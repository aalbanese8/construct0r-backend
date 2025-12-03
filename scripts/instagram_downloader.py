#!/usr/bin/env python3
"""
Instagram Content Extractor using Instaloader
This script extracts captions, downloads videos, and returns video paths for transcription.
"""

import sys
import json
import os
from pathlib import Path
import glob

try:
    import instaloader
except ImportError:
    print(json.dumps({
        "error": "Instaloader not installed. Run: pip3 install instaloader"
    }))
    sys.exit(1)


def extract_instagram_content(post_url, output_dir):
    """
    Extract caption and download video from Instagram post

    Args:
        post_url: Instagram post URL
        output_dir: Directory to save downloaded content

    Returns:
        Dictionary with caption, metadata, and video path
    """
    try:
        # Initialize Instaloader with video downloads enabled
        loader = instaloader.Instaloader(
            dirname_pattern=output_dir,
            filename_pattern="{shortcode}",
            download_pictures=False,
            download_videos=True,  # Enable video downloads
            download_video_thumbnails=False,
            download_geotags=False,
            download_comments=False,
            save_metadata=False,
            compress_json=False,
            post_metadata_txt_pattern="",  # Don't save txt files
        )

        # Extract shortcode from URL
        # URLs are typically: https://www.instagram.com/p/SHORTCODE/ or /reel/SHORTCODE/
        shortcode = None
        if '/p/' in post_url:
            shortcode = post_url.split('/p/')[1].split('/')[0]
        elif '/reel/' in post_url:
            shortcode = post_url.split('/reel/')[1].split('/')[0]
        else:
            raise ValueError("Invalid Instagram URL format")

        # Get post
        post = instaloader.Post.from_shortcode(loader.context, shortcode)

        # Determine post type
        post_type = 'post'
        has_video = False
        if post.is_video:
            post_type = 'video'
            has_video = True
        if '/reel/' in post_url:
            post_type = 'reel'
            has_video = True

        # Extract caption
        caption = post.caption or ""

        # Get additional metadata
        likes = post.likes
        comments = post.comments
        date = post.date_local.isoformat()

        # Download the post (video if it's a video)
        video_path = None
        if has_video:
            try:
                loader.download_post(post, target=output_dir)

                # Find the downloaded video file
                video_files = glob.glob(os.path.join(output_dir, f"{shortcode}.mp4"))
                if video_files:
                    video_path = video_files[0]
            except Exception as e:
                # If download fails, continue without video
                print(f"Warning: Failed to download video: {str(e)}", file=sys.stderr)

        # Return data as JSON
        result = {
            "caption": caption,
            "type": post_type,
            "has_video": has_video,
            "video_path": video_path,
            "likes": likes,
            "comments": comments,
            "date": date,
            "url": post_url,
        }

        print(json.dumps(result))
        return 0

    except Exception as e:
        error_result = {
            "error": f"Failed to extract Instagram content: {str(e)}"
        }
        print(json.dumps(error_result))
        return 1


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(json.dumps({
            "error": "Usage: python3 instagram_downloader.py <post_url> <output_dir>"
        }))
        sys.exit(1)

    post_url = sys.argv[1]
    output_dir = sys.argv[2]

    # Create output directory if it doesn't exist
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    sys.exit(extract_instagram_content(post_url, output_dir))
