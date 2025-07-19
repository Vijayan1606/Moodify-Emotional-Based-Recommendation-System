function toggleChatbox() {
    let chatbox = document.getElementById("chatbox");
    let notification = document.getElementById("chatNotification");

    chatbox.classList.toggle("show");

    // Remove notification when chatbox opens
    if (chatbox.classList.contains("show")) {
        notification.style.display = "none";
    }
}

// Hide notification after 5 seconds
setTimeout(() => {
    let notification = document.getElementById("chatNotification");
    notification.style.opacity = "0";
    setTimeout(() => (notification.style.display = "none"), 500);
}, 5000);

function sendMessage() {
    let userInput = document.getElementById("userInput").value;
    if (userInput.trim() === "") return;

    let messagesDiv = document.getElementById("messages");

    // Show User Message
    let userMessageDiv = document.createElement("div");
    userMessageDiv.className = "message user";
    userMessageDiv.innerText = userInput;
    messagesDiv.appendChild(userMessageDiv);

    document.getElementById("userInput").value = "";

    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}
