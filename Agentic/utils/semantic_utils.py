from typing import Dict, Any
import numpy as np
from sentence_transformers import SentenceTransformer, util
from wordfreq import zipf_frequency

# Load once (global model)
_semantic_model = SentenceTransformer("all-MiniLM-L6-v2")


def is_real_word(word: str, threshold: float = 2.0) -> bool:
    """
    Check if a word exists in language using frequency.
    """
    return zipf_frequency(word.lower(), "en") >= threshold


def semantic_similarity(word1: str, word2: str) -> float:
    """
    Compute cosine similarity between two words using embeddings.
    """
    emb1 = _semantic_model.encode(word1, convert_to_tensor=True)
    emb2 = _semantic_model.encode(word2, convert_to_tensor=True)
    return float(util.cos_sim(emb1, emb2))


def classify_semantic_error(
    target_word: str,
    transcribed_word: str,
    similarity_threshold: float = 0.6,
) -> Dict[str, Any]:
    """
    Classify semantic relationship between target and produced word.
    """

    similarity = semantic_similarity(target_word, transcribed_word)
    real_word = is_real_word(transcribed_word)

    if not real_word:
        semantic_type = "Neologism"
    elif similarity >= similarity_threshold:
        semantic_type = "Semantic Paraphasia"
    else:
        semantic_type = "Unrelated Real Word"

    return {
        "semantic_similarity": similarity,
        "semantic_error_type": semantic_type,
        "is_real_word": real_word,
    }
