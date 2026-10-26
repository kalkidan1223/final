const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const TtsProvider = require('./TtsProvider');

class EdgeTtsProvider extends TtsProvider {
  constructor(defaultVoice = 'am-ET-MekdesNeural') {
    super('edge');
    this.defaultVoice = defaultVoice;
  }

  async synthesize({ text, voice, language = 'am-ET' }) {
    if (!text || typeof text !== 'string') {
      throw new Error('Valid text string is required for synthesis');
    }

    const selectedVoice = voice || this.defaultVoice;
    const tts = new MsEdgeTTS();

    try {
      await tts.setMetadata(
        selectedVoice,
        OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
      );

      const { audioStream } = tts.toStream(text);
      const chunks = [];

      await new Promise((resolve, reject) => {
        audioStream.on('data', chunk => chunks.push(chunk));
        audioStream.on('end', () => resolve());
        audioStream.on('error', err => reject(err));
      });

      const buffer = Buffer.concat(chunks);
      if (buffer.length === 0) {
        throw new Error('TTS provider returned an empty audio stream');
      }

      return buffer;
    } finally {
      try {
        tts.close();
      } catch (e) {
        // Ignore close error on finished stream
      }
    }
  }

  async getVoices(language = 'am-ET') {
    const tts = new MsEdgeTTS();
    try {
      const allVoices = await tts.getVoices();
      const filtered = allVoices.filter(v => v.Locale.toLowerCase() === language.toLowerCase());
      return filtered.map(v => ({
        id: v.ShortName,
        name: v.FriendlyName || v.Name,
        gender: v.Gender,
        locale: v.Locale,
      }));
    } finally {
      try {
        tts.close();
      } catch (e) {}
    }
  }
}

module.exports = EdgeTtsProvider;
