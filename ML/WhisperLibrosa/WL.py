import pyaudio
import wave
from openai import OpenAI
import librosa
import soundfile as sf
import os


CHUNK = 1024
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 16000  #
RECORD_SECONDS = 5  
class RealtimeMicTranscriberAPI:
    def __init__(self, api_key=None):
        
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        
        if not self.api_key:
            raise ValueError(
                "No API key provided! Either:\n"
                "1. Pass api_key='your-key-here' when creating the transcriber, or\n"
                "2. Set environment variable: export OPENAI_API_KEY='your-key-here'"
            )
        
        self.client = OpenAI(api_key=self.api_key)
        self.audio = pyaudio.PyAudio()
        self.is_recording = False
        
    def record_audio(self, duration=RECORD_SECONDS):
        print(f" Recording for {duration} seconds...")
        
        stream = self.audio.open(
            format=FORMAT,
            channels=CHANNELS,
            rate=RATE,
            input=True,
            frames_per_buffer=CHUNK
        )
        
        frames = []
        for i in range(0, int(RATE / CHUNK * duration)):
            data = stream.read(CHUNK)
            frames.append(data)
        
        stream.stop_stream()
        stream.close()
        
        print("Recording complete!")
        return frames
    
    def save_audio(self, frames, filename="temp_recording.wav"):
        wf = wave.open(filename, 'wb')
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(self.audio.get_sample_size(FORMAT))
        wf.setframerate(RATE)
        wf.writeframes(b''.join(frames))
        wf.close()
        return filename
    
    def remove_silence(self, audio_file):
        y, sr = librosa.load(audio_file, sr=None)
        yt, _ = librosa.effects.trim(y, top_db=30)
        
        cleaned_file = "audio_no_silence.wav"
        sf.write(cleaned_file, yt, sr)
        return cleaned_file
    
    def transcribe_with_api(self, audio_file):
       
        
        with open(audio_file, "rb") as audio:
            transcript = self.client.audio.transcriptions.create(
                model="whisper-1",  
                file=audio,
                language="en",
                response_format="text"
            )
        
        return transcript
    
    def remove_repetitions(self, text):
        words = text.split()
        cleaned = []
        
        for word in words:
            if len(cleaned) == 0 or word.lower() != cleaned[-1].lower():
                cleaned.append(word)
        
        return " ".join(cleaned)
    
    def remove_sentence_repetition(self, text):
        sentences = text.split(". ")
        seen = set()
        result = []
        
        for s in sentences:
            if s.lower() not in seen:
                seen.add(s.lower())
                result.append(s)
        
        return ". ".join(result)
    
    def process_and_transcribe(self, frames):
        temp_file = self.save_audio(frames)
        
        cleaned_file = self.remove_silence(temp_file)
        
        text = self.transcribe_with_api(cleaned_file)
        
        clean_text = self.remove_repetitions(text)
        final_text = self.remove_sentence_repetition(clean_text)
        
        return final_text
    
    def continuous_recording(self, duration=RECORD_SECONDS):
        print("\n🎙️  Real-time Microphone Transcription (API Mode)")
        print("Press Ctrl+C to stop\n")
        
        self.is_recording = True
        
        try:
            while self.is_recording:
                frames = self.record_audio(duration)
                
                transcription = self.process_and_transcribe(frames)
                
                
                print(f"📝 Transcription: {transcription}")
                
                
        except KeyboardInterrupt:
            print(" Stopping transcription...")
            self.is_recording = False
    
    def record_once(self, duration=RECORD_SECONDS):
        frames = self.record_audio(duration)
        transcription = self.process_and_transcribe(frames)
        print(f"\n📝 Transcription: {transcription}\n")
        return transcription
    
    def cleanup(self):
        self.audio.terminate()


def main():
    
    api_key = input("Enter your OpenAI API key (or press Enter to use env variable): ").strip()
    
    if not api_key:
        api_key = None  
    
    try:
        transcriber = RealtimeMicTranscriberAPI(api_key=api_key)
        
        print("Choose mode:")
        print("1. Single recording (record once and transcribe)")
        print("2. Continuous mode (keep recording and transcribing)")
        
        choice = input("\nEnter choice (1 or 2): ").strip()
        
        if choice == "1":
            duration = input("Recording duration in seconds (default 5): ").strip()
            duration = int(duration) if duration else 5
            transcriber.record_once(duration)
        else:
            duration = input("Recording duration per chunk in seconds (default 5): ").strip()
            duration = int(duration) if duration else 5
            transcriber.continuous_recording(duration)
        
        transcriber.cleanup()
        
    except ValueError as e:
        print(f" Error: {e}")
       


if __name__ == "__main__":
    main()