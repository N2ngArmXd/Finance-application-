import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import TransactionPage from './components/TransactionPage';

function App() {
  const [user, setUser] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activePage, setActivePage] = useState('dashboard');

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        activePage={activePage}
        setActivePage={setActivePage}
      />

      {/* Main Content Area */}
      <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-72' : 'ml-20'}`}>
        {/* Top Header */}
        <header className="flex justify-end p-6">
          <div className="flex items-center gap-4 bg-white p-2 px-4 rounded-2xl shadow-sm border border-slate-100">
            <span className="text-sm font-bold text-slate-600">👤 {user.username}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-red-500 font-bold hover:bg-red-50 p-2 px-3 rounded-xl transition"
            >
              ออกจากระบบ
            </button>
          </div>
        </header>

        {/* Content Section */}
        <main className="p-8">
          {activePage === 'dashboard' && (
            <div className="bg-white p-10 rounded-3xl border border-dashed border-slate-200 text-center text-slate-400">
              <h2 className="text-xl font-bold">ยินดีต้อนรับสู่ Dashboard</h2>
              <p>ขณะนี้ยังไม่มีข้อมูลการแสดงผล</p>
            </div>
          )}

          {activePage === 'transaction' && (
            <TransactionPage userId={user.id} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;