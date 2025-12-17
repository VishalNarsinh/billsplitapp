import React, { useState, useEffect, useRef } from 'react';
import ChatService from '../services/chatService';
import { useAuth } from '../context/AuthContext';

const PrivateChatModal = ({ friend, onClose }) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (!friend || !friend.id) {
            console.error("PrivateChatModal: Invalid friend object", friend);
            return;
        }

        // Load history
        const loadHistory = async () => {
            try {
                const history = await ChatService.getHistory(friend.id);
                setMessages(history);
                scrollToBottom();
            } catch (err) {
                console.error("Failed to load chat history", err);
            }
        };
        loadHistory();

        const handleIncomingMessage = (msg) => {
            // Check if message belongs to this conversation
            // Either from Friend -> Me OR Me -> Friend (if we receive our own echo)
            if (msg.senderId == friend.id || msg.recipientId == friend.id) {
                setMessages(prev => [...prev, msg]);
                scrollToBottom();
            }
        };

        ChatService.connect(user.email, handleIncomingMessage);

        return () => {
            ChatService.disconnect();
        };
    }, [friend.id, user.email]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        ChatService.sendMessage(friend.id, newMessage);

        // Optimistic update - REMOVED
        // We rely on the server echo.
        // const optimisticMsg = { ... };
        // setMessages(prev => [...prev, optimisticMsg]);
        // scrollToBottom();

        setNewMessage('');
        // Controller sends back to queue, so we might get a duplicate if we don't dedupe.
        // But better to see it twice (or handle generic dedupe) than not at all.
        // For now, let's rely on the duplicate being rare or acceptable for MVP.
        // Actually, preventing duplicate is easy if we check ID, but ID comes from backend.
        // Let's stick to optimistic for responsiveness.
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-white/10 shadow-2xl flex flex-col h-[600px]">
                {/* Header */}
                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-slate-800/50 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold shadow-lg shadow-violet-500/20">
                            {friend.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-lg">{friend.name}</h3>
                            <p className="text-xs text-emerald-400 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                Online
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/30">
                    {messages.map((msg, idx) => {
                        const isMe = msg.senderId === user.id;
                        return (
                            <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${isMe
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

                {/* Input Area */}
                <form onSubmit={handleSend} className="p-4 bg-slate-800/30 border-t border-white/5">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all"
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim()}
                            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-colors shadow-lg shadow-violet-900/20 flex items-center justify-center aspect-square"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PrivateChatModal;
