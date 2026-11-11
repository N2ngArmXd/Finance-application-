import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Users, HandCoins, Pencil, Undo2, Trash2, Receipt, Info, CircleCheck, ChevronDown, ChevronUp, LayoutDashboard } from 'lucide-react';
import { formatMoney, formatShortDate, toDateInput } from '../../utils/format';
import { debtApi } from '../../utils/debtApi';
import { toMovementDateTime } from '../../utils/savingsApi';
import BillForm from './BillForm';
import BillDetail from './BillDetail';
import PaymentForm from './PaymentForm';
import ConfirmDialog from '../ui/ConfirmDialog';

const money = (n) => `฿${formatMoney(n)}`;

const isDone = (b) => b.memberCount > 0 && b.paidCount === b.memberCount;

// ข้อความ/ตารางสรุปของ dialog ยืนยันแต่ละแบบ
const dialogProps = (d) => {
    if (!d) return {};
    if (d.kind === 'edit') {
        const { payload, extra } = d;
        const notes = [
            extra.removed.length > 0 && `เอาออกจากบิล: ${extra.removed.join(', ')}`,
            extra.dropsExpense ? 'จะลบรายจ่ายยอดเต็มที่ระบบลงไว้' : payload.recordExpense && 'รายจ่ายยอดเต็มในประวัติธุรกรรมจะแก้ตามบิล',
        ].filter(Boolean);
        return {
            tone: 'brand', icon: Pencil, title: `บันทึกการแก้ไขบิล "${payload.title}"?`,
            rows: [
                { k: 'ยอดบิล', v: money(payload.totalAmount) },
                ...payload.members.map((m) => ({ k: m.name, v: money(m.amount), tone: 'brand' })),
                ...(payload.includeSelf ? [{ k: 'ส่วนของเรา', v: money(extra.selfShare) }] : []),
            ],
            note: notes.join(' · ') || undefined,
            noteTone: extra.removed.length > 0 || extra.dropsExpense ? 'warn' : 'brand',
            noteIcon: Info,
            confirmLabel: 'บันทึก', busyLabel: 'กำลังบันทึก…',
        };
    }
    if (d.kind === 'create') {
        const { payload, extra } = d;
        return {
            tone: 'brand', icon: Users, title: `สร้างบิล "${payload.title}"?`,
            rows: [
                { k: 'ยอดบิล', v: money(payload.totalAmount) },
                ...payload.members.map((m) => ({ k: m.name, v: money(m.amount), tone: 'brand' })),
                ...(payload.includeSelf ? [{ k: 'ส่วนของเรา', v: money(extra.selfShare) }] : []),
            ],
            note: payload.recordExpense
                ? `จะเพิ่มรายจ่าย ${money(payload.totalAmount)} หมวด "${extra.categoryName ?? '-'}" ในประวัติธุรกรรม`
                : 'ไม่ลงรายจ่าย (บันทึกบิลนี้เองไปแล้ว)',
            noteIcon: Receipt,
            confirmLabel: 'สร้างบิล', busyLabel: 'กำลังบันทึก…',
        };
    }
    if (d.kind === 'receive') {
        const amount = parseFloat(d.values.amount);
        const rows = [
            { k: 'บิล', v: d.bill.title },
            { k: 'จาก', v: d.member.creditorName },
            { k: 'ยอดที่ได้รับ', v: money(amount), tone: 'brand' },
        ];
        if (d.payment) {
            return {
                tone: 'brand', icon: Pencil, title: 'บันทึกการแก้ไขยอดที่รับ?', rows,
                note: 'รายรับที่ผูกอยู่ในประวัติธุรกรรมจะถูกแก้ตามไปด้วย', noteIcon: Receipt,
                confirmLabel: 'บันทึก', busyLabel: 'กำลังบันทึก…',
            };
        }
        const left = d.member.remaining - amount;
        return {
            tone: 'brand', icon: HandCoins, title: `${d.member.creditorName} คืนเงินแล้ว?`,
            rows: [...rows, { k: 'ยังค้างหลังรับ', v: left <= 0.0001 ? 'คืนครบ' : money(left) }],
            note: `จะเพิ่มรายรับ ${money(amount)} หมวด "เงินคืน" ในประวัติธุรกรรม`, noteIcon: Receipt,
            confirmLabel: 'รับเงินคืน', busyLabel: 'กำลังบันทึก…',
        };
    }
    if (d.kind === 'undo') {
        return {
            tone: 'danger', icon: Undo2, title: 'ยกเลิกรายการรับเงินนี้?', text: 'ยอดที่ค้างของคนนี้จะเพิ่มกลับมา',
            rows: [
                { k: 'จาก', v: d.member.creditorName },
                { k: 'ยอด', v: money(d.payment.amount) },
                { k: 'วันที่', v: formatShortDate(new Date(d.payment.paymentDate)) },
            ],
            note: 'จะลบรายรับ "เงินคืน" ที่ผูกอยู่ในประวัติธุรกรรมด้วย', noteTone: 'warn', noteIcon: Info,
            confirmLabel: 'ยกเลิกรับเงิน', busyLabel: 'กำลังยกเลิก…',
        };
    }
    // deleteBill
    const b = d.bill;
    return {
        tone: 'danger', icon: Trash2, title: `ลบบิล "${b.title}"?`, text: 'บิลและรายชื่อคนที่ต้องคืนจะถูกซ่อน',
        rows: [
            { k: 'ยอดบิล', v: money(b.totalAmount) },
            { k: 'ได้คืนแล้ว', v: money(b.collected) },
        ],
        note: 'รายจ่ายยอดเต็มและเงินที่ได้คืนแล้วยังอยู่ในประวัติธุรกรรม (ยอดสุทธิไม่เปลี่ยน)',
        noteIcon: Info,
        confirmLabel: 'ลบบิล', busyLabel: 'กำลังลบ…',
    };
};

// แท็บ "เขาติดหนี้เรา": บิลที่เราออกเงินก่อน แล้วทวงคืนจากเพื่อน
// focusId = บิลที่ต้องเปิดเมื่อกดมาจากหน้าอื่น (ประวัติธุรกรรม)
export default function BillSplit({ available, onChanged, showToast, focusId, onFocusHandled }) {
    const [bills, setBills] = useState([]);
    const [categories, setCategories] = useState([]);
    const [fetching, setFetching] = useState(true);
    const [showDone, setShowDone] = useState(false);
    const [highlightId, setHighlightId] = useState(null);

    const [creating, setCreating] = useState(false);
    const [editingId, setEditingId] = useState(null); // บิลที่กำลังแก้ไข
    const [receiveForm, setReceiveForm] = useState(null); // { groupId, debtId, payment? }
    const [detailId, setDetailId] = useState(null);
    const [historyKey, setHistoryKey] = useState(0);
    const [dialog, setDialog] = useState(null);
    const [dialogBusy, setDialogBusy] = useState(false);

    const fetchBills = useCallback(async () => {
        setFetching(true);
        try {
            setBills(await debtApi('bills/list') || []);
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setFetching(false);
        }
    }, [showToast]);

    useEffect(() => { fetchBills(); }, [fetchBills]);

    // หมวดรายจ่าย ใช้ตอนลงรายจ่ายยอดเต็ม
    useEffect(() => {
        fetch('/api/finance-app/categories/getCategoriesList', { method: 'POST' })
            .then((r) => (r.ok ? r.json() : [])).then(setCategories).catch(() => setCategories([]));
    }, []);

    const openBills = useMemo(() => bills.filter((b) => !isDone(b)), [bills]);
    const doneBills = useMemo(() => bills.filter(isDone), [bills]);
    const billById = (id) => bills.find((b) => b.groupId === id);
    const detailBill = detailId != null ? billById(detailId) : null;
    const receiveBill = receiveForm ? billById(receiveForm.groupId) : null;
    const receiveMember = receiveBill?.members.find((m) => m.debtId === receiveForm.debtId) ?? null;

    // เปิดบิลที่ส่งมาจากหน้าอื่น
    useEffect(() => {
        if (fetching || focusId == null) return;
        const target = bills.find((b) => b.groupId === focusId);
        if (target) {
            if (isDone(target)) setShowDone(true);
            setHighlightId(focusId);
            setDetailId(focusId);
        }
        onFocusHandled?.();
    }, [fetching, focusId]);

    const afterChange = async (message) => {
        showToast(message);
        setHistoryKey((k) => k + 1);
        await fetchBills();
        onChanged?.();
    };

    const submitReceive = (values) => setDialog({ kind: 'receive', bill: receiveBill, member: receiveMember, payment: receiveForm.payment, values });

    const confirmDialog = async () => {
        const d = dialog;
        if (!d) return;
        setDialogBusy(true);
        try {
            let message;
            if (d.kind === 'create') {
                await debtApi('bills/create', d.payload);
                setCreating(false);
                message = `สร้างบิล "${d.payload.title}" แล้ว ทวงคืน ${d.payload.members.length} คน`;
            } else if (d.kind === 'edit') {
                await debtApi('bills/update', { ...d.payload, groupId: d.groupId });
                setEditingId(null);
                message = `บันทึกการแก้ไขบิล "${d.payload.title}" แล้ว`;
            } else if (d.kind === 'receive') {
                const amount = parseFloat(d.values.amount);
                const note = d.values.note.trim() || null;
                if (d.payment) {
                    // วันที่ไม่เปลี่ยน -> ส่งเวลาเดิมกลับไป
                    const sameDay = toDateInput(new Date(d.payment.paymentDate)) === d.values.date;
                    await debtApi('payment/update', {
                        debtPaymentId: d.payment.debtPaymentId,
                        amount,
                        paymentDate: sameDay ? d.payment.paymentDate : toMovementDateTime(d.values.date, d.payment.paymentDate.slice(11, 19)),
                        note,
                    });
                    message = 'บันทึกการแก้ไขยอดที่รับแล้ว';
                } else {
                    await debtApi('pay', { debtId: d.member.debtId, amount, paymentDate: toMovementDateTime(d.values.date), note });
                    message = amount >= d.member.remaining - 0.0001
                        ? `${d.member.creditorName} คืนครบแล้ว +${money(amount)}`
                        : `รับเงินคืนจาก ${d.member.creditorName} +${money(amount)}`;
                }
                setReceiveForm(null);
            } else if (d.kind === 'undo') {
                await debtApi('payment/delete', { debtPaymentId: d.payment.debtPaymentId });
                message = `ยกเลิกรับเงินจาก ${d.member.creditorName} แล้ว`;
            } else {
                await debtApi('bills/delete', { groupId: d.bill.groupId });
                if (detailId === d.bill.groupId) setDetailId(null);
                message = `ลบบิล "${d.bill.title}" แล้ว`;
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
    const closeCreate = useCallback(() => setCreating(false), []);
    const closeEdit = useCallback(() => setEditingId(null), []);
    const editBill = editingId != null ? billById(editingId) : null;
    const closeReceive = useCallback(() => setReceiveForm(null), []);
    const closeDetail = useCallback(() => { setDetailId(null); setHighlightId(null); }, []);
    const dlg = dialogProps(dialog);

    const totalRemaining = openBills.reduce((s, b) => s + b.remaining, 0);
    const peopleLeft = openBills.reduce((s, b) => s + (b.memberCount - b.paidCount), 0);
    const totalCollected = bills.reduce((s, b) => s + b.collected, 0);

    const openBillCard = (b) => {
        setHighlightId(null);
        setDetailId(b.groupId);
    };

    return (
        <>
            <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-600">เราออกเงินก่อน แล้วทวงคืนจากเพื่อน</span>
                <button
                    type="button"
                    onClick={() => setCreating(true)}
                    className="shrink-0 h-11 pl-3.5 pr-[18px] rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-[15px] font-semibold flex items-center gap-2"
                >
                    <Plus size={18} /> สร้างบิลหาร
                </button>
            </div>

            {fetching && bills.length === 0 ? (
                <div aria-busy="true" className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
                    {[1, 2].map((i) => <div key={i} className="h-44 rounded-2xl bg-white border border-slate-200" />)}
                </div>
            ) : bills.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl px-6 py-10 flex flex-col items-center gap-2 text-center">
                    <span className="w-14 h-14 mb-1 rounded-full bg-income-50 flex items-center justify-center">
                        <Users size={26} className="text-income-600" />
                    </span>
                    <span className="text-base font-semibold text-slate-800">ยังไม่มีบิลหาร</span>
                    <span className="text-sm text-slate-600 max-w-[440px]">
                        ไปเที่ยวหรือกินข้าวแล้วเราจ่ายก่อน? ใส่ยอดบิลกับรายชื่อ ระบบหารให้ แล้วกด "รับเงิน" เมื่อเพื่อนคืน
                    </span>
                    <button onClick={() => setCreating(true)} className="mt-3 h-12 pl-4 pr-5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-[15px] font-semibold flex items-center gap-2">
                        <Plus size={18} /> สร้างบิลแรก
                    </button>
                </div>
            ) : (
                <>
                    {/* สรุป */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                        <div className="p-4 sm:p-6 flex flex-col gap-0.5">
                            <span className="text-sm font-semibold text-slate-600">รอทวงคืน · {peopleLeft} คน</span>
                            <span className="text-[36px] leading-[44px] sm:text-[44px] sm:leading-[52px] font-bold tracking-tight text-slate-900 tabular-nums [overflow-wrap:anywhere]">{money(totalRemaining)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:gap-4 px-4 sm:px-6 py-4 border-t border-slate-100">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-xs text-slate-600">ได้คืนแล้วทั้งหมด</span>
                                <span className="text-lg sm:text-xl font-bold tabular-nums text-income-600 [overflow-wrap:anywhere]">{money(totalCollected)}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-xs text-slate-600">ยอดสุทธิคงเหลือ</span>
                                <span className={`text-lg sm:text-xl font-bold tabular-nums [overflow-wrap:anywhere] ${available < 0 ? 'text-expense-600' : 'text-slate-800'}`}>
                                    {available != null ? money(available) : '—'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {openBills.length === 0 ? (
                        <div className="bg-white border border-slate-200 rounded-2xl px-6 py-8 flex flex-col items-center gap-2 text-center">
                            <span className="text-base font-semibold text-slate-800">ทุกคนคืนครบแล้ว 🎉</span>
                            <span className="text-sm text-slate-600">บิลที่เก็บครบ {doneBills.length} บิล อยู่ด้านล่าง</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {openBills.map((b) => (
                                <BillCard key={b.groupId} bill={b} highlight={highlightId === b.groupId} onOpen={() => openBillCard(b)} />
                            ))}
                        </div>
                    )}

                    {doneBills.length > 0 && (
                        <div className="mt-2 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                            <button
                                type="button"
                                onClick={() => setShowDone((v) => !v)}
                                className="w-full h-14 pl-5 pr-4 flex items-center gap-2 hover:bg-slate-50 text-left"
                            >
                                <span className="text-base font-semibold text-slate-800">เก็บครบแล้ว</span>
                                <span className="min-w-6 h-6 px-2 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold flex items-center justify-center">{doneBills.length}</span>
                                <span className="flex-1" />
                                {showDone ? <ChevronUp size={20} className="text-slate-500" /> : <ChevronDown size={20} className="text-slate-500" />}
                            </button>
                            {showDone && doneBills.map((b) => (
                                <button
                                    key={b.groupId}
                                    type="button"
                                    onClick={() => openBillCard(b)}
                                    className={`w-full min-h-16 py-2 pl-4 sm:pl-5 pr-3 flex items-center gap-3 border-t border-slate-100 text-left hover:bg-slate-50 ${highlightId === b.groupId ? 'bg-gold-50' : ''}`}
                                >
                                    <span className="w-9 h-9 shrink-0 rounded-full bg-income-50 flex items-center justify-center">
                                        <CircleCheck size={18} className="text-income-600" />
                                    </span>
                                    <span className="flex-1 min-w-0 flex flex-col">
                                        <span className="text-sm font-semibold text-slate-800 truncate">{b.title}</span>
                                        <span className="text-xs text-slate-500">{formatShortDate(b.billDate)} · ได้คืน {money(b.collected)} จาก {b.memberCount} คน</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </>
            )}

            {detailBill && (
                <BillDetail
                    bill={detailBill}
                    reloadKey={historyKey}
                    paused={!!dialog || !!receiveForm || editingId != null}
                    onClose={closeDetail}
                    onEdit={() => setEditingId(detailBill.groupId)}
                    onReceive={(m) => setReceiveForm({ groupId: detailBill.groupId, debtId: m.debtId })}
                    onEditPayment={(m, p) => setReceiveForm({ groupId: detailBill.groupId, debtId: m.debtId, payment: p })}
                    onDeletePayment={(m, p) => setDialog({ kind: 'undo', bill: detailBill, member: m, payment: p })}
                    onDelete={() => setDialog({ kind: 'deleteBill', bill: detailBill })}
                />
            )}

            {creating && (
                <BillForm
                    categories={categories}
                    paused={!!dialog}
                    onCancel={closeCreate}
                    onSubmit={(payload, extra) => setDialog({ kind: 'create', payload, extra })}
                />
            )}

            {editBill && (
                <BillForm
                    key={`edit-${editBill.groupId}`}
                    bill={editBill}
                    categories={categories}
                    paused={!!dialog}
                    onCancel={closeEdit}
                    onSubmit={(payload, extra) => setDialog({ kind: 'edit', groupId: editBill.groupId, payload, extra })}
                />
            )}

            {receiveForm && receiveMember && (
                <PaymentForm
                    key={`receive-${receiveForm.payment?.debtPaymentId ?? receiveMember.debtId}`}
                    receive
                    debt={receiveMember}
                    payment={receiveForm.payment}
                    defaultAmount={receiveMember.remaining}
                    available={available}
                    paused={!!dialog}
                    onCancel={closeReceive}
                    onSubmit={submitReceive}
                />
            )}

            <ConfirmDialog open={!!dialog} {...dlg} busy={dialogBusy} onCancel={cancelDialog} onConfirm={confirmDialog} />
        </>
    );
}

function BillCard({ bill, highlight, onOpen }) {
    const pct = bill.toCollect > 0 ? Math.min(bill.collected / bill.toCollect, 1) * 100 : 0;
    return (
        <button
            type="button"
            id={`bill-${bill.groupId}`}
            onClick={onOpen}
            className={`scroll-mt-20 lg:scroll-mt-6 bg-white border rounded-2xl flex flex-col text-left transition-shadow hover:shadow-[0_4px_16px_-6px_rgba(15,23,42,0.12)] ${highlight
                ? 'border-gold-400 shadow-[0_0_0_3px_var(--color-gold-100)]'
                : 'border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.04)]'}`}
        >
            {highlight && (
                <span className="w-full flex items-center gap-1.5 px-4 sm:px-5 py-2 bg-gold-50 border-b border-gold-100 rounded-t-[15px] text-xs font-semibold text-gold-700">
                    <LayoutDashboard size={14} /> เปิดจากหน้าอื่น
                </span>
            )}
            <span className="w-full p-4 sm:p-5 flex flex-col gap-3.5">
                <span className="flex items-start gap-3">
                    <span className="w-11 h-11 shrink-0 rounded-full bg-income-50 flex items-center justify-center">
                        <Users size={20} className="text-income-600" />
                    </span>
                    <span className="flex-1 min-w-0 flex flex-col">
                        <span className="text-base font-semibold text-slate-800 truncate">{bill.title}</span>
                        <span className="text-xs leading-[18px] text-slate-500">{formatShortDate(bill.billDate)} · บิล {money(bill.totalAmount)}</span>
                    </span>
                </span>

                <span className="flex flex-col gap-2">
                    <span className="flex items-baseline justify-between gap-2 flex-wrap">
                        <span className="flex flex-col">
                            <span className="text-xs text-slate-500">ยังค้าง</span>
                            <span className="text-2xl font-bold tabular-nums text-slate-900">{money(bill.remaining)}</span>
                        </span>
                        <span className="text-[13px] text-slate-500 tabular-nums">ได้คืน {money(bill.collected)} / {money(bill.toCollect)}</span>
                    </span>
                    <span className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <span className="block h-full rounded-full bg-income-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                    </span>
                </span>

                {/* ชิปรายชื่อ: เขียว = คืนครบ */}
                <span className="flex flex-wrap gap-1.5">
                    {bill.members.map((m) => (
                        <span
                            key={m.debtId}
                            className={`h-7 pl-2 pr-2.5 rounded-full text-xs font-semibold flex items-center gap-1 max-w-[160px] ${m.status === 'PAID'
                                ? 'bg-income-50 text-income-700'
                                : m.paidAmount > 0 ? 'bg-gold-50 text-gold-700' : 'bg-slate-100 text-slate-600'}`}
                        >
                            {m.status === 'PAID' ? <CircleCheck size={13} className="shrink-0" /> : <HandCoins size={13} className="shrink-0" />}
                            <span className="truncate">{m.creditorName}</span>
                        </span>
                    ))}
                </span>
                <span className="text-xs font-semibold text-slate-600">คืนครบ {bill.paidCount}/{bill.memberCount} คน</span>
            </span>
        </button>
    );
}
