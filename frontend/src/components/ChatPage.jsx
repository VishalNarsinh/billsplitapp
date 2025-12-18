import React, { useState, useEffect, useRef } from 'react';
import ChatService from '../services/chatService';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { api } from '../services/api';
import { useParams, useNavigate } from 'react-router-dom';

const ChatPage = () => {
    const { user } = useAuth();
    const { onlineUsers, unreadCounts, setActiveChatId, markAsRead } = useChat();
    const { friendId } = useParams();
    const navigate = useNavigate();
    const [recentContacts, setRecentContacts] = useState([]);
    const [currentFriend, setCurrentFriend] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    // Fetch recent contacts on mount
    useEffect(() => {
        fetchRecentContacts();
    }, []);

    const fetchRecentContacts = async () => {
        try {
            const res = await api.get('/chat/recent-contacts');
            setRecentContacts(res.data);
        } catch (err) {
            console.error("Failed to fetch recent contacts", err);
        }
    };

    // Handle Active Chat Friend Logic
    useEffect(() => {
        if (friendId && recentContacts.length > 0) {
            const friend = recentContacts.find(c => c.id === parseInt(friendId));
            if (friend) {
                setCurrentFriend(friend);
                setActiveChatId(friend.id);
                markAsRead(friend.id); // Clear unread when opening
            }
        } else {
            setCurrentFriend(null);
            setActiveChatId(null);
        }

        return () => {
            setActiveChatId(null);
        };
    }, [friendId, recentContacts, setActiveChatId, markAsRead]);


    // Chat Logic
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef(null);

    const handleInputChange = (e) => {
        setNewMessage(e.target.value);

        if (!currentFriend) return;

        // Send typing indicator
        ChatService.sendTyping(currentFriend.id);

        // Clear existing timeout
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        // Set new timeout to stop typing after 2 seconds of inactivity
        // Note: In a real app we might want to send a "STOP_TYPING" event, 
        // but for now the receiver can just auto-hide it after a timeout too.
    };

    useEffect(() => {
        if (!currentFriend || !currentFriend.id) return;

        // Load history
        const loadHistory = async () => {
            try {
                const history = await ChatService.getHistory(currentFriend.id);
                setMessages(history);
                scrollToBottom();

                // Mark loaded messages as read if any are unread
                // Just calling markAsRead in context connects the badge, but backend needs to know too
                // We do this via the new chat.read endpoint if there are unread ones.
                // Or simplified: just send a read receipt for the friend when we open.
                ChatService.sendReadReceipt(currentFriend.id);
            } catch (err) {
                console.error("Failed to load chat history", err);
            }
        };
        loadHistory();

        // Subscribe to incoming messages to update UI in real-time
        const handleIncomingMessage = (msg) => {
            if (msg.senderId == currentFriend.id || msg.recipientId == currentFriend.id) {

                if (msg.type === 'TYPING') {
                    if (msg.senderId === currentFriend.id) {
                        // Check if this typing event is stale (older than the last message received)
                        const lastMsgFromFriend = messages.findLast(m => m.senderId === currentFriend.id);
                        if (lastMsgFromFriend && msg.timestamp && new Date(msg.timestamp) < new Date(lastMsgFromFriend.timestamp)) {
                            return; // Ignore stale typing event
                        }

                        setIsTyping(true);
                        // Auto-hide after 3 seconds if no new typing event
                        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                        typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
                    }
                    return;
                }

                if (msg.type === 'READ_RECEIPT') {
                    if (msg.senderId === currentFriend.id) {
                        // The friend read OUR messages. 
                        // Update our local messages to be isRead=true
                        setMessages(prev => prev.map(m => m.senderId === user.id ? { ...m, isRead: true } : m));
                    }
                    return;
                }

                // Normal CHAT message
                setMessages(prev => [...prev, msg]);
                setIsTyping(false);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

                // No more blocking needed as we check timestamps now.

                scrollToBottom();

                // Also mark as read immediately if we are looking at it
                if (msg.senderId == currentFriend.id) {
                    markAsRead(currentFriend.id);
                    ChatService.sendReadReceipt(currentFriend.id);
                }
            }
        };

        ChatService.addMessageListener(handleIncomingMessage);

        return () => {
            ChatService.removeMessageListener(handleIncomingMessage);
        };
    }, [currentFriend?.id, markAsRead, user.id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);


    const handleSend = (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentFriend) return;

        ChatService.sendMessage(currentFriend.id, newMessage);
        setNewMessage('');
    };

    const isOnline = currentFriend && onlineUsers.some(email => email === currentFriend.email);

    // helper to find last read message index
    const lastMessage = messages[messages.length - 1];
    const isLastMessageFromMe = lastMessage && lastMessage.senderId === user.id;
    const lastReadMessageIndex = isLastMessageFromMe
        ? messages.findLastIndex(m => m.senderId === user.id && m.isRead)
        : -1;

    return (
        <div className="flex h-[calc(100vh-80px)] bg-slate-900 border-t border-white/5">
            {/* Sidebar */}
            <div className="w-80 border-r border-white/5 bg-slate-900/50 flex flex-col">
                <div className="p-6 border-b border-white/5 flex items-center gap-3">
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 -ml-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                        title="Back to Dashboard"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <h2 className="text-xl font-bold text-white">Messages</h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {recentContacts.map(contact => {
                        const contactOnline = onlineUsers.some(email => email === contact.email);
                        const unreadCount = unreadCounts[contact.id] || 0;

                        return (
                            <div
                                key={contact.id}
                                onClick={() => {
                                    navigate(`/chat/${contact.id}`);
                                }}
                                className={`p-4 flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-colors ${Number(friendId) === contact.id ? 'bg-white/10' : ''}`}
                            >
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold shadow-lg shadow-violet-500/20">
                                        {contact.name.charAt(0).toUpperCase()}
                                    </div>
                                    {contactOnline && <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-medium text-slate-200 truncate">{contact.name}</h3>
                                    </div>
                                    {unreadCount > 0 ? (
                                        <p className="text-xs text-violet-400 font-semibold truncate">
                                            {unreadCount} new message{unreadCount > 1 ? 's' : ''}
                                        </p>
                                    ) : (
                                        <p className="text-xs text-slate-500 truncate">Click to chat</p>
                                    )}
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
                                const isLastRead = idx === lastReadMessageIndex;
                                return (
                                    <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-[60%] px-6 py-3 rounded-2xl ${isMe
                                            ? 'bg-violet-600 text-white rounded-br-sm shadow-lg shadow-violet-900/20'
                                            : 'bg-slate-800 text-slate-200 rounded-bl-sm border border-white/5'
                                            }`}>
                                            <p className="text-sm leading-relaxed">{msg.content}</p>
                                            <p className={`text-[10px] mt-1 ${isMe ? 'text-violet-200' : 'text-slate-500'} text-right`}>
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        {isMe && isLastRead && (
                                            <span className="text-[10px] text-slate-500 mt-1 mr-1">Seen</span>
                                        )}
                                    </div>
                                );
                            })}

                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-slate-800 text-slate-400 px-4 py-3 rounded-2xl rounded-bl-sm border border-white/5 text-xs flex items-center gap-1.5 shadow-lg">
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse"></div>
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse delay-150"></div>
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse delay-300"></div>
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSend} className="p-6 bg-slate-900/50 border-t border-white/5">
                            <div className="flex gap-4 max-w-4xl mx-auto">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={handleInputChange}
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
