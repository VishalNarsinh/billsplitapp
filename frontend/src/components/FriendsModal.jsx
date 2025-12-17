import React, { useState, useEffect } from 'react';
import { friendApi } from '../services/api';

const FriendsModal = ({ onClose, onChat }) => {
    const [activeTab, setActiveTab] = useState('list'); // list, search, requests
    const [friends, setFriends] = useState([]);
    const [requests, setRequests] = useState([]);
    const [sentRequests, setSentRequests] = useState([]); // New state for sent requests
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchFriends();
        fetchRequests();
        fetchSentRequests(); // Fetch on load
    }, []);

    const fetchFriends = async () => {
        try {
            const res = await friendApi.getFriends();
            setFriends(res.data);
        } catch (err) {
            console.error("Fetch friends error:", err);
        }
    };

    const fetchRequests = async () => {
        try {
            const res = await friendApi.getPendingRequests();
            setRequests(res.data);
        } catch (err) {
            console.error("Fetch requests error:", err);
        }
    };

    // New function to fetch sent requests
    const fetchSentRequests = async () => {
        try {
            const res = await friendApi.getSentRequests();
            setSentRequests(res.data);
        } catch (err) {
            console.error("Fetch sent requests error:", err);
        }
    };

    // Live Search with Debounce
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchQuery.trim()) {
                handleSearch();
            } else {
                setSearchResults([]);
            }
        }, 300); // 300ms delay

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setLoading(true);
        try {
            const res = await friendApi.searchUsers(searchQuery);
            setSearchResults(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const isFriend = (userId) => {
        return friends.some(f => f.id === userId);
    };

    // Updated check using backend data
    const isPending = (userId) => {
        return sentRequests.some(req => req.sender.id === userId); // req.sender is actually the RECEIVER in our DTO for sent requests, wait let's check mapping
        // In FriendController.getSentRequests, we mapped 'req.getReceiver()' to the DTO's sender field? No, we mapped it to 'sender' field of DTO but it holds receiver data?
        // ideally DTO should have generic 'user' field or specific 'receiver' field.
        // But for now, the 'sender' field of the DTO in the 'sent-requests' response contains the RECEIVER user info.
        // So yes, checking req.sender.id is correct given how we mapped it.
    };

    const sendRequest = async (userId) => {
        try {
            await friendApi.sendRequest(userId);
            setMessage('Request sent successfully!');
            setTimeout(() => setMessage(''), 3000);
            fetchSentRequests(); // Refresh sent list
        } catch (err) {
            const msg = err.response?.data?.errorMessage || 'Failed to send request';
            setMessage(msg);
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const handleAccept = async (requestId) => {
        try {
            await friendApi.acceptRequest(requestId);
            fetchRequests();
            fetchFriends();
            setMessage('Friend added!');
        } catch (err) {
            console.error(err);
        }
    };

    const handleReject = async (requestId) => {
        try {
            await friendApi.rejectRequest(requestId);
            fetchRequests();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="flex bg-slate-800 rounded-xl p-1">
                {['list', 'search', 'requests'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab
                            ? 'bg-violet-600 text-white shadow-lg'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        {tab === 'list' && 'My Friends'}
                        {tab === 'search' && 'Add Friend'}
                        {tab === 'requests' && `Requests (${requests.length})`}
                    </button>
                ))}
            </div>

            {message && (
                <div className={`p-3 rounded-lg text-sm text-center ${message.toLowerCase().includes('success') || message.includes('added')
                    ? 'bg-green-500/20 text-green-300'
                    : 'bg-red-500/20 text-red-300'
                    }`}>
                    {message}
                </div>
            )}

            {/* Content */}
            <div className="min-h-[300px]">
                {activeTab === 'list' && (
                    <div className="space-y-3">
                        {friends.map(friend => (
                            <div key={friend.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center font-bold text-slate-900">
                                        {friend.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-medium">{friend.name}</div>
                                        <div className="text-xs text-slate-400">{friend.email}</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onChat(friend)}
                                    className="p-2 bg-violet-600/20 text-violet-400 hover:bg-violet-600/40 rounded-lg transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                        {friends.length === 0 && <div className="text-center text-slate-500 py-8">No friends yet. Add some!</div>}
                    </div>
                )}

                {activeTab === 'search' && (
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by name or email..."
                                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:outline-none focus:border-violet-500"
                            />
                            {/* Removed manual Search button as it is now live */}
                        </div>
                        <div className="space-y-2">
                            {loading && <div className="text-center text-slate-500 text-sm">Searching...</div>}

                            {searchResults.map(user => {
                                const alreadyFriend = isFriend(user.id);
                                const pending = isPending(user.id);

                                return (
                                    <div key={user.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs">
                                                {user.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium">{user.name}</div>
                                                <div className="text-xs text-slate-400">{user.email}</div>
                                            </div>
                                        </div>
                                        {alreadyFriend ? (
                                            <span className="text-xs px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                                                Friend
                                            </span>
                                        ) : pending ? (
                                            <button
                                                disabled
                                                className="text-xs px-3 py-1.5 bg-slate-700 text-slate-400 rounded-lg cursor-not-allowed"
                                            >
                                                Sent
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => sendRequest(user.id)}
                                                className="text-xs px-3 py-1.5 bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors"
                                            >
                                                Add
                                            </button>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {activeTab === 'requests' && (
                    <div className="space-y-3">
                        {requests.map(req => (
                            <div key={req.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold">
                                        {req.sender.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-medium">{req.sender.name}</div>
                                        <div className="text-xs text-slate-400">wants to be friends</div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleAccept(req.id)}
                                        className="p-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => handleReject(req.id)}
                                        className="p-2 bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 rounded-lg"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                        {requests.length === 0 && <div className="text-center text-slate-500 py-8">No pending requests.</div>}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FriendsModal;
