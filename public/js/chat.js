const socket = io({
    autoConnect: false,
    auth: (cb) => {
        cb({ token: localStorage.getItem('token') });
    }
});

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const roomInput = document.getElementById('room');
const joinBtn = document.getElementById('join-btn');
const roomDisplay = document.getElementById('room-display');
const messagesList = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const leaveBtn = document.getElementById('leave-btn');
const typingIndicator = document.getElementById('typing-indicator');

let currentUser = {}; // Will hold full user object
let currentRoom = '';
let typingTimeout;

// Join Room (Login first)
joinBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const room = roomInput.value.trim();

    if (email && password && room) {
        try {
            // 1. Login via API
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();

            if (!data.success) {
                alert(data.message || 'Login failed');
                return;
            }

            // 2. Save token and user info
            localStorage.setItem('token', data.data.accessToken);
            currentUser = data.data.user;
            currentRoom = room;

            // 3. Connect Socket
            socket.auth = { token: data.data.accessToken };
            socket.connect();

            // 4. Join Room upon connection
            // We wait for connection to ensure auth passed
        } catch (error) {
            console.error(error);
            alert('An error occurred during login');
        }
    } else {
        alert('Please enter email, password, and room');
    }
});

// Socket Connection Events
socket.on('connect', () => {
    console.log('Connected to socket');

    // Join logic moved here to ensure we are connected
    socket.emit('join_room', currentRoom);

    toggleScreen();
    roomDisplay.textContent = `Room: ${currentRoom} (User: ${currentUser.username || currentUser.email})`;
    addMessage('System', `You joined ${currentRoom}`);
});

socket.on('connect_error', (err) => {
    alert(`Connection failed: ${err.message}`);
    // If auth failed, maybe force logout/clear token
});

// Send Message
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Typing Indicator Events
messageInput.addEventListener('input', () => {
    if (currentRoom) {
        socket.emit('typing', { room: currentRoom, user: currentUser.username || currentUser.email });

        // Debounce stop typing
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            socket.emit('stop_typing', { room: currentRoom, user: currentUser.username || currentUser.email });
        }, 2000);
    }
});

function sendMessage() {
    const message = messageInput.value.trim();
    if (message && currentRoom) {
        socket.emit('send_message', {
            room: currentRoom,
            message: message,
            senderId: currentUser._id,
            senderName: currentUser.username || currentUser.email
        });
        messageInput.value = '';
        socket.emit('stop_typing', { room: currentRoom, user: currentUser.username || currentUser.email }); // clear typing 
    }
}

// Leave Room
leaveBtn.addEventListener('click', () => {
    socket.emit('leave_room', currentRoom);
    socket.disconnect(); // Correctly disconnect
    toggleScreen();
    messagesList.innerHTML = '';
    currentRoom = '';
    currentUser = {};
    localStorage.removeItem('token');
});

// Socket Events
socket.on('receive_message', (data) => {
    typingIndicator.textContent = ''; // Clear typing when message received
    addMessage(data.senderName, data.message, data.timestamp);
});

socket.on('notification', (data) => {
    addMessage('Notification', `${data.type}: ${data.message}`);
});

socket.on('user_typing', (data) => {
    if (data.user !== (currentUser.username || currentUser.email)) {
        typingIndicator.textContent = `${data.user} is typing...`;
    }
});

socket.on('user_stop_typing', (data) => {
    typingIndicator.textContent = '';
});

// Helper Functions
function toggleScreen() {
    loginScreen.classList.toggle('hidden');
    chatScreen.classList.toggle('hidden');
}

function addMessage(sender, text, timestamp = new Date()) {
    const li = document.createElement('li');
    const time = new Date(timestamp).toLocaleTimeString();
    li.innerHTML = `<strong>${sender}</strong> <span class="meta">${time}</span><br>${text}`;
    messagesList.appendChild(li);
    messagesList.scrollTop = messagesList.scrollHeight;
}
