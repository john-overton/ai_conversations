import sqlite3
import datetime
import logging
from ollama import Client
import nltk
nltk.download('punkt_tab', quiet=True)
from nltk.tokenize import word_tokenize

# Set up logging
logging.basicConfig(filename='conversation.log', level=logging.DEBUG,
                    format='%(asctime)s - %(levelname)s - %(message)s')

# Initialize Ollama client
try:
    client = Client(host='http://localhost:10001')
    logging.info("Ollama client initialized successfully")
except Exception as e:
    logging.error(f"Failed to initialize Ollama client: {str(e)}")
    raise

# Initialize SQLite database
try:
    conn = sqlite3.connect('conversation.db')
    cursor = conn.cursor()
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS conversations
    (Person TEXT, Response TEXT, DateTime TEXT, TokenSize INTEGER)
    ''')
    conn.commit()
    logging.info("SQLite database initialized successfully")
except Exception as e:
    logging.error(f"Failed to initialize SQLite database: {str(e)}")
    raise

def count_tokens(text):
    try:
        return len(word_tokenize(text))
    except Exception as e:
        logging.error(f"Error in count_tokens: {str(e)}")
        return 0

def save_response(person, response):
    try:
        now = datetime.datetime.now().isoformat()
        token_size = count_tokens(response)
        cursor.execute('INSERT INTO conversations VALUES (?, ?, ?, ?)',
                       (person, response, now, token_size))
        conn.commit()
        logging.info(f"Response saved for {person}: {token_size} tokens")
    except Exception as e:
        logging.error(f"Error in save_response: {str(e)}")
        conn.rollback()

def insert_starter_line(person, response):
    try:
        save_response(person, response)
        logging.info(f"Inserted starter line: {person}: {response}")
    except Exception as e:
        logging.error(f"Error in insert_starter_line: {str(e)}")

def get_conversation_history(max_tokens=25000):
    try:
        cursor.execute('SELECT Person, Response FROM conversations ORDER BY DateTime DESC')
        history = cursor.fetchall()
        
        total_tokens = 0
        context = []
        
        for person, response in reversed(history):
            tokens = count_tokens(f"{person}: {response}")
            if total_tokens + tokens > max_tokens:
                break
            context.insert(0, f"{person}: {response}")
            total_tokens += tokens
        
        logging.info(f"Retrieved conversation history: {total_tokens} tokens")
        return "\n".join(context)
    except Exception as e:
        logging.error(f"Error in get_conversation_history: {str(e)}")
        return ""

def generate_prompt(current_persona, other_persona):
    try:
        context = get_conversation_history()
        prompt = f"""You are {current_persona['name']} and a {current_persona['description']}. 
You have been talking to {other_persona['name']}, who is a {other_persona['description']}. 

Continue the conversation naturally, responding to the last message without helper text or anything like "Here is the reponse to conversation:" or "here is the next respone:".
Keep the response concise without lists or any non paragraph formatting.  Remember this is a conversation.

Here is the current context of the conversation:

{context}

{current_persona['name']}:"""
        logging.info(f"Generated prompt for {current_persona['name']}")
        return prompt
    except Exception as e:
        logging.error(f"Error in generate_prompt: {str(e)}")
        return ""

def run_conversation(persona1, persona2, num_turns=10):
    current_persona, next_persona = persona1, persona2
    
    for turn in range(num_turns):
        try:
            logging.info(f"Starting turn {turn + 1}")
            prompt = generate_prompt(current_persona, next_persona)
            
            response = client.generate(
                model='llama3.2:latest',
                prompt=prompt,
            )
            
            llm_response = response['response'].strip()
            print(f"{current_persona['name']}: {llm_response}")
            save_response(current_persona['name'], llm_response)
            logging.info(f"Turn {turn + 1} completed: {current_persona['name']} responded")
            
            current_persona, next_persona = next_persona, current_persona
        except Exception as e:
            logging.error(f"Error in turn {turn + 1}: {str(e)}")
            break

if __name__ == "__main__":
    try:
        persona1 = {
            "name": "Amelia",
            "description": "a writer with a focus on drama, mysetery, and psychological thrillers, loves Stephen King and Tom Clancey"
        }
        persona2 = {
            "name": "Zara",
            "description": "a writer that loves drama, politics, and romance"
        }
        
        starter_line = "Lets create an outline, plot, and details around a book where the world is ending and a man name John is traveling for work and is trying to make it back to his wife and newborn baby boy."
        insert_starter_line(persona1['name'], starter_line)
        
        run_conversation(persona1, persona2, num_turns=100)
    except Exception as e:
        logging.critical(f"Critical error in main execution: {str(e)}")
    finally:
        conn.close()
        logging.info("Database connection closed. Script execution completed.")