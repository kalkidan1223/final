const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const fs = require('fs');
const path = require('path');

async function testAmharicTTS() {
  console.log('Testing Amharic TTS with MsEdgeTTS...');
  const tts = new MsEdgeTTS();
  await tts.setMetadata('am-ET-MekdesNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  const testDir = path.join(__dirname, '..', 'uploads', 'audio', 'test');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const testCharacters = ['ሀ', 'ሁ', 'ሂ', 'ሃ', 'ሄ', 'ህ', 'ሆ'];
  for (const char of testCharacters) {
    const filePath = path.join(testDir, `test_${char}.mp3`);
    console.log(`Synthesizing character: ${char}...`);
    try {
      const { audioStream } = tts.toStream(char);
      const chunks = [];
      await new Promise((resolve, reject) => {
        audioStream.on('data', chunk => chunks.push(chunk));
        audioStream.on('end', () => resolve());
        audioStream.on('error', err => reject(err));
      });
      const buffer = Buffer.concat(chunks);
      fs.writeFileSync(filePath, buffer);
      console.log(`✓ Saved ${char} audio (${buffer.length} bytes) to ${filePath}`);
    } catch (err) {
      console.error(`✗ Failed for ${char}:`, err.message);
    }
  }
}

testAmharicTTS()
  .then(() => {
    console.log('TTS test completed successfully!');
    process.exit(0);
  })
  .catch(err => {
    console.error('TTS test failed:', err);
    process.exit(1);
  });
