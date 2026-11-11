import { useEffect, useMemo, useRef, useState } from 'react';
import { X, AlertCircle, Calendar, Plus, Trash2, Users, Receipt, RotateCcw, Check, Pencil, Lock } from 'lucide-react';
import { formatMoney, formatDayLabel, toAmountDisplay, sanitizeAmount, toDateInput } from '../../utils/format';
import { splitBill } from '../../utils/billSplit';
import CategorySelect from '../ui/CategorySelect';

const money = (n) => `฿${formatMoney(n)}`;

const FieldError = ({ text }) => (
    <span className="flex items-center gap-1.5 px-1 text-[13px] leading-[18px] font-medium text-expense-700">
        <AlertCircle size={16} className="shrink-0" /> {text}
    </span>
);

const inputClass = (err) =>
    `h-12 w-full px-3.5 rounded-xl border bg-slate-50 text-base sm:text-[15px] text-slate-800 outline-none focus:bg-white focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/10 ${err ? 'border-expense-600' : 'border-slate-200'}`;

// สวิตช์เปิด/ปิด พร้อมคำอธิบาย
function Toggle({ on, onChange, label, sub }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={on}
            onClick={() => onChange(!on)}
            className="w-full flex items-center gap-3 text-left"
        >
            <span className="flex-1 min-w-0 flex flex-col">
                <span className="text-sm font-semibold text-slate-700">{label}</span>
                {sub && <span className="text-xs text-slate-500">{sub}</span>}
            </span>
            <span className={`shrink-0 w-11 h-6 rounded-full p-0.5 transition-colors ${on ? 'bg-brand-600' : 'bg-slate-300'}`}>
                <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
            </span>
        </button>
    );
}

let keySeq = 0;
const newMember = () => ({ key: ++keySeq, debtId: null, paid: 0, name: '', amount: '', edited: false });

// ค่าเริ่มต้นของฟอร์ม: สร้างใหม่ = ว่าง · แก้ไข = จากบิลเดิม (ยอดรายคนคงไว้ตามที่บันทึก)
const initialForm = (bill, today) => (bill
    ? {
        title: bill.title,
        total: String(Number(bill.totalAmount)),
        date: bill.billDate,
        includeSelf: bill.includeSelf,
        members: bill.members.map((m) => ({
            key: ++keySeq, debtId: m.debtId, paid: Number(m.paidAmount) || 0,
            name: m.creditorName, amount: String(Number(m.totalAmount)), edited: true,
        })),
        recordExpense: bill.transactionId != null,
        categoryId: bill.categoryId ?? null,
        note: bill.note || '',
    }
    : {
        title: '',
        total: '',
        date: today,
        includeSelf: true,
        members: [newMember()],
        recordExpense: true,
        categoryId: null,
        note: '',
    });

// modal สร้าง/แก้ไขบิลหาร — ใส่ยอดบิล + รายชื่อ ระบบหารให้ (แก้ยอดรายคนได้) แล้วสร้างรายการทวงทีละคน
// bill = บิลเดิม (โหมดแก้ไข): คนที่คืนเงินแล้วเอาออกไม่ได้ และยอดต้องไม่น้อยกว่าที่ได้รับ
export default function BillForm({ bill = null, categories, paused = false, onCancel, onSubmit }) {
    const isEdit = !!bill;
    const today = toDateInput(new Date());
    const expenseCats = useMemo(() => categories.filter((c) => c.type === 'EXPENSE'), [categories]);
    const [form, setForm] = useState(() => initialForm(bill, today));
    const [tried, setTried] = useState(false);
    const dateRef = useRef(null);
    const set = (patch) => setForm((f) => ({ ...f, ...patch }));

    // หมวดรายจ่ายเริ่มต้น = บันเทิง (ถ้ามี)
    const categoryId = form.categoryId ?? expenseCats.find((c) => c.name === 'บันเทิง')?.id ?? null;

    useEffect(() => {
        if (paused) return;
        const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [paused, onCancel]);

    const total = parseFloat(form.total) || 0;
    const split = splitBill(total, form.members, form.includeSelf);
    const amountOf = (i) => (form.members[i].edited ? parseFloat(form.members[i].amount) || 0 : split.amounts[i]);
    const toCollect = form.members.reduce((s, _, i) => s + amountOf(i), 0);
    const anyEdited = form.members.some((m) => m.edited);
    const peopleCount = form.members.length + (form.includeSelf ? 1 : 0);

    const setMember = (key, patch) => set({ members: form.members.map((m) => (m.key === key ? { ...m, ...patch } : m)) });
    const addMember = () => set({ members: [...form.members, newMember()] });
    const removeMember = (key) => set({ members: form.members.filter((m) => m.key !== key) });
    const resetSplit = () => set({ members: form.members.map((m) => ({ ...m, edited: false, amount: '' })) });

    // ข้อผิดพลาด
    const titleErr = tried && !form.title.trim() ? 'ตั้งชื่อบิล เช่น ทริปเขาใหญ่' : null;
    const totalErr = (form.total !== '' || tried) && !(total > 0) ? 'กรอกยอดบิลมากกว่า 0' : null;
    const nameErr = (m) => tried && !m.name.trim();
    // ยอดของคนที่คืนมาแล้ว ต้องไม่น้อยกว่าที่ได้รับ
    const belowPaid = (i) => form.members[i].paid > 0 && amountOf(i) < form.members[i].paid - 0.004;
    const amountErr = (i) => total > 0 && (!(amountOf(i) > 0) || belowPaid(i));
    const splitErr = total > 0
        ? (form.includeSelf && split.selfShare < 0
            ? `ยอดที่ทวงรวมกันเกินยอดบิล ${money(-split.selfShare)}`
            : !form.includeSelf && Math.abs(total - toCollect) > 0.004
                ? `ยอดที่ทวงรวมกัน ${money(toCollect)} ไม่เท่ากับยอดบิล`
                : null)
        : null;
    const catErr = tried && form.recordExpense && !categoryId ? 'เลือกหมวดรายจ่าย' : null;

    const submit = (e) => {
        e.preventDefault();
        setTried(true);
        const bad = !form.title.trim() || !(total > 0) || form.members.length === 0
            || form.members.some((m, i) => !m.name.trim() || !(amountOf(i) > 0) || belowPaid(i))
            || splitErr || (form.recordExpense && !categoryId);
        if (bad) return;
        onSubmit({
            title: form.title.trim(),
            totalAmount: total,
            billDate: form.date,
            includeSelf: form.includeSelf,
            recordExpense: form.recordExpense,
            categoryId: form.recordExpense ? categoryId : null,
            note: form.note.trim() || null,
            members: form.members.map((m, i) => ({ debtId: m.debtId, name: m.name.trim(), amount: Number(amountOf(i).toFixed(2)) })),
        }, {
            removed: isEdit ? bill.members.filter((bm) => !form.members.some((m) => m.debtId === bm.debtId)).map((bm) => bm.creditorName) : [],
            dropsExpense: isEdit && bill.transactionId != null && !form.recordExpense,
            categoryName: expenseCats.find((c) => c.id === categoryId)?.name,
            selfShare: form.includeSelf ? split.selfShare : 0,
        });
    };

    const openDate = () => {
        const el = dateRef.current;
        if (!el) return;
        try { el.showPicker?.(); } catch { el.focus(); }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-start md:items-center justify-center sm:p-4 overflow-y-auto animate-fade-in" onClick={onCancel}>
            <form
                onSubmit={submit}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                className="w-[560px] max-w-full h-dvh sm:h-auto sm:my-4 bg-white sm:rounded-3xl shadow-[0_24px_64px_-16px_rgba(15,23,42,0.35)] flex flex-col overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:pt-0 sm:pb-0 animate-zoom-in"
            >
                <div className="h-14 sm:h-16 shrink-0 flex items-center justify-between pl-4 sm:pl-6 pr-2 sm:pr-3 border-b border-slate-100">
                    <span className="flex items-center gap-2 text-[17px] font-semibold text-slate-800">
                        {isEdit ? <Pencil size={20} className="text-income-600" /> : <Users size={20} className="text-income-600" />}
                        {isEdit ? 'แก้ไขบิล' : 'สร้างบิลหาร'}
                    </span>
                    <button type="button" onClick={onCancel} aria-label="ปิด" className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 min-h-0 sm:flex-none sm:max-h-[calc(92vh-144px)] overflow-y-auto px-4 sm:px-6 pt-5 pb-6 flex flex-col gap-5">
                    <label className="flex flex-col gap-2">
                        <span className="text-sm font-semibold text-slate-700">ชื่อบิล</span>
                        <input
                            value={form.title}
                            onChange={(e) => set({ title: e.target.value })}
                            placeholder="เช่น ทริปเขาใหญ่ · หมูกระทะวันศุกร์"
                            maxLength={100}
                            autoFocus={!isEdit}
                            className={inputClass(titleErr)}
                        />
                        {titleErr && <FieldError text={titleErr} />}
                    </label>

                    {/* ยอดบิล */}
                    <div className="flex flex-col gap-2">
                        <label className={`flex flex-col gap-0.5 pt-3.5 pb-3 px-[18px] rounded-2xl cursor-text bg-slate-100 ${totalErr ? 'ring-2 ring-inset ring-expense-600' : ''}`}>
                            <span className="text-[13px] leading-[18px] font-semibold text-slate-700">ยอดบิลทั้งหมดที่เราจ่ายไป</span>
                            <span className="flex items-baseline gap-1">
                                <span className="shrink-0 text-2xl sm:text-[28px] leading-[44px] sm:leading-[52px] font-semibold text-slate-800">฿</span>
                                <input
                                    value={toAmountDisplay(form.total)}
                                    onChange={(e) => set({ total: sanitizeAmount(e.target.value) })}
                                    inputMode="decimal"
                                    placeholder="0.00"
                                    aria-label="ยอดบิลทั้งหมด"
                                    className="flex-1 min-w-0 w-0 bg-transparent outline-none p-0 text-[36px] sm:text-[44px] leading-[44px] sm:leading-[52px] font-bold tracking-tight tabular-nums text-slate-900 caret-slate-900 placeholder:text-slate-300"
                                />
                            </span>
                        </label>
                        {totalErr && <FieldError text={totalErr} />}
                    </div>

                    <div className="flex flex-col gap-2">
                        <span className="text-sm font-semibold text-slate-700">วันที่จ่ายบิล</span>
                        <div onClick={openDate} className="relative h-12 px-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-2.5 cursor-pointer text-base sm:text-[15px] text-slate-800">
                            <Calendar size={18} className="shrink-0 text-slate-500" />
                            <span className="flex-1 truncate">{form.date === today ? 'วันนี้' : formatDayLabel(form.date)}</span>
                            <input
                                ref={dateRef}
                                type="date"
                                tabIndex={-1}
                                max={today}
                                value={form.date}
                                onChange={(e) => e.target.value && set({ date: e.target.value })}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* คนที่ต้องคืน */}
                    <div className="flex flex-col gap-3 p-3.5 sm:p-4 rounded-2xl border border-slate-200">
                        <div className="flex items-baseline justify-between gap-2">
                            <span className="text-sm font-semibold text-slate-700">หารกับใครบ้าง</span>
                            <span className="text-xs text-slate-500">{peopleCount} คน{form.includeSelf ? ' (รวมเรา)' : ''}</span>
                        </div>

                        <Toggle
                            on={form.includeSelf}
                            onChange={(v) => set({ includeSelf: v })}
                            label="นับเราในการหารด้วย"
                            sub={form.includeSelf ? 'เราออกส่วนของตัวเองด้วย ทวงเฉพาะส่วนของเพื่อน' : 'เพื่อนจ่ายคืนทั้งบิล'}
                        />

                        <div className="flex flex-col gap-2">
                            {form.members.map((m, i) => (
                                <div key={m.key} className="flex items-start gap-2">
                                    <input
                                        value={m.name}
                                        onChange={(e) => setMember(m.key, { name: e.target.value })}
                                        placeholder={`ชื่อคนที่ ${i + 1}`}
                                        maxLength={100}
                                        aria-label={`ชื่อคนที่ ${i + 1}`}
                                        className={`${inputClass(nameErr(m))} flex-1 min-w-0`}
                                    />
                                    <div className={`shrink-0 w-[132px] h-12 px-3 rounded-xl border flex items-center gap-1 ${amountErr(i) ? 'border-expense-600' : m.edited ? 'border-brand-300 bg-brand-50' : 'border-slate-200 bg-slate-50'}`}>
                                        <span className="text-sm text-slate-500">฿</span>
                                        <input
                                            value={m.edited ? toAmountDisplay(m.amount) : (total > 0 ? formatMoney(split.amounts[i]) : '')}
                                            onChange={(e) => setMember(m.key, { amount: sanitizeAmount(e.target.value), edited: true })}
                                            // เลือกทั้งช่องตอนแตะ พิมพ์ทับได้เลย (ยอดจะถูกล็อกเป็นยอดที่แก้เองเมื่อเริ่มพิมพ์)
                                            onFocus={(e) => e.target.select()}
                                            inputMode="decimal"
                                            placeholder="0.00"
                                            aria-label={`ยอดของคนที่ ${i + 1}`}
                                            className="flex-1 min-w-0 w-0 bg-transparent outline-none text-right text-[15px] font-semibold tabular-nums text-slate-800"
                                        />
                                    </div>
                                    {m.paid > 0 ? (
                                        // คืนเงินมาแล้ว เอาออกไม่ได้ (ต้องยกเลิกรายการรับเงินก่อน)
                                        <span title={`คืนมาแล้ว ${money(m.paid)} เอาออกไม่ได้`} className="shrink-0 w-10 h-12 rounded-xl flex items-center justify-center text-slate-400">
                                            <Lock size={16} />
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => removeMember(m.key)}
                                            disabled={form.members.length === 1}
                                            aria-label="ลบคนนี้"
                                            className="shrink-0 w-10 h-12 rounded-xl flex items-center justify-center text-slate-500 hover:bg-expense-50 hover:text-expense-700 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500"
                                        >
                                            <Trash2 size={17} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button type="button" onClick={addMember} className="h-10 pl-3 pr-3.5 rounded-xl border border-dashed border-brand-300 text-brand-700 text-sm font-semibold flex items-center gap-1.5 hover:bg-brand-50">
                                <Plus size={16} /> เพิ่มคน
                            </button>
                            {anyEdited && (
                                <button type="button" onClick={resetSplit} className="h-10 px-3 rounded-xl text-slate-600 text-sm font-medium flex items-center gap-1.5 hover:bg-slate-100">
                                    <RotateCcw size={15} /> หารเท่ากันใหม่
                                </button>
                            )}
                        </div>
                        {tried && form.members.some((m) => !m.name.trim()) && <FieldError text="กรอกชื่อให้ครบทุกคน" />}
                        {total > 0 && form.members.some((_, i) => !(amountOf(i) > 0)) && <FieldError text="ยอดของแต่ละคนต้องมากกว่า 0" />}
                        {form.members.map((m, i) => belowPaid(i) && (
                            <FieldError key={`paid-${m.key}`} text={`${m.name || 'คนนี้'} คืนมาแล้ว ${money(m.paid)} ยอดต้องไม่น้อยกว่านี้`} />
                        ))}
                        {isEdit && form.members.some((m) => m.paid > 0) && (
                            <span className="flex items-center gap-1.5 px-1 text-xs text-slate-500">
                                <Lock size={12} className="shrink-0" /> คนที่คืนเงินแล้วเอาออกจากบิลไม่ได้ ถ้าจำเป็นให้ยกเลิกรายการรับเงินของคนนั้นก่อน
                            </span>
                        )}
                        {splitErr && <FieldError text={splitErr} />}

                        {total > 0 && (
                            <div className="px-3.5 py-0.5 bg-slate-50 border border-slate-100 rounded-xl text-sm">
                                <div className="flex justify-between gap-3 py-2">
                                    <span className="text-slate-500">ทวงคืนทั้งหมด ({form.members.length} คน)</span>
                                    <span className="font-semibold tabular-nums text-income-600">{money(toCollect)}</span>
                                </div>
                                {form.includeSelf && (
                                    <div className="flex justify-between gap-3 py-2 border-t border-slate-200">
                                        <span className="text-slate-500">ส่วนของเรา</span>
                                        <span className={`font-semibold tabular-nums ${split.selfShare < 0 ? 'text-expense-600' : 'text-slate-800'}`}>{money(split.selfShare)}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ลงรายจ่ายยอดเต็ม */}
                    <div className="flex flex-col gap-3 p-3.5 sm:p-4 rounded-2xl border border-slate-200">
                        <Toggle
                            on={form.recordExpense}
                            onChange={(v) => set({ recordExpense: v })}
                            label="ลงรายจ่ายยอดเต็มให้ด้วย"
                            sub={form.recordExpense
                                ? (isEdit && bill.transactionId != null ? 'รายจ่ายที่ลงไว้จะแก้ยอด/หมวด/วันที่ตามบิล' : 'เพื่อนคืนครบแล้ว ยอดสุทธิจะเหลือแค่ส่วนของเรา')
                                : (isEdit && bill.transactionId != null ? 'จะลบรายจ่ายยอดเต็มที่ระบบลงไว้' : 'ปิดไว้ถ้าบันทึกรายจ่ายบิลนี้เองไปแล้ว')}
                        />
                        {form.recordExpense && (
                            <>
                                <CategorySelect
                                    categories={expenseCats}
                                    value={categoryId}
                                    onChange={(id) => set({ categoryId: id })}
                                    error={!!catErr}
                                    placeholder="เลือกหมวดรายจ่าย"
                                />
                                {catErr && <FieldError text={catErr} />}
                            </>
                        )}
                    </div>

                    <label className="flex flex-col gap-2">
                        <span className="text-sm font-semibold text-slate-700">หมายเหตุ <span className="font-normal text-slate-500">(ไม่บังคับ)</span></span>
                        <input
                            value={form.note}
                            onChange={(e) => set({ note: e.target.value })}
                            placeholder="เช่น ค่าที่พัก + ค่าอาหาร"
                            maxLength={255}
                            className={inputClass(false)}
                        />
                    </label>

                    {!isEdit && (
                        <div className="flex gap-2 items-start px-3 py-2.5 rounded-[10px] bg-brand-50 text-brand-700 text-[13px] leading-[18px] font-medium">
                            <Receipt size={16} className="shrink-0 mt-px" />
                            <span>เพื่อนคืนเงินเมื่อไหร่ กด "รับเงิน" ที่ชื่อคนนั้น ระบบจะลงรายรับหมวด "เงินคืน" ให้</span>
                        </div>
                    )}
                </div>

                <div className="shrink-0 flex gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200">
                    <button type="button" onClick={onCancel} className="w-24 sm:w-[120px] h-12 rounded-xl border border-slate-200 bg-white text-slate-700 text-[15px] font-semibold hover:bg-slate-50">
                        ยกเลิก
                    </button>
                    <button type="submit" className="flex-1 h-12 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-[15px] font-semibold flex items-center justify-center gap-2">
                        <Check size={18} /> {isEdit ? 'บันทึกการแก้ไข' : 'สร้างบิล'}
                    </button>
                </div>
            </form>
        </div>
    );
}
