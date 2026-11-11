import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, HandCoins, ChevronDown, ChevronUp, Trash2, Pencil, Receipt, TriangleAlert, Info, Users } from 'lucide-react';
import { formatMoney, formatShortDate, toDateInput } from '../utils/format';
import { debtApi } from '../utils/debtApi';
import { toMovementDateTime } from '../utils/savingsApi';
import { CategoryAvatar } from '../utils/categoryIcons';
import DebtCard from './debts/DebtCard';
import DebtForm from './debts/DebtForm';
import PaymentForm from './debts/PaymentForm';
import DebtDetail from './debts/DebtDetail';
import BillSplit from './debts/BillSplit';
import ConfirmDialog from './ui/ConfirmDialog';
import { Toast } from './ui/Toast';
import { useToast } from './ui/useToast';

const money = (n) => `฿${formatMoney(n)}`;
const thisMonthKey = () => toDateInput(new Date()).slice(0, 7);

const emptyDebtForm = () => ({
    creditorName: '',
    totalAmount: '',
    borrowDate: toDateInput(new Date()),
    dueDate: '',
    description: '',
});

// ข้อความ/ตารางสรุปของ dialog ยืนยันแต่ละแบบ
const dialogProps = (d) => {
    if (!d) return {};
    const debt = d.debt;
    if (d.kind === 'payment') {
        const amount = parseFloat(d.values.amount);
        const rows = [
            { k: 'ติดหนี้', v: debt.creditorName },
            { k: 'ยอดที่จ่าย', v: money(amount), tone: 'expense' },
            { k: 'วันที่', v: formatShortDate(d.values.date) },
        ];
        if (d.payment) {
            return {
                tone: 'brand', icon: Pencil, title: 'บันทึกการแก้ไขรายการชำระ?', rows,
                note: 'รายจ่ายที่ผูกอยู่ในประวัติธุรกรรมจะถูกแก้ตามไปด้วย', noteIcon: Receipt,
                confirmLabel: 'บันทึก', busyLabel: 'กำลังบันทึก…',
            };
        }
        const remaining = debt.remaining - amount;
        return {
            tone: 'brand', icon: HandCoins, title: 'ยืนยันการชำระหนี้?',
            rows: [...rows, { k: 'คงเหลือหลังจ่าย', v: remaining <= 0.0001 ? 'ชำระครบ' : money(remaining) }],
            note: `จะเพิ่มรายจ่าย ${money(amount)} หมวด "ชำระหนี้" และหักจากยอดสุทธิ`, noteIcon: Receipt,
            confirmLabel: 'ชำระเงิน', busyLabel: 'กำลังบันทึก…',
        };
    }
    if (d.kind === 'deletePayment') {
        const p = d.payment;
        return {
            tone: 'danger', icon: Trash2, title: 'ลบรายการชำระนี้?', text: 'ยอดหนี้คงเหลือจะเพิ่มกลับมา',
            rows: [
                { k: 'ติดหนี้', v: debt.creditorName },
                { k: 'ยอดที่จ่าย', v: money(p.amount) },
                { k: 'วันที่', v: formatShortDate(new Date(p.paymentDate)) },
            ],
            note: 'จะลบรายจ่ายที่ผูกอยู่ในประวัติธุรกรรมด้วย', noteTone: 'warn', noteIcon: TriangleAlert,
            confirmLabel: 'ลบ', busyLabel: 'กำลังลบ…',
        };
    }
    // deleteDebt
    return {
        tone: 'danger', icon: Trash2, title: `ลบหนี้ "${debt.creditorName}"?`, text: 'รายการหนี้จะถูกซ่อนออกจากหน้านี้',
        rows: [
            { k: 'ยอดหนี้', v: money(debt.totalAmount) },
            { k: 'จ่ายแล้ว', v: money(debt.paidAmount) },
        ],
        note: debt.paidAmount > 0 ? 'รายจ่ายชำระหนี้ที่บันทึกไปแล้วยังอยู่ในประวัติธุรกรรม (ยอดสุทธิไม่เปลี่ยน)' : undefined,
        noteIcon: Info,
        confirmLabel: 'ลบ', busyLabel: 'กำลังลบ…',
    };
};

// focusId = หนี้ฝั่งเราติดหนี้ที่ต้องไฮไลต์ · focusGroupId = บิลหารที่ต้องเปิด (มาจากหน้าประวัติธุรกรรม)
export default function Debts({ focusId, focusGroupId, onFocusHandled }) {
    const [tab, setTab] = useState(focusGroupId != null ? 'bills' : 'payable');
    const [debts, setDebts] = useState([]);
    const [summary, setSummary] = useState(null);
    const [fetching, setFetching] = useState(true);
    const [showPaid, setShowPaid] = useState(false);
    const [highlightId, setHighlightId] = useState(null);

    const [debtForm, setDebtForm] = useState(null);       // { mode, debt?, initial }
    const [paymentForm, setPaymentForm] = useState(null); // { debtId, payment? }
    const [detailId, setDetailId] = useState(null);
    const [historyKey, setHistoryKey] = useState(0);
    const [dialog, setDialog] = useState(null);
    const [dialogBusy, setDialogBusy] = useState(false);
    const [toast, showToast] = useToast();

    const fetchAll = useCallback(async () => {
        setFetching(true);
        try {
            const [list, dash] = await Promise.all([
                debtApi('list'),
                fetch('/api/finance-app/dashboard/summary', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ month: thisMonthKey() }),
                }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
            ]);
            setDebts(list || []);
            setSummary(dash);
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setFetching(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    // หนี้ค้างจ่าย: เลยกำหนดขึ้นก่อน -> ใกล้กำหนด -> ไม่กำหนด
    const activeDebts = useMemo(() => debts
        .filter((d) => d.status !== 'PAID')
        .sort((a, b) => (b.overdue - a.overdue) || (a.dueDate || '9999').localeCompare(b.dueDate || '9999')), [debts]);
    const paidDebts = useMemo(() => debts.filter((d) => d.status === 'PAID'), [debts]);
    const debtById = (id) => debts.find((d) => d.debtId === id);
    const detailDebt = detailId != null ? debtById(detailId) : null;
    const paymentDebt = paymentForm ? debtById(paymentForm.debtId) : null;

    // เปิดหนี้ที่ส่งมาจากหน้าอื่น (ประวัติธุรกรรม)
    useEffect(() => {
        if (fetching || focusId == null) return;
        const target = debts.find((d) => d.debtId === focusId);
        if (target) {
            if (target.status === 'PAID') setShowPaid(true);
            setHighlightId(focusId);
            requestAnimationFrame(() => {
                document.getElementById(`debt-${focusId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
        }
        onFocusHandled?.();
    }, [fetching, focusId]);

    const afterChange = async (message) => {
        showToast(message);
        setHistoryKey((k) => k + 1);
        await fetchAll();
    };

    // ---------- หนี้ ----------
    const openCreate = () => setDebtForm({ mode: 'create', initial: emptyDebtForm() });
    const openEdit = (d) => setDebtForm({
        mode: 'edit',
        debt: d,
        initial: {
            creditorName: d.creditorName || '',
            totalAmount: String(d.totalAmount),
            borrowDate: d.borrowDate || toDateInput(new Date()),
            dueDate: d.dueDate || '',
            description: d.description || '',
        },
    });

    const saveDebt = async (values) => {
        const payload = {
            creditorName: values.creditorName.trim(),
            totalAmount: parseFloat(values.totalAmount),
            borrowDate: values.borrowDate,
            dueDate: values.dueDate || null,
            description: values.description.trim() || null,
        };
        try {
            if (debtForm.mode === 'edit') {
                await debtApi('update', { ...payload, debtId: debtForm.debt.debtId });
            } else {
                await debtApi('create', payload);
            }
            setDebtForm(null);
            await afterChange(debtForm.mode === 'edit' ? 'บันทึกการแก้ไขรายการหนี้แล้ว' : `เพิ่มหนี้ "${payload.creditorName}" แล้ว`);
        } catch (error) {
            showToast(error.message, 'error');
        }
    };

    // ---------- ชำระ ----------
    const openPayment = (d, payment = null) => setPaymentForm({ debtId: d.debtId, payment });
    const submitPayment = (values) => setDialog({ kind: 'payment', debt: paymentDebt, payment: paymentForm.payment, values });

    const runPayment = async (d) => {
        const { values, payment } = d;
        const amount = parseFloat(values.amount);
        const note = values.note.trim() || null;
        if (payment) {
            // วันที่ไม่เปลี่ยน -> ส่งเวลาเดิมกลับไป
            const sameDay = toDateInput(new Date(payment.paymentDate)) === values.date;
            await debtApi('payment/update', {
                debtPaymentId: payment.debtPaymentId,
                amount,
                paymentDate: sameDay ? payment.paymentDate : toMovementDateTime(values.date, payment.paymentDate.slice(11, 19)),
                note,
            });
            return 'บันทึกการแก้ไขรายการชำระแล้ว';
        }
        await debtApi('pay', { debtId: d.debt.debtId, amount, paymentDate: toMovementDateTime(values.date), note });
        return amount >= d.debt.remaining - 0.0001
            ? `ชำระหนี้ "${d.debt.creditorName}" ครบแล้ว 🎉`
            : `ชำระ ${money(amount)} และเพิ่มรายจ่ายในประวัติธุรกรรมแล้ว`;
    };

    const confirmDialog = async () => {
        const d = dialog;
        if (!d) return;
        setDialogBusy(true);
        try {
            let message;
            if (d.kind === 'payment') {
                message = await runPayment(d);
                setPaymentForm(null);
            } else if (d.kind === 'deletePayment') {
                await debtApi('payment/delete', { debtPaymentId: d.payment.debtPaymentId });
                message = 'ลบรายการชำระและรายจ่ายที่ผูกอยู่แล้ว';
            } else {
                await debtApi('delete', { debtId: d.debt.debtId });
                if (detailId === d.debt.debtId) setDetailId(null);
                message = `ลบหนี้ "${d.debt.creditorName}" แล้ว`;
            }
            setDialog(null);
            await afterChange(message);
        } catch (error) {
            setDialog(null);
            showToast(error.message, 'error');
        } finally {
            setDialogBusy(false);
        }
    };

    const cancelDialog = useCallback(() => setDialog(null), []);
    const closeDebtForm = useCallback(() => setDebtForm(null), []);
    const closePaymentForm = useCallback(() => setPaymentForm(null), []);
    const closeDetail = useCallback(() => setDetailId(null), []);
    const dlg = dialogProps(dialog);

    const totalRemaining = activeDebts.reduce((s, d) => s + d.remaining, 0);
    const overdueCount = activeDebts.filter((d) => d.overdue).length;
    const totalPaid = debts.reduce((s, d) => s + d.paidAmount, 0);

    return (
        <div className="max-w-[928px] mx-auto flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4 min-h-11">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-800">ติดตามหนี้</h1>
                {tab === 'payable' && (
                    <button
                        type="button"
                        onClick={openCreate}
                        className="shrink-0 h-11 pl-3.5 pr-[18px] rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-[15px] font-semibold flex items-center gap-2"
                    >
                        <Plus size={18} /> เพิ่มหนี้
                    </button>
                )}
            </div>

            {/* แท็บ: เราติดหนี้เขา / เขาติดหนี้เรา (บิลหาร) */}
            <div role="tablist" className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-1">
                {[
                    { id: 'payable', label: 'เราติดหนี้', Icon: HandCoins },
                    { id: 'bills', label: 'เขาติดหนี้เรา', Icon: Users },
                ].map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        role="tab"
                        aria-selected={tab === t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex-1 h-11 rounded-[9px] flex items-center justify-center gap-2 text-[15px] font-semibold transition-all ${tab === t.id
                            ? `bg-white shadow-[0_1px_2px_rgba(15,23,42,0.08),0_1px_3px_rgba(15,23,42,0.06)] ${t.id === 'payable' ? 'text-rose-600' : 'text-income-600'}`
                            : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <t.Icon size={18} /> {t.label}
                    </button>
                ))}
            </div>

            {tab === 'bills' ? (
                <BillSplit
                    available={summary?.availableBalance ?? null}
                    onChanged={fetchAll}
                    showToast={showToast}
                    focusId={focusGroupId}
                    onFocusHandled={onFocusHandled}
                />
            ) : fetching && debts.length === 0 ? (
                <LoadingSkeleton />
            ) : debts.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl px-6 py-10 flex flex-col items-center gap-2 text-center">
                    <span className="w-14 h-14 mb-1 rounded-full bg-rose-50 flex items-center justify-center">
                        <HandCoins size={26} className="text-rose-600" />
                    </span>
                    <span className="text-base font-semibold text-slate-800">ยังไม่มีรายการหนี้</span>
                    <span className="text-sm text-slate-600 max-w-[420px]">
                        จดไว้ว่าติดหนี้ใครเท่าไหร่ แล้วกดชำระเมื่อจ่ายคืน ระบบจะลงรายจ่ายและหักจากยอดสุทธิให้อัตโนมัติ
                    </span>
                    <button onClick={openCreate} className="mt-3 h-12 pl-4 pr-5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-[15px] font-semibold flex items-center gap-2">
                        <Plus size={18} /> เพิ่มหนี้รายการแรก
                    </button>
                </div>
            ) : (
                <>
                    {/* สรุป */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                        <div className="p-4 sm:p-6 flex flex-col gap-0.5">
                            <span className="text-sm font-semibold text-slate-600">หนี้คงเหลือ · {activeDebts.length} รายการ</span>
                            <span className="text-[36px] leading-[44px] sm:text-[44px] sm:leading-[52px] font-bold tracking-tight text-slate-900 tabular-nums [overflow-wrap:anywhere]">{money(totalRemaining)}</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 px-4 sm:px-6 py-4 border-t border-slate-100 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-xs text-slate-600">จ่ายคืนไปแล้วทั้งหมด</span>
                                <span className="text-lg sm:text-xl font-bold tabular-nums text-income-600 [overflow-wrap:anywhere]">{money(totalPaid)}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-xs text-slate-600">เลยกำหนดคืน</span>
                                <span className={`text-lg sm:text-xl font-bold tabular-nums ${overdueCount > 0 ? 'text-expense-600' : 'text-slate-800'}`}>
                                    {overdueCount} รายการ
                                </span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-xs text-slate-600">ยอดสุทธิคงเหลือ</span>
                                <span className={`text-lg sm:text-xl font-bold tabular-nums [overflow-wrap:anywhere] ${summary?.availableBalance < 0 ? 'text-expense-600' : 'text-slate-800'}`}>
                                    {summary ? money(summary.availableBalance) : '—'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-base font-semibold text-slate-800">หนี้ที่ต้องจ่าย</span>
                        <span className="text-[13px] text-slate-500">{activeDebts.length} รายการ</span>
                    </div>

                    {activeDebts.length === 0 ? (
                        <div className="bg-white border border-slate-200 rounded-2xl px-6 py-8 flex flex-col items-center gap-2 text-center">
                            <span className="text-base font-semibold text-slate-800">ไม่มีหนี้ค้างแล้ว 🎉</span>
                            <span className="text-sm text-slate-600">หนี้ที่ชำระครบ {paidDebts.length} รายการ อยู่ด้านล่าง</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {activeDebts.map((d) => (
                                <DebtCard
                                    key={d.debtId}
                                    debt={d}
                                    highlight={highlightId === d.debtId}
                                    onOpen={() => { setHighlightId(null); setDetailId(d.debtId); }}
                                    onPay={() => openPayment(d)}
                                    onEdit={() => openEdit(d)}
                                    onDelete={() => setDialog({ kind: 'deleteDebt', debt: d })}
                                />
                            ))}
                        </div>
                    )}

                    {/* ชำระครบแล้ว */}
                    {paidDebts.length > 0 && (
                        <div className="mt-2 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                            <button
                                type="button"
                                onClick={() => setShowPaid((v) => !v)}
                                className="w-full h-14 pl-5 pr-4 flex items-center gap-2 hover:bg-slate-50 text-left"
                            >
                                <span className="text-base font-semibold text-slate-800">ชำระครบแล้ว</span>
                                <span className="min-w-6 h-6 px-2 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold flex items-center justify-center">{paidDebts.length}</span>
                                <span className="flex-1" />
                                {showPaid ? <ChevronUp size={20} className="text-slate-500" /> : <ChevronDown size={20} className="text-slate-500" />}
                            </button>
                            {showPaid && paidDebts.map((d) => (
                                <div
                                    key={d.debtId}
                                    id={`debt-${d.debtId}`}
                                    className={`scroll-mt-20 lg:scroll-mt-6 min-h-16 py-2 pl-4 sm:pl-5 pr-2 sm:pr-3 flex items-center gap-2 sm:gap-3 border-t border-slate-100 ${highlightId === d.debtId ? 'bg-gold-50' : ''}`}
                                >
                                    <CategoryAvatar name="HandCoins" size={36} />
                                    <div className="flex-1 min-w-0 flex flex-col">
                                        <span className="text-sm font-semibold text-slate-800 truncate">{d.creditorName}</span>
                                        <span className="text-xs text-slate-500">
                                            {money(d.totalAmount)} · {d.paidOffAt ? `ครบเมื่อ ${formatShortDate(new Date(d.paidOffAt))}` : 'ชำระครบ'}
                                        </span>
                                    </div>
                                    <button type="button" onClick={() => setDetailId(d.debtId)} className="shrink-0 h-10 sm:h-9 px-2.5 sm:px-3 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">
                                        ประวัติ
                                    </button>
                                    <button type="button" onClick={() => openEdit(d)} aria-label="แก้ไข" className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100">
                                        <Pencil size={18} />
                                    </button>
                                    <button type="button" onClick={() => setDialog({ kind: 'deleteDebt', debt: d })} aria-label="ลบ" className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-expense-700 hover:bg-expense-50">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {detailDebt && (
                <DebtDetail
                    debt={detailDebt}
                    reloadKey={historyKey}
                    paused={!!dialog || !!paymentForm}
                    onClose={closeDetail}
                    onPay={() => openPayment(detailDebt)}
                    onEditPayment={(p) => openPayment(detailDebt, p)}
                    onDeletePayment={(p) => setDialog({ kind: 'deletePayment', debt: detailDebt, payment: p })}
                />
            )}

            {debtForm && (
                <DebtForm
                    key={`${debtForm.mode}-${debtForm.debt?.debtId ?? 'new'}`}
                    mode={debtForm.mode}
                    initial={debtForm.initial}
                    paidAmount={debtForm.debt?.paidAmount ?? 0}
                    paused={!!dialog}
                    onCancel={closeDebtForm}
                    onSubmit={saveDebt}
                />
            )}

            {paymentForm && paymentDebt && (
                <PaymentForm
                    key={`pay-${paymentForm.payment?.debtPaymentId ?? 'new'}`}
                    debt={paymentDebt}
                    payment={paymentForm.payment}
                    available={summary?.availableBalance ?? null}
                    paused={!!dialog}
                    onCancel={closePaymentForm}
                    onSubmit={submitPayment}
                />
            )}

            <ConfirmDialog open={!!dialog} {...dlg} busy={dialogBusy} onCancel={cancelDialog} onConfirm={confirmDialog} />
            <Toast toast={toast} />
        </div>
    );
}

function LoadingSkeleton() {
    return (
        <div aria-busy="true" className="flex flex-col gap-4 animate-pulse">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-3">
                <span className="w-40 h-3 rounded-full bg-slate-200" />
                <span className="w-64 h-9 rounded-[10px] bg-slate-200" />
                <div className="grid grid-cols-3 gap-4 pt-4 mt-1 border-t border-slate-100">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex flex-col gap-2">
                            <span className="w-[70%] h-2.5 rounded-full bg-slate-100" />
                            <span className="w-[85%] h-[18px] rounded-full bg-slate-200" />
                        </div>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2].map((i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-3.5">
                        <div className="flex items-center gap-3">
                            <span className="w-11 h-11 rounded-full bg-slate-200" />
                            <span className="w-32 h-3.5 rounded-full bg-slate-200" />
                        </div>
                        <span className="w-40 h-6 rounded-full bg-slate-200" />
                        <span className="h-2 rounded-full bg-slate-100" />
                        <span className="h-10 rounded-xl bg-slate-200" />
                    </div>
                ))}
            </div>
        </div>
    );
}
