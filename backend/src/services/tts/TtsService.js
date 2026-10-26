const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pool, query } = require('../../config/db');
const EdgeTtsProvider = require('./EdgeTtsProvider');
const AzureTtsProvider = require('./AzureTtsProvider');
const MockTtsProvider = require('./MockTtsProvider');
const { UPLOAD_ROOT } = require('../../middleware/upload');

class TtsService {
  constructor() {
    this.audioDir = path.join(UPLOAD_ROOT, 'audio', 'fidel');
    if (!fs.existsSync(this.audioDir)) {
      fs.mkdirSync(this.audioDir, { recursive: true });
    }

    // Provider map
    this.providers = {
      edge: new EdgeTtsProvider(),
      azure: new AzureTtsProvider(),
      mock: new MockTtsProvider(),
    };

    // Active in-flight concurrency locks keyed by speech_text_hash
    this.inFlightLocks = new Map();

    // Default configuration
    this.defaultVoice = 'am-ET-MekdesNeural';
    this.defaultLanguage = 'am-ET';
  }

  getProvider(providerName) {
    const selected = providerName || process.env.TTS_PROVIDER || (process.env.NODE_ENV === 'test' ? 'mock' : 'edge');
    const provider = this.providers[selected];
    if (!provider) {
      throw new Error(`TTS Provider "${selected}" is not registered`);
    }
    return provider;
  }

  computeHash(speechText, providerName, voiceId, languageCode) {
    const payload = `${speechText.trim()}|${providerName}|${voiceId}|${languageCode}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Get or generate audio for a specific fidel character
   * @param {Object} options
   * @param {number|string} options.characterId
   * @param {string} [options.providerName]
   * @param {string} [options.voiceId]
   * @param {boolean} [options.forceRegenerate]
   * @returns {Promise<Object>} audio asset record
   */
  async getOrGenerateCharacterAudio({
    characterId,
    providerName,
    voiceId,
    forceRegenerate = false,
  }) {
    // 1. Retrieve character metadata
    const charRes = await query(
      `SELECT c.*, f.family_name, f.base_character
       FROM fidel_characters c
       JOIN fidel_families f ON f.id = c.family_id
       WHERE c.id = $1`,
      [characterId]
    );

    if (charRes.rows.length === 0) {
      throw new Error(`Fidel character with ID ${characterId} not found`);
    }

    const character = charRes.rows[0];
    const speechText = character.speech_text || character.character;
    const languageCode = character.speech_language || this.defaultLanguage;
    const activeProviderName = providerName || process.env.TTS_PROVIDER || (process.env.NODE_ENV === 'test' ? 'mock' : 'edge');
    const activeVoiceId = voiceId || this.defaultVoice;

    // 2. Compute deterministic cache hash
    const hash = this.computeHash(speechText, activeProviderName, activeVoiceId, languageCode);
    const audioFilename = `${hash}.mp3`;
    const localFilePath = path.join(this.audioDir, audioFilename);
    const publicAudioUrl = `/uploads/audio/fidel/${audioFilename}`;

    // 3. Check existing asset in database
    if (!forceRegenerate) {
      const existingAsset = await query(
        `SELECT * FROM fidel_audio_assets
         WHERE fidel_character_id = $1
           AND provider = $2
           AND voice_id = $3
           AND speech_text_hash = $4`,
        [characterId, activeProviderName, activeVoiceId, hash]
      );

      if (
        existingAsset.rows.length > 0 &&
        existingAsset.rows[0].generation_status === 'ready' &&
        fs.existsSync(localFilePath)
      ) {
        return existingAsset.rows[0];
      }
    }

    // 4. Concurrency lock: Prevent duplicate concurrent generation calls
    const lockKey = `${characterId}_${hash}`;
    if (this.inFlightLocks.has(lockKey)) {
      return await this.inFlightLocks.get(lockKey);
    }

    const generationPromise = this._generateAndSaveAsset({
      characterId,
      character,
      speechText,
      languageCode,
      activeProviderName,
      activeVoiceId,
      hash,
      localFilePath,
      publicAudioUrl,
    });

    this.inFlightLocks.set(lockKey, generationPromise);

    try {
      const result = await generationPromise;
      return result;
    } finally {
      this.inFlightLocks.delete(lockKey);
    }
  }

  async _generateAndSaveAsset({
    characterId,
    character,
    speechText,
    languageCode,
    activeProviderName,
    activeVoiceId,
    hash,
    localFilePath,
    publicAudioUrl,
  }) {
    const provider = this.getProvider(activeProviderName);

    // Initial asset record in DB as processing or pending
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const upsertPending = await client.query(
        `INSERT INTO fidel_audio_assets (
           fidel_character_id, provider, voice_id, language_code,
           speech_text_hash, audio_url, storage_key, generation_status,
           pronunciation_review_status, duration_seconds, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'processing', 'approved', 1.0, now())
         ON CONFLICT (fidel_character_id, provider, voice_id, speech_text_hash)
         DO UPDATE SET
           generation_status = 'processing',
           updated_at = now()
         RETURNING *`,
        [
          characterId,
          activeProviderName,
          activeVoiceId,
          languageCode,
          hash,
          publicAudioUrl,
          localFilePath,
        ]
      );

      await client.query('COMMIT');

      // Synthesize audio with retry logic (up to 2 retries)
      let buffer = null;
      let lastError = null;
      const maxRetries = 2;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          buffer = await provider.synthesize({
            text: speechText,
            voice: activeVoiceId,
            language: languageCode,
          });
          if (buffer && buffer.length > 0) break;
        } catch (err) {
          lastError = err;
          if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, (attempt + 1) * 300));
          }
        }
      }

      if (!buffer || buffer.length === 0) {
        // Record failed status
        await query(
          `UPDATE fidel_audio_assets
           SET generation_status = 'failed', updated_at = now()
           WHERE fidel_character_id = $1
             AND provider = $2
             AND voice_id = $3
             AND speech_text_hash = $4`,
          [characterId, activeProviderName, activeVoiceId, hash]
        );
        throw new Error(
          `Audio synthesis failed for character "${character.character}" (${characterId}): ${lastError?.message || 'Empty audio buffer returned'}`
        );
      }

      // Write audio to disk
      fs.writeFileSync(localFilePath, buffer);

      // Estimate duration from MP3 length (approx ~1.0-1.5s for single syllable MP3)
      const durationSeconds = 1.0;

      // Update asset record to 'ready'
      const updatedAsset = await query(
        `UPDATE fidel_audio_assets
         SET generation_status = 'ready',
             duration_seconds = $1,
             audio_url = $2,
             storage_key = $3,
             updated_at = now()
         WHERE fidel_character_id = $4
           AND provider = $5
           AND voice_id = $6
           AND speech_text_hash = $7
         RETURNING *`,
        [
          durationSeconds,
          publicAudioUrl,
          localFilePath,
          characterId,
          activeProviderName,
          activeVoiceId,
          hash,
        ]
      );

      return updatedAsset.rows[0];
    } catch (err) {
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Prewarm audio for all fidel characters associated with a lesson
   * @param {number|string} lessonId
   * @returns {Promise<Object>} summary of prewarmed assets
   */
  async prewarmLessonAudio(lessonId) {
    const charsRes = await query(
      `SELECT c.id, c.character, c.speech_text, f.id as family_id, f.family_name
       FROM lesson_fidel_families lff
       JOIN fidel_families f ON f.id = lff.family_id
       JOIN fidel_characters c ON c.family_id = f.id
       WHERE lff.lesson_id = $1 AND c.is_active = TRUE
       ORDER BY lff.display_order ASC, c.display_order ASC`,
      [lessonId]
    );

    const characters = charsRes.rows;
    let readyCount = 0;
    let failedCount = 0;
    const errors = [];

    for (const char of characters) {
      try {
        const asset = await this.getOrGenerateCharacterAudio({
          characterId: char.id,
        });
        if (asset.generation_status === 'ready') {
          readyCount++;
        } else {
          failedCount++;
        }
      } catch (err) {
        failedCount++;
        errors.push({ characterId: char.id, character: char.character, error: err.message });
      }
    }

    return {
      total: characters.length,
      readyCount,
      failedCount,
      allReady: failedCount === 0 && characters.length > 0,
      errors,
    };
  }

  /**
   * Invalidate audio assets when a character's speech text is updated
   * @param {number|string} characterId
   */
  async invalidateCharacterAudio(characterId) {
    await query(
      `UPDATE fidel_audio_assets
       SET generation_status = 'pending',
           pronunciation_review_status = 'pending_review',
           updated_at = now()
       WHERE fidel_character_id = $1`,
      [characterId]
    );
  }
}

// Export singleton instance
module.exports = new TtsService();
