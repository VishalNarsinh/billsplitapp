import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

const RecentActivity = ({ refreshKey }) => {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchExpenses();
    }, [refreshKey]);

    const fetchExpenses = async () => {
        setLoading(true);
        try {
            const res = await api.get('/expenses');
            const data = res.data;
            // Sort by date desc
            const sorted = data.sort((a, b) => new Date(b.date) - new Date(a.date));
            setExpenses(sorted);
        } catch (err) {
            console.error("Failed to fetch expenses", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 rounded-3xl bg-slate-800/50 border border-white/5">
            <h2 className="text-2xl font-bold mb-6">Recent Activity</h2>
            {loading ? (
                <div className="text-center text-slate-500 py-8">Loading...</div>
            ) : expenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 border-2 border-dashed border-slate-700/50 rounded-2xl">
                    <p>No recent expenses.</p>
                    <p className="text-sm mt-2">Create a group and add an expense to get started.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {expenses.map(expense => (
                        <div key={expense.id} className="p-4 bg-white/5 rounded-2xl flex justify-between items-center hover:bg-white/10 transition-colors">
                            <div>
                                <div className="font-bold text-lg">{expense.description}</div>
                                <div className="text-sm text-slate-400">
                                    Paid by <span className="text-violet-400">{expense.payer?.name}</span> • {new Date(expense.date).toLocaleDateString()}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xl font-bold text-pink-500">${expense.totalAmount}</div>
                                <div className="text-xs text-slate-500">
                                    Split with {expense.shares?.length} others
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default RecentActivity;
