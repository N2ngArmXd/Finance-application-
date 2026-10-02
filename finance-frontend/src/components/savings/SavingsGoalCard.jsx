import { useEffect, useRef, useState } from 'react';
import { Ellipsis, Pencil, Archive, Trash2, ArrowDownToLine, ArrowUpFromLine, LayoutDashboard } from 'lucide-react';
import { formatMoney } from '../../utils/format';
import { goalColor, goalStatusLine } from '../../utils/savingsTheme';
import GoalAvatar from './GoalAvatar';

const money = (n) => `฿${formatMoney(n)}`;

export default function SavingsGoalCard({ goal, highlight, onOpen, onDeposit, onWithdraw, onEdit, onArchive, onDelete }) {
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

    const c = goalColor(goal.color);
    const pct = goal.progress != null ? Math.min(goal.progress, 1) * 100 : null;
    const status = goalStatusLine(goal);
    const stop = (fn) => (e) => { e.stopPropagation(); setMenuOpen(false); fn(); };

    return (
        <div
            id={`goal-${goal.savingsGoalId}`}
            onClick={onOpen}
            className={`scroll-mt-6 relative bg-white border rounded-2xl flex flex-col cursor-pointer transition-shadow hover:shadow-[0_4px_16px_-6px_rgba(15,23,42,0.12)] ${highlight
                ? 'border-gold-400 shadow-[0_0_0_3px_var(--color-gold-100)]'
                : 'border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.04)]'}`}
        >
            {highlight && (
                <div className="flex items-center gap-1.5 px-5 py-2 bg-gold-50 border-b border-gold-100 rounded-t-[15px] text-xs font-semibold text-gold-700">
                    <LayoutDashboard size={14} /> เปิดจากหน้าอื่น
                </div>
            )}

            <div className="p-5 flex flex-col gap-3.5 flex-1">
                <div className="flex items-start gap-3">
                    <GoalAvatar icon={goal.icon} color={goal.color} size={44} />
                    <div className="flex-1 min-w-0 flex flex-col">
                        <span className="text-base font-semibold text-slate-800 truncate">{goal.name}</span>
                        <span className="text-xs leading-[18px] text-slate-500 line-clamp-2 break-words" title={goal.description || undefined}>
                            {goal.description || (goal.depositedThisMonth > 0 ? `เดือนนี้ฝาก ${money(goal.depositedThisMonth)}` : 'เดือนนี้ยังไม่ได้ฝาก')}
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
                                <button type="button" onClick={stop(onArchive)} className="h-10 px-2.5 rounded-lg flex items-center gap-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                                    <Archive size={18} /> ปิดกระปุก
                                </button>
                                <button type="button" onClick={stop(onDelete)} className="h-10 mt-1 px-2.5 rounded-lg border-t border-slate-100 flex items-center gap-2.5 text-sm font-medium text-expense-700 hover:bg-slate-50">
                                    <Trash2 size={18} /> ลบกระปุก
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <div className="flex items-baseline justify-between gap-2 flex-wrap">
                        <span className="text-2xl font-bold text-slate-900 tabular-nums">{money(goal.balance)}</span>
                        {goal.targetAmount != null && (
                            <span className="text-[13px] text-slate-500 tabular-nums">
                                จาก {money(goal.targetAmount)} · <b className={`font-semibold ${goal.reached ? 'text-income-600' : 'text-slate-700'}`}>{Math.floor(goal.progress * 100)}%</b>
                            </span>
                        )}
                    </div>
                    {pct != null ? (
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${goal.reached ? 'bg-income-500' : c.bar}`} style={{ width: `${pct}%` }} />
                        </div>
                    ) : (
                        <span className="text-xs text-slate-500">ไม่กำหนดเป้า · เก็บไปเรื่อย ๆ</span>
                    )}
                </div>

                {status && (
                    <span className={`flex items-center gap-1.5 text-[13px] ${status.tone}`}>
                        <status.Icon size={15} className="shrink-0" />
                        <span className="truncate">{status.text}</span>
                    </span>
                )}
            </div>

            <div className="grid grid-cols-2 gap-2 px-5 pb-5">
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDeposit(); }}
                    className="h-10 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold flex items-center justify-center gap-1.5"
                >
                    <ArrowDownToLine size={16} /> ฝาก
                </button>
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onWithdraw(); }}
                    disabled={!(goal.balance > 0)}
                    className="h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold flex items-center justify-center gap-1.5 disabled:text-slate-400 disabled:hover:bg-white disabled:cursor-not-allowed"
                >
                    <ArrowUpFromLine size={16} /> ถอน
                </button>
            </div>
        </div>
    );
}
