$(document).ready(function() {
    let conversation = [];
    let isRunning = false;
    let iterationCount = 0;
    let currentTopic = '';
    let lastResponse = '';
    let documentContent = '';
    let isSelfChat = false;
    let isDarkMode = false;

    function formatMessage(message) {
        return marked(message);
    }

    function addMessage(message, isUser = false) {
        conversation.push({text: message, sender: isUser ? 'User' : 'AI'});
        let formattedMessage = formatMessage(message);
        let messageHtml = `
            <div class="message ${isUser ? 'user-message' : 'bot-message'}">
                <div class="bubble">
                    <div class="name">${isUser ? 'User' : 'AI'}</div>
                    ${formattedMessage}
                </div>
            </div>
        `;
        $("#chatWindow").append(messageHtml);
        $("#chatWindow").scrollTop($("#chatWindow")[0].scrollHeight);

        // Check for code in AI response
        if (!isUser && message.includes('```')) {
            let codeBlocks = message.match(/```[\s\S]*?```/g);
            if (codeBlocks) {
                $("#detectedCode").text(codeBlocks.join('\n\n').replace(/```/g, ''));
                $("#artifactPane").show();
            }
        }
    }

    function updateButtonStates() {
        if (isRunning) {
            $("#sendBtn").text("Interrupt");
            $("#stopBtn").show();
        } else {
            $("#sendBtn").text("Send");
            $("#stopBtn").hide();
        }
    }

    function runConversation(userInput) {
        isRunning = true;
        currentTopic = userInput;
        updateButtonStates();
        
        function iterate() {
            if (!isRunning) return;
            
            $.ajax({
                url: '/chat',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ 
                    user_input: currentTopic,
                    self_chat: isSelfChat,
                    last_response: lastResponse,
                    document_content: documentContent,
                    custom_prompt: $("#customPrompt").val()
                }),
                success: function(response) {
                    addMessage(response.response);
                    lastResponse = response.response;
                    iterationCount++;
                    
                    if (response.title) {
                        $("#chatTitle").text(response.title);
                    }
                    
                    if (isSelfChat) {
                        if (iterationCount % 16 === 0) {
                            if (confirm("Do you want to continue the conversation?")) {
                                setTimeout(iterate, 2000);
                            } else {
                                isRunning = false;
                                updateButtonStates();
                            }
                        } else if (isRunning) {
                            setTimeout(iterate, 2000);
                        }
                    } else {
                        isRunning = false;
                        updateButtonStates();
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
                    lastResponse = '';
                    runConversation(userInput);
                }, 1000);
            } else {
                addMessage(userInput, true);
                lastResponse = '';
                runConversation(userInput);
            }
            $("#userInput").val('');
        }
    });

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
                $("#artifactPane").hide();
                isRunning = false;
                iterationCount = 0;
                currentTopic = '';
                lastResponse = '';
                documentContent = '';
                $("#fileName").text('');
                $("#chatTitle").text('AI Chatbot');
                updateButtonStates();
                addMessage("Conversation and context have been reset.", true);
            }
        });
    });

    $("#exportBtn").click(function() {
        let format = prompt("Choose export format (txt or md):", "txt");
        if (format !== 'txt' && format !== 'md') {
            alert("Invalid format. Please choose 'txt' or 'md'.");
            return;
        }
        
        $.ajax({
            url: '/export',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ conversation: conversation, format: format }),
            xhrFields: {
                responseType: 'blob'
            },
            success: function(blob) {
                let url = window.URL.createObjectURL(blob);
                let a = document.createElement('a');
                a.href = url;
                a.download = `conversation.${format}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
            },
            error: function() {
                alert("Error exporting conversation.");
            }
        });
    });

    $("#fileInput").change(function(e) {
        let file = e.target.files[0];
        if (file) {
            $("#fileName").text(`Attached: ${file.name}`);
            let reader = new FileReader();
            reader.onload = function(e) {
                documentContent = e.target.result;
                addMessage(`File "${file.name}" has been attached and will be used as context for the conversation.`, true);
            };
            reader.readAsText(file);
        }
    });

    $("#projectInput").change(function(e) {
        let file = e.target.files[0];
        if (file) {
            let formData = new FormData();
            formData.append('project', file);
            
            $.ajax({
                url: '/upload_project',
                method: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                success: function(response) {
                    documentContent = response.project_content;
                    addMessage(`Project "${file.name}" has been uploaded and will be used as context for the conversation.`, true);
                },
                error: function() {
                    addMessage("Error uploading project. Please try again.", true);
                }
            });
        }
    });

    $("#darkModeToggle").change(function() {
        isDarkMode = this.checked;
        $("body").toggleClass("dark-mode", isDarkMode);
    });

    $("#selfChatToggle").change(function() {
        isSelfChat = this.checked;
    });

    updateButtonStates();
});