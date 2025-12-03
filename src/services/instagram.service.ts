import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { transcribeAudioFile } from './transcription.service.js';

const execAsync = promisify(exec);

interface InstagramContent {
  caption: string;
  transcript?: string;
  url: string;
  type: 'post' | 'reel' | 'video';
  hasVideo: boolean;
}

export const extractInstagramContent = async (postUrl: string): Promise<InstagramContent> => {
  let tempDir: string | null = null;

  try {
    // Validate Instagram URL
    if (!postUrl.includes('instagram.com')) {
      throw new Error('Invalid Instagram URL');
    }

    // Create temporary directory for downloads
    tempDir = path.join(process.cwd(), 'uploads', `instagram-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    // Call Python script to download Instagram content
    const scriptPath = path.join(process.cwd(), 'scripts', 'instagram_downloader.py');
    const command = `python3 "${scriptPath}" "${postUrl}" "${tempDir}" 2>/dev/null`;

    const { stdout } = await execAsync(command, {
      timeout: 120000, // 120 second timeout (increased for video downloads)
    });

    // Parse the output from Python script (only the last line should be JSON)
    const lines = stdout.trim().split('\n');
    const jsonOutput = lines[lines.length - 1];
    const output = JSON.parse(jsonOutput);

    if (output.error) {
      throw new Error(output.error);
    }

    let transcript: string | undefined = undefined;

    // If there's a video, transcribe it
    if (output.has_video && output.video_path) {
      try {
        console.log(`Transcribing Instagram video: ${output.video_path}`);
        transcript = await transcribeAudioFile(output.video_path);
        console.log(`Transcription completed: ${transcript.substring(0, 100)}...`);
      } catch (transcriptionError) {
        console.error('Failed to transcribe video:', transcriptionError);
        // Continue without transcript rather than failing completely
        transcript = '[Transcription failed]';
      }
    }

    // Clean up temporary directory
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch((err) => {
        console.error('Failed to clean up temp directory:', err);
      });
    }

    return {
      caption: output.caption || '',
      transcript,
      url: postUrl,
      type: output.type || 'post',
      hasVideo: output.has_video || false,
    };
  } catch (error) {
    // Clean up on error
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {
        // Ignore cleanup errors
      });
    }

    console.error('Instagram extraction error:', error);
    throw new Error(`Failed to extract Instagram content: ${error}`);
  }
};
