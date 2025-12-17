import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { api } from './api'; // Ensure you have this for getting token

class ChatService {
    constructor() {
        this.client = null;
        this.subscriptions = {};
        this.instanceId = Math.random().toString(36).substring(7);
        // Debug logging removed
        window.chatService = this; // For debugging
    }

    connect(userEmail, onMessageReceived) {
        const token = localStorage.getItem('accessToken');

        if (this.client && this.client.active) {
            this.client.deactivate();
        }

        this.client = new Client({
            // Endpoint: ws://localhost:8080/ws
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
                            onMessageReceived(JSON.parse(message.body));
                        } catch (err) {
                            console.error('Error parsing message:', err);
                        }
                    }
                });
            },
            onStompError: (frame) => {
                console.error('broker reported error: ' + frame.headers['message']);
                console.error('additional details: ' + frame.body);
            },
            onWebSocketClose: () => {
                // Connection closed
            }
        });

        this.client.activate();
    }

    sendMessage(recipientId, content) {
        if (this.client && this.client.connected) {
            const chatMessage = {
                recipientId: recipientId,
                content: content
            };
            this.client.publish({
                destination: "/app/chat.private",
                body: JSON.stringify(chatMessage)
            });
        } else {
            console.error("Chat client not connected. State:", this.client ? "Active=" + this.client.active : "Null");
            // Optional: generic fallback or toast
            if (this.client) {
                this.client.activate();
            }
        }
    }

    disconnect() {
        if (this.client) {
            this.client.deactivate();
        }
    }

    async getHistory(friendId) {
        const response = await api.get(`/messages/${friendId}`);
        return response.data;
    }
}

export default new ChatService();
