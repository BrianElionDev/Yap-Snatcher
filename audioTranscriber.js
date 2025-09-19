const { OpenAI } = require('openai');
const fs = require('fs-extra');
const path = require('path');
const config = require('./config');

class AudioTranscriber {
  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey,
    });
  }

  async transcribeAudioFile(audioFilePath, options = {}) {
    const {
      language = config.defaultLanguage,
      prompt = '',
      temperature = 0,
      responseFormat = 'json',
    } = options;

    if (!await fs.pathExists(audioFilePath)) {
      throw new Error(`Audio file not found: ${audioFilePath}`);
    }

    const fileStats = await fs.stat(audioFilePath);
    const fileSizeMB = (fileStats.size / (1024 * 1024)).toFixed(2);
    
    console.log(`Transcribing file: ${path.basename(audioFilePath)}`);
    console.log(`File size: ${fileSizeMB} MB`);
    console.log(`Language: ${language}, Temperature: ${temperature}`);

    if (fileStats.size > config.chunkSize) {
      console.log('File is large, splitting into chunks...');
      return await this.transcribeLargeFile(audioFilePath, options);
    }

    return await this.transcribeSingleFile(audioFilePath, options);
  }

  async transcribeSingleFile(audioFilePath, options) {
    const {
      language = config.defaultLanguage,
      prompt = '',
      temperature = 0,
      responseFormat = 'json',
    } = options;

    let lastError;
    for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
      try {
        const transcription = await this.openai.audio.transcriptions.create({
          file: fs.createReadStream(audioFilePath),
          model: config.whisperModel,
          language,
          prompt,
          temperature,
          response_format: responseFormat,
        });
        
        console.log('Transcription successful');
        return transcription;
      } catch (error) {
        lastError = error;
        const retryMsg = attempt < config.maxRetries ? 
          `Retrying in ${config.retryDelay/1000} seconds...` : 
          'Max retries reached';
        console.error(`Attempt ${attempt} failed: ${error.message}. ${retryMsg}`);
        
        if (attempt < config.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, config.retryDelay));
        }
      }
    }
    
    throw new Error(`Failed to transcribe after ${config.maxRetries} attempts: ${lastError.message}`);
  }

  async transcribeLargeFile(audioFilePath, options) {
    const { splitAudioIfNeeded } = require('./youtubeDownloader');
    const audioPaths = await splitAudioIfNeeded(audioFilePath);
    console.log(`Audio split into ${audioPaths.length} chunks`);
    
    const results = [];
    for (let i = 0; i < audioPaths.length; i++) {
      console.log(`Processing chunk ${i+1}/${audioPaths.length}`);
      
      let prompt = '';
      if (i > 0 && results[i-1] && results[i-1].text) {
        const words = results[i-1].text.split(' ');
        const contextWords = words.slice(Math.max(0, words.length - 100)).join(' ');
        prompt = `Previous context: ${contextWords}`;
      }
      
      const chunkResult = await this.transcribeSingleFile(audioPaths[i], {
        ...options,
        prompt,
      });
      
      results.push(chunkResult);
    }
    
    const combinedText = results.map(result => result.text).join(' ');
    return {
      text: combinedText,
      chunks: results,
    };
  }

  async saveTranscription(transcription, outputPath) {
    await fs.ensureDir(path.dirname(outputPath));
    
    await fs.writeFile(outputPath, transcription.text);
    
    if (transcription.chunks) {
      const jsonPath = outputPath.replace(/\.[^.]+$/, '.json');
      await fs.writeFile(jsonPath, JSON.stringify(transcription, null, 2));
    }
    
    console.log(`Transcription saved to: ${outputPath}`);
    return outputPath;
  }

  async processAudioFile(inputPath, outputPath, options = {}) {
    const transcription = await this.transcribeAudioFile(inputPath, options);
    return await this.saveTranscription(transcription, outputPath);
  }
}

module.exports = AudioTranscriber;
