# this code will contain the finalized analyzer code 
import nltk

try:
    nltk.download('averaged_perceptron_tagger_eng', quiet=True)
except Exception:
    pass
from g2p_en import G2p
from final_perception import run as perception_run
from sentence_transformers import SentenceTransformer, util 
from wordfreq import zipf_frequency

g2p = G2p()

def text_to_phonemes(text: str) -> list[str]:
    try:
        phonemes = g2p(text)

        # Remove spaces and punctuation tokens
        phonemes = [
        ''.join([c for c in p if not c.isdigit()])
        for p in phonemes
        if p.isalpha() or any(char.isdigit() for char in p)
    ]

        return phonemes

    except Exception as e:
        print("An error occurred:", str(e))
        return []

print("Loading Semantic Model.")
semantic_model = SentenceTransformer("all-MiniLM-L6-v2")
SEMANTIC_THRESHOLD=0.65

def _normalize_attempt_text(attempt):
    if isinstance(attempt, list):
        return " ".join(str(item) for item in attempt).strip()
    return str(attempt).strip() if attempt is not None else ""


def detect_semantic(target_word, attempt):
    """
classifeis lexical-level erors:1) neologistic 2) semantic 3) correct
    """
    attempt_text = _normalize_attempt_text(attempt)
    target_text = str(target_word).strip()

    if not attempt_text:
        return "No speech"
    #neologism 
    if zipf_frequency(attempt_text,"en")==0:
        return"Neologistic"
    #semantic similarity check 
    emb_t= semantic_model.encode(target_text,convert_to_tensor=True)
    emb_s= semantic_model.encode(attempt_text, convert_to_tensor=True)

    similarity=float(util.cos_sim(emb_t,emb_s))

    if similarity > SEMANTIC_THRESHOLD and attempt_text.lower() != target_text.lower():
        return "Semantic Paraphasia"
    if attempt_text.lower() == target_text.lower():
        return "Correct"    
    return "Phonological"

#creating a fallback function incase espeak is not installed
def fallback_phonemes(input_text):
      return input_text.lower()

def calculate_accuracy(target, attempt):
    """Calculate phoneme-level accuracy percentage"""
    if not target:
        return 0.0
    n, m = len(target), len(attempt)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    
    for i in range(n + 1):
        dp[i][0] = i
    for j in range(m + 1):
        dp[0][j] = j
    
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if target[i-1] == attempt[j-1]:
                dp[i][j] = dp[i-1][j-1]
            else:
                dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
    
    distance = dp[n][m]
    accuracy = ((max(n, m) - distance) / max(n, m)) * 100
    return round(accuracy, 2)


def run():
    """Main execution function - returns error report"""
    print("Enter the Target word: ")
    target_word = input().strip()

    transcript = perception_run()
    transcript_text = str(transcript).strip() if transcript is not None else ""
    
    print("Converting target word to phonemes...")
    target_phonemes = text_to_phonemes(target_word)
    
    print("Converting transcript to phonemes...")
    attempt = text_to_phonemes(transcript_text)
    
    print(f"\nTarget phonemes: {target_phonemes}")
    print(f"Transcribed phonemes: {attempt}\n")
    
    # Generate error report
    error_report = phoneme_errors(target_phonemes, attempt)
    
    # Semantic analysis
    semantic_error_type= detect_semantic(target_word, transcript_text)
    print (f"Semantic Classification:{semantic_error_type}")
    # Print report
    print("=" * 50)
    print("ERROR REPORT")
    print("=" * 50)
    print(f"Accuracy: {error_report['accuracy']}%")
    print(f"Total Errors: {error_report['total_errors']}")
    print(f"  - Substitutions: {error_report['error_summary']['substitutions']}")
    print(f"  - Omissions: {error_report['error_summary']['omissions']}")
    print(f"  - Insertions: {error_report['error_summary']['insertions']}")
    print("\nDetailed Errors:")
    for i, error in enumerate(error_report['errors'], 1):
        print(f"  {i}. {error['type'].upper()}: {error['description']}")
    print("=" * 50)
    
    # Generate feedback
    try:
        from final_reasoning import generate_feedback, print_feedback, generate_practice_exercise
        
        print("\nGenerating personalized feedback...")
        patient_name = input("Enter patient name (or press Enter for 'friend'): ").strip() or "friend"
        
        # Generate feedback
        feedback = generate_feedback(
            error_report=error_report,
            target_word=target_word,
            patient_name=patient_name
        )
        
        # Display feedback
        print_feedback(feedback)
        
        # Generate practice exercise
        exercise = generate_practice_exercise(error_report, target_word)
        print("PRACTICE EXERCISE:")
        print(exercise)
        print()
        
    except ImportError:
        print("\n✗ Feedback module not available. Install with: pip install openai")
    except Exception as e:
        print(f"\n✗ Error generating feedback: {str(e)}")
    
    return error_report
def phoneme_errors(target_phonemes, attempt_phonemes):
    """
    Find phoneme errors using dynamic programming
    Returns: structured error report dict
    """
    n, m = len(target_phonemes), len(attempt_phonemes)
    
    # DP table
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    
    # Initialize base cases
    for i in range(n + 1):
        dp[i][0] = i
    for j in range(m + 1):
        dp[0][j] = j
    
    # Fill DP table
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if target_phonemes[i-1] == attempt_phonemes[j-1]:
                dp[i][j] = dp[i-1][j-1]
            else:
                dp[i][j] = 1 + min(
                    dp[i-1][j],
                    dp[i][j-1],
                    dp[i-1][j-1]
                )
    
    # Backtrack to find actual errors
    errors = []
    i, j = n, m
    
    while i > 0 or j > 0:
        if i > 0 and j > 0 and target_phonemes[i-1] == attempt_phonemes[j-1]:
            i -= 1
            j -= 1
        elif i > 0 and j > 0 and dp[i][j] == dp[i-1][j-1] + 1:
            errors.append({
                'type': 'substitution',
                'position': i-1,
                'target_phoneme': target_phonemes[i-1],
                'actual_phoneme': attempt_phonemes[j-1],
                'description': f'{target_phonemes[i-1]} → {attempt_phonemes[j-1]}'
            })
            i -= 1
            j -= 1
        elif i > 0 and dp[i][j] == dp[i-1][j] + 1:
            errors.append({
                'type': 'omission',
                'position': i-1,
                'target_phoneme': target_phonemes[i-1],
                'actual_phoneme': None,
                'description': f'missing {target_phonemes[i-1]}'
            })
            i -= 1
        else:
            errors.append({
                'type': 'insertion',
                'position': j-1,
                'target_phoneme': None,
                'actual_phoneme': attempt_phonemes[j-1],
                'description': f'extra {attempt_phonemes[j-1]}'
            })
            j -= 1
    
    errors = list(reversed(errors))
    
    # CREATE ERROR REPORT HERE
    error_report = {
        'target_phonemes': target_phonemes,
        'attempt_phonemes': attempt_phonemes,
        'total_errors': len(errors),
        'accuracy': calculate_accuracy(target_phonemes, attempt_phonemes),
        'errors': errors,
        'error_summary': {
            'substitutions': sum(1 for e in errors if e['type'] == 'substitution'),
            'omissions': sum(1 for e in errors if e['type'] == 'omission'),
            'insertions': sum(1 for e in errors if e['type'] == 'insertion')
        }
    }
    
    return error_report

if __name__ == "__main__":
    run()
