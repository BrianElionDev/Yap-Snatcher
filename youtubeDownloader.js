const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs-extra');
const path = require('path');
const config = require('./config');

ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Downloads a YouTube video and extracts the audio
 * @param {string} url YouTube video URL
 * @param {string} outputFileName Name of the output audio file
 * @returns {Promise<string>} Path to the extracted audio file
 */
async function downloadAndExtractAudio(url, outputFileName) {
  if (!ytdl.validateURL(url)) {
    throw new Error('Invalid YouTube URL');
  }

  // Create temp directory if it doesn't exist
  await fs.ensureDir(config.tempDir);
  
  // Get video info to validate and get title
  const info = await ytdl.getInfo(url);
  const videoTitle = info.videoDetails.title;
  console.log(`Downloading: ${videoTitle}`);
  
  // Generate file paths
  const videoId = ytdl.getVideoID(url);
  const videoPath = path.join(config.tempDir, `${videoId}.mp4`);
  const audioPath = path.join(config.tempDir, outputFileName || `${videoId}.mp3`);
  
  // Download video
  return new Promise((resolve, reject) => {
    const videoStream = ytdl(url, {
      quality: 'lowest', // We only need audio, so lowest video quality is fine
      filter: 'audioandvideo',
    });
    
    videoStream.pipe(fs.createWriteStream(videoPath))
      .on('finish', () => {
        console.log('Video download complete, extracting audio...');
        
        // Extract audio using ffmpeg
        ffmpeg(videoPath)
          .noVideo()
          .audioCodec('libmp3lame')
          .audioBitrate(128)
          .output(audioPath)
          .on('end', () => {
            console.log('Audio extraction complete');
            // Clean up video file
            fs.remove(videoPath)
              .then(() => resolve(audioPath))
              .catch(err => {
                console.warn('Warning: Failed to clean up video file:', err.message);
                resolve(audioPath); // Still resolve with the audio path
              });
          })
          .on('error', (err) => reject(new Error(`Audio extraction failed: ${err.message}`)))
          .run();
      })
      .on('error', (err) => reject(new Error(`Video download failed: ${err.message}`)));
  });
}

/**
 * Splits an audio file into smaller chunks if needed
 * @param {string} filePath Path to the audio file
 * @returns {Promise<string[]>} Array of paths to audio chunks
 */
async function splitAudioIfNeeded(filePath) {
  const stats = await fs.stat(filePath);
  
  // If file is smaller than chunk size, no need to split
  if (stats.size <= config.chunkSize) {
    return [filePath];
  }
  
  console.log(`Audio file size (${stats.size} bytes) exceeds chunk size (${config.chunkSize} bytes). Splitting...`);
  
  // Create directory for chunks
  const chunkDir = path.join(config.tempDir, 'chunks');
  await fs.ensureDir(chunkDir);
  
  // Get audio duration to calculate split points
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(new Error(`Failed to probe audio file: ${err.message}`));
      
      const duration = metadata.format.duration;
      const numChunks = Math.ceil(stats.size / config.chunkSize);
      const chunkDuration = duration / numChunks;
      
      const chunkPaths = [];
      let completedChunks = 0;
      
      // Create each chunk
      for (let i = 0; i < numChunks; i++) {
        const start = i * chunkDuration;
        const chunkPath = path.join(chunkDir, `chunk_${i}.mp3`);
        chunkPaths.push(chunkPath);
        
        ffmpeg(filePath)
          .setStartTime(start)
          .setDuration(chunkDuration)
          .output(chunkPath)
          .on('end', () => {
            completedChunks++;
            console.log(`Chunk ${i+1}/${numChunks} complete`);
            if (completedChunks === numChunks) {
              resolve(chunkPaths);
            }
          })
          .on('error', (err) => reject(new Error(`Failed to create chunk ${i+1}: ${err.message}`)))
          .run();
      }
    });
  });
}

module.exports = {
  downloadAndExtractAudio,
  splitAudioIfNeeded
};