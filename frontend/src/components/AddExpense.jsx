import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

// Simple equal split logic for MVP
// Enhanced AddExpense with Split Options
const AddExpense = ({ onClose, currentUser, groups = [], onExpenseAdded }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [loading, setLoading] = useState(false);

    // Split State
    const [splitType, setSplitType] = useState('EQUAL'); // EQUAL, UNEQUAL
    const [splitMembers, setSplitMembers] = useState([]); // List of members to render inputs
    const [customSplits, setCustomSplits] = useState({}); // { userId: amount }

    const [lockedMembers, setLockedMembers] = useState(new Set());

    // Initialize selected group if only one exists
    useEffect(() => {
        if (groups.length === 1) {
            handleGroupChange(groups[0].id);
        }
    }, [groups]);

    const handleGroupChange = async (groupId) => {
        setSelectedGroupId(groupId);
        setLockedMembers(new Set()); // Reset locks
        if (!groupId) {
            setSplitMembers([]);
            return;
        }
        try {
            const res = await api.get(`/groups/${groupId}`);
            setSplitMembers(res.data.members || []);
            // Reset splits
            setCustomSplits({});
            setSplitType('EQUAL');
        } catch (err) {
            console.error("Failed to fetch group members", err);
        }
    };

    // Auto-calculate splits when Amount or Split Type changes
    useEffect(() => {
        if (splitMembers.length === 0 || !amount) return;

        const total = parseFloat(amount);
        if (isNaN(total)) return;

        if (splitType === 'EQUAL') {
            setLockedMembers(new Set()); // Reset locks on equal split
            const memberCount = splitMembers.length;
            const baseSplit = Math.floor((total / memberCount) * 100) / 100;
            let remainder = Math.round((total - (baseSplit * memberCount)) * 100);

            const newSplits = {};
            splitMembers.forEach((member, index) => {
                let share = baseSplit;
                if (index < remainder) share += 0.01;
                newSplits[member.id] = share.toFixed(2);
            });
            setCustomSplits(newSplits);
        } else {
            // UNEQUAL: Initialize if empty
            if (Object.keys(customSplits).length === 0) {
                const memberCount = splitMembers.length;
                const baseSplit = (total / memberCount).toFixed(2);
                const newSplits = {};
                splitMembers.forEach(m => newSplits[m.id] = baseSplit);
                setCustomSplits(newSplits);
            }
        }
    }, [amount, splitType, splitMembers]); // Don't include customSplits here to avoid loops

    const handleSplitChange = (userId, value) => {
        // 1. Update this user's value and lock them
        const newVal = value; // Keep as string for input
        const total = parseFloat(amount) || 0;

        const newLocked = new Set(lockedMembers);
        newLocked.add(userId);
        setLockedMembers(newLocked);

        const newSplits = { ...customSplits, [userId]: newVal };

        // 2. Calculate remaining
        let lockedSum = 0;
        newLocked.forEach(id => {
            lockedSum += parseFloat(newSplits[id]) || 0;
        });

        const remaining = total - lockedSum;
        const unlockedMembers = splitMembers.filter(m => !newLocked.has(m.id));

        if (unlockedMembers.length > 0) {
            // Simple distribution
            const count = unlockedMembers.length;
            const baseSplit = Math.floor((remaining / count) * 100) / 100;

            // Distribute pennies to ensure sum matches exactly (if positive)
            // But for live editing, maybe just simpler floor/fix is better to avoid jumping numbers?
            // Let's try to be precise so the sum check passes.
            let remainderCents = Math.round((remaining - (baseSplit * count)) * 100);

            unlockedMembers.forEach((m, idx) => {
                let share = baseSplit;
                // Distribute remainder pennies to the first few unlocked members
                if (idx < remainderCents) share += 0.01;
                // Handle negative remainder just in case (though math above usually handles it via negative baseSplit)
                newSplits[m.id] = share.toFixed(2);
            });
        }

        setCustomSplits(newSplits);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!description || !amount || !selectedGroupId) return;

        // Validation for UNEQUAL
        const total = parseFloat(amount);
        let currentSum = 0;
        const finalSplits = {};

        Object.entries(customSplits).forEach(([uid, val]) => {
            const floatVal = parseFloat(val);
            currentSum += floatVal;
            finalSplits[uid] = floatVal;
        });

        // Tolerance for floating point (0.01)
        if (Math.abs(currentSum - total) > 0.02) {
            alert(`Split amounts sum ($${currentSum.toFixed(2)}) must match Total Amount ($${total.toFixed(2)})`);
            return;
        }

        setLoading(true);
        try {
            const payload = {
                groupId: selectedGroupId,
                payerId: currentUser.id,
                description,
                totalAmount: total,
                splits: finalSplits
            };

            await api.post('/expenses', payload);
            onExpenseAdded();
            onClose();

        } catch (err) {
            console.error(err);
            alert('Error adding expense: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
            <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Group</label>
                <select
                    value={selectedGroupId}
                    onChange={(e) => handleGroupChange(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none text-white"
                >
                    <option value="">Select a group...</option>
                    {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Description</label>
                <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Dinner at Tacos"
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none text-white"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Total Amount</label>
                <div className="relative">
                    <span className="absolute left-4 top-3 text-slate-500">$</span>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none text-white appearance-none"
                    />
                </div>
            </div>

            {/* Split Options */}
            {selectedGroupId && amount && (
                <div className="space-y-3 pt-4 border-t border-white/10">
                    <label className="block text-sm font-medium text-slate-400">Split Type</label>
                    <div className="flex bg-slate-800 p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setSplitType('EQUAL')}
                            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${splitType === 'EQUAL' ? 'bg-pink-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Equal Split (=)
                        </button>
                        <button
                            type="button"
                            onClick={() => setSplitType('UNEQUAL')}
                            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${splitType === 'UNEQUAL' ? 'bg-pink-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Unequal Split (Custom)
                        </button>
                    </div>

                    {/* Member List for Splits */}
                    <div className="space-y-2 mt-3">
                        {splitMembers.map(member => (
                            <div key={member.id} className="flex items-center justify-between gap-3 text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs">
                                        {member.name.charAt(0)}
                                    </div>
                                    <span className="text-slate-300">{member.name}</span>
                                </div>
                                <div className="relative w-24">
                                    <span className="absolute left-2 top-1.5 text-slate-500 text-xs">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        disabled={splitType === 'EQUAL'}
                                        value={customSplits[member.id] || ''}
                                        onChange={(e) => handleSplitChange(member.id, e.target.value)}
                                        className={`w-full pl-5 pr-2 py-1.5 bg-slate-900 border rounded-lg text-right text-sm outline-none focus:border-pink-500 ${splitType === 'EQUAL' ? 'border-transparent text-slate-500' : 'border-slate-700 text-white'}`}
                                    />
                                </div>
                            </div>
                        ))}
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
                    disabled={loading || !selectedGroupId || !amount || !description}
                    className="px-6 py-2 bg-gradient-to-r from-pink-500 to-violet-600 rounded-lg text-white font-bold shadow-lg hover:shadow-pink-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {loading ? 'Adding...' : 'Add Expense'}
                </button>
            </div>
        </form>
    );
};

export default AddExpense;
