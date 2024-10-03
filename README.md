﻿# ai_conversations
Welcome to AI conversations, a simple application made with Claude that allows a locally hosted AI bot to talk to itself based on a prompt that you give it.

First off, you will need to download an Ollama based AI tool that will let you host the LLM locally on port 10001.  The easiest tool for this will be [MSTY](https://msty.app/).  It will run a local server (typically on port 10001) that will allow for this application to interface with it through an API.  If you find the local server is a different port edit line 7 of app.py and change the port number.

I recommend downloading Llama 3.2 as it's pretty lightwight, fast, and usable.  Also.. that is what this repository is configured to use.  If you need to change the model change line 51 of app.py to the model you will use.

Then in your favorite IDE pull this repo and install the dependencies.  You will need [python](https://www.python.org/downloads/) to start.

Then run ```pip install flask ollama``` from your terminal.

Once you have done that run ```python app.py``` to start the server.  This should start the web service on [localhost:5000](https://localhost:5000/)

Now you are done!  Chat away!
