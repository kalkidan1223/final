const axios = require('axios');
const TtsProvider = require('./TtsProvider');

class AzureTtsProvider extends TtsProvider {
  constructor(apiKey, region, defaultVoice = 'am-ET-MekdesNeural') {
    super('azure');
    this.apiKey = apiKey || process.env.AZURE_SPEECH_KEY;
    this.region = region || process.env.AZURE_SPEECH_REGION || 'eastus';
    this.defaultVoice = defaultVoice;
  }

  async synthesize({ text, voice, language = 'am-ET' }) {
    if (!this.apiKey) {
      throw new Error('Azure Speech API key is not configured (AZURE_SPEECH_KEY missing)');
    }
    const selectedVoice = voice || this.defaultVoice;

    // Use Azure Speech REST API SSML endpoint
    const url = `https://${this.region}.tts.speech.microsoft.com/cognitiveservices/v1`;
    const ssml = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${language}">
        <voice name="${selectedVoice}">
          ${text}
        </voice>
      </speak>
    `.trim();

    const response = await axios.post(url, ssml, {
      headers: {
        'Ocp-Apim-Subscription-Key': this.apiKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'BranaYouthTTS/1.0',
      },
      responseType: 'arraybuffer',
      timeout: 10000,
    });

    return Buffer.from(response.data);
  }

  async getVoices(language = 'am-ET') {
    if (!this.apiKey) return [];
    const url = `https://${this.region}.tts.speech.microsoft.com/cognitiveservices/voices/list`;
    const response = await axios.get(url, {
      headers: {
        'Ocp-Apim-Subscription-Key': this.apiKey,
      },
      timeout: 10000,
    });
    return response.data
      .filter(v => v.Locale.toLowerCase() === language.toLowerCase())
      .map(v => ({
        id: v.ShortName,
        name: v.LocalName || v.DisplayName || v.ShortName,
        gender: v.Gender,
        locale: v.Locale,
      }));
  }
}

module.exports = AzureTtsProvider;
