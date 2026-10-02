import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import RegisterForm from './components/RegisterForm';
import TransactionPage from './components/TransactionPage';
import HistoryPage from './components/HIstoryPage';
import Installments from './components/Installments';
import DashboardPage from './components/DashboardPage';

function App() {
  const [user, setUser] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activePage, setActivePage] = useState('dashboard');
  // รายการผ่อนที่ต้องเปิดให้ทันทีเมื่อกดมาจากหน้าอื่น (เช่น dashboard)
  const [installmentFocusId, setInstallmentFocusId] = useState(null);

  const openInstallment = (installmentsId = null) => {
    setInstallmentFocusId(installmentsId);
    setActivePage('installment');
  };

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
    if (isRegistering) {
      return <RegisterForm onGoToLogin={() => setIsRegistering(false)} />;
    }
    return <Login onLoginSuccess={handleLoginSuccess} onGoToRegister={() => setIsRegistering(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        activePage={activePage}
        setActivePage={setActivePage}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-72' : 'ml-20'}`}>
        {/* Content Section */}
        <main className="p-8">
          {activePage === 'dashboard' && (
            <DashboardPage userId={user.id} onOpenInstallment={openInstallment} />
          )}

          {activePage === 'transaction' && (
            <TransactionPage userId={user.id} onNavigate={setActivePage} />
          )}
          {activePage === 'history' && (
            <HistoryPage userId={user.id} onNavigate={setActivePage} />
          )}
          {activePage === 'installment' && (
            <Installments
              userId={user.id}
              focusId={installmentFocusId}
              onFocusHandled={() => setInstallmentFocusId(null)}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;