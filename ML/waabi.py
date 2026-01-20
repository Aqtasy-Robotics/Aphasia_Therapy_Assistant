import sounddevice as sd
import soundfile as sf
import numpy as np
import os
from groq import Groq
import time
from dotenv import load_dotenv

class AphasisSpeechCorrectionAgent:
    def __init__(self, api_key=None, aphasia_mode=True):
        """
        Initialize the speech correction agent optimized for Aphasia speech.
        
        Args:
            api_key: Groq API key (or set GROQ_API_KEY env variable)
            aphasia_mode: Enable special handling for Aphasia speech patterns
        """
        self.client = Groq(api_key=api_key or os.environ.get("waabi_py"))
        self.aphasia_mode = aphasia_mode
        
        # Audio recording settings optimized for Aphasia
        self.sample_rate = 16000  # 16kHz is optimal for Whisper
        self.channels = 1  # Mono audio
        self.record_seconds = 10  # Longer default for Aphasia speakers
        self.temp_audio_file = "temp_audio.wav"
        
    def record_audio(self, duration=None, show_countdown=True):
        """
        Record audio with visual feedback for Aphasia speakers.
        
        Args:
            duration: Recording duration in seconds
            show_countdown: Show countdown timer during recording
            
        Returns:
            str: Path to saved audio file or None if failed
        """
        if duration is None:
            duration = self.record_seconds
            
        try:
            print("🎤 Recording will start in 3 seconds...")
            print("Take your time and speak naturally.")
            time.sleep(3)
            print("\n🔴 RECORDING NOW! Speak whenever you're ready...")
            
            # Record audio
            recording = sd.rec(
                int(duration * self.sample_rate),
                samplerate=self.sample_rate,
                channels=self.channels,
                dtype='int16'
            )
            
            # Show countdown during recording
            if show_countdown:
                for remaining in range(duration, 0, -1):
                    print(f"⏱️  {remaining} seconds remaining...", end='\r')
                    time.sleep(1)
            else:
                sd.wait()  # Wait until recording is finished
            
            sd.wait()  # Ensure recording is complete
            print("\n✅ Recording finished!                    ")
            
            # Save to WAV file
            sf.write(self.temp_audio_file, recording, self.sample_rate)
            
            return self.temp_audio_file
            
        except Exception as e:
            print(f"❌ Error recording audio: {e}")
            print("\n💡 Troubleshooting tips:")
            print("   - Check if your microphone is connected")
            print("   - Make sure no other app is using the microphone")
            print("   - Try running: python -m sounddevice")
            return None
    
    def transcribe_with_whisper(self, audio_file):
        """
        Transcribe audio using Groq's Whisper with Aphasia-optimized settings.
        
        Args:
            audio_file: Path to audio file
            
        Returns:
            dict: Transcription data including text and metadata
        """
        try:
            print("⏳ Transcribing with Whisper (optimized for speech difficulties)...")
            
            with open(audio_file, "rb") as file:
                # Use verbose_json to get word-level timestamps and confidence
                transcription = self.client.audio.transcriptions.create(
                    file=(audio_file, file.read()),
                    model="whisper-large-v3-turbo",
                    response_format="verbose_json",
                    language="en",  # Specify language for better accuracy
                    temperature=0.0  # More deterministic for clearer speech patterns
                )
            
            text = transcription.text
            print(f"📝 Transcribed: '{text}'")
            
            return {
                "text": text,
                "full_data": transcription
            }
            
        except Exception as e:
            print(f"❌ Transcription error: {e}")
            return None
    
    def analyze_aphasia_speech(self, transcription_data):
        """
        Analyze speech with special consideration for Aphasia patterns.
        
        Args:
            transcription_data: Dict containing transcribed text and metadata
            
        Returns:
            dict: Contains analysis, corrections, and Aphasia-specific feedback
        """
        text = transcription_data["text"]
        
        # Enhanced prompt for Aphasia speech understanding
        prompt = f"""You are analyzing speech from someone who may have Aphasia, a language disorder that affects speech production and comprehension. Be patient, supportive, and focus on understanding their intended meaning.

Common Aphasia speech patterns to recognize:
- Word-finding difficulties (paraphasias, circumlocution)
- Grammatical errors (agrammatism, telegraphic speech)
- Sound substitutions or omissions
- Repetitions or self-corrections
- Incomplete sentences or fragments
- Use of gestures or filler words

Transcribed speech: "{text}"

Please provide:

1. **Intended Meaning**: What you understand the person is trying to communicate (be generous in interpretation)

2. **Speech Patterns Observed**: Identify any Aphasia-related patterns present

3. **Corrected/Clarified Version**: A grammatically correct version that maintains their intended meaning

4. **Supportive Feedback**: 
   - Acknowledge what was communicated successfully
   - Gently suggest alternative ways to express difficult words or phrases
   - Provide encouragement

5. **Communication Strategies**: Practical tips for expressing this idea more easily next time

Be compassionate, never condescending. Focus on successful communication rather than errors. If the speech is unclear, acknowledge the effort and ask clarifying questions the person could consider."""

        try:
            print("🧠 Analyzing speech patterns with Aphasia awareness...")
            
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": """You are a compassionate speech-language pathologist specializing in Aphasia rehabilitation. Your goal is to:
1. Understand the speaker's intended message despite speech difficulties
2. Provide supportive, encouraging feedback
3. Suggest practical communication strategies
4. Never make the speaker feel inadequate
5. Celebrate successful communication attempts

Be patient, understanding, and focus on what WAS communicated rather than what wasn't."""
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                model="llama-3.3-70b-versatile",
                temperature=0.4,  # Slightly higher for more empathetic responses
                max_tokens=1500,  # More tokens for detailed supportive feedback
            )
            
            analysis = chat_completion.choices[0].message.content
            return {
                "original": text,
                "analysis": analysis,
                "success": True,
                "aphasia_optimized": True
            }
            
        except Exception as e:
            return {
                "original": text,
                "analysis": f"Error analyzing text: {e}",
                "success": False
            }
    
    def test_microphone(self):
        """Test if microphone is working properly."""
        print("\n🎤 Testing microphone...")
        print("Available audio devices:")
        print(sd.query_devices())
        
        print("\n🔴 Recording 3 seconds for test...")
        try:
            test_recording = sd.rec(
                int(3 * self.sample_rate),
                samplerate=self.sample_rate,
                channels=self.channels,
                dtype='int16'
            )
            sd.wait()
            
            # Check if we captured any sound
            if np.max(np.abs(test_recording)) > 100:
                print("✅ Microphone is working! Sound detected.")
                return True
            else:
                print("⚠️  Microphone detected but no sound captured.")
                print("   Try speaking louder or check microphone settings.")
                return False
                
        except Exception as e:
            print(f"❌ Microphone test failed: {e}")
            return False
    
    def run_interactive_session(self, recording_duration=10):
        """
        Run an Aphasia-friendly interactive session.
        
        Args:
            recording_duration: Duration in seconds for each recording
        """
        self.record_seconds = recording_duration
        
        print("\n" + "="*70)
        print("🤖 Aphasia-Aware Speech Analysis Agent")
        print("="*70)
        print("🎙️  Perception: Whisper (Groq) - Optimized for speech variations")
        print("🧠 Reasoning: LLM (Groq) - Aphasia-aware analysis")
        print("="*70)
        print(f"⏱️  Recording duration: {recording_duration} seconds per session")
        print("💡 Take your time - there's no rush!")
        print("🛑 Press Ctrl+C anytime to exit\n")
        
        # Test microphone first
        test = input("Would you like to test your microphone first? (y/n): ")
        if test.lower() == 'y':
            self.test_microphone()
            input("\nPress Enter to continue...")
        
        session_count = 0
        
        try:
            while True:
                session_count += 1
                print(f"\n{'='*70}")
                print(f"Session #{session_count}")
                print(f"{'='*70}\n")
                
                # Record audio with countdown
                audio_file = self.record_audio()
                
                if audio_file:
                    # Transcribe with Whisper
                    transcription_data = self.transcribe_with_whisper(audio_file)
                    
                    if transcription_data and transcription_data["text"].strip():
                        # Analyze with Aphasia awareness
                        result = self.analyze_aphasia_speech(transcription_data)
                        
                        if result["success"]:
                            print("\n" + "="*70)
                            print("📊 ANALYSIS & SUPPORTIVE FEEDBACK:")
                            print("="*70)
                            print(result["analysis"])
                            print("="*70 + "\n")
                        else:
                            print(f"❌ Error: {result['analysis']}\n")
                    else:
                        print("⚠️  No speech detected or transcription was empty.")
                        print("💡 This is okay! Try again when you're ready.\n")
                    
                    # Clean up temp audio file
                    if os.path.exists(audio_file):
                        os.remove(audio_file)
                
                print("\n" + "─"*70)
                input("✅ Press Enter when you're ready for the next session (or Ctrl+C to exit)...")
                
        except KeyboardInterrupt:
            print("\n\n" + "="*70)
            print(f"👋 Session ended. You completed {session_count} session(s).")
            print("Great work! Keep practicing!")
            print("="*70)
            
            # Clean up temp file on exit
            if os.path.exists(self.temp_audio_file):
                os.remove(self.temp_audio_file)
    
    def analyze_single_speech(self, recording_duration=10):
        """
        Record and analyze a single speech input with Aphasia awareness.
        
        Args:
            recording_duration: Duration in seconds for recording
            
        Returns:
            dict: Analysis result
        """
        self.record_seconds = recording_duration
        
        print(f"\n⏱️  Recording for {recording_duration} seconds...")
        audio_file = self.record_audio()
        
        if audio_file:
            transcription_data = self.transcribe_with_whisper(audio_file)
            
            if transcription_data and transcription_data["text"].strip():
                result = self.analyze_aphasia_speech(transcription_data)
                
                # Clean up temp audio file
                if os.path.exists(audio_file):
                    os.remove(audio_file)
                
                return result
            else:
                print("⚠️  No speech detected.")
        
        return {"success": False, "analysis": "Failed to record or transcribe audio"}


# Example usage
if __name__ == "__main__":
    # Make sure to set your GROQ_API_KEY environment variable
    # export GROQ_API_KEY='your-groq-api-key-here'
    
    print("""
╔═══════════════════════════════════════════════════════════════════╗
║         Aphasia-Aware Speech Correction Agent                     ║
║                                                                   ║
║  This agent is designed to understand and support individuals     ║
║  with Aphasia. It provides patient, encouraging feedback.         ║
╚═══════════════════════════════════════════════════════════════════╝
    """)
    
    # Interactive session with Aphasia-optimized settings
    agent = AphasisSpeechCorrectionAgent(aphasia_mode=True)
    agent.run_interactive_session(recording_duration=10)
    
    # Single analysis option (uncomment to use)
    # agent = AphasisSpeechCorrectionAgent(aphasia_mode=True)
    # result = agent.analyze_single_speech(recording_duration=10)
    # if result["success"]:
    #     print("\n📊 Analysis:")
    #     print(result["analysis"])