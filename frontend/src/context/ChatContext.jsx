import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ChatService from '../services/chatService';
import { useAuth } from './AuthContext';
import { api } from '../services/api';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
    const { user } = useAuth();
    const [isConnected, setIsConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [unreadCounts, setUnreadCounts] = useState({}); // { userId: count }
    const [activeChatId, setActiveChatId] = useState(null); // ID of friend currently chatting with

    const fetchOnlineStatus = useCallback(async () => {
        try {
            const res = await api.get('/chat/online-users');
            setOnlineUsers(res.data);
        } catch (err) {
            console.error("Failed to fetch online status");
        }
    }, []);

    const handleIncomingMessage = useCallback((msg) => {
        const senderId = msg.senderId;
        if (senderId === user.id) return;

        // We need to use the ref for activeChatId because this callback is closed over strict state if not carefully managed
        // But since we are adding/removing listener on mount, we rely on the state being fresh or refs.
        // Actually, handleIncomingMessage is added once. It closes over initial state!
        // FIX: Use a ref for activeChatId checking inside callback
    }, [user.id]); // Wait, this logic is flawed because of closure.

    // Let's fix the closure issue by using a Ref for activeChatId
    const activeChatIdRef = useRef(null);
    useEffect(() => {
        activeChatIdRef.current = activeChatId;
    }, [activeChatId]);

    const handleIncomingMessageRef = useRef(null);
    handleIncomingMessageRef.current = (msg) => {
        const senderId = msg.senderId;
        if (senderId === user.id) return;

        if (activeChatIdRef.current && parseInt(activeChatIdRef.current) === senderId) {
            return;
        }

        // Only increment unread for actual CHAT messages
        if (msg.type && msg.type !== 'CHAT') {
            return;
        }

        setUnreadCounts(prev => ({
            ...prev,
            [senderId]: (prev[senderId] || 0) + 1
        }));
    };

    useEffect(() => {
        if (user) {
            const token = localStorage.getItem('accessToken');
            ChatService.connect(user.email, token);

            const onMessage = (msg) => {
                if (handleIncomingMessageRef.current) handleIncomingMessageRef.current(msg);
            };

            ChatService.addMessageListener(onMessage);
            setIsConnected(true);

            fetchOnlineStatus();
            const interval = setInterval(fetchOnlineStatus, 30000);

            return () => {
                ChatService.removeMessageListener(onMessage);
                ChatService.disconnect();
                clearInterval(interval);
                setIsConnected(false);
            };
        }
    }, [user, fetchOnlineStatus]);

    const markAsRead = useCallback((friendId) => {
        setUnreadCounts(prev => {
            const newCounts = { ...prev };
            delete newCounts[friendId];
            return newCounts;
        });
    }, []);

    const totalUnreadConversations = Object.keys(unreadCounts).length;

    const value = React.useMemo(() => ({
        isConnected,
        onlineUsers,
        unreadCounts,
        totalUnreadConversations,
        setActiveChatId,
        markAsRead
    }), [isConnected, onlineUsers, unreadCounts, totalUnreadConversations, markAsRead]);

    return (
        <ChatContext.Provider value={value}>
            {children}
        </ChatContext.Provider>
    );
};
