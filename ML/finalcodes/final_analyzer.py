# this code will contain the finalized analyzer code 
from phonemizer import phonemize
from ML.finalcodes.final_perception import run as perception_run


def text_to_phonemes(text: str) -> list[str]:
    try:
        phoneme_str= phonemize(
            text=text,
            language="en-us",
            backend="espeak",# using espeak to convert the TRANSCRPIT TEXT to phoenem 
            strip=True,
            preserve_punctuation=False,
            with_stress=False,
        ).split()
        # splitting the whitespaces in the symbols 
        phonemes = [p for p in phoneme_str.split() if p]
        return phonemes
    except RuntimeError as e:
        print("An error occured :",str(e))
        return []

transcript=perception_run() 
#CONVERTING THE TARGET WORD TO PHONEMES
def analyzer():
    target=input("Enter the target word:")
   #coverting both target and tanscribed text to phonemes
    target_phonemes=text_to_phonemes(target)
    transcribed_phonemes=text_to_phonemes(transcript)



#creating a fallback function incase espeak is not installed
def fallback_phonemes(input_text):
      return input_text.lower()

#creating a comparing algorith to find the error 
def phoneme_errors(target_phonemes, attempt_phonemes):
    """
    Find phoneme errors using dynamic programming
    Returns: list of (error_type, position, details)
    """
    n, m = len(target_phonemes), len(attempt_phonemes)
    
    # DP table: dp[i][j] = min operations to transform target[:i] to attempt[:j]
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    
    # Initialize base cases
    for i in range(n + 1):
        dp[i][0] = i  # deletions
    for j in range(m + 1):
        dp[0][j] = j  # insertions
    
    # Fill DP table
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if target_phonemes[i-1] == attempt_phonemes[j-1]:
                dp[i][j] = dp[i-1][j-1]  # match, no cost
            else:
                dp[i][j] = 1 + min(
                    dp[i-1][j],      # deletion (omission)
                    dp[i][j-1],      # insertion
                    dp[i-1][j-1]     # substitution
                )
    
    # Backtrack to find actual errors
    errors = []
    i, j = n, m
    
    while i > 0 or j > 0:
        if i > 0 and j > 0 and target_phonemes[i-1] == attempt_phonemes[j-1]:
            i -= 1
            j -= 1
        elif i > 0 and j > 0 and dp[i][j] == dp[i-1][j-1] + 1:
            errors.append(('substitution', i-1, f'{target_phonemes[i-1]} → {attempt_phonemes[j-1]}'))
            i -= 1
            j -= 1
        elif i > 0 and dp[i][j] == dp[i-1][j] + 1:
            errors.append(('omission', i-1, f'missing {target_phonemes[i-1]}'))
            i -= 1
        else:
            errors.append(('insertion', j-1, f'extra {attempt_phonemes[j-1]}'))
            j -= 1
    
    return list(reversed(errors))




def run():
    print("Enter the Target word ")
    target_phonemes = text_to_phonemes(input())
    print("The transcrpit is beign converted to phoneme level")
    transcribed_phonemes = text_to_phonemes(transcript)
    
if __name__ == "__main__":
    run()
