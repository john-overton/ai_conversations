from flask import Flask, render_template, request, jsonify, send_file
from ollama import Client
import time
import logging
import os
import zipfile
import io

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
    user_input = data['user_input']
    self_chat = data['self_chat']
    last_response = data.get('last_response', '')
    document_content = data.get('document_content', '')
    custom_prompt = data.get('custom_prompt', '')
    
    if custom_prompt:
        prompt = custom_prompt.replace("{user_input}", user_input)
    elif self_chat:
        if not last_response:
            prompt = f"{user_input}\n\nPlease start a discussion on this topic."
        else:
            prompt = f"Continue the discussion. Previous response: {last_response}"
    else:
        prompt = user_input

    if document_content:
        prompt += f"\n\nContext:\n{document_content}"
    
    logging.info(f"Sending prompt to LLM: {prompt}")
    response = client.generate(model='llama3.2:latest', prompt=prompt)
    
    # Generate title
    title_prompt = f"Generate a title of less than 10 words for this conversation:\n\nUser: {user_input}\nAI: {response['response']}"
    title_response = client.generate(model='llama3.2:latest', prompt=title_prompt)
    title = title_response['response'].strip()
    
    return jsonify({
        "response": response['response'],
        "title": title
    })

@app.route('/reset', methods=['POST'])
def reset():
    logging.info("Conversation reset requested")
    return jsonify({"status": "success", "message": "Conversation reset successfully"})

@app.route('/upload_project', methods=['POST'])
def upload_project():
    if 'project' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['project']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    if file:
        # Create a temporary directory to extract the zip file
        temp_dir = 'temp_project'
        os.makedirs(temp_dir, exist_ok=True)
        
        # Save and extract the zip file
        zip_path = os.path.join(temp_dir, file.filename)
        file.save(zip_path)
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(temp_dir)
        
        # Read all text files in the project
        project_content = ""
        for root, dirs, files in os.walk(temp_dir):
            for file in files:
                if file.endswith(('.txt', '.py', '.js', '.html', '.css', '.md', '.json', '.xml')):
                    file_path = os.path.join(root, file)
                    with open(file_path, 'r', encoding='utf-8') as f:
                        project_content += f"File: {file}\n\n{f.read()}\n\n"
        
        # Clean up temporary directory
        for root, dirs, files in os.walk(temp_dir, topdown=False):
            for file in files:
                os.remove(os.path.join(root, file))
            for dir in dirs:
                os.rmdir(os.path.join(root, dir))
        os.rmdir(temp_dir)
        
        return jsonify({"project_content": project_content})

@app.route('/export', methods=['POST'])
def export_conversation():
    data = request.json
    conversation = data['conversation']
    format = data['format']
    
    if format == 'txt':
        content = "\n".join([f"{msg['sender']}: {msg['text']}" for msg in conversation])
        mimetype = 'text/plain'
        filename = 'conversation.txt'
    elif format == 'md':
        content = "# Conversation\n\n" + "\n\n".join([f"**{msg['sender']}:** {msg['text']}" for msg in conversation])
        mimetype = 'text/markdown'
        filename = 'conversation.md'
    else:
        return jsonify({"error": "Invalid format"}), 400

    return send_file(
        io.BytesIO(content.encode()),
        mimetype=mimetype,
        as_attachment=True,
        attachment_filename=filename
    )

if __name__ == '__main__':
    app.run(debug=True)