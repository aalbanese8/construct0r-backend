#!/usr/bin/env python3
"""
YouTube Audio Downloader using yt-dlp
First tries to get auto-generated transcript, then falls back to audio download.
"""

import sys
import json
import os
from pathlib import Path
import re
import subprocess

try:
    import yt_dlp
except ImportError:
    print(json.dumps({
        "error": "yt-dlp not installed. Run: pip3 install yt-dlp"
    }))
    sys.exit(1)

try:
    from youtube_transcript_api import YouTubeTranscriptApi
    from youtube_transcript_api._errors import (
        TranscriptsDisabled,
        NoTranscriptFound,
        VideoUnavailable
    )
    TRANSCRIPT_API_AVAILABLE = True
except ImportError:
    TRANSCRIPT_API_AVAILABLE = False


def extract_video_id(url):
    """Extract YouTube video ID from URL"""
    patterns = [
        r'(?:v=|\/)([0-9A-Za-z_-]{11}).*',
        r'(?:embed\/)([0-9A-Za-z_-]{11})',
        r'^([0-9A-Za-z_-]{11})$'
    ]

    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


def compress_audio_if_needed(audio_path, max_size_mb=24):
    """
    Compress audio file if it exceeds max_size_mb using FFmpeg

    Args:
        audio_path: Path to the audio file
        max_size_mb: Maximum file size in MB (default 24MB for Whisper's 25MB limit with buffer)

    Returns:
        Path to the compressed file (or original if compression not needed)
    """
    file_size_mb = os.path.getsize(audio_path) / (1024 * 1024)

    if file_size_mb <= max_size_mb:
        # File is already small enough
        return audio_path

    # File is too large, compress it with lower bitrate
    compressed_path = audio_path.replace('.mp3', '_compressed.mp3')

    # Use progressively lower bitrates until file is small enough
    for bitrate in ['64k', '48k', '32k']:
        try:
            # Compress using FFmpeg
            subprocess.run([
                'ffmpeg', '-i', audio_path,
                '-b:a', bitrate,
                '-ar', '16000',  # Lower sample rate for speech
                '-ac', '1',       # Mono audio
                '-y',             # Overwrite output file
                compressed_path
            ], check=True, capture_output=True)

            # Check if compressed file is small enough
            compressed_size_mb = os.path.getsize(compressed_path) / (1024 * 1024)
            if compressed_size_mb <= max_size_mb:
                # Replace original with compressed version
                os.remove(audio_path)
                os.rename(compressed_path, audio_path)
                return audio_path

        except subprocess.CalledProcessError:
            continue

    # If we get here, even maximum compression didn't work
    # Return the most compressed version we have
    if os.path.exists(compressed_path):
        os.remove(audio_path)
        os.rename(compressed_path, audio_path)

    return audio_path


def get_auto_transcript(video_url):
    """
    Try to get auto-generated transcript from YouTube

    Returns:
        tuple: (success: bool, title: str, transcript: str)
    """
    if not TRANSCRIPT_API_AVAILABLE:
        return False, None, None

    try:
        video_id = extract_video_id(video_url)
        if not video_id:
            return False, None, None

        # Get transcript (prefers manual, falls back to auto-generated)
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id)

        # Combine all transcript segments
        transcript = ' '.join([segment['text'] for segment in transcript_list])

        # Get video title using yt-dlp
        with yt_dlp.YoutubeDL({'quiet': True, 'no_warnings': True}) as ydl:
            info = ydl.extract_info(video_url, download=False)
            title = info.get('title', 'Unknown Title')

        return True, title, transcript

    except (TranscriptsDisabled, NoTranscriptFound, VideoUnavailable):
        # No transcript available, will fall back to audio download
        return False, None, None
    except Exception as e:
        # Any other error, fall back to audio download
        return False, None, None


def download_youtube_audio(video_url, output_dir):
    """
    Download audio from YouTube video
    First tries to get auto-generated transcript (fast & free),
    then falls back to downloading audio for Whisper transcription.

    Args:
        video_url: YouTube video URL
        output_dir: Directory to save downloaded audio

    Returns:
        Dictionary with title and transcript/audio path
    """
    try:
        # STEP 1: Try to get auto-generated transcript first
        success, title, transcript = get_auto_transcript(video_url)

        if success:
            # Auto-transcript found! Return immediately without downloading
            result = {
                "title": title,
                "transcript": transcript,
                "audio_path": None,  # No audio file needed
                "source": "auto_transcript",
                "url": video_url,
            }
            print(json.dumps(result))
            return 0

        # STEP 2: No auto-transcript available, download audio for Whisper
        # Configure yt-dlp options (lower quality to stay under 25MB limit)
        ydl_opts = {
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '96',  # Lower quality for smaller files (fine for speech)
            }],
            'outtmpl': os.path.join(output_dir, '%(id)s.%(ext)s'),
            'quiet': True,
            'no_warnings': True,
            'noprogress': True,
            'no_color': True,
        }

        # Download video info and audio
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=True)

            video_id = info['id']
            title = info['title']

            # The audio file path after conversion
            audio_path = os.path.join(output_dir, f"{video_id}.mp3")

            # STEP 3: Compress audio if it exceeds Whisper's 25MB limit
            audio_path = compress_audio_if_needed(audio_path, max_size_mb=24)

            result = {
                "title": title,
                "audio_path": audio_path,
                "transcript": None,  # Will be transcribed by Whisper
                "source": "whisper",
                "duration": info.get('duration', 0),
                "url": video_url,
            }

            print(json.dumps(result))
            return 0

    except Exception as e:
        error_result = {
            "error": f"Failed to download YouTube audio: {str(e)}"
        }
        print(json.dumps(error_result))
        return 1


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(json.dumps({
            "error": "Usage: python3 youtube_downloader.py <video_url> <output_dir>"
        }))
        sys.exit(1)

    video_url = sys.argv[1]
    output_dir = sys.argv[2]

    # Create output directory if it doesn't exist
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    sys.exit(download_youtube_audio(video_url, output_dir))
