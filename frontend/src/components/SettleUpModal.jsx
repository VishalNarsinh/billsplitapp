import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

const SettleUpModal = ({ onClose, onSuccess, currentUser, groupId, groupMembers }) => {
    const [recipientId, setRecipientId] = useState('');
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [balances, setBalances] = useState([]);
    const [myBalance, setMyBalance] = useState(0);

    // Fetch balances using the existing endpoint
    useEffect(() => {
        const fetchBalances = async () => {
            try {
                const res = await api.get(`/groups/${groupId}/balances`);
                setBalances(res.data);

                const myRec = res.data.find(b => b.user.id === currentUser.id);
                setMyBalance(myRec ? myRec.netBalance : 0);
            } catch (err) {
                console.error("Failed to fetch balances", err);
            }
        };
        fetchBalances();
    }, [groupId, currentUser.id]);

    // Filter recipients: Only those who are OWED money (positive balance)
    // And we should only be settling if WE owe money (negative balance)
    const potentialRecipients = balances
        .filter(b => b.user.id !== currentUser.id && b.netBalance > 0.01)
        .map(b => b.user);

    const handleRecipientChange = (id) => {
        setRecipientId(id);

        // Auto-fill logic
        if (id && myBalance < 0) {
            const recipientBal = balances.find(b => b.user.id === parseInt(id));
            if (recipientBal) {
                // We pay the smaller of: what we owe (absolute) OR what they are owed.
                const maxPayable = Math.min(Math.abs(myBalance), recipientBal.netBalance);
                setAmount(maxPayable.toFixed(2));
            }
        } else {
            setAmount('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!recipientId || !amount) return;

        // Validation
        const payAmount = parseFloat(amount);
        const recipientBal = balances.find(b => b.user.id === parseInt(recipientId));

        if (myBalance >= 0) {
            alert("You don't owe any money, so you don't need to settle up!");
            return;
        }

        if (recipientBal) {
            const maxPayable = Math.min(Math.abs(myBalance), recipientBal.netBalance);
            // Allow 0.05 tolerance for float rounding
            if (payAmount > maxPayable + 0.05) {
                alert(`You can't pay more than needed! Maximum is $${maxPayable.toFixed(2)} based on your debt and their credit.`);
                return;
            }
        }

        setLoading(true);
        try {
            const recipient = potentialRecipients.find(m => m.id === parseInt(recipientId));

            // Construct payload as a Settlement Expense
            const payload = {
                groupId: groupId,
                payerId: currentUser.id,
                description: `Payment to ${recipient.name}`,
                totalAmount: payAmount,
                type: 'SETTLEMENT',
                splits: {
                    [recipient.id]: payAmount
                }
            };

            await api.post('/expenses', payload);
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            console.error("Failed to settle up", err);
            alert("Failed to settle up. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <p className="text-sm text-slate-400">
                Record a cash or external payment you made to someone to settle your debt.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Paying To</label>
                    <select
                        value={recipientId}
                        onChange={(e) => handleRecipientChange(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-white"
                        autoFocus
                    >
                        <option value="">Select recipient...</option>
                        {potentialRecipients.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                </div>

                {myBalance >= 0 ? (
                    <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-xl text-center text-sm">
                        You're all settled up! (You don't owe anyone)
                    </div>
                ) : (
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Amount</label>
                        <div className="relative">
                            <span className="absolute left-4 top-3 text-slate-500">$</span>
                            <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full pl-8 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-white appearance-none h-12 box-border"
                            />
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-3 mt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-slate-300 hover:bg-white/5 transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading || !recipientId || !amount}
                        className="px-6 py-2 bg-emerald-600 rounded-lg text-white font-bold shadow-lg hover:shadow-emerald-500/25 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {loading ? 'Processing...' : 'Settle Up'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SettleUpModal;
