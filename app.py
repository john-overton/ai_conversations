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
    
    return jsonify({"response": response['response']})

@app.route('/generate_title', methods=['POST'])
def generate_title():
    conversation = request.json['conversation']
    conversation_text = "\n".join([f"{'User' if msg['isUser'] else 'Chatbot'}: {msg['text']}" for msg in conversation])
    
    prompt = f"Based on the following conversation, generate a short, catchy title that summarizes the main topic or theme:\n\n{conversation_text}\n\nTitle:"
    
    logging.info(f"Sending title generation prompt to LLM: {prompt}")
    response = client.generate(model='llama3.2:latest', prompt=prompt)
    
    title = response['response'].strip()
    return jsonify({"title": title})

@app.route('/reset', methods=['POST'])
def reset():
    logging.info("Conversation reset requested")
    return jsonify({"status": "success", "message": "Conversation reset successfully"})

if __name__ == '__main__':
    app.run(debug=True)