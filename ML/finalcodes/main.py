# main.py

from final_analyzer import run as run_pipeline

def main():
    """
    Entry point for the full therapy pipeline:
    1) Ask for target word
    2) Record and transcribe speech (perception)
    3) Analyze phoneme and semantic errors (analyzer)
    4) Generate feedback + practice exercise (reasoning)
    """
    error_report = run_pipeline()
    # You can optionally do something with error_report here
    # e.g., save it to a file, or just leave it as is

if __name__ == "__main__":
    main()