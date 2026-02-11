# this code will contain the finalized analyzer code 
from phonemizer import phonemize
from final_perception import transcribe_audio


#CONVERTING THE TARGET WORD TO PHONEMES
def target_phoneme():
    target=input("Enter the target word:")
    phn = phonemize(target, language='en-us')


# using espeak to convert the TRANSCRPIT TEXT to phoenem 
def text_to_phonemes(transcript):
    try:
        phoneme_str= phonemize(
            transcript,
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

