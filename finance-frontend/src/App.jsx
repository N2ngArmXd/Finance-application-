import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import { MobileHeader, BottomNav } from './components/MobileNav';
import Login from './components/Login';
import RegisterForm from './components/RegisterForm';
import TransactionPage from './components/TransactionPage';
import HistoryPage from './components/HistoryPage';
import Installments from './components/Installments';
import DashboardPage from './components/DashboardPage';
import Savings from './components/Savings';

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

  // กระปุกเงินออมที่ต้องไฮไลต์เมื่อกดมาจากหน้าอื่น (dashboard / ประวัติธุรกรรม)
  const [savingsFocusId, setSavingsFocusId] = useState(null);
  const openSavings = (savingsGoalId = null) => {
    setSavingsFocusId(savingsGoalId);
    setActivePage('savings');
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
    <div className="min-h-dvh bg-slate-50 lg:flex">
      {/* Sidebar (desktop) */}
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        activePage={activePage}
        setActivePage={setActivePage}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className={`flex-1 min-w-0 transition-all duration-300 ${isSidebarOpen ? 'lg:ml-72' : 'lg:ml-20'}`}>
        {/* แถบหัว (มือถือ / แท็บเล็ต) */}
        <MobileHeader user={user} onLogout={handleLogout} />

        {/* Content Section — มือถือเว้นที่ด้านล่างให้ BottomNav */}
        <main className="px-4 pt-4 pb-bottom-nav md:px-6 md:pt-6 lg:p-8">
          {activePage === 'dashboard' && (
            <DashboardPage userId={user.id} onOpenInstallment={openInstallment} onOpenSavings={openSavings} />
          )}

          {activePage === 'transaction' && (
            <TransactionPage userId={user.id} onNavigate={setActivePage} />
          )}
          {activePage === 'history' && (
            <HistoryPage userId={user.id} onNavigate={setActivePage} onOpenSavings={openSavings} />
          )}
          {activePage === 'savings' && (
            <Savings
              userId={user.id}
              focusId={savingsFocusId}
              onFocusHandled={() => setSavingsFocusId(null)}
            />
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

      {/* เมนูล่าง (มือถือ / แท็บเล็ต) */}
      <BottomNav activePage={activePage} setActivePage={setActivePage} />
    </div>
  );
}

export default App;