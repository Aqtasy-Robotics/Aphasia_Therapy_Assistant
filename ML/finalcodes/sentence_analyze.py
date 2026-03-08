from final_perception import run as perception_run
import eng_to_ipa as ipa
import difflib
import json


# ─────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────

PRONUNCIATION_THRESHOLD = 0.75
WORD_MATCH_THRESHOLD    = 0.80


# ─────────────────────────────────────────────
# Text Normalization
# ─────────────────────────────────────────────

def normalize_text(text):
    text = text.lower()
    for char in [".", ",", "!", "?", ";", ":"]:
        text = text.replace(char, "")
    return text.split()


# ─────────────────────────────────────────────
# Phoneme Conversion
# ─────────────────────────────────────────────

def word_to_phonemes(word):
    try:
        phonemes = ipa.convert(word.lower())
        if phonemes.startswith("*"):
            return word.lower()
        return phonemes
    except Exception:
        return word.lower()


def sentence_to_phoneme_pairs(sentence):
    """Returns [(word, phonemes), ...] for every word in sentence."""
    words = normalize_text(sentence)
    return [(w, word_to_phonemes(w)) for w in words]


# ─────────────────────────────────────────────
# Word Alignment
# ─────────────────────────────────────────────

def align_words(target_words, spoken_words):
    """
    Align target and spoken word lists via SequenceMatcher.
    Returns [(target_word, spoken_word), ...]. Missing = "".
    """
    matcher = difflib.SequenceMatcher(None, target_words, spoken_words)
    aligned = []

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            for t, s in zip(target_words[i1:i2], spoken_words[j1:j2]):
                aligned.append((t, s))
        elif tag == "replace":
            t_chunk = target_words[i1:i2]
            s_chunk = spoken_words[j1:j2]
            for t, s in zip(t_chunk, s_chunk):
                aligned.append((t, s))
            for t in t_chunk[len(s_chunk):]:
                aligned.append((t, ""))
            for s in s_chunk[len(t_chunk):]:
                aligned.append(("", s))
        elif tag == "delete":
            for t in target_words[i1:i2]:
                aligned.append((t, ""))
        elif tag == "insert":
            for s in spoken_words[j1:j2]:
                aligned.append(("", s))

    return aligned


# ─────────────────────────────────────────────
# Phoneme Similarity
# ─────────────────────────────────────────────

def phoneme_similarity(p1, p2):
    if not p1 and not p2:
        return 1.0
    return difflib.SequenceMatcher(None, p1, p2).ratio()


# ─────────────────────────────────────────────
# Word Classification
# ─────────────────────────────────────────────

def classify_word_pair(target_word, spoken_word, target_phonemes, spoken_phonemes):
    """
    Returns (issue_type, phoneme_similarity_score).
      - "correct"       -> same word, phonemes close enough
      - "pronunciation" -> same word, phonemes diverge
      - "substitution"  -> different word entirely
    """
    if not target_word or not spoken_word:
        return "substitution", 0.0

    surface_sim = difflib.SequenceMatcher(None, target_word, spoken_word).ratio()
    phon_sim    = phoneme_similarity(target_phonemes, spoken_phonemes)

    if surface_sim >= WORD_MATCH_THRESHOLD:
        if phon_sim >= PRONUNCIATION_THRESHOLD:
            return "correct", phon_sim
        else:
            return "pronunciation", phon_sim
    else:
        return "substitution", phon_sim


# ─────────────────────────────────────────────
# Stage 1 — Sentence-Level Error Report
# ─────────────────────────────────────────────

def generate_sentence_error_report(target_sentence, spoken_sentence):
    """
    Compares target vs spoken at the word level.
    Detects: substitutions, omissions, insertions, correct words.
    Returns a structured report dict.
    """
    target_words = normalize_text(target_sentence)
    spoken_words = normalize_text(spoken_sentence)

    matcher = difflib.SequenceMatcher(None, target_words, spoken_words)

    correct_words = []
    substitutions = []
    omissions     = []
    insertions    = []

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            correct_words.extend(target_words[i1:i2])

        elif tag == "replace":
            t_seg = target_words[i1:i2]
            s_seg = spoken_words[j1:j2]
            for t, s in zip(t_seg, s_seg):
                substitutions.append({"expected": t, "spoken": s, "error_type": "substitution"})
            for t in t_seg[len(s_seg):]:
                omissions.append({"expected": t, "error_type": "omission"})
            for s in s_seg[len(t_seg):]:
                insertions.append({"spoken": s, "error_type": "insertion"})

        elif tag == "delete":
            for word in target_words[i1:i2]:
                omissions.append({"expected": word, "error_type": "omission"})

        elif tag == "insert":
            for word in spoken_words[j1:j2]:
                insertions.append({"spoken": word, "error_type": "insertion"})

    total_errors = len(substitutions) + len(omissions) + len(insertions)

    if total_errors == 0:
        severity = "none"
    elif total_errors <= 2:
        severity = "mild"
    elif total_errors <= 4:
        severity = "moderate"
    else:
        severity = "high"

    return {
        "level": "sentence",
        "target_sentence": target_sentence,
        "spoken_sentence": spoken_sentence,
        "analysis": {
            "correct_words": correct_words,
            "substitutions": substitutions,
            "omissions":     omissions,
            "insertions":    insertions,
        },
        "summary": {
            "total_errors": total_errors,
            "severity":     severity,
        }
    }


# ─────────────────────────────────────────────
# Stage 2 — Phoneme-Level Analysis
# ─────────────────────────────────────────────

def analyze_phonemes(target_sentence, spoken_sentence):
    """
    Compares target vs spoken at the phoneme level word by word.
    Returns a list of per-word result dicts.
    """
    target_pairs = sentence_to_phoneme_pairs(target_sentence)
    spoken_pairs = sentence_to_phoneme_pairs(spoken_sentence)

    target_phon_map = {w: p for w, p in target_pairs}
    spoken_phon_map = {w: p for w, p in spoken_pairs}

    target_words = [w for w, _ in target_pairs]
    spoken_words = [w for w, _ in spoken_pairs]

    aligned = align_words(target_words, spoken_words)

    results = []
    for t_word, s_word in aligned:
        t_phon = target_phon_map.get(t_word, "")
        s_phon = spoken_phon_map.get(s_word, "")
        issue_type, sim = classify_word_pair(t_word, s_word, t_phon, s_phon)

        results.append({
            "target_word"     : t_word,
            "spoken_word"     : s_word,
            "target_phonemes" : t_phon,
            "spoken_phonemes" : s_phon,
            "issue_type"      : issue_type,
            "similarity"      : round(sim, 3),
        })

    return results


# ─────────────────────────────────────────────
# Summary Helpers
# ─────────────────────────────────────────────

def filter_by_issue(results, issue_type):
    return [r for r in results if r["issue_type"] == issue_type]


def summarize_phonemes(results):
    return {
        "correct"       : len(filter_by_issue(results, "correct")),
        "pronunciation" : len(filter_by_issue(results, "pronunciation")),
        "substitution"  : len(filter_by_issue(results, "substitution")),
    }


# ─────────────────────────────────────────────
# Printers
# ─────────────────────────────────────────────

def print_sentence_report(report):
    print("\n" + "=" * 60)
    print("  STAGE 1 — SENTENCE-LEVEL ERROR REPORT")
    print("=" * 60)
    print(json.dumps(report, indent=4))


def print_phoneme_report(target_sentence, spoken_sentence, results):
    icons = {"correct": "✅", "pronunciation": "🔶", "substitution": "❌"}

    print("\n" + "=" * 60)
    print("  STAGE 2 — PHONEME-LEVEL ANALYSIS")
    print("=" * 60)
    print(f"  TARGET    : {target_sentence}")
    print(f"  TRANSCRIPT: {spoken_sentence}")
    print("-" * 60)

    for r in results:
        icon = icons.get(r["issue_type"], "?")
        print(
            f"\n  {icon}  [{r['issue_type'].upper()}]"
            f"\n     Target  : {r['target_word']!r:15}  phonemes: /{r['target_phonemes']}/"
            f"\n     Spoken  : {r['spoken_word']!r:15}  phonemes: /{r['spoken_phonemes']}/"
            f"\n     Phoneme similarity: {r['similarity']:.0%}"
        )

    totals = summarize_phonemes(results)
    print(f"\n  -- Summary --")
    print(f"     Correct       : {totals['correct']}")
    print(f"     Pronunciation : {totals['pronunciation']}")
    print(f"     Substitution  : {totals['substitution']}")
    print("=" * 60 + "\n")


# ─────────────────────────────────────────────
# Full Sequential Pipeline
# ─────────────────────────────────────────────

def run_pipeline(target_sentence):
    """
    Sequential pipeline:
      1. Get transcript from perception (ASR)
      2. Stage 1 — sentence-level error report
      3. Stage 2 — phoneme-level analysis
    """
    # Step 1 — ASR
    print("\n[Step 1] Running speech perception...")
    spoken_sentence = perception_run()
    print(f" Transcript: {spoken_sentence!r}")

    # Step 2 — Sentence-level
    print("\n[Step 2] Running sentence-level error analysis...")
    sentence_report = generate_sentence_error_report(target_sentence, spoken_sentence)
    print_sentence_report(sentence_report)

    # Step 3 — Phoneme-level
    print("\n[Step 3] Running phoneme-level analysis...")
    phoneme_results = analyze_phonemes(target_sentence, spoken_sentence)
    print_phoneme_report(target_sentence, spoken_sentence, phoneme_results)

    return {
        "sentence_report" : sentence_report,
        "phoneme_results" : phoneme_results,
    }


# ─────────────────────────────────────────────
# Entry Point
# ─────────────────────────────────────────────

if __name__ == "__main__":
    target = input("Enter the target sentence for analysis: ")
    run_pipeline(target)