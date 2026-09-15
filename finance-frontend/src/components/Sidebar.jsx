// src/components/Sidebar.jsx
import React from 'react';
import { LayoutDashboard, PlusCircle, ChevronLeft, ChevronRight, Wallet, Coins, LogOut, User } from 'lucide-react';

export default function Sidebar({ isOpen, setIsOpen, activePage, setActivePage, user, onLogout }) {
    const menuItems = [
        { id: 'dashboard', icon: <LayoutDashboard size={22} />, label: 'หน้าหลัก' },
        { id: 'history', icon: <Wallet size={22} />, label: 'ประวัติธุรกรรม' },
        { id: 'transaction', icon: <PlusCircle size={22} />, label: 'บันทึกรายธุรกรรม' },
        { id: 'installment', icon: <Coins size={22} />, label: 'ตารางผ่อนชำระ' },
    ];

    return (
        <div className={`fixed top-0 left-0 h-full bg-indigo-700 border-r border-indigo-800 transition-all duration-300 z-50 flex flex-col ${isOpen ? 'w-72' : 'w-20'
            }`}>

            {/* ส่วนหัว Sidebar */}
            <div className="flex items-center justify-between p-6 mb-8">
                <div className={`flex flex-col leading-tight text-white font-black ${!isOpen && 'hidden'}`}>
                    <span>FINANCE APPLICATION</span>
                    <span className="text-indigo-300 text-sm">MANAGEMENT</span>
                </div>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white mx-auto"
                >
                    {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                </button>
            </div>

            {/* รายการเมนู */}
            <nav className="px-4 space-y-2 flex-1">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActivePage(item.id)}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${activePage === item.id
                            ? 'bg-white text-indigo-700 shadow-lg shadow-indigo-900/30'
                            : 'text-indigo-200 hover:bg-indigo-600 hover:text-white'
                            }`}
                    >
                        <div className="min-w-[24px]">{item.icon}</div>
                        <span className={`font-bold whitespace-nowrap ${!isOpen && 'hidden'}`}>
                            {item.label}
                        </span>
                    </button>
                ))}
            </nav>

            {/* Banner ผู้ใช้ + ออกจากระบบ */}
            <div className="p-4 border-t border-indigo-600 mt-auto">
                <div className={`flex items-center ${isOpen ? 'gap-3 justify-between' : 'justify-center'}`}>
                    <div className={`flex items-center gap-2 min-w-0 ${!isOpen && 'hidden'}`}>
                        <div className="min-w-[32px] w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center">
                            <User size={18} />
                        </div>
                        <span className="font-bold text-white truncate">{user?.username}</span>
                    </div>
                    <button
                        onClick={onLogout}
                        title="ออกจากระบบ"
                        className="p-2 rounded-xl text-red-300 hover:bg-indigo-600 hover:text-red-200 transition shrink-0"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}