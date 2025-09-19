#!/usr/bin/env node

const { program } = require('commander');
const path = require('path');
const fs = require('fs-extra');
const AudioTranscriber = require('./audioTranscriber');
const AudioProcessor = require('./audioProcessor');
const config = require('./config');

program
  .name('audio-transcriber')
  .description('Transcribe audio files directly using OpenAI\'s Whisper API')
  .version('1.0.0')
  .requiredOption('-i, --input <path>', 'Input audio file or directory path')
  .option('-o, --output <path>', 'Output file path for the transcription')
  .option('-d, --output-dir <path>', 'Output directory (default: ./audio_output)', './audio_output')
  .option('-l, --language <code>', 'Language code (e.g., "en", "fr", "de")', config.defaultLanguage)
  .option('-t, --temperature <number>', 'Temperature for the model (0.0-1.0)', '0')
  .option('--format <format>', 'Output format (txt or json)', 'txt')
  .option('--batch', 'Process all audio files in input directory')
  .option('--keep-filename', 'Keep original filename instead of adding timestamp')
  .parse(process.argv);

const options = program.opts();

async function processSingleFile(inputPath, outputPath) {
  try {
    console.log('Audio Transcriber');
    console.log('=================');
    
    const fileInfo = await AudioProcessor.validateAudioFile(inputPath);
    console.log(`Processing: ${fileInfo.name}${fileInfo.extension} (${fileInfo.sizeMB} MB)`);
    
    await AudioProcessor.ensureOutputDirectory(path.dirname(outputPath));
    
    const transcriber = new AudioTranscriber();
    const savedPath = await transcriber.processAudioFile(inputPath, outputPath, {
      language: options.language,
      temperature: parseFloat(options.temperature),
      responseFormat: 'json',
    });
    
    console.log(`Transcription completed: ${savedPath}`);
    return savedPath;
  } catch (error) {
    console.error(`Error processing ${inputPath}:`, error.message);
    throw error;
  }
}

async function processBatch(inputDir, outputDir) {
  try {
    console.log('Batch Audio Transcriber');
    console.log('=======================');
    console.log(`Input directory: ${inputDir}`);
    console.log(`Output directory: ${outputDir}`);
    
    const audioFiles = await AudioProcessor.getAudioFilesFromDirectory(inputDir);
    
    if (audioFiles.length === 0) {
      console.log('No audio files found in the input directory');
      return;
    }
    
    console.log(`Found ${audioFiles.length} audio files to process`);
    
    await AudioProcessor.ensureOutputDirectory(outputDir);
    
    const transcriber = new AudioTranscriber();
    const results = [];
    
    for (let i = 0; i < audioFiles.length; i++) {
      const inputFile = audioFiles[i];
      const fileInfo = await AudioProcessor.validateAudioFile(inputFile);
      
      console.log(`\nProcessing ${i+1}/${audioFiles.length}: ${fileInfo.name}${fileInfo.extension}`);
      
      const outputPath = options.keepFilename 
        ? path.join(outputDir, `${fileInfo.name}.${options.format}`)
        : AudioProcessor.generateOutputPath(inputFile, outputDir, options.format);
      
      try {
        const savedPath = await transcriber.processAudioFile(inputFile, outputPath, {
          language: options.language,
          temperature: parseFloat(options.temperature),
          responseFormat: 'json',
        });
        
        results.push({ input: inputFile, output: savedPath, success: true });
        console.log(`✓ Completed: ${path.basename(savedPath)}`);
      } catch (error) {
        console.error(`✗ Failed: ${error.message}`);
        results.push({ input: inputFile, output: null, success: false, error: error.message });
      }
    }
    
    console.log('\nBatch processing summary:');
    console.log(`✓ Successful: ${results.filter(r => r.success).length}`);
    console.log(`✗ Failed: ${results.filter(r => !r.success).length}`);
    
    if (results.some(r => !r.success)) {
      console.log('\nFailed files:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`  - ${path.basename(r.input)}: ${r.error}`);
      });
    }
    
  } catch (error) {
    console.error('Batch processing error:', error.message);
    throw error;
  }
}

async function main() {
  try {
    const inputPath = path.resolve(options.input);
    const outputDir = path.resolve(options.outputDir);
    
    if (options.batch) {
      if (!(await fs.pathExists(inputPath)) || !(await fs.stat(inputPath)).isDirectory()) {
        throw new Error('Input path must be a directory when using --batch option');
      }
      await processBatch(inputPath, outputDir);
    } else {
      if (!(await fs.pathExists(inputPath)) || (await fs.stat(inputPath)).isDirectory()) {
        throw new Error('Input path must be a file when not using --batch option');
      }
      
      let outputPath;
      if (options.output) {
        outputPath = path.resolve(options.output);
      } else {
        outputPath = options.keepFilename 
          ? path.join(outputDir, `${path.basename(inputPath, path.extname(inputPath))}.${options.format}`)
          : AudioProcessor.generateOutputPath(inputPath, outputDir, options.format);
      }
      
      await processSingleFile(inputPath, outputPath);
    }
    
    console.log('\nProcess completed successfully!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
