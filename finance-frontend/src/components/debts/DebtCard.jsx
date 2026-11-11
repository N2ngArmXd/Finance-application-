import { useEffect, useRef, useState } from 'react';
import { Ellipsis, Pencil, Trash2, HandCoins, History, LayoutDashboard } from 'lucide-react';
import { formatMoney } from '../../utils/format';
import { CategoryAvatar } from '../../utils/categoryIcons';
import { debtStatusLine } from '../../utils/debtTheme';

const money = (n) => `฿${formatMoney(n)}`;

export default function DebtCard({ debt, highlight, onOpen, onPay, onEdit, onDelete }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        if (!menuOpen) return;
        const onDown = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
        const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
        document.addEventListener('mousedown', onDown);
        window.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            window.removeEventListener('keydown', onKey);
        };
    }, [menuOpen]);

    const pct = Math.min(debt.progress || 0, 1) * 100;
    const status = debtStatusLine(debt);
    const stop = (fn) => (e) => { e.stopPropagation(); setMenuOpen(false); fn(); };

    return (
        <div
            id={`debt-${debt.debtId}`}
            onClick={onOpen}
            className={`scroll-mt-20 lg:scroll-mt-6 relative bg-white border rounded-2xl flex flex-col cursor-pointer transition-shadow hover:shadow-[0_4px_16px_-6px_rgba(15,23,42,0.12)] ${highlight
                ? 'border-gold-400 shadow-[0_0_0_3px_var(--color-gold-100)]'
                : debt.overdue ? 'border-expense-200 shadow-[0_1px_2px_rgba(15,23,42,0.04)]' : 'border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.04)]'}`}
        >
            {highlight && (
                <div className="flex items-center gap-1.5 px-4 sm:px-5 py-2 bg-gold-50 border-b border-gold-100 rounded-t-[15px] text-xs font-semibold text-gold-700">
                    <LayoutDashboard size={14} /> เปิดจากหน้าอื่น
                </div>
            )}

            <div className="p-4 sm:p-5 flex flex-col gap-3.5 flex-1">
                <div className="flex items-start gap-3">
                    <CategoryAvatar name="HandCoins" size={44} />
                    <div className="flex-1 min-w-0 flex flex-col">
                        <span className="text-base font-semibold text-slate-800 truncate">{debt.creditorName}</span>
                        <span className="text-xs leading-[18px] text-slate-500 line-clamp-2 break-words" title={debt.description || undefined}>
                            {debt.description || (debt.paymentCount > 0 ? `จ่ายแล้ว ${debt.paymentCount} ครั้ง` : 'ยังไม่ได้จ่าย')}
                        </span>
                    </div>
                    <div ref={menuRef} className="relative -mr-2 -mt-1">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
                            aria-label="เพิ่มเติม"
                            aria-expanded={menuOpen}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 ${menuOpen ? 'bg-slate-100' : ''}`}
                        >
                            <Ellipsis size={20} />
                        </button>
                        {menuOpen && (
                            <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-11 z-10 w-[200px] p-1.5 bg-white border border-slate-200 rounded-xl shadow-[0_12px_32px_-8px_rgba(15,23,42,0.22)] flex flex-col animate-fade-in">
                                <button type="button" onClick={stop(onEdit)} className="h-10 px-2.5 rounded-lg flex items-center gap-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                                    <Pencil size={18} /> แก้ไข
                                </button>
                                <button type="button" onClick={stop(onOpen)} className="h-10 px-2.5 rounded-lg flex items-center gap-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                                    <History size={18} /> ประวัติการชำระ
                                </button>
                                <button type="button" onClick={stop(onDelete)} className="h-10 mt-1 px-2.5 rounded-lg border-t border-slate-100 flex items-center gap-2.5 text-sm font-medium text-expense-700 hover:bg-slate-50">
                                    <Trash2 size={18} /> ลบรายการหนี้
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <div className="flex items-baseline justify-between gap-2 flex-wrap">
                        <span className="flex flex-col">
                            <span className="text-xs text-slate-500">คงเหลือ</span>
                            <span className={`text-2xl font-bold tabular-nums ${debt.status === 'PAID' ? 'text-income-600' : 'text-slate-900'}`}>{money(debt.remaining)}</span>
                        </span>
                        <span className="text-[13px] text-slate-500 tabular-nums">
                            จ่ายแล้ว {money(debt.paidAmount)} / {money(debt.totalAmount)}
                        </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${debt.status === 'PAID' ? 'bg-income-500' : 'bg-rose-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                </div>

                <span className={`flex items-center gap-1.5 text-[13px] ${status.tone}`}>
                    <status.Icon size={15} className="shrink-0" />
                    <span className="truncate">{status.text}</span>
                </span>
            </div>

            {debt.status !== 'PAID' && (
                <div className="px-4 sm:px-5 pb-4 sm:pb-5">
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onPay(); }}
                        className="w-full h-11 sm:h-10 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold flex items-center justify-center gap-1.5"
                    >
                        <HandCoins size={16} /> ชำระเงิน
                    </button>
                </div>
            )}
        </div>
    );
}
