import sounddevice as sd
from groq import Groq
import os

print("Testing imports...")
print("✅ sounddevice imported")
print("✅ groq imported")

# Test API key
api_key = os.environ.get("GROQ_API_KEY")
if api_key:
    print(f"✅ API key found: {api_key[:10]}...")
else:
    print("❌ API key not found! Set GROQ_API_KEY environment variable")

# Test microphone
print("\n🎤 Available audio devices:")
print(sd.query_devices())