import { useCallback, useEffect, useState } from 'react';
import { X, ArrowDownToLine, ArrowUpFromLine, Pencil, Trash2, Loader2, History, Wallet, CloudOff } from 'lucide-react';
import { formatMoney, formatDayLabel, formatTime } from '../../utils/format';
import { CategoryAvatar } from '../../utils/categoryIcons';
import { goalColor, goalStatusLine } from '../../utils/savingsTheme';
import { savingsApi } from '../../utils/savingsApi';
import GoalAvatar from './GoalAvatar';

const PAGE_SIZE = 20;
const money = (n) => `฿${formatMoney(n)}`;

// ป้ายประเภทรายการ
const MODE = {
    DEPOSIT: { label: 'ฝาก', sign: '+', amount: 'text-brand-600' },
    TO_WALLET: { label: 'ถอนกลับเข้ากระเป๋า', sign: '−', amount: 'text-slate-700' },
    SPEND: { label: 'ถอนไปใช้จ่าย', sign: '−', amount: 'text-expense-600' },
};

// drawer รายละเอียดกระปุก + ประวัติฝาก-ถอน
// reloadKey เปลี่ยน = โหลดประวัติใหม่ (หลังฝาก/ถอน/แก้/ลบ) · paused = มี modal/dialog ซ้อนอยู่
export default function GoalDetail({ goal, userId, reloadKey, paused, onClose, onDeposit, onWithdraw, onEditMovement, onDeleteMovement }) {
    const [items, setItems] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const load = useCallback(async (p) => {
        setLoading(true);
        setError(false);
        try {
            const data = await savingsApi('movements', { userId, savingsGoalId: goal.savingsGoalId, page: p, size: PAGE_SIZE });
            setItems((cur) => (p === 1 ? data.content : [...cur, ...data.content]));
            setPage(p);
            setTotalPages(data.totalPages || 1);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [userId, goal.savingsGoalId]);

    useEffect(() => { load(1); }, [load, reloadKey]);

    useEffect(() => {
        if (paused) return;
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [paused, onClose]);

    const c = goalColor(goal.color);
    const pct = goal.progress != null ? Math.min(goal.progress, 1) * 100 : null;
    const status = goalStatusLine(goal);

    return (
        <>
            <div onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/30 animate-fade-in" />
            <aside role="dialog" aria-modal="true" aria-label="รายละเอียดกระปุก" className="fixed top-0 right-0 bottom-0 z-40 w-[440px] max-w-full bg-white flex flex-col shadow-[-24px_0_48px_-16px_rgba(15,23,42,0.3)] animate-drawer-in">
                <div className="h-16 shrink-0 flex items-center justify-between pl-6 pr-3 border-b border-slate-100">
                    <span className="text-[17px] font-semibold text-slate-800">รายละเอียดกระปุก</span>
                    <button onClick={onClose} aria-label="ปิด" className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100">
                        <X size={20} />
                    </button>
                </div>

                <div className="shrink-0 px-6 py-5 border-b border-slate-100 flex flex-col gap-3">
                    <div className="flex items-center gap-3.5">
                        <GoalAvatar icon={goal.icon} color={goal.color} size={48} />
                        <div className="flex-1 min-w-0 flex flex-col">
                            <span className="text-base font-semibold text-slate-800 truncate">{goal.name}</span>
                            {goal.description && <span className="text-[13px] leading-[18px] text-slate-500 break-words">{goal.description}</span>}
                        </div>
                    </div>
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-[28px] leading-9 font-bold text-slate-900 tabular-nums">{money(goal.balance)}</span>
                        {goal.targetAmount != null && <span className="text-sm text-slate-500 tabular-nums">/ {money(goal.targetAmount)}</span>}
                    </div>
                    {pct != null && (
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div className={`h-full rounded-full ${goal.reached ? 'bg-income-500' : c.bar}`} style={{ width: `${pct}%` }} />
                        </div>
                    )}
                    {status && (
                        <span className={`flex items-center gap-1.5 text-[13px] ${status.tone}`}>
                            <status.Icon size={15} className="shrink-0" /> {status.text}
                        </span>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="h-10 px-6 flex items-center gap-1.5 bg-slate-50 border-b border-slate-100 text-[13px] font-semibold text-slate-600">
                        <History size={14} /> ประวัติฝาก-ถอน
                    </div>

                    {error ? (
                        <div className="py-10 px-6 flex flex-col items-center gap-2 text-center">
                            <span className="w-12 h-12 rounded-full bg-warn-50 flex items-center justify-center"><CloudOff size={22} className="text-warn-600" /></span>
                            <span className="text-sm font-semibold text-slate-800">โหลดประวัติไม่สำเร็จ</span>
                            <button onClick={() => load(1)} className="mt-1 h-10 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-brand-600 hover:bg-slate-50">ลองใหม่</button>
                        </div>
                    ) : items.length === 0 && loading ? (
                        <div aria-busy="true" className="animate-pulse">
                            {[0, 1, 2].map((i) => (
                                <div key={i} className="h-16 px-6 flex items-center gap-3 border-b border-slate-100">
                                    <span className="w-9 h-9 rounded-full bg-slate-200" />
                                    <span className="flex-1 h-3 rounded-full bg-slate-200" />
                                    <span className="w-16 h-3 rounded-full bg-slate-200" />
                                </div>
                            ))}
                        </div>
                    ) : items.length === 0 ? (
                        <div className="py-10 px-6 flex flex-col items-center gap-1 text-center">
                            <span className="text-sm font-semibold text-slate-800">ยังไม่มีรายการ</span>
                            <span className="text-[13px] text-slate-500">กด "ฝาก" เพื่อเริ่มเก็บเงินในกระปุกนี้</span>
                        </div>
                    ) : (
                        <>
                            {items.map((m) => {
                                const mode = MODE[m.mode] || MODE.DEPOSIT;
                                return (
                                    <div key={m.savingsMovementId} className="group min-h-16 px-6 py-2.5 flex items-center gap-3 border-b border-slate-100">
                                        {m.mode === 'SPEND' ? (
                                            <CategoryAvatar name={m.categoryIcon} size={36} />
                                        ) : (
                                            <span className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center ${m.mode === 'DEPOSIT' ? 'bg-brand-50 text-brand-600' : 'bg-slate-100 text-slate-600'}`}>
                                                {m.mode === 'DEPOSIT' ? <ArrowDownToLine size={17} /> : <Wallet size={17} />}
                                            </span>
                                        )}
                                        <div className="flex-1 min-w-0 flex flex-col">
                                            <span className="text-sm font-medium text-slate-800 truncate">
                                                {mode.label}{m.mode === 'SPEND' && m.categoryName ? ` · ${m.categoryName}` : ''}
                                            </span>
                                            <span className="text-xs text-slate-500 truncate">
                                                {formatDayLabel(m.movementDate)} · {formatTime(m.movementDate)}{m.note ? ` · ${m.note}` : ''}
                                            </span>
                                        </div>
                                        <span className={`shrink-0 text-[15px] font-semibold tabular-nums ${mode.amount}`}>{mode.sign}{formatMoney(m.amount)}</span>
                                        <div className="shrink-0 flex opacity-60 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => onEditMovement(m)} aria-label="แก้ไขรายการ" className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100">
                                                <Pencil size={15} />
                                            </button>
                                            <button onClick={() => onDeleteMovement(m)} aria-label="ลบรายการ" className="w-8 h-8 rounded-lg flex items-center justify-center text-expense-700 hover:bg-expense-50">
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            {page < totalPages && (
                                <button
                                    onClick={() => load(page + 1)}
                                    disabled={loading}
                                    className="w-full h-12 flex items-center justify-center gap-2 text-sm font-semibold text-brand-600 hover:bg-slate-50 disabled:text-slate-400"
                                >
                                    {loading && <Loader2 size={16} className="animate-spin" />} โหลดเพิ่ม
                                </button>
                            )}
                        </>
                    )}
                </div>

                <div className="shrink-0 grid grid-cols-2 gap-3 px-6 py-4 border-t border-slate-200">
                    <button
                        onClick={onWithdraw}
                        disabled={!(goal.balance > 0)}
                        className="h-12 rounded-xl border border-slate-200 bg-white text-slate-700 text-[15px] font-semibold flex items-center justify-center gap-2 hover:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                    >
                        <ArrowUpFromLine size={18} /> ถอน
                    </button>
                    <button onClick={onDeposit} className="h-12 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-[15px] font-semibold flex items-center justify-center gap-2">
                        <ArrowDownToLine size={18} /> ฝาก
                    </button>
                </div>
            </aside>
        </>
    );
}
