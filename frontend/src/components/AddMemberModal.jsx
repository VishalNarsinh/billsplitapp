import React, { useState, useEffect } from 'react';
import { friendApi, groupApi } from '../services/api';

const AddMemberModal = ({ groupId, existingMembers = [], onClose, onMemberAdded }) => {
    const [friends, setFriends] = useState([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(null);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchFriends();
    }, []);

    const fetchFriends = async () => {
        try {
            const res = await friendApi.getFriends();
            setFriends(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const isMember = (userId) => {
        return existingMembers.some(m => m.id === userId);
    };

    const addMember = async (userId) => {
        setAdding(userId);
        try {
            await groupApi.addMember(groupId, userId);
            setMessage('Member added!');
            setTimeout(() => {
                setMessage('');
                onMemberAdded(); // Callback to refresh group details
            }, 1000);
        } catch (err) {
            const msg = err.response?.data?.errorMessage || 'Failed to add member';
            setMessage(msg);
        } finally {
            setAdding(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 transition-opacity">
            <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-slate-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                        Add Friends to Group
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    {message && (
                        <div className={`p-3 rounded-lg text-sm text-center ${message.includes('added') ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                            }`}>
                            {message}
                        </div>
                    )}

                    {loading ? (
                        <div className="text-center text-slate-500">Loading friends...</div>
                    ) : friends.length === 0 ? (
                        <div className="text-center text-slate-500">
                            You have no friends yet. Add some first!
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {friends.map(friend => {
                                const alreadyInGroup = isMember(friend.id);
                                return (
                                    <div key={friend.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">
                                                {friend.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium">{friend.name}</div>
                                                <div className="text-xs text-slate-400">{friend.email}</div>
                                            </div>
                                        </div>
                                        {alreadyInGroup ? (
                                            <button
                                                disabled
                                                className="text-xs px-3 py-1.5 bg-slate-800 text-slate-500 border border-slate-700 rounded-lg cursor-not-allowed flex items-center gap-1"
                                            >
                                                In Group
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => addMember(friend.id)}
                                                disabled={adding === friend.id}
                                                className="text-xs px-3 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-1"
                                            >
                                                {adding === friend.id ? 'Adding...' : 'Add'}
                                                {!adding && (
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                    </svg>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddMemberModal;
