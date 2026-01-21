import streamlit as st
import torch
import numpy as np
import sounddevice as sd
from groq import Groq
import queue
import sys

# --- CONFIGURATION ---
# Updated with your specific API key
GROQ_API_KEY = "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" 
client = Groq(api_key=GROQ_API_KEY)

# --- SILERO VAD SETUP ---
# We load the model once and cache it for performance
@st.cache_resource
def load_vad_model():
    try:
        model, utils = torch.hub.load(repo_or_dir='snakers4/silero-vad',
                                      model='silero_vad',
                                      force_reload=False,
                                      trust_repo=True)
        return model, utils
    except Exception as e:
        st.error(f"Failed to load VAD model: {e}")
        return None, None

model, utils = load_vad_model()

# --- AUDIO CAPTURE CONFIG ---
SAMPLING_RATE = 16000 # Silero VAD requires 16000Hz or 8000Hz
CHUNK_SIZE = 512      # Number of samples per chunk

# --- STREAMLIT UI ---
st.set_page_config(page_title="Voca AI - Aphasia Assistant", page_icon="🤖")
st.title("🤖 Voca AI: Aphasia Therapy Assistant")
st.markdown("This interface uses **Silero VAD** to detect your voice and **Groq** to provide therapeutic responses.")

if "messages" not in st.session_state:
    st.session_state.messages = []

# Display chat history
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

def process_audio_and_chat(user_text):
    """Handles the Groq API call and UI update"""
    st.session_state.messages.append({"role": "user", "content": user_text})
    with st.chat_message("user"):
        st.markdown(user_text)

    with st.chat_message("assistant"):
        response_placeholder = st.empty()
        full_response = ""
        
        try:
            stream = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": "You are a helpful chatbot with vast knowledge about Aphasia. Provide supportive, therapeutic feedback."},
                    {"role": "user", "content": user_text}
                ],
                stream=True
            )
            
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    full_response += chunk.choices[0].delta.content
                    response_placeholder.markdown(full_response + "▌")
            
            response_placeholder.markdown(full_response)
        except Exception as e:
            st.error(f"Groq API Error: {e}")
    
    st.session_state.messages.append({"role": "assistant", "content": full_response})

# --- VAD RECORDING LOGIC ---
st.sidebar.header("Audio Settings")
is_recording = st.sidebar.button("🎤 Start Listening (VAD Active)")

if is_recording:
    if model is None:
        st.sidebar.error("VAD Model not loaded.")
    else:
        st.info("Listening... Speak now. (The VAD will detect your voice)")
        
        audio_queue = queue.Queue()

        def callback(indata, frames, time, status):
            if status:
                print(status, file=sys.stderr)
            audio_queue.put(indata.copy())

        try:
            with sd.InputStream(samplerate=SAMPLING_RATE, channels=1, callback=callback, blocksize=CHUNK_SIZE):
                # Small loop to demonstrate detection
                for _ in range(100): 
                    audio_chunk = audio_queue.get()
                    audio_tensor = torch.from_numpy(audio_chunk).float().squeeze()
                    
                    # VAD confidence score
                    speech_prob = model(audio_tensor, SAMPLING_RATE).item()
                    
                    if speech_prob > 0.5:
                        st.sidebar.success(f"Voice Detected! (Conf: {speech_prob:.2f})")
                    else:
                        st.sidebar.text("Silence...")
        except Exception as e:
            st.error(f"Audio Error: {e}. Ensure your microphone is connected and permissions are granted.")

# Fallback text input for the UI
if prompt := st.chat_input("Type your practice word or question here..."):
    process_audio_and_chat(prompt)