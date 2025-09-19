require('dotenv').config();

const config = {
  openaiApiKey: process.env.OPENAI_API_KEY,
  outputDir: process.env.OUTPUT_DIR || './output',
  tempDir: process.env.TEMP_DIR || './temp',
  whisperModel: process.env.WHISPER_MODEL || 'whisper-1',
  defaultLanguage: process.env.DEFAULT_LANGUAGE || 'en',
  maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
  retryDelay: parseInt(process.env.RETRY_DELAY || '1000'),
  chunkSize: parseInt(process.env.CHUNK_SIZE || '25000000'), // 25MB in bytes
};

// Validate essential config
if (!config.openaiApiKey) {
  console.error('Error: OPENAI_API_KEY is required in .env file');
  process.exit(1);
}

module.exports = config;