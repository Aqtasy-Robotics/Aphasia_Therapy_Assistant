def is_real_word(word: str) -> bool:
    """
    Check if a word is a real word in the dictionary.
    Returns True if word exists, False if it's a neologism.
    """
    # Simple implementation - you can enhance this
    return len(word) > 0 and word.isalpha()


def is_neologism(word: str) -> bool:
    """
    Check if a word is a neologism (newly created/non-standard word).
    Returns True if it's NOT a real word.
    """
    return not is_real_word(word)