To run the Agentic Code , follow the foloowing steps:

1.Install all required dependencies(in the requirements.txt)at once -->
python -c "import langgraph; print('langgraph installed successfully')"

2Verify Installation
After installing, verify it worked:--> python -c "import langgraph; print('langgraph installed successfully')"

What is langgraph?
langgraph is a library for building agentic workflows. our project uses it to create the state graph that orchestrates the 4 -Agent Architecture:
Speech perception
Analysis
Reasoning
Execution feedback

!!Make sure you're in the correct directory when running pip!!
Then run --> pip install Langraph 

Sentence Transformers : 
What is sentence_transformers?
sentence_transformers is a library that creates embeddings (vector representations) of text. our project uses it in semantic_utils.py to:

Compare semantic similarity between target words and transcribed words
Classify semantic errors in speech therapy

**run this to download sentence transformers ---> pip install sentence_transformers**
