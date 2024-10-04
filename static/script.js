$(document).ready(function() {
    let conversation = [];
    let isRunning = false;
    let iterationCount = 0;
    let currentTopic = '';
    let lastResponse = '';
    let documentContent = '';
    let isSelfChat = false;
    let isDarkMode = false;
    let codeBlocks = [];

    function formatMessage(message) {
        let formattedMessage = marked(message);
        formattedMessage = formattedMessage.replace(/<pre><code class="language-(\w+)">/g, '<pre><code class="language-$1">');
        return formattedMessage;
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
        Prism.highlightAllUnder(document.getElementById('chatWindow'));

        // Check for code in AI response
        if (!isUser && message.includes('```')) {
            codeBlocks = message.match(/```(\w+)?\n[\s\S]*?```/g) || [];
            if (codeBlocks.length > 0) {
                $("#codeSelector").empty();
                codeBlocks.forEach((block, index) => {
                    let language = block.match(/```(\w+)?/)[1] || 'markup';
                    $("#codeSelector").append(`<option value="${index}">Code Block ${index + 1} (${language})</option>`);
                });
                updateCodeDisplay(0);
                $("#artifactPane").show();
                $("#artifactContainer").removeClass("minimized");
                $("#toggleArtifactBtn").text("Hide Artifacts");
            }
        }
    }

    function updateCodeDisplay(index) {
        let block = codeBlocks[index];
        let language = block.match(/```(\w+)?/)[1] || 'markup';
        let code = block.replace(/```(\w+)?\n/, '').replace(/```$/, '');
        $("#detectedCode").attr('class', `language-${language}`).text(code);
        Prism.highlightElement(document.getElementById('detectedCode'));
    }

    $("#codeSelector").change(function() {
        updateCodeDisplay($(this).val());
    });

    $("#toggleArtifactBtn").click(function() {
        $("#artifactContainer").toggleClass("minimized");
        if ($("#artifactContainer").hasClass("minimized")) {
            $("#artifactPane").hide();
            $(this).text("Show Artifacts");
            $("#artifactContainer").css('width', 'auto');
        } else {
            $("#artifactPane").show();
            $(this).text("Hide Artifacts");
            $("#artifactContainer").css('width', '');
        }
    });

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
        if (isDarkMode) {
            $('head').append('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.24.1/themes/prism-tomorrow.min.css" id="prismDarkTheme">');
        } else {
            $('#prismDarkTheme').remove();
        }
        Prism.highlightAll();
    });

    $("#selfChatToggle").change(function() {
        isSelfChat = this.checked;
    });

    updateButtonStates();
});