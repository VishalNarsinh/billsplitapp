import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { api } from './api';

class ChatService {
    constructor() {
        this.client = null;
        this.messageCallbacks = []; // Array of listeners
    }

    connect(userEmail, token) {
        if (this.client && this.client.active) {
            return; // Already connected
        }

        this.client = new Client({
            // Endpoint: ws://localhost:8080/ws
            // Use function to create SockJS instance
            webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
            connectHeaders: {
                Authorization: `Bearer ${token}`
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            onConnect: () => {
                // Subscribe to private user queue
                this.client.subscribe(`/user/queue/messages`, (message) => {
                    if (message.body) {
                        try {
                            const parsedMessage = JSON.parse(message.body);
                            this.notifyListeners(parsedMessage);
                        } catch (err) {
                            console.error('Error parsing message:', err);
                        }
                    }
                });
            },
            onStompError: (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
                console.error('Additional details: ' + frame.body);
            }
        });

        this.client.activate();
    }

    disconnect() {
        if (this.client) {
            this.client.deactivate();
            this.client = null;
        }
    }

    sendMessage(recipientId, content) {
        if (this.client && this.client.connected) {
            const chatMessage = {
                recipientId: recipientId,
                content: content,
                type: 'CHAT'
            };
            this.client.publish({
                destination: "/app/chat.private",
                body: JSON.stringify(chatMessage)
            });
        } else {
            console.error("Chat client not connected.");
        }
    }

    sendTyping(recipientId) {
        if (this.client && this.client.connected) {
            const chatMessage = {
                recipientId: recipientId,
                type: 'TYPING'
            };
            this.client.publish({
                destination: "/app/chat.private",
                body: JSON.stringify(chatMessage)
            });
        }
    }

    sendReadReceipt(recipientId) {
        if (this.client && this.client.connected) {
            const chatMessage = {
                recipientId: recipientId,
                type: 'READ_RECEIPT'
            };
            this.client.publish({
                destination: "/app/chat.read", // Separate endpoint in Controller
                body: JSON.stringify(chatMessage)
            });
        }
    }

    // Observer Pattern Helpers
    addMessageListener(callback) {
        this.messageCallbacks.push(callback);
    }

    removeMessageListener(callback) {
        this.messageCallbacks = this.messageCallbacks.filter(cb => cb !== callback);
    }

    notifyListeners(message) {
        this.messageCallbacks.forEach(callback => callback(message));
    }

    // API calls remain the same, but moving to ChatContext or keeping here is fine.
    async getHistory(friendId) {
        const response = await api.get(`/messages/${friendId}`);
        return response.data;
    }
}

export default new ChatService();
