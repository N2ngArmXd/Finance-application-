// src/components/Sidebar.jsx
import React from 'react';
import { LayoutDashboard, PlusCircle, ChevronLeft, ChevronRight, Wallet } from 'lucide-react';

export default function Sidebar({ isOpen, setIsOpen, activePage, setActivePage }) {
    const menuItems = [
        { id: 'dashboard', icon: <LayoutDashboard size={22} />, label: 'หน้าหลัก' },
        { id: 'history', icon: <Wallet size={22} />, label: 'ประวัติธุรกรรม' },
        { id: 'transaction', icon: <PlusCircle size={22} />, label: 'บันทึกรายธุรกรรม' },
    ];

    return (
        <div className={`fixed top-0 left-0 h-full bg-white border-r border-slate-100 transition-all duration-300 z-50 ${isOpen ? 'w-72' : 'w-20'
            }`}>

            {/* ส่วนหัว Sidebar */}
            <div className="flex items-center justify-between p-6 mb-8">
                <div className={`flex flex-col leading-tight text-indigo-700 font-black ${!isOpen && 'hidden'}`}>
                    <span>FINANCE APPLICATION</span>
                    <span className="text-indigo-400 text-sm">MANAGEMENT</span>
                </div>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 mx-auto"
                >
                    {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                </button>
            </div>

            {/* รายการเมนู */}
            <nav className="px-4 space-y-2">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActivePage(item.id)}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${activePage === item.id
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                            : 'text-slate-500 hover:bg-slate-50'
                            }`}
                    >
                        <div className="min-w-[24px]">{item.icon}</div>
                        <span className={`font-bold whitespace-nowrap ${!isOpen && 'hidden'}`}>
                            {item.label}
                        </span>
                    </button>
                ))}
            </nav>
        </div>
    );
}