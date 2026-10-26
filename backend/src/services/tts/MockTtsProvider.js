const crypto = require('crypto');
const TtsProvider = require('./TtsProvider');

// Minimal valid silent MP3 frame buffer repeated to create playable ~1s MP3
function generateMockMp3(text) {
  // MPEG-1 Layer 3, 128 kbps, 44.1 kHz, stereo frame header (4 bytes: 0xFF, 0xFB, 0x90, 0x00)
  // frame length = 144 * 128000 / 44100 = 417 bytes
  const frameLength = 417;
  const frame = Buffer.alloc(frameLength, 0);
  frame[0] = 0xFF;
  frame[1] = 0xFB; // MPEG-1 Layer 3, no protection
  frame[2] = 0x90; // 128 kbps, 44100 Hz
  frame[3] = 0x00;

  // Add text hash signature in data payload for deterministic variation
  const textHash = crypto.createHash('md5').update(text || '').digest();
  textHash.copy(frame, 4);

  // 38 frames ≈ 1.0 second of audio
  return Buffer.concat(Array(38).fill(frame));
}

class MockTtsProvider extends TtsProvider {
  constructor(defaultVoice = 'am-ET-MekdesNeural') {
    super('mock');
    this.defaultVoice = defaultVoice;
    this.simulateFailure = false;
  }

  setSimulateFailure(shouldFail) {
    this.simulateFailure = shouldFail;
  }

  async synthesize({ text, voice, language = 'am-ET' }) {
    if (this.simulateFailure) {
      throw new Error('Simulated TTS provider error');
    }
    if (!text) {
      throw new Error('Valid text string is required for mock synthesis');
    }
    return generateMockMp3(text);
  }

  async getVoices(language = 'am-ET') {
    return [
      { id: 'am-ET-MekdesNeural', name: 'Mock Mekdes (Female)', gender: 'Female', locale: 'am-ET' },
      { id: 'am-ET-AmehaNeural', name: 'Mock Ameha (Male)', gender: 'Male', locale: 'am-ET' },
    ];
  }
}

module.exports = MockTtsProvider;
