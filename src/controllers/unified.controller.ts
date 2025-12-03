import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import * as transcriptionService from '../services/transcription.service.js';
import * as instagramService from '../services/instagram.service.js';

/**
 * Unified transcribe endpoint that handles both YouTube and Instagram URLs
 */
export const unifiedTranscribeHandler = async (req: AuthRequest, res: Response) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Detect platform from URL
    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
    const isInstagram = url.includes('instagram.com');

    if (isYouTube) {
      // Handle YouTube
      const result = await transcriptionService.transcribeYouTubeVideo(url);
      return res.json({
        platform: 'youtube',
        title: result.title,
        text: result.transcript,
        url: url,
      });
    } else if (isInstagram) {
      // Handle Instagram
      const result = await instagramService.extractInstagramContent(url);

      // Combine caption and transcript into "text" field
      const text = result.hasVideo && result.transcript
        ? `${result.caption}\n\n[Video Transcript]\n${result.transcript}`
        : result.caption;

      return res.json({
        platform: 'instagram',
        text: text,
        title: result.caption?.substring(0, 100) || 'Instagram Post',
        hasVideo: result.hasVideo,
        type: result.type,
        url: url,
      });
    } else {
      return res.status(400).json({
        error: 'Unsupported platform. Please provide a YouTube or Instagram URL.',
      });
    }
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Transcription failed' });
  }
};
