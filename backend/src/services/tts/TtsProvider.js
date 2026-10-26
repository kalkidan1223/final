/**
 * Base abstract class for TTS Providers
 */
class TtsProvider {
  constructor(name) {
    this.name = name;
  }

  /**
   * Synthesize speech for given text
   * @param {Object} options
   * @param {string} options.text - Configured speech text
   * @param {string} options.voice - Voice identifier (e.g. 'am-ET-MekdesNeural')
   * @param {string} options.language - Locale (e.g. 'am-ET')
   * @returns {Promise<Buffer>} - Audio buffer (MP3)
   */
  async synthesize({ text, voice, language }) {
    throw new Error('synthesize() must be implemented by provider');
  }

  /**
   * List available voices for language
   * @param {string} language
   * @returns {Promise<Array>}
   */
  async getVoices(language = 'am-ET') {
    return [];
  }
}

module.exports = TtsProvider;
