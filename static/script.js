$(document).ready(function() {
    let conversation = [];
    let isRunning = false;
    let iterationCount = 0;
    let currentTopic = '';
    let lastResponse = '';
    let documentContent = '';
    let aiTitle = '';

    function formatMessage(message) {
        return marked(message);
    }

    function addMessage(message, isUser = false) {
        conversation.push({text: message, isUser: isUser});
        let formattedMessage = formatMessage(message);
        let messageHtml = `
            <div class="message ${isUser ? 'user-message' : 'bot-message'}">
                <div class="bubble">
                    <div class="name">${isUser ? 'User' : 'Chatbot'}</div>
                    ${formattedMessage}
                </div>
            </div>
        `;
        $("#chatWindow").append(messageHtml);
        $("#chatWindow").scrollTop($("#chatWindow")[0].scrollHeight);
    }

    function updateButtonStates() {
        if (isRunning) {
            $("#sendBtn").text("Interject");
            $("#stopBtn").show();
        } else {
            $("#sendBtn").text("Start Discussion");
            $("#stopBtn").hide();
        }
    }

    function runConversation(topic) {
        isRunning = true;
        currentTopic = topic;
        updateButtonStates();
        
        function iterate() {
            if (!isRunning) return;
            
            $.ajax({
                url: '/chat',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ 
                    topic: currentTopic, 
                    iterations: 1, 
                    last_response: lastResponse,
                    document_content: documentContent,
                    generate_title: aiTitle === ''
                }),
                success: function(response) {
                    addMessage(response.response);
                    lastResponse = response.response;
                    iterationCount++;
                    
                    if (response.title && aiTitle === '') {
                        aiTitle = response.title;
                        $("#aiTitle").text(aiTitle);
                    }
                    
                    if (iterationCount % 16 === 0) {
                        if (confirm("Do you want to continue the conversation?")) {
                            setTimeout(iterate, 11000);  // 11 seconds to account for server-side delay
                        } else {
                            isRunning = false;
                            updateButtonStates();
                        }
                    } else if (isRunning) {
                        setTimeout(iterate, 11000);  // 11 seconds to account for server-side delay
                    }
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    console.error("Error in chat request:", textStatus, errorThrown);
                    addMessage("An error occurred while fetching the response. Please try again.", false);
                    isRunning = false;
                    updateButtonStates();
                }
            });
        }
        
        iterate();
    }

    $("#sendBtn").click(function() {
        let userInput = $("#userInput").val().trim();
        if (userInput) {
            if (isRunning) {
                isRunning = false;
                setTimeout(() => {
                    addMessage(userInput, true);
                    lastResponse = '';  // Reset last response when user interjects
                    runConversation(userInput);
                }, 1000);
            } else {
                addMessage(userInput, true);
                lastResponse = '';  // Reset last response for new conversation
                runConversation(userInput);
            }
            $("#userInput").val('');
        }
    });

    // Add ability to submit with Ctrl+Enter
    $("#userInput").keydown(function(e) {
        if (e.ctrlKey && e.keyCode == 13) {
            $("#sendBtn").click();
        }
    });

    $("#stopBtn").click(function() {
        isRunning = false;
        updateButtonStates();
        addMessage("Conversation stopped by user.", true);
    });

    $("#resetBtn").click(function() {
        $.ajax({
            url: '/reset',
            method: 'POST',
            success: function() {
                conversation = [];
                $("#chatWindow").empty();
                $("#aiTitle").empty();
                isRunning = false;
                iterationCount = 0;
                currentTopic = '';
                lastResponse = '';
                documentContent = '';
                aiTitle = '';
                $("#fileName").text('');
                updateButtonStates();
                addMessage("Conversation and context have been reset.", true);
            }
        });
    });

    $("#exportBtn").click(function() {
        let text = conversation.map(msg => `${msg.isUser ? 'User' : 'Chatbot'}: ${msg.text}`).join('\n');
        let blob = new Blob([text], { type: 'text/plain' });
        let anchor = document.createElement('a');
        anchor.download = `${aiTitle || 'conversation'}.txt`;
        anchor.href = window.URL.createObjectURL(blob);
        anchor.click();
    });

    $("#fileInput").change(function(e) {
        let file = e.target.files[0];
        if (file) {
            $("#fileName").text(`Attached: ${file.name}`);
            let reader = new FileReader();
            reader.onload = function(e) {
                documentContent = e.target.result;
                addMessage(`Document "${file.name}" has been attached and will be used as context for the conversation.`, true);
            };
            reader.readAsText(file);
        }
    });

    // Initialize button states
    updateButtonStates();
});