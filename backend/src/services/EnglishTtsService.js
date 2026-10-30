const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pool, query } = require('../config/db');
const EdgeTtsProvider = require('./tts/EdgeTtsProvider');
const AzureTtsProvider = require('./tts/AzureTtsProvider');
const MockTtsProvider = require('./tts/MockTtsProvider');
const { UPLOAD_ROOT } = require('../middleware/upload');

class EnglishTtsService {
  constructor() {
    this.audioDir = path.join(UPLOAD_ROOT, 'audio', 'english');
    if (!fs.existsSync(this.audioDir)) fs.mkdirSync(this.audioDir, { recursive: true });
    this.providers = { edge: new EdgeTtsProvider(), azure: new AzureTtsProvider(), mock: new MockTtsProvider() };
    this.inFlightLocks = new Map();
    this.defaultVoice = 'en-US-JennyNeural';
    this.defaultLanguage = 'en-US';
  }
  getProvider(name) {
    const selected = name || process.env.TTS_PROVIDER || (process.env.NODE_ENV === 'test' ? 'mock' : 'edge');
    const p = this.providers[selected];
    if (!p) throw new Error(`TTS Provider "${selected}" not registered`);
    return p;
  }
  computeHash(text, provider, voice, lang) {
    return crypto.createHash('sha256').update(`${text.trim()}|${provider}|${voice}|${lang}`).digest('hex');
  }
  async getOrGenerateLetterAudio({ letterId, providerName, voiceId, forceRegenerate = false }) {
    const charRes = await query('SELECT * FROM english_letters WHERE id = $1', [letterId]);
    if (charRes.rows.length === 0) throw new Error(`English letter ${letterId} not found`);
    const letter = charRes.rows[0];
    const speechText = letter.speech_text || letter.letter;
    const languageCode = letter.speech_language || this.defaultLanguage;
    const activeProvider = providerName || process.env.TTS_PROVIDER || (process.env.NODE_ENV === 'test' ? 'mock' : 'edge');
    const activeVoice = voiceId || this.defaultVoice;
    const hash = this.computeHash(speechText, activeProvider, activeVoice, languageCode);
    const filename = `${hash}.mp3`;
    const localPath = path.join(this.audioDir, filename);
    const publicUrl = `/uploads/audio/english/${filename}`;

    if (!forceRegenerate) {
      const existing = await query(
        `SELECT * FROM english_audio_assets WHERE english_letter_id=$1 AND provider=$2 AND voice_id=$3 AND speech_text_hash=$4`,
        [letterId, activeProvider, activeVoice, hash]
      );
      if (existing.rows.length > 0 && existing.rows[0].generation_status === 'ready' && fs.existsSync(localPath)) {
        return existing.rows[0];
      }
    }
    const lockKey = `${letterId}_${hash}`;
    if (this.inFlightLocks.has(lockKey)) return await this.inFlightLocks.get(lockKey);
    const promise = this._generate({ letterId, letter, speechText, languageCode, activeProvider, activeVoice, hash, localPath, publicUrl });
    this.inFlightLocks.set(lockKey, promise);
    try { return await promise; } finally { this.inFlightLocks.delete(lockKey); }
  }
  async _generate({ letterId, letter, speechText, languageCode, activeProvider, activeVoice, hash, localPath, publicUrl }) {
    const provider = this.getProvider(activeProvider);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO english_audio_assets (english_letter_id, provider, voice_id, language_code, speech_text_hash, audio_url, storage_key, generation_status, pronunciation_review_status, duration_seconds, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'processing','approved',1.0,now())
         ON CONFLICT (english_letter_id, provider, voice_id, speech_text_hash) DO UPDATE SET generation_status='processing', updated_at=now()`,
        [letterId, activeProvider, activeVoice, languageCode, hash, publicUrl, localPath]
      );
      await client.query('COMMIT');

      let buffer = null, lastError = null;
      for (let attempt = 0; attempt <= 2; attempt++) {
        try {
          buffer = await provider.synthesize({ text: speechText, voice: activeVoice, language: languageCode });
          if (buffer && buffer.length > 0) break;
        } catch (err) {
          lastError = err;
          if (attempt < 2) await new Promise(r => setTimeout(r, (attempt + 1) * 300));
        }
      }
      if (!buffer || buffer.length === 0) {
        await query(`UPDATE english_audio_assets SET generation_status='failed', updated_at=now() WHERE english_letter_id=$1 AND provider=$2 AND voice_id=$3 AND speech_text_hash=$4`, [letterId, activeProvider, activeVoice, hash]);
        throw new Error(`Audio synthesis failed for letter "${letter.letter}" (${letterId}): ${lastError?.message || 'Empty buffer'}`);
      }
      fs.writeFileSync(localPath, buffer);
      const updated = await query(
        `UPDATE english_audio_assets SET generation_status='ready', duration_seconds=1.0, audio_url=$1, storage_key=$2, updated_at=now()
         WHERE english_letter_id=$3 AND provider=$4 AND voice_id=$5 AND speech_text_hash=$6 RETURNING *`,
        [publicUrl, localPath, letterId, activeProvider, activeVoice, hash]
      );
      return updated.rows[0];
    } catch (err) {
      throw err;
    } finally {
      client.release();
    }
  }
  async prewarmLessonAudio(lessonId) {
    const chars = await query(
      `SELECT el.id FROM lesson_english_letters lel JOIN english_letters el ON el.id=lel.letter_id WHERE lel.lesson_id=$1 AND el.is_active=TRUE ORDER BY lel.display_order`,
      [lessonId]
    );
    let ready = 0, failed = 0, errors = [];
    for (const c of chars.rows) {
      try {
        const a = await this.getOrGenerateLetterAudio({ letterId: c.id });
        if (a.generation_status === 'ready') ready++; else failed++;
      } catch (e) { failed++; errors.push({ letterId: c.id, error: e.message }); }
    }
    return { total: chars.rows.length, readyCount: ready, failedCount: failed, allReady: failed === 0 && chars.rows.length > 0, errors };
  }
  async invalidateLetterAudio(letterId) {
    await query(`UPDATE english_audio_assets SET generation_status='pending', updated_at=now() WHERE english_letter_id=$1`, [letterId]);
  }
}
module.exports = new EnglishTtsService();