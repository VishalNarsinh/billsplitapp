import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

import { useAuth } from '../context/AuthContext';

const GroupBalances = ({ groupId, members, refreshTrigger, onAddMember, onSettleUp }) => {
    const { user: currentUser } = useAuth();
    const [debts, setDebts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('balances');

    useEffect(() => {
        const fetchDebts = async () => {
            try {
                // Fetch pairwise debts instead of net balances
                const res = await api.get(`/groups/${groupId}/debts`);
                setDebts(res.data);
            } catch (err) {
                console.error("Failed to fetch debts", err);
            } finally {
                setLoading(false);
            }
        };
        if (groupId) fetchDebts();
    }, [groupId, refreshTrigger]);

    // Filter for current user
    const myDebts = debts.filter(d => d.debtor.id === currentUser.id);
    const owedToMe = debts.filter(d => d.creditor.id === currentUser.id);
    const isSettled = myDebts.length === 0 && owedToMe.length === 0;

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/5">
                <button
                    onClick={() => setActiveTab('balances')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'balances' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:text-white'}`}
                >
                    Balances
                </button>
                <button
                    onClick={() => setActiveTab('info')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'info' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:text-white'}`}
                >
                    Group Info
                </button>
            </div>

            {/* TAB CONTENT: BALANCES */}
            {activeTab === 'balances' && (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                    {loading ? (
                        <div className="text-white text-center py-4">Calculating...</div>
                    ) : isSettled ? (
                        <div className="text-slate-400 text-center py-8">
                            <div className="mb-2 text-4xl">🎉</div>
                            You are all settled up!
                        </div>
                    ) : (
                        <>
                            {/* YOU OWE */}
                            {myDebts.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider">You Owe</h3>
                                    {myDebts.map((debt, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-3 bg-red-900/10 rounded-xl border border-red-500/10">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold">
                                                    {debt.creditor.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-slate-200 font-medium">{debt.creditor.name}</span>
                                            </div>
                                            <div className="font-bold text-red-400">
                                                -${debt.amount.toFixed(2)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* OWED TO YOU */}
                            {owedToMe.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Owed To You</h3>
                                    {owedToMe.map((debt, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-3 bg-emerald-900/10 rounded-xl border border-emerald-500/10">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold">
                                                    {debt.debtor.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-slate-200 font-medium">{debt.debtor.name}</span>
                                            </div>
                                            <div className="font-bold text-emerald-400">
                                                +${debt.amount.toFixed(2)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    <button
                        onClick={onSettleUp}
                        className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Settle Up
                    </button>
                </div>
            )}

            {/* TAB CONTENT: INFO */}
            {activeTab === 'info' && (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Group Members</h3>
                        {members && members.map((member) => (
                            <div key={member.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
                                    {member.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <div className="font-medium text-white">{member.name}</div>
                                    <div className="text-xs text-slate-500">{member.email}</div>
                                </div>
                                {member.id === currentUser.id && (
                                    <span className="text-xs bg-white/10 px-2 py-1 rounded text-slate-300">You</span>
                                )}
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={onAddMember}
                        className="w-full py-3 rounded-xl bg-slate-800 text-violet-400 hover:text-violet-300 hover:bg-slate-700 transition-colors font-medium border border-violet-500/30 flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        Add Member via Email
                    </button>
                </div>
            )}
        </div>
    );
};

export default GroupBalances;
