import React, { useState, useEffect, useRef } from 'react';
import ChatService from '../services/chatService'; // Assuming this exists or will be moved/shared
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { useParams, useNavigate } from 'react-router-dom';

const ChatPage = () => {
    const { user } = useAuth();
    const { friendId } = useParams();
    const navigate = useNavigate();
    const [recentContacts, setRecentContacts] = useState([]);
    const [currentFriend, setCurrentFriend] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    // Fetch recent contacts & online status on mount
    useEffect(() => {
        fetchRecentContacts();
        fetchOnlineStatus();
        // Poll online status every 30 seconds
        const interval = setInterval(fetchOnlineStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchOnlineStatus = async () => {
        try {
            const res = await api.get('/chat/online-users');
            setOnlineUsers(res.data); // List of emails
        } catch (err) {
            console.error("Failed to fetch online status", err);
        }
    };

    // Set current friend based on URL param
    useEffect(() => {
        if (friendId && recentContacts.length > 0) {
            const friend = recentContacts.find(c => c.id === parseInt(friendId));
            if (friend) {
                setCurrentFriend(friend);
            }
        } else {
            setCurrentFriend(null);
        }
    }, [friendId, recentContacts]);

    const fetchRecentContacts = async () => {
        try {
            const res = await api.get('/chat/recent-contacts');
            setRecentContacts(res.data);
        } catch (err) {
            console.error("Failed to fetch recent contacts", err);
        }
    };

    // Chat Logic (duplicated from PrivateChatModal as requested to not break original)
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (!currentFriend || !currentFriend.id) return;

        // Load history
        const loadHistory = async () => {
            try {
                const history = await ChatService.getHistory(currentFriend.id);
                setMessages(history);
                scrollToBottom();
            } catch (err) {
                console.error("Failed to load chat history", err);
            }
        };
        loadHistory();

        const handleIncomingMessage = (msg) => {
            if (msg.senderId == currentFriend.id || msg.recipientId == currentFriend.id) {
                setMessages(prev => [...prev, msg]);
                scrollToBottom();
            }
        };

        ChatService.connect(user.email, handleIncomingMessage);

        return () => {
            ChatService.disconnect();
        };
    }, [currentFriend?.id, user.email]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentFriend) return;

        ChatService.sendMessage(currentFriend.id, newMessage);
        setNewMessage('');
    };

    const isOnline = currentFriend && onlineUsers.includes(currentFriend.email);

    return (
        <div className="flex h-[calc(100vh-80px)] bg-slate-900 border-t border-white/5">
            {/* Sidebar */}
            <div className="w-80 border-r border-white/5 bg-slate-900/50 flex flex-col">
                <div className="p-6 border-b border-white/5">
                    <h2 className="text-xl font-bold text-white">Messages</h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {recentContacts.map(contact => {
                        const contactOnline = onlineUsers.includes(contact.email);
                        return (
                            <div
                                key={contact.id}
                                onClick={() => navigate(`/chat/${contact.id}`)}
                                className={`p-4 flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-colors ${parseInt(friendId) === contact.id ? 'bg-white/10' : ''}`}
                            >
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold shadow-lg shadow-violet-500/20">
                                        {contact.name.charAt(0).toUpperCase()}
                                    </div>
                                    {contactOnline && <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>}
                                </div>
                                <div>
                                    <h3 className="font-medium text-slate-200">{contact.name}</h3>
                                    <p className="text-xs text-slate-500 truncate">Click to chat</p>
                                </div>
                            </div>
                        )
                    })}
                    {recentContacts.length === 0 && (
                        <div className="p-8 text-center text-slate-500 text-sm">
                            No recent chats. Start a conversation from your friends list!
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Window */}
            <div className="flex-1 flex flex-col bg-slate-950/30">
                {currentFriend ? (
                    <>
                        {/* Header */}
                        <div className="p-4 border-b border-white/5 flex items-center gap-4 bg-slate-900/50">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold shadow-lg shadow-violet-500/20">
                                {currentFriend.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-lg">{currentFriend.name}</h3>
                                <p className={`text-xs flex items-center gap-1 ${isOnline ? 'text-emerald-400' : 'text-slate-500'}`}>
                                    <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
                                    {isOnline ? 'Online' : 'Offline'}
                                </p>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-4">
                            {messages.map((msg, idx) => {
                                const isMe = msg.senderId === user.id;
                                return (
                                    <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[60%] px-6 py-3 rounded-2xl ${isMe
                                            ? 'bg-violet-600 text-white rounded-br-sm shadow-lg shadow-violet-900/20'
                                            : 'bg-slate-800 text-slate-200 rounded-bl-sm border border-white/5'
                                            }`}>
                                            <p className="text-sm leading-relaxed">{msg.content}</p>
                                            <p className={`text-[10px] mt-1 ${isMe ? 'text-violet-200' : 'text-slate-500'} text-right`}>
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSend} className="p-6 bg-slate-900/50 border-t border-white/5">
                            <div className="flex gap-4 max-w-4xl mx-auto">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all font-sans"
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim()}
                                    className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 rounded-xl transition-colors shadow-lg shadow-violet-900/20 font-medium"
                                >
                                    Send
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                        <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-6">
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-slate-300 mb-2">Your Messages</h3>
                        <p className="max-w-xs text-center">Select a chat from the sidebar or start a new conversation.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatPage;
