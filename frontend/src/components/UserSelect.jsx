import React, { useState, useEffect } from 'react';

const UserSelect = ({ onUserSelected }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newUserName, setNewUserName] = useState('');
    const [newUserEmail, setNewUserEmail] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = () => {
        fetch('/api/users')
            .then(res => res.json())
            .then(data => {
                setUsers(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        if (!newUserName || !newUserEmail) return;

        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newUserName, email: newUserEmail })
            });
            const user = await res.json();
            setUsers([...users, user]);
            onUserSelected(user);
        } catch (err) {
            alert("Failed to create user");
        }
    };

    if (loading) return <div className="text-center p-8">Loading users...</div>;

    return (
        <div className="max-w-md mx-auto mt-20 p-8 bg-slate-800 rounded-2xl shadow-2xl border border-white/10">
            <h2 className="text-2xl font-bold mb-6 text-center bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">Welcome to BillSplit</h2>

            {users.length > 0 && (
                <div className="mb-8">
                    <label className="block text-sm font-medium text-slate-400 mb-2">Select User</label>
                    <div className="grid gap-2">
                        {users.map(u => (
                            <button
                                key={u.id}
                                onClick={() => onUserSelected(u)}
                                className="w-full text-left px-4 py-3 bg-slate-900 hover:bg-slate-700 rounded-xl transition-colors flex items-center justify-between group"
                            >
                                <span className="font-medium text-slate-200 group-hover:text-white transition-colors">{u.name}</span>
                                <span className="text-xs text-slate-500">{u.email}</span>
                            </button>
                        ))}
                    </div>
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-700"></div></div>
                        <div className="relative flex justify-center text-sm"><span className="px-2 bg-slate-800 text-slate-500">Or create new</span></div>
                    </div>
                </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                    <label className="block text-xs uppercase font-bold text-slate-500 mb-1">New User Name</label>
                    <input
                        className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none"
                        placeholder="Name"
                        value={newUserName}
                        onChange={e => setNewUserName(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-xs uppercase font-bold text-slate-500 mb-1">Email</label>
                    <input
                        className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none"
                        placeholder="Email"
                        value={newUserEmail}
                        onChange={e => setNewUserEmail(e.target.value)}
                    />
                </div>
                <button className="w-full py-3 mt-4 bg-violet-600 hover:bg-violet-500 rounded-lg font-bold shadow-lg transition-all">
                    Get Started
                </button>
            </form>
        </div>
    );
};

export default UserSelect;
