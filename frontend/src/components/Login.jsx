import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Login = ({ onSwitch }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await login(email, password);
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
        }
    };

    return (
        <div className="bg-slate-800 p-8 rounded-3xl border border-white/5 shadow-2xl">
            <h2 className="text-3xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">Welcome Back</h2>
            {error && <div className="bg-red-500/20 text-red-300 p-3 rounded-xl mb-4 text-sm text-center">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500 text-white" placeholder="you@example.com" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500 text-white" placeholder="••••••••" required />
                </div>
                <button type="submit" className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold py-3 rounded-xl hover:shadow-lg hover:shadow-violet-600/30 transition-all">Sign In</button>
            </form>
            <div className="mt-6 text-center text-sm text-slate-400">
                Don't have an account? <button onClick={onSwitch} className="text-violet-400 hover:text-violet-300 font-medium">Create one</button>
            </div>
        </div>
    );
};

export default Login;
