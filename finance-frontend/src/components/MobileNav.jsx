// src/components/MobileNav.jsx
// เมนูสำหรับจอเล็กกว่า lg (มือถือ / แท็บเล็ต): แถบหัวด้านบน + แถบเมนูด้านล่าง
import React from 'react';
import { LogOut, User } from 'lucide-react';
import { navItems } from './navItems';

export function MobileHeader({ user, onLogout }) {
    return (
        <header className="lg:hidden sticky top-0 z-30 bg-brand-600 text-white pt-[env(safe-area-inset-top)]">
            <div className="h-14 flex items-center justify-between gap-3 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))]">
                <div className="flex flex-col leading-tight font-black text-sm">
                    <span>FINANCE APPLICATION</span>
                    <span className="text-gold-400 text-[11px] tracking-widest">MANAGEMENT</span>
                </div>
                <div className="flex items-center gap-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="shrink-0 w-7 h-7 rounded-full bg-gold-400 text-brand-700 flex items-center justify-center">
                            <User size={16} />
                        </div>
                        <span className="font-bold text-sm truncate max-w-[110px]">{user?.username}</span>
                    </div>
                    <button
                        onClick={onLogout}
                        title="ออกจากระบบ"
                        aria-label="ออกจากระบบ"
                        className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-expense-300 active:bg-brand-500"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </div>
        </header>
    );
}

export function BottomNav({ activePage, setActivePage }) {
    return (
        <nav
            aria-label="เมนูหลัก"
            className="lg:hidden fixed inset-x-0 bottom-0 z-30 bg-white border-t border-slate-200 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.15)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
        >
            <ul className="h-16 grid grid-cols-5 max-w-xl mx-auto">
                {navItems.map(({ id, Icon, shortLabel }) => {
                    const active = activePage === id;
                    return (
                        <li key={id}>
                            <button
                                onClick={() => setActivePage(id)}
                                aria-current={active ? 'page' : undefined}
                                className={`w-full h-full flex flex-col items-center justify-center gap-1 transition-colors ${active ? 'text-brand-600' : 'text-slate-400 active:text-slate-600'}`}
                            >
                                <span className={`flex items-center justify-center w-12 h-7 rounded-full transition-colors ${active ? 'bg-gold-100' : ''}`}>
                                    <Icon size={21} strokeWidth={active ? 2.4 : 2} />
                                </span>
                                <span className={`text-[11px] leading-none whitespace-nowrap ${active ? 'font-bold' : 'font-medium'}`}>
                                    {shortLabel}
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
