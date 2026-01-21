import yt_dlp
import sys
import os

# --- CONFIGURATION ---
# Since you added aliases, FFMPEG_PATH can likely stay empty.
# If it still fails, put the full path to the .exe here.
FFMPEG_PATH = "C:\Users\USER\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.0.1-full_build\bin" 

def download_youtube_audio(url, output_filename='speech_sample'):
    # Clean the URL to ensure no markdown or brackets interfere
    url = url.replace('[', '').replace(']', '').split(' ')[0].strip()
    
    print(f"--- INITIALIZING EXTRACTION ---")
    print(f"Target URL: {url}")

    ydl_opts = {
        'format': 'bestaudio/best',
        'verbose': True,
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'wav',
            'preferredquality': '192',
        }],
        'outtmpl': f'{output_filename}.%(ext)s',
    }

    # If you explicitly provide a path, we use it. 
    # Otherwise, yt-dlp will now look for the 'ffmpeg' alias you created.
    if FFMPEG_PATH:
        ydl_opts['ffmpeg_location'] = FFMPEG_PATH
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            print("Status: Downloading and Converting...")
            ydl.download([url])
            print(f"\nSUCCESS: Created {output_filename}.wav")
            
    except Exception as e:
        print(f"\n--- SCRIPT ERROR ---")
        print(f"Details: {e}")
        print("\nPossible Solution: If it says 'ffmpeg not found', restart your terminal.")

if __name__ == "__main__":
    # Standard URL for the Broca's Aphasia video
    video_url = "https://www.youtube.com/watch?v=RMa9BVpJkYQ"
    download_youtube_audio(video_url, "brocas_patient_01")