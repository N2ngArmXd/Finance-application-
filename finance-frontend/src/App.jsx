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
import { AUTH_EXPIRED_EVENT, fetchCurrentUser, logout } from './utils/auth';

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

  // เปิดแอป: ให้ backend ตรวจ cookie (JWT) — ไม่เชื่อข้อมูลใน localStorage
  const [checkingSession, setCheckingSession] = useState(true);
  useEffect(() => {
    localStorage.removeItem('user'); // ของเดิมก่อนใช้ JWT — ไม่ใช้แล้ว
    fetchCurrentUser().then(me => {
      setUser(me);
      setCheckingSession(false);
    });
  }, []);

  // API ไหนตอบ 401 (token หมดอายุ/ไม่ถูกต้อง) → กลับหน้า login
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setActivePage('dashboard');
  };

  if (checkingSession) {
    return <div className="min-h-dvh bg-white" />;
  }

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
            <DashboardPage onOpenInstallment={openInstallment} onOpenSavings={openSavings} />
          )}

          {activePage === 'transaction' && (
            <TransactionPage onNavigate={setActivePage} />
          )}
          {activePage === 'history' && (
            <HistoryPage onNavigate={setActivePage} onOpenSavings={openSavings} />
          )}
          {activePage === 'savings' && (
            <Savings
              focusId={savingsFocusId}
              onFocusHandled={() => setSavingsFocusId(null)}
            />
          )}
          {activePage === 'installment' && (
            <Installments
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