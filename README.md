# YouTube & Audio Transcription Tool

A comprehensive Node.js tool for transcribing YouTube videos and audio files using OpenAI's Whisper API. This tool supports both YouTube video transcription and direct audio file transcription with batch processing capabilities.

## Features

### YouTube Transcription
- Download YouTube videos and extract audio
- Automatic audio chunking for large files (>25MB)
- Context-aware chunk processing
- Multiple output formats (TXT, JSON)

### Direct Audio Transcription
- Support for multiple audio formats (MP3, WAV, M4A, FLAC, AAC, OGG, WMA)
- Single file or batch processing
- Automatic file validation
- Separate output directory for audio transcriptions
- Retry logic with exponential backoff

## Installation

1. Clone or download this repository
2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```bash
OPENAI_API_KEY=your_openai_api_key_here
OUTPUT_DIR=./output
TEMP_DIR=./temp
WHISPER_MODEL=whisper-1
DEFAULT_LANGUAGE=en
MAX_RETRIES=3
RETRY_DELAY=1000
CHUNK_SIZE=25000000
```

## Usage

### YouTube Video Transcription

Transcribe a YouTube video:
```bash
npm start -- -u "https://www.youtube.com/watch?v=VIDEO_ID"
```

With custom options:
```bash
npm start -- -u "https://www.youtube.com/watch?v=VIDEO_ID" -l fr -t 0.5 --format json --keep-audio
```

**Options:**
- `-u, --url <url>`: YouTube video URL (required)
- `-o, --output <path>`: Output file path
- `-l, --language <code>`: Language code (default: en)
- `-t, --temperature <number>`: Temperature 0.0-1.0 (default: 0)
- `--keep-audio`: Keep downloaded audio files
- `--format <format>`: Output format - txt or json (default: txt)

### Direct Audio File Transcription

#### Single File Transcription
```bash
npm run audio -- -i /path/to/audio.mp3
```

With custom options:
```bash
npm run audio -- -i /path/to/audio.mp3 -o /path/to/output.txt -l es -t 0.3 --format json
```

#### Batch Processing
Process all audio files in a directory:
```bash
npm run audio -- -i /path/to/audio/directory --batch
```

With custom output directory:
```bash
npm run audio -- -i /path/to/audio/directory --batch -d /path/to/output/directory
```

**Options:**
- `-i, --input <path>`: Input audio file or directory (required)
- `-o, --output <path>`: Output file path (single file only)
- `-d, --output-dir <path>`: Output directory (default: ./audio_output)
- `-l, --language <code>`: Language code (default: en)
- `-t, --temperature <number>`: Temperature 0.0-1.0 (default: 0)
- `--format <format>`: Output format - txt or json (default: txt)
- `--batch`: Process all audio files in input directory
- `--keep-filename`: Keep original filename instead of adding timestamp

## Supported Audio Formats

- MP3 (.mp3)
- WAV (.wav)
- M4A (.m4a)
- FLAC (.flac)
- AAC (.aac)
- OGG (.ogg)
- WMA (.wma)

## Directory Structure

```
youtube_transcription/
├── audio_output/          # Output directory for audio transcriptions
├── downloads/             # Temporary YouTube downloads
├── output/                # Output directory for YouTube transcriptions
├── temp/                  # Temporary files
├── node_modules/          # Dependencies
├── audioIndex.js          # CLI for audio file transcription
├── audioProcessor.js      # Audio file validation and processing
├── audioTranscriber.js    # Audio transcription logic
├── config.js              # Configuration settings
├── index.js               # CLI for YouTube transcription
├── transcriber.js         # Core transcription logic
├── youtubeDownloader.js   # YouTube download and audio extraction
├── package.json           # Project configuration
└── README.md              # This file
```

## Configuration

The tool uses environment variables for configuration. Create a `.env` file with:

```env
OPENAI_API_KEY=your_api_key_here
OUTPUT_DIR=./output
TEMP_DIR=./temp
WHISPER_MODEL=whisper-1
DEFAULT_LANGUAGE=en
MAX_RETRIES=3
RETRY_DELAY=1000
CHUNK_SIZE=25000000
```

### Configuration Options

- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `OUTPUT_DIR`: Directory for YouTube transcription outputs
- `TEMP_DIR`: Directory for temporary files
- `WHISPER_MODEL`: Whisper model to use (default: whisper-1)
- `DEFAULT_LANGUAGE`: Default language code (default: en)
- `MAX_RETRIES`: Maximum retry attempts for failed requests
- `RETRY_DELAY`: Delay between retries in milliseconds
- `CHUNK_SIZE`: Maximum file size before chunking (in bytes)

## Error Handling

- Automatic retry logic with exponential backoff
- File validation before processing
- Detailed error messages and logging
- Graceful handling of large files through chunking

## Examples

### Example 1: Transcribe a YouTube Video
```bash
npm start -- -u "https://www.youtube.com/watch?v=dQw4w9WgXcQ" -l en --format json
```

### Example 2: Transcribe a Single Audio File
```bash
npm run audio -- -i ./my_audio.mp3 -l en --format txt
```

### Example 3: Batch Process Audio Files
```bash
npm run audio -- -i ./audio_files/ --batch -d ./transcriptions/
```

### Example 4: Transcribe with Custom Settings
```bash
npm run audio -- -i ./interview.wav -l es -t 0.5 --format json --keep-filename
```

## Troubleshooting

### Common Issues

1. **API Key Error**: Ensure your OpenAI API key is correctly set in the `.env` file
2. **File Not Found**: Check that the input file path is correct and the file exists
3. **Unsupported Format**: Ensure your audio file is in a supported format
4. **Large File Issues**: The tool automatically handles large files by chunking them
5. **Permission Errors**: Ensure you have write permissions for output directories

### File Size Limits

- OpenAI Whisper API has a 25MB file size limit
- Files larger than 25MB are automatically split into chunks
- Each chunk is processed separately and results are combined

## Dependencies

- `commander`: CLI argument parsing
- `dotenv`: Environment variable management
- `ffmpeg-static`: FFmpeg binary for audio processing
- `fluent-ffmpeg`: FFmpeg wrapper for Node.js
- `fs-extra`: Enhanced file system operations
- `openai`: OpenAI API client
- `ytdl-core`: YouTube video downloading

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues and questions, please check the troubleshooting section above or create an issue in the repository.
