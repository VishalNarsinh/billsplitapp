import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import CreateGroup from './components/CreateGroup';
import AddExpense from './components/AddExpense';
import RecentActivity from './components/RecentActivity';
import Login from './components/Login';
import Register from './components/Register';
import { api } from './services/api';
import Modal from './components/Modal';
import FriendsModal from './components/FriendsModal';
import AddMemberModal from './components/AddMemberModal';
import SettleUpModal from './components/SettleUpModal';
import PrivateChatModal from './components/PrivateChatModal';

import GroupBalances from './components/GroupBalances';

function Dashboard() {
  const { user, logout } = useAuth();
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isSettleUpModalOpen, setIsSettleUpModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [chatFriend, setChatFriend] = useState(null); // The friend currently being chatted with
  const [groups, setGroups] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (user) {
      fetchGroups();
    }
  }, [user, refreshKey]);

  const fetchGroups = async () => {
    try {
      const res = await api.get('/groups');
      setGroups(res.data);
    } catch (err) {
      console.error("Failed to fetch groups", err);
    }
  };

  const handleGroupCreated = (group) => {
    setGroups([...groups, group]);
    setRefreshKey(prev => prev + 1);
  };

  const handleExpenseAdded = () => {
    setRefreshKey(prev => prev + 1);
    setIsExpenseModalOpen(false);
  };

  const handleGroupClick = (group) => {
    setSelectedGroup(group);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-pink-500/30">
      {/* Header */}
      <header className="px-8 py-6 flex justify-between items-center border-b border-white/5 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <span className="font-bold text-lg">B</span>
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            BillSplit
          </h1>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-300 flex items-center justify-center text-slate-900 font-bold">
              {user.name.charAt(0)}
            </div>
            <div className="text-sm">
              <div className="font-medium text-slate-200 group-hover:text-white transition-colors">{user.name}</div>
              <div className="text-xs text-slate-400">{user.email}</div>
            </div>
          </div>
          <button onClick={logout} className="text-sm text-slate-400 hover:text-white">Logout</button>
        </div>
      </header>

      <main className="p-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="group p-6 rounded-3xl bg-gradient-to-br from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 transition-all duration-300 shadow-xl shadow-violet-900/20 border border-white/10 text-left relative overflow-hidden"
            >
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div className="text-lg font-bold">Add Expense</div>
                <div className="text-white/60 text-sm mt-1">Split costs instantly</div>
              </div>
            </button>

            <button
              onClick={() => setIsGroupModalOpen(true)}
              className="group p-6 rounded-3xl bg-slate-800/50 hover:bg-slate-800 transition-all duration-300 border border-white/5 text-left relative overflow-hidden"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 text-blue-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="text-lg font-bold text-slate-200">Create Group</div>
              <div className="text-slate-500 text-sm mt-1">Start a new collection</div>
            </button>

            <button
              onClick={() => setIsFriendsModalOpen(true)}
              className="col-span-2 group p-6 rounded-3xl bg-slate-800/30 hover:bg-slate-800/50 transition-all duration-300 border border-white/5 flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="text-left">
                <div className="text-lg font-bold text-slate-200">Friends & Connections</div>
                <div className="text-slate-500 text-sm">Manage your social circle</div>
              </div>
            </button>
          </div>

          {/* Recent Activity Card */}
          <RecentActivity refreshKey={refreshKey} />
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <div className="p-8 rounded-3xl bg-slate-800/50 border border-white/5 min-h-[400px]">
            <h2 className="text-xl font-bold mb-6 flex items-center justify-between">
              <span>Your Groups</span>
              <span className="text-xs bg-white/10 px-2 py-1 rounded-full text-slate-400">{groups.length}</span>
            </h2>
            <div className="space-y-3">
              {groups.map(group => (
                <div onClick={() => handleGroupClick(group)} key={group.id} className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group flex items-center justify-between">
                  <span className="font-medium text-slate-300 group-hover:text-white">{group.name}</span>
                  <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              ))}
              {groups.length === 0 && (
                <div className="text-center text-slate-500 py-8 text-sm">No groups yet.</div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      <Modal isOpen={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} title="Create New Group">
        <CreateGroup currentUser={user} onGroupCreated={handleGroupCreated} onClose={() => setIsGroupModalOpen(false)} />
      </Modal>

      <Modal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} title="Add Expense">
        <AddExpense currentUser={user} groups={groups} onExpenseAdded={handleExpenseAdded} onClose={() => setIsExpenseModalOpen(false)} />
      </Modal>

      <Modal isOpen={!!selectedGroup} onClose={() => setSelectedGroup(null)} title={selectedGroup ? selectedGroup.name : ''}>
        {selectedGroup && (
          <GroupBalances
            groupId={selectedGroup.id}
            members={selectedGroup.members || []}
            refreshTrigger={refreshKey}
            onAddMember={() => setIsAddMemberModalOpen(true)}
            onSettleUp={() => setIsSettleUpModalOpen(true)}
          />
        )}
      </Modal>

      <Modal isOpen={isFriendsModalOpen} onClose={() => setIsFriendsModalOpen(false)} title="Friends & Connections">
        <FriendsModal
          onClose={() => setIsFriendsModalOpen(false)}
          onChat={(friend) => {
            setChatFriend(friend);
            setIsFriendsModalOpen(false); // Close list when opening chat? Or keep open? Closing for focus.
          }}
        />
      </Modal>

      {isAddMemberModalOpen && selectedGroup && (
        <AddMemberModal
          groupId={selectedGroup.id}
          existingMembers={selectedGroup.members || []}
          onClose={() => setIsAddMemberModalOpen(false)}
          onMemberAdded={async () => {
            // Refresh logic: re-fetch the specific group to update members list and balances
            try {
              const res = await api.get(`/groups/${selectedGroup.id}`);
              setSelectedGroup(res.data); // Update selected group with new members
              setRefreshKey(prev => prev + 1); // Trigger other refreshes if needed
              setIsAddMemberModalOpen(false);
            } catch (err) {
              console.error("Failed to refresh group", err);
            }
          }}
        />
      )}

      {isSettleUpModalOpen && selectedGroup && (
        <Modal isOpen={true} onClose={() => setIsSettleUpModalOpen(false)} title="Settle Up">
          <SettleUpModal
            currentUser={user}
            groupId={selectedGroup.id}
            groupMembers={selectedGroup.members || []}
            onClose={() => setIsSettleUpModalOpen(false)}
            onSuccess={() => {
              setRefreshKey(prev => prev + 1);
              // Maybe close group modal too? Or just refresh balances.
            }}
          />
        </Modal>
      )}

      {chatFriend && (
        <PrivateChatModal
          friend={chatFriend}
          onClose={() => setChatFriend(null)}
        />
      )}
    </div>
  );
}

function App() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <AuthProvider>
      <AuthConsumer isLogin={isLogin} setIsLogin={setIsLogin} />
    </AuthProvider>
  );
}

const AuthConsumer = ({ isLogin, setIsLogin }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading...</div>;
  }

  if (user) {
    return <Dashboard />;
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {isLogin ? (
          <Login onSwitch={() => setIsLogin(false)} />
        ) : (
          <Register onSwitch={() => setIsLogin(true)} />
        )}
      </div>
    </div>
  );
};

export default App;
