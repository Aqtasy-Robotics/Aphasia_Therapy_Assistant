"""
nodes/phoneme_node.py — **state bug FIXED.
Returns only the keys this node actually changes.
All original logic unchanged.
"""

from __future__ import annotations

import nltk
try:
    nltk.download("averaged_perceptron_tagger_eng", quiet=True)
except Exception:
    pass

from g2p_en import G2p
from sentence_transformers import SentenceTransformer, util
from wordfreq import zipf_frequency

from state import SpeechTherapyState

_g2p = G2p()
print("Loading Semantic Model...")
_semantic_model    = SentenceTransformer("all-MiniLM-L6-v2")
SEMANTIC_THRESHOLD = 0.65


def text_to_phonemes(text: str) -> list[str]:
    try:
        phonemes = _g2p(text)
        return [
            "".join([c for c in p if not c.isdigit()])
            for p in phonemes
            if p.isalpha() or any(char.isdigit() for char in p)
        ]
    except Exception as e:
        print("phoneme error:", str(e))
        return []


def _normalize_attempt_text(attempt) -> str:
    if isinstance(attempt, list):
        return " ".join(str(i) for i in attempt).strip()
    return str(attempt).strip() if attempt is not None else ""


def detect_semantic(target_word: str, attempt) -> str:
    attempt_text = _normalize_attempt_text(attempt)
    target_text  = str(target_word).strip()
    if not attempt_text:
        return "No speech"
    if zipf_frequency(attempt_text, "en") == 0:
        return "Neologistic"
    emb_t      = _semantic_model.encode(target_text,  convert_to_tensor=True)
    emb_s      = _semantic_model.encode(attempt_text, convert_to_tensor=True)
    similarity = float(util.cos_sim(emb_t, emb_s))
    if similarity > SEMANTIC_THRESHOLD and attempt_text.lower() != target_text.lower():
        return "Semantic Paraphasia"
    if attempt_text.lower() == target_text.lower():
        return "Correct"
    return "Phonological"


def calculate_accuracy(target: list, attempt: list) -> float:
    if not target:
        return 0.0
    n, m = len(target), len(attempt)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1): dp[i][0] = i
    for j in range(m + 1): dp[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if target[i-1] == attempt[j-1]:
                dp[i][j] = dp[i-1][j-1]
            else:
                dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
    return round(((max(n, m) - dp[n][m]) / max(n, m)) * 100, 2)


def phoneme_errors(target_phonemes: list, attempt_phonemes: list) -> dict:
    n, m = len(target_phonemes), len(attempt_phonemes)
    dp   = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1): dp[i][0] = i
    for j in range(m + 1): dp[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if target_phonemes[i-1] == attempt_phonemes[j-1]:
                dp[i][j] = dp[i-1][j-1]
            else:
                dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])

    errors, i, j = [], n, m
    while i > 0 or j > 0:
        if i > 0 and j > 0 and target_phonemes[i-1] == attempt_phonemes[j-1]:
            i -= 1; j -= 1
        elif i > 0 and j > 0 and dp[i][j] == dp[i-1][j-1] + 1:
            errors.append({"type": "substitution", "position": i-1,
                           "target_phoneme": target_phonemes[i-1],
                           "actual_phoneme": attempt_phonemes[j-1],
                           "description": f"{target_phonemes[i-1]} → {attempt_phonemes[j-1]}"})
            i -= 1; j -= 1
        elif i > 0 and dp[i][j] == dp[i-1][j] + 1:
            errors.append({"type": "omission", "position": i-1,
                           "target_phoneme": target_phonemes[i-1],
                           "actual_phoneme": None,
                           "description": f"missing {target_phonemes[i-1]}"})
            i -= 1
        else:
            errors.append({"type": "insertion", "position": j-1,
                           "target_phoneme": None,
                           "actual_phoneme": attempt_phonemes[j-1],
                           "description": f"extra {attempt_phonemes[j-1]}"})
            j -= 1

    errors = list(reversed(errors))
    return {
        "target_phonemes":  target_phonemes,
        "attempt_phonemes": attempt_phonemes,
        "total_errors":     len(errors),
        "accuracy":         calculate_accuracy(target_phonemes, attempt_phonemes),
        "errors":           errors,
        "error_summary": {
            "substitutions": sum(1 for e in errors if e["type"] == "substitution"),
            "omissions":     sum(1 for e in errors if e["type"] == "omission"),
            "insertions":    sum(1 for e in errors if e["type"] == "insertion"),
        },
    }


def phoneme_analysis_node(state: SpeechTherapyState) -> dict:
    target_word = state.get("target_word", "")
    transcript  = state.get("transcript", "") or ""

    print(f"\nConverting '{target_word}' to phonemes...")
    target_ph  = text_to_phonemes(target_word)
    print("Converting transcript to phonemes...")
    attempt_ph = text_to_phonemes(transcript)

    print(f"Target  : {target_ph}")
    print(f"Attempt : {attempt_ph}\n")

    report         = phoneme_errors(target_ph, attempt_ph)
    semantic_label = detect_semantic(target_word, transcript)

    print("=" * 50)
    print("ERROR REPORT")
    print("=" * 50)
    print(f"Accuracy        : {report['accuracy']}%")
    print(f"Total Errors    : {report['total_errors']}")
    print(f"  Substitutions : {report['error_summary']['substitutions']}")
    print(f"  Omissions     : {report['error_summary']['omissions']}")
    print(f"  Insertions    : {report['error_summary']['insertions']}")
    print(f"Semantic Label  : {semantic_label}")
    for idx, err in enumerate(report["errors"], 1):
        print(f"  {idx}. {err['type'].upper()}: {err['description']}")
    print("=" * 50)

    # ✅ Only return what THIS node changed
    return {
        "target_phonemes":  target_ph,
        "attempt_phonemes": attempt_ph,
        "error_report":     report,
        "semantic_label":   semantic_label,
        "current_error":    None,
    }