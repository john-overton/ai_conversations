## AI Conversations

Welcome to AI Conversations, a simple application built with Claude that allows a locally hosted AI bot to talk to itself based on a prompt you provide.

First, you'll need to download an Ollama-based AI tool to host the LLM locally on port 10001. The easiest tool for this is [MSTY](https://msty.app/). It runs a local server (typically on port 10001) that allows this application to interface with it through an API. If your local server uses a different port, edit line 7 of `app.py` and change the port number.

I recommend downloading Llama 3.2 2B as it's relatively lightweight, fast, and usable. This repository is configured to use it by default. If you need to change the model, modify line 51 of app.py to reflect your chosen model.

Next, clone this repository in your preferred IDE and install the dependencies. You'll need [Python](https://www.python.org/downloads/) to get started.

Then, run `pip install flask ollama` in your terminal.

Once that's done, run `python app.py` to start the server. This will launch the web service at [localhost:5000](http://localhost:5000/).

Now you're all set! Start chatting!