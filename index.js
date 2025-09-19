#!/usr/bin/env node

const { program } = require('commander');
const path = require('path');
const fs = require('fs-extra');
const { downloadAndExtractAudio, splitAudioIfNeeded } = require('./youtubeDownloader');
const Transcriber = require('./transcriber');
const config = require('./config');

// Define CLI options
program
  .name('youtube-whisper-transcriber')
  .description('Transcribe YouTube videos using OpenAI\'s Whisper API')
  .version('1.0.0')
  .requiredOption('-u, --url <url>', 'YouTube video URL')
  .option('-o, --output <path>', 'Output file path for the transcription')
  .option('-l, --language <code>', 'Language code (e.g., "en", "fr", "de")', config.defaultLanguage)
  .option('-t, --temperature <number>', 'Temperature for the model (0.0-1.0)', '0')
  .option('--keep-audio', 'Keep the downloaded audio files after transcription')
  .option('--format <format>', 'Output format (txt or json)', 'txt')
  .parse(process.argv);

const options = program.opts();

// Main application function
async function main() {
  try {
    console.log('YouTube Whisper Transcriber');
    console.log('=========================');
    console.log(`Processing URL: ${options.url}`);
    
    // Create output directory
    await fs.ensureDir(config.outputDir);
    
    // Generate output path if not provided
    if (!options.output) {
      const videoId = options.url.split('v=')[1]?.split('&')[0] || 'video';
      options.output = path.join(config.outputDir, `${videoId}.${options.format}`);
    }
    
    // Download YouTube video and extract audio
    const audioPath = await downloadAndExtractAudio(options.url);
    console.log(`Audio extracted to: ${audioPath}`);
    
    // Split audio if needed
    const audioPaths = await splitAudioIfNeeded(audioPath);
    console.log(`Audio processed into ${audioPaths.length} chunks`);
    
    // Transcribe audio
    const transcriber = new Transcriber();
    let transcription;
    
    if (audioPaths.length === 1) {
      // Single file transcription
      transcription = await transcriber.transcribeAudio(audioPaths[0], {
        language: options.language,
        temperature: parseFloat(options.temperature),
        responseFormat: 'json',
      });
    } else {
      // Multi-chunk transcription
      transcription = await transcriber.transcribeChunks(audioPaths, {
        language: options.language,
        temperature: parseFloat(options.temperature),
        responseFormat: 'json',
      });
    }
    
    // Save transcription
    const savedPath = await transcriber.saveTranscription(transcription, options.output);
    console.log(`Transcription completed and saved to: ${savedPath}`);
    
    // Clean up temporary files unless --keep-audio flag is used
    if (!options.keepAudio) {
      console.log('Cleaning up temporary files...');
      await Promise.all(audioPaths.map(filePath => fs.remove(filePath)));
      console.log('Cleanup complete');
    }
    
    console.log('Process completed successfully!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the application
main();