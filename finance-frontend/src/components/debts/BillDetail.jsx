import { useCallback, useEffect, useState } from 'react';
import { X, Pencil, Undo2, CloudOff, CircleCheck, HandCoins, Receipt, Trash2, Users } from 'lucide-react';
import { formatMoney, formatDayLabel, formatShortDate } from '../../utils/format';
import { CategoryAvatar } from '../../utils/categoryIcons';
import { debtApi } from '../../utils/debtApi';

const money = (n) => `฿${formatMoney(n)}`;

// drawer รายละเอียดบิลหาร: รายชื่อคนที่ต้องคืน + สถานะ + ประวัติรับเงินของแต่ละคน
// reloadKey เปลี่ยน = โหลดประวัติใหม่ · paused = มี modal/dialog ซ้อนอยู่
export default function BillDetail({ bill, reloadKey, paused, onClose, onReceive, onEditPayment, onDeletePayment, onEdit, onDelete }) {
    const [payments, setPayments] = useState({}); // debtId -> [payment]
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const memberIds = bill.members.map((m) => m.debtId).join(',');
    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const ids = memberIds ? memberIds.split(',').map(Number) : [];
            const lists = await Promise.all(ids.map((debtId) => debtApi('payments', { debtId })));
            setPayments(Object.fromEntries(ids.map((id, i) => [id, lists[i] || []])));
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [memberIds]);

    useEffect(() => { load(); }, [load, reloadKey]);

    useEffect(() => {
        if (paused) return;
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [paused, onClose]);

    const pct = bill.toCollect > 0 ? Math.min(bill.collected / bill.toCollect, 1) * 100 : 0;
    const done = bill.memberCount > 0 && bill.paidCount === bill.memberCount;

    return (
        <>
            <div onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/30 animate-fade-in" />
            <aside role="dialog" aria-modal="true" aria-label="รายละเอียดบิล" className="fixed top-0 right-0 bottom-0 z-40 w-[460px] max-w-full bg-white flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-[-24px_0_48px_-16px_rgba(15,23,42,0.3)] animate-drawer-in">
                <div className="h-16 shrink-0 flex items-center justify-between pl-4 sm:pl-6 pr-3 border-b border-slate-100">
                    <span className="text-[17px] font-semibold text-slate-800">รายละเอียดบิล</span>
                    <button onClick={onClose} aria-label="ปิด" className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex flex-col gap-3">
                        <div className="flex items-center gap-3.5">
                            <span className="w-12 h-12 shrink-0 rounded-full bg-income-50 flex items-center justify-center">
                                <Users size={22} className="text-income-600" />
                            </span>
                            <div className="flex-1 min-w-0 flex flex-col">
                                <span className="text-base font-semibold text-slate-800 truncate">{bill.title}</span>
                                <span className="text-[13px] leading-[18px] text-slate-500 break-words">
                                    {formatShortDate(bill.billDate)} · บิล {money(bill.totalAmount)}{bill.note ? ` · ${bill.note}` : ''}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span className={`text-[28px] leading-9 font-bold tabular-nums ${done ? 'text-income-600' : 'text-slate-900'}`}>{money(bill.collected)}</span>
                            <span className="text-sm text-slate-500 tabular-nums">ได้คืนแล้ว จาก {money(bill.toCollect)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full rounded-full bg-income-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[13px]">
                            <div className="px-3 py-2 rounded-xl bg-slate-50 flex flex-col">
                                <span className="text-slate-500">ส่วนของเรา</span>
                                <span className="font-semibold tabular-nums text-slate-800">{bill.includeSelf ? money(bill.selfShare) : 'ไม่ได้หาร'}</span>
                            </div>
                            <div className="px-3 py-2 rounded-xl bg-slate-50 flex flex-col min-w-0">
                                <span className="text-slate-500">รายจ่ายยอดเต็ม</span>
                                {bill.transactionId ? (
                                    <span className="flex items-center gap-1.5 min-w-0 font-semibold text-slate-800">
                                        <CategoryAvatar name={bill.categoryIcon} size={18} />
                                        <span className="truncate">{bill.categoryName}</span>
                                    </span>
                                ) : (
                                    <span className="font-semibold text-slate-500">ไม่ได้ลง</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="h-10 px-4 sm:px-6 flex items-center gap-1.5 bg-slate-50 border-b border-slate-100 text-[13px] font-semibold text-slate-600">
                        <HandCoins size={14} /> คนที่ต้องคืน
                        <span className="flex-1" />
                        <span className="font-normal">คืนครบ {bill.paidCount}/{bill.memberCount} คน</span>
                    </div>

                    {error ? (
                        <div className="py-10 px-6 flex flex-col items-center gap-2 text-center">
                            <span className="w-12 h-12 rounded-full bg-warn-50 flex items-center justify-center"><CloudOff size={22} className="text-warn-600" /></span>
                            <span className="text-sm font-semibold text-slate-800">โหลดประวัติไม่สำเร็จ</span>
                            <button onClick={load} className="mt-1 h-10 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-brand-600 hover:bg-slate-50">ลองใหม่</button>
                        </div>
                    ) : (
                        bill.members.map((m) => {
                            const paid = m.status === 'PAID';
                            const list = payments[m.debtId] || [];
                            return (
                                <div key={m.debtId} className="px-4 sm:px-6 py-3 border-b border-slate-100 flex flex-col gap-2">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-sm font-bold ${paid ? 'bg-income-50 text-income-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {paid ? <CircleCheck size={18} /> : m.creditorName.trim().charAt(0)}
                                        </span>
                                        <div className="flex-1 min-w-0 flex flex-col">
                                            <span className="text-[15px] font-semibold text-slate-800 truncate">{m.creditorName}</span>
                                            <span className="text-xs text-slate-500 tabular-nums">
                                                ส่วนที่ต้องคืน {money(m.totalAmount)}
                                                {!paid && m.paidAmount > 0 && <> · <span className="text-income-700 font-semibold">ได้แล้ว {money(m.paidAmount)}</span></>}
                                            </span>
                                        </div>
                                        {paid ? (
                                            <span className="shrink-0 h-8 px-2.5 rounded-full bg-income-50 text-income-700 text-xs font-semibold flex items-center gap-1">
                                                <CircleCheck size={14} /> คืนครบ
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => onReceive(m)}
                                                className="shrink-0 h-9 px-3 rounded-xl bg-income-600 hover:bg-income-700 text-white text-sm font-semibold flex items-center gap-1.5"
                                            >
                                                <HandCoins size={15} /> รับเงิน
                                                {m.paidAmount > 0 && <span className="tabular-nums font-normal opacity-90">{money(m.remaining)}</span>}
                                            </button>
                                        )}
                                    </div>

                                    {/* ประวัติรับเงินของคนนี้ */}
                                    {loading && list.length === 0 ? (
                                        m.paymentCount > 0 && <div aria-busy="true" className="ml-12 h-8 rounded-lg bg-slate-50 animate-pulse" />
                                    ) : list.map((p) => (
                                        <div key={p.debtPaymentId} className="group ml-12 min-h-9 pl-2.5 pr-1 rounded-lg bg-slate-50 flex items-center gap-2 text-[13px]">
                                            <Receipt size={13} className="shrink-0 text-income-600" />
                                            <span className="flex-1 min-w-0 truncate text-slate-600">
                                                {formatDayLabel(p.paymentDate)}{p.note ? ` · ${p.note}` : ''}
                                            </span>
                                            <span className="shrink-0 font-semibold tabular-nums text-income-600">+{formatMoney(p.amount)}</span>
                                            <button onClick={() => onEditPayment(m, p)} aria-label="แก้ไขยอดที่รับ" className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200">
                                                <Pencil size={14} />
                                            </button>
                                            <button onClick={() => onDeletePayment(m, p)} aria-label="ยกเลิกรายการรับเงิน" title="ยกเลิกรับเงิน" className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-expense-700 hover:bg-expense-50">
                                                <Undo2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="shrink-0 grid grid-cols-[auto_1fr] gap-3 px-4 sm:px-6 py-4 border-t border-slate-200">
                    <button onClick={onDelete} aria-label="ลบบิล" className="h-12 px-4 rounded-xl bg-expense-50 text-expense-700 text-[15px] font-semibold flex items-center justify-center gap-2 hover:bg-expense-100">
                        <Trash2 size={18} /> <span className="hidden sm:inline">ลบบิล</span>
                    </button>
                    <button onClick={onEdit} className="h-12 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-[15px] font-semibold flex items-center justify-center gap-2">
                        <Pencil size={18} /> แก้ไขบิล
                    </button>
                </div>
            </aside>
        </>
    );
}
