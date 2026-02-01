from typing import List

from phonemizer import phonemize

from config import config


def _simple_fallback_phonemes(text: str) -> List[str]:
    """
    Simple fallback: return characters as phonemes if espeak is not available.
    This is a basic approximation - not accurate but allows the system to run.
    """
    # Convert to lowercase and split into characters
    return [c for c in text.lower() if c.isalpha()]


def text_to_phonemes(text: str) -> List[str]:
    """
    Convert input text (typically a single word) to a list of phoneme symbols.
    Uses the phonemizer library. For English this will be language 'en-us'.
    Falls back to simple character-based phonemes if espeak is not installed.
    """
    language = "en-us" if config.language.startswith("en") else config.language
    
    try:
        # Try to use espeak backend
        phoneme_str = phonemize(
            text,
            language=language,
            backend="espeak",
            strip=True,
            preserve_punctuation=False,
            with_stress=True,
        )
        # Split on whitespace into symbols
        phonemes = [p for p in phoneme_str.split() if p]
        return phonemes
    except RuntimeError as e:
        if "espeak" in str(e).lower() or "not installed" in str(e).lower():
            print(
                "Warning: espeak not installed. Using fallback phoneme conversion. "
                "For accurate phonemes, install espeak-ng from: "
                "https://github.com/espeak-ng/espeak-ng/releases"
            )
            return _simple_fallback_phonemes(text)
        else:
            # Re-raise if it's a different error
            raise

