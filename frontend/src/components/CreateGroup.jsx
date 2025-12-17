import React, { useState } from 'react';
import { api, friendApi, groupApi } from '../services/api';

const CreateGroup = ({ onClose, onGroupCreated, currentUser }) => {
    const [name, setName] = useState('');
    const [friends, setFriends] = useState([]);
    const [selectedFriends, setSelectedFriends] = useState(new Set());
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState('name'); // name, friends
    const [message, setMessage] = useState('');

    // Fetch friends on mount
    React.useEffect(() => {
        const fetchFriends = async () => {
            try {
                const res = await friendApi.getFriends();
                setFriends(res.data);
            } catch (err) {
                console.error("Failed to fetch friends", err);
            }
        };
        fetchFriends();
    }, []);

    const toggleFriend = (id) => {
        const newSelected = new Set(selectedFriends);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedFriends(newSelected);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        setMessage('Creating group...');

        try {
            // 1. Create Group
            const res = await groupApi.createGroup(name);
            const group = res.data;

            // 2. Add Current User (Backend might do this automatically if logic changed, but frontend explicitly does it here based on previous code)
            // Ideally backend should add creator automatically. For now keeping existing logic + failsafe.
            try {
                if (currentUser && currentUser.id) {
                    await groupApi.addMember(group.id, currentUser.id);
                }
            } catch (err) {
                // Ignore if already added by backend
            }

            // 3. Add Selected Friends
            const friendIds = Array.from(selectedFriends);
            if (friendIds.length > 0) {
                setMessage(`Adding ${friendIds.length} members...`);
                // Run in parallel for speed
                await Promise.all(friendIds.map(fid => groupApi.addMember(group.id, fid)));
            }

            setMessage('Group created successfully!');

            // Short delay to show success message
            setTimeout(() => {
                onGroupCreated(group);
                onClose();
            }, 1000);

        } catch (err) {
            console.error(err);
            setMessage('Failed to create group');
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Progress/Steps (Simplified) */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-violet-400">
                    {step === 'name' ? 'Name Your Group' : 'Add Friends'}
                </h2>
                {step === 'friends' && (
                    <span className="text-xs text-slate-500">{selectedFriends.size} selected</span>
                )}
            </div>

            {message && (
                <div className={`p-3 rounded-lg text-sm text-center ${message.toLowerCase().includes('success')
                    ? 'bg-green-500/20 text-green-300'
                    : message.toLowerCase().includes('fail')
                        ? 'bg-red-500/20 text-red-300'
                        : 'bg-blue-500/20 text-blue-300'
                    }`}>
                    {message}
                </div>
            )}

            {!message.includes('success') && (
                <form onSubmit={handleSubmit} className="space-y-4">

                    {step === 'name' ? (
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Group Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Summer Trip 2024"
                                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none text-white transition-all"
                                autoFocus
                            />
                            <div className="mt-6 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => setStep('friends')}
                                    disabled={!name.trim()}
                                    className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors"
                                >
                                    Next: Add Friends &rarr;
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="max-h-[40vh] overflow-y-auto space-y-2 pr-2">
                                {friends.length === 0 ? (
                                    <div className="text-center text-slate-500 py-4">No friends found.</div>
                                ) : (
                                    friends.map(friend => (
                                        <div
                                            key={friend.id}
                                            onClick={() => toggleFriend(friend.id)}
                                            className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${selectedFriends.has(friend.id)
                                                ? 'bg-violet-600/20 border-violet-500/50'
                                                : 'bg-slate-800/50 border-transparent hover:bg-slate-800'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${selectedFriends.has(friend.id) ? 'bg-violet-500 text-white' : 'bg-slate-700 text-slate-300'
                                                    }`}>
                                                    {friend.name.charAt(0)}
                                                </div>
                                                <span className={selectedFriends.has(friend.id) ? 'text-white' : 'text-slate-300'}>
                                                    {friend.name}
                                                </span>
                                            </div>
                                            {selectedFriends.has(friend.id) && (
                                                <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="flex justify-between gap-3 pt-4 border-t border-white/5">
                                <button
                                    type="button"
                                    onClick={() => setStep('name')}
                                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                                >
                                    &larr; Back
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2 bg-gradient-to-r from-pink-500 to-violet-600 rounded-lg text-white font-bold shadow-lg hover:shadow-violet-500/25 disabled:opacity-50 transition-all flex items-center gap-2"
                                >
                                    {loading ? 'Creating...' : `Create Group (${selectedFriends.size + 1})`}
                                </button>
                            </div>
                        </div>
                    )}
                </form>
            )}
        </div>
    );
};

export default CreateGroup;
