from groq import Groq
client=Groq(api_key="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")
print("Chatbot streaming : Type quit , exit or bye inorder to stop ")

while True:
    user_input=input("You:")
    if user_input.lower() in ["quit","exit","bye"]:
        print("\n chatbot:goodbye")
        break
    print("Chatbot:", end="", flush=True)

    stream=client.chat.completions.create(
        model="llama-3.1-8b-instant" , 
        messages=[
            {"role":"system", "content":"You are a helpful chatbot who has a vast knowledge about Aphasia"},
            {"role":"user" , "content":user_input}
        ],
        stream=True # sending responses piece by piece , just like how we chat to chatgpt
    )
    for chunk in stream:
        if chunk.choices[0].delta.content:
            print(chunk.choices[0].delta.content,end="",flush=True)
    print()