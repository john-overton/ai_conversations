from flask import Flask, render_template, request, jsonify
from ollama import Client
import time
import logging

app = Flask(__name__)
client = Client(host='http://localhost:10001')

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    topic = data['topic']
    iterations = data['iterations']
    last_response = data.get('last_response', '')
    document_content = data.get('document_content', '')
    generate_title = data.get('generate_title', False)
    
    if not last_response:
        # First iteration
        if document_content:
            prompt = f"Let's have a deep dive discussion about {topic}. Use the following document as context:\n\n{document_content}\n\nStart by introducing the topic and relating it to the context provided."
        else:
            prompt = f"Let's have a deep dive discussion about {topic}. Start by introducing the topic."
    else:
        # Subsequent iterations
        if document_content:
            prompt = f"Continue the discussion about {topic}, keeping in mind the context of the attached document. Previous response: {last_response}"
        else:
            prompt = f"Continue the discussion about {topic}. Previous response: {last_response}"
    
    logging.info(f"Sending prompt to LLM: {prompt}")
    response = client.generate(model='llama3.2:latest', prompt=prompt)
    time.sleep(10)  # 10-second pause between calls

    result = {"response": response['response']}

    if generate_title:
        title_prompt = f"Based on the following conversation, generate a short, catchy title:\n\n{topic}\n{response['response']}"
        title_response = client.generate(model='llama3.2:latest', prompt=title_prompt)
        result["title"] = title_response['response'].strip()
    
    return jsonify(result)

@app.route('/reset', methods=['POST'])
def reset():
    logging.info("Conversation reset requested")
    return jsonify({"status": "success", "message": "Conversation reset successfully"})

if __name__ == '__main__':
    app.run(debug=True)