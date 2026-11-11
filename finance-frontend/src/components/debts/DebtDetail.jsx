import { useCallback, useEffect, useState } from 'react';
import { X, Pencil, Trash2, History, CloudOff, HandCoins } from 'lucide-react';
import { formatMoney, formatDayLabel, formatTime, formatShortDate } from '../../utils/format';
import { CategoryAvatar } from '../../utils/categoryIcons';
import { debtApi } from '../../utils/debtApi';
import { debtStatusLine } from '../../utils/debtTheme';

const money = (n) => `฿${formatMoney(n)}`;

// drawer รายละเอียดหนี้ + ประวัติการชำระ
// reloadKey เปลี่ยน = โหลดประวัติใหม่ (หลังจ่าย/แก้/ลบ) · paused = มี modal/dialog ซ้อนอยู่
export default function DebtDetail({ debt, reloadKey, paused, onClose, onPay, onEditPayment, onDeletePayment }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            setItems(await debtApi('payments', { debtId: debt.debtId }) || []);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [debt.debtId]);

    useEffect(() => { load(); }, [load, reloadKey]);

    useEffect(() => {
        if (paused) return;
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [paused, onClose]);

    const pct = Math.min(debt.progress || 0, 1) * 100;
    const status = debtStatusLine(debt);
    const paid = debt.status === 'PAID';

    return (
        <>
            <div onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/30 animate-fade-in" />
            <aside role="dialog" aria-modal="true" aria-label="รายละเอียดหนี้" className="fixed top-0 right-0 bottom-0 z-40 w-[440px] max-w-full bg-white flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-[-24px_0_48px_-16px_rgba(15,23,42,0.3)] animate-drawer-in">
                <div className="h-16 shrink-0 flex items-center justify-between pl-4 sm:pl-6 pr-3 border-b border-slate-100">
                    <span className="text-[17px] font-semibold text-slate-800">รายละเอียดหนี้</span>
                    <button onClick={onClose} aria-label="ปิด" className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100">
                        <X size={20} />
                    </button>
                </div>

                <div className="shrink-0 px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex flex-col gap-3">
                    <div className="flex items-center gap-3.5">
                        <CategoryAvatar name="HandCoins" size={48} />
                        <div className="flex-1 min-w-0 flex flex-col">
                            <span className="text-base font-semibold text-slate-800 truncate">{debt.creditorName}</span>
                            <span className="text-[13px] leading-[18px] text-slate-500 break-words">
                                {debt.description || `ยืมเมื่อ ${formatShortDate(debt.borrowDate)}`}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className={`text-[28px] leading-9 font-bold tabular-nums ${paid ? 'text-income-600' : 'text-slate-900'}`}>{money(debt.remaining)}</span>
                        <span className="text-sm text-slate-500 tabular-nums">คงเหลือ จาก {money(debt.totalAmount)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full rounded-full ${paid ? 'bg-income-500' : 'bg-rose-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className={`flex items-center gap-1.5 text-[13px] ${status.tone}`}>
                        <status.Icon size={15} className="shrink-0" /> {status.text}
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="h-10 px-4 sm:px-6 flex items-center gap-1.5 bg-slate-50 border-b border-slate-100 text-[13px] font-semibold text-slate-600">
                        <History size={14} /> ประวัติการชำระ
                        <span className="flex-1" />
                        <span className="font-normal tabular-nums">จ่ายแล้ว {money(debt.paidAmount)}</span>
                    </div>

                    {error ? (
                        <div className="py-10 px-6 flex flex-col items-center gap-2 text-center">
                            <span className="w-12 h-12 rounded-full bg-warn-50 flex items-center justify-center"><CloudOff size={22} className="text-warn-600" /></span>
                            <span className="text-sm font-semibold text-slate-800">โหลดประวัติไม่สำเร็จ</span>
                            <button onClick={load} className="mt-1 h-10 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-brand-600 hover:bg-slate-50">ลองใหม่</button>
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
                            <span className="text-sm font-semibold text-slate-800">ยังไม่มีการชำระ</span>
                            <span className="text-[13px] text-slate-500">กด "ชำระเงิน" เมื่อจ่ายคืน ระบบจะลงรายจ่ายให้อัตโนมัติ</span>
                        </div>
                    ) : (
                        items.map((p) => (
                            <div key={p.debtPaymentId} className="group min-h-16 pl-4 pr-2 sm:px-6 py-2.5 flex items-center gap-3 border-b border-slate-100">
                                <span className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center bg-expense-50 text-expense-600">
                                    <HandCoins size={17} />
                                </span>
                                <div className="flex-1 min-w-0 flex flex-col">
                                    <span className="text-sm font-medium text-slate-800 truncate">{p.note || 'ชำระหนี้'}</span>
                                    <span className="text-xs text-slate-500 truncate">
                                        {formatDayLabel(p.paymentDate)} · {formatTime(p.paymentDate)}
                                    </span>
                                </div>
                                <span className="shrink-0 text-[15px] font-semibold tabular-nums text-expense-600">−{formatMoney(p.amount)}</span>
                                <div className="shrink-0 flex opacity-60 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => onEditPayment(p)} aria-label="แก้ไขรายการ" className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100">
                                        <Pencil size={15} />
                                    </button>
                                    <button onClick={() => onDeletePayment(p)} aria-label="ลบรายการ" className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-expense-700 hover:bg-expense-50">
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {!paid && (
                    <div className="shrink-0 px-4 sm:px-6 py-4 border-t border-slate-200">
                        <button onClick={onPay} className="w-full h-12 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-[15px] font-semibold flex items-center justify-center gap-2">
                            <HandCoins size={18} /> ชำระเงิน
                        </button>
                    </div>
                )}
            </aside>
        </>
    );
}
