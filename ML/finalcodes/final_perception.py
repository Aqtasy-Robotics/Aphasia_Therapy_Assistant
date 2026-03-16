import os 
import tempfile
import sounddevice as sd 
import soundfile as sf
import numpy as np
from dotenv import load_dotenv
from groq import Groq 

# loadin the values from the .env file 
load_dotenv()

API_KEY = os.getenv("GROQ_API") # getting the openai api key from the .env file
if not API_KEY:
    raise ValueError("OPENAI_API key is not set in the environment variables. Please set it in the .env file.")

client= Groq(api_key=API_KEY) # setting up the openai key 

SAMPLE_RATE = int(os.getenv("SAMPLE_RATE", 16000))
RECORD_SECONDS  = int(os.getenv("RECORD_SECONDS", 8))

# creating a function for recording the auido using the Mic

def record_audio():
    print("......🎤 Start Speaking now .......")
    audio = sd.rec(
        int(RECORD_SECONDS * SAMPLE_RATE),
        samplerate=SAMPLE_RATE, #
        channels=1,#
        dtype="float32", #
    )
    sd.wait() #blocks the execution of your Python script until a background audio task (playing or recording) is finished. 

    audio = audio.squeeze() # used to convert 3d tensor to 2d tensor

    with tempfile.NamedTemporaryFile(delete=False,suffix=".wav") as temp_file: # creating a temporary file to save the recorded audio
        sf.write(temp_file.name , audio, SAMPLE_RATE ) #
        return temp_file.name

# using whisper to transcribe the saved auido .WAV file 
def transcribe_audio(file_path):
    with open(file_path,"rb") as audio_file:
        transcript = client.audio.transcriptions.create(
            model="whisper-large-v3",
            file=audio_file,
            language="en",
        )
        return transcript.text.strip().lower()

# main menu 
def run():
    text = ""
    audio_path = None
    try:
        audio_path = record_audio()
        print("The Audio is beign transcribed.....")
        text = transcribe_audio(audio_path)
        print("transcription is :::",text)
    except Exception as e:
        print("An error occurred:", str(e))
    finally:
        if audio_path and os.path.exists(audio_path):
            try:
                os.remove(audio_path)
            except OSError:
                pass
    return text

if __name__ == "__main__":
    run()