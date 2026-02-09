To run the Agentic Code , follow the foloowing steps:

1.Install all required dependencies(in the requirements.txt)at once -->
python -c "import langgraph; print('langgraph installed successfully')"

2Verify Installation
After installing, verify it worked:--> python -c "import langgraph; print('langgraph installed successfully')"

What is langgraph?
langgraph is a library for building agentic workflows. our project uses it to create the state graph that orchestrates the 4 -Agent Architecture:\
Speech perception\
Analysis\
Reasoning\
Execution feedback\

!!Make sure you're in the correct directory when running pip!!\
Then run --> pip install Langraph 

Sentence Transformers : \
What is sentence_transformers?\
sentence_transformers is a library that creates embeddings (vector representations) of text. our project uses it in semantic_utils.py to:\

Compare semantic similarity between target words and transcribed words\
Classify semantic errors in speech therapy\

**run this to download sentence transformers ---> pip install sentence_transformers**\
pip install wordfreq\

 **You can sue the virtual environment to run the python script** run the below code to acitvate the virtual environemnt \
.\.venv\Scripts\activate.bat

Install all the dependenices \
pip install  -r requirements.txt\

**
RUNNING CODE UPLOADED**
How to run in Colab ?\
1. Run these two commands in one Cell \
   !apt-get update\
!apt-get install -y espeak-ng ffmpeg\

2. Download the relevant packages \ (in a new cell)
   !pip install -q \ \
  openai-whisper \ \
  phonemizer \ \
  sentence-transformers \ \
  wordfreq \ \
  pyttsx3 \ \
  soundfile \ \
  numpy \

3. 


