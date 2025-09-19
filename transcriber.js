const { OpenAI } = require('openai');
const fs = require('fs-extra');
const path = require('path');
const config = require('./config');

/**
 * Handles transcription of audio files using OpenAI's Whisper API
 */
class Transcriber {
  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey,
    });
  }

  /**
   * Transcribes an audio file using Whisper API
   * @param {string} audioFilePath Path to the audio file
   * @param {Object} options Transcription options
   * @returns {Promise<Object>} Transcription result
   */
  async transcribeAudio(audioFilePath, options = {}) {
    const {
      language = config.defaultLanguage,
      prompt = '',
      temperature = 0,
      responseFormat = 'json',
    } = options;

    if (!await fs.pathExists(audioFilePath)) {
      throw new Error(`Audio file not found: ${audioFilePath}`);
    }

    console.log(`Transcribing file: ${audioFilePath}`);
    console.log(`Language: ${language}, Temperature: ${temperature}`);

    const audioFile = await fs.readFile(audioFilePath);
    
    // Implement retry logic
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

  /**
   * Transcribe multiple audio chunks and combine the results
   * @param {string[]} chunkPaths Array of paths to audio chunks
   * @param {Object} options Transcription options
   * @returns {Promise<Object>} Combined transcription result
   */
  async transcribeChunks(chunkPaths, options = {}) {
    console.log(`Transcribing ${chunkPaths.length} audio chunks...`);
    
    const results = [];
    for (let i = 0; i < chunkPaths.length; i++) {
      console.log(`Processing chunk ${i+1}/${chunkPaths.length}`);
      
      // Use previous chunk's end as context for the next chunk
      let prompt = '';
      if (i > 0 && results[i-1] && results[i-1].text) {
        // Use the last ~100 words as context
        const words = results[i-1].text.split(' ');
        const contextWords = words.slice(Math.max(0, words.length - 100)).join(' ');
        prompt = `Previous context: ${contextWords}`;
      }
      
      const chunkResult = await this.transcribeAudio(chunkPaths[i], {
        ...options,
        prompt,
      });
      
      results.push(chunkResult);
    }
    
    // Combine results
    const combinedText = results.map(result => result.text).join(' ');
    return {
      text: combinedText,
      chunks: results,
    };
  }

  /**
   * Saves transcription to a file
   * @param {Object} transcription Transcription result
   * @param {string} outputPath Path to save the transcription
   * @returns {Promise<string>} Path to the saved file
   */
  async saveTranscription(transcription, outputPath) {
    await fs.ensureDir(path.dirname(outputPath));
    
    // Save the full transcription
    await fs.writeFile(outputPath, transcription.text);
    
    // If we have chunks, save detailed JSON with timestamps if available
    if (transcription.chunks) {
      const jsonPath = outputPath.replace(/\.[^.]+$/, '.json');
      await fs.writeFile(jsonPath, JSON.stringify(transcription, null, 2));
    }
    
    console.log(`Transcription saved to: ${outputPath}`);
    return outputPath;
  }
}

module.exports = Transcriber;