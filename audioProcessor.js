const fs = require('fs-extra');
const path = require('path');

class AudioProcessor {
  static supportedFormats = ['.mp3', '.wav', '.m4a', '.flac', '.aac', '.ogg', '.wma'];

  static async validateAudioFile(filePath) {
    if (!await fs.pathExists(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    const ext = path.extname(filePath).toLowerCase();
    if (!this.supportedFormats.includes(ext)) {
      throw new Error(`Unsupported audio format: ${ext}. Supported formats: ${this.supportedFormats.join(', ')}`);
    }

    const stats = await fs.stat(filePath);
    if (stats.size === 0) {
      throw new Error('Audio file is empty');
    }

    return {
      path: filePath,
      name: path.basename(filePath, ext),
      extension: ext,
      size: stats.size,
      sizeMB: (stats.size / (1024 * 1024)).toFixed(2)
    };
  }

  static generateOutputPath(inputPath, outputDir, format = 'txt') {
    const inputName = path.basename(inputPath, path.extname(inputPath));
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return path.join(outputDir, `${inputName}_${timestamp}.${format}`);
  }

  static async ensureOutputDirectory(outputDir) {
    await fs.ensureDir(outputDir);
  }

  static async getAudioFilesFromDirectory(dirPath) {
    if (!await fs.pathExists(dirPath)) {
      throw new Error(`Directory does not exist: ${dirPath}`);
    }

    const files = await fs.readdir(dirPath);
    const audioFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return this.supportedFormats.includes(ext);
    });

    return audioFiles.map(file => path.join(dirPath, file));
  }
}

module.exports = AudioProcessor;
