from final_perception import run as perception_run
import difflib
from typing import Dict, List, Any


def normalize_text(text: str) -> List[str]:
    text = text.lower()
    for char in [".", ",", "!", "?", ";", ":"]:
        text = text.replace(char, "")
    return text.split()


def generate_error_report(target_sentence: str) -> Dict[str, Any]:
    """
    Generates structured error report for reasoning agent.
    """

    # 1️⃣ Get transcript
    spoken_sentence = perception_run()

    target_words = normalize_text(target_sentence)
    spoken_words = normalize_text(spoken_sentence)

    matcher = difflib.SequenceMatcher(None, target_words, spoken_words)

    correct_words = []
    substitutions = []
    omissions = []
    insertions = []

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():

        if tag == "equal":
            correct_words.extend(target_words[i1:i2])

        elif tag == "replace":
            t_segment = target_words[i1:i2]
            s_segment = spoken_words[j1:j2]

            for t, s in zip(t_segment, s_segment):
                substitutions.append({
                    "expected": t,
                    "spoken": s,
                    "error_type": "substitution"
                })

        elif tag == "delete":
            for word in target_words[i1:i2]:
                omissions.append({
                    "expected": word,
                    "error_type": "omission"
                })

        elif tag == "insert":
            for word in spoken_words[j1:j2]:
                insertions.append({
                    "spoken": word,
                    "error_type": "insertion"
                })

    total_errors = len(substitutions) + len(omissions) + len(insertions)

    severity = "none"
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
            "omissions": omissions,
            "insertions": insertions
        },
        "summary": {
            "total_errors": total_errors,
            "severity": severity
        }
    }


if __name__ == "__main__":

    TARGET =input("Enter the target sentence for analysis: ")

    report = generate_error_report(TARGET)

    import json
    print(json.dumps(report, indent=4))