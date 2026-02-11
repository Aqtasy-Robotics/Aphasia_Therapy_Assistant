# this code will contain the finalized analyzer code 
from phonemizer import phonemize
from final_perception import transcribe_audio

# using espeak to convert the text to phoenem 

def text_to_phonemes(transcript):
    try:
        phoneme_str= phonemize(
            text,
            language="en-us",
            backend="espeak",
            strip=True,
            preserve_punctuation=False,
            with_stress=False,
        ).split()
        # splitting the whitespaces in the symbols 
        phonemes = [p for p in phoneme_str.split() if p]
        return phonemes
    except RuntimeError as e:
        print("An error occured :",str(e))

