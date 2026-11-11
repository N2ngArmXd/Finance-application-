import { useEffect, useRef, useState } from 'react';
import { X, AlertCircle, Calendar, Receipt, HandCoins, TriangleAlert } from 'lucide-react';
import { formatMoney, formatDayLabel, toAmountDisplay, sanitizeAmount, toDateInput } from '../../utils/format';
import { CategoryAvatar } from '../../utils/categoryIcons';

const money = (n) => `฿${formatMoney(n)}`;

const FieldError = ({ text }) => (
    <span className="flex items-center gap-1.5 px-1 text-[13px] leading-[18px] font-medium text-expense-700">
        <AlertCircle size={16} className="shrink-0" /> {text}
    </span>
);

const chipClass = (on) =>
    `h-9 px-3 rounded-full text-sm font-medium flex items-center gap-1.5 transition-colors ${on
        ? 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300'
        : 'bg-white text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50'
    }`;

// modal ชำระหนี้ / แก้ไขรายการชำระ · payment = รายการเดิม (โหมดแก้ไข)
// receive = รับเงินคืนจากเพื่อน (บิลหาร) -> ลงเป็นรายรับ "เงินคืน" · defaultAmount = ยอดที่ใส่ให้ก่อน (ส่วนที่หารแล้ว)
// available = ยอดสุทธิคงเหลือ (ไว้เตือนตอนจ่ายเกินเงินที่มี)
export default function PaymentForm({ debt, payment, available, receive = false, defaultAmount, paused = false, onCancel, onSubmit }) {
    const isEdit = !!payment;
    const today = toDateInput(new Date());
    const [form, setForm] = useState(() => payment
        ? { amount: String(payment.amount), date: toDateInput(new Date(payment.paymentDate)), note: payment.note || '' }
        : { amount: defaultAmount != null ? String(Number(Number(defaultAmount).toFixed(2))) : '', date: today, note: '' });
    const [tried, setTried] = useState(false);
    const dateRef = useRef(null);
    const set = (patch) => setForm((f) => ({ ...f, ...patch }));

    useEffect(() => {
        if (paused) return;
        const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [paused, onCancel]);

    const amount = parseFloat(form.amount) || 0;
    // ตอนแก้ไข ยอดเดิมของรายการนี้ถูกนับในยอดจ่ายแล้วอยู่แล้ว
    const maxAmount = debt.remaining + (isEdit ? payment.amount : 0);
    const remainingAfter = maxAmount - amount;
    const delta = amount - (isEdit ? payment.amount : 0);
    // รับเงินคืน = ยอดสุทธิเพิ่ม · จ่ายหนี้ = ยอดสุทธิลด
    const availableAfter = available != null ? available + (receive ? delta : -delta) : null;

    const amountErr = (form.amount !== '' || tried) && !(amount > 0)
        ? 'กรอกจำนวนเงินมากกว่า 0'
        : amount > maxAmount + 0.0001
            ? `${receive ? 'รับ' : 'จ่าย'}ได้ไม่เกิน ${money(maxAmount)}`
            : null;

    const quick = [
        { label: receive ? 'รับทั้งหมด' : 'จ่ายทั้งหมด', value: String(Number(maxAmount.toFixed(2))) },
        ...(maxAmount >= 2 ? [{ label: 'ครึ่งหนึ่ง', value: String(Number((maxAmount / 2).toFixed(2))) }] : []),
    ];

    const openDate = () => {
        const el = dateRef.current;
        if (!el) return;
        try { el.showPicker?.(); } catch { el.focus(); }
    };

    const submit = (e) => {
        e.preventDefault();
        setTried(true);
        if (!(amount > 0) || amount > maxAmount + 0.0001) return;
        onSubmit(form);
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-start md:items-center justify-center sm:p-4 overflow-y-auto animate-fade-in" onClick={onCancel}>
            <form
                onSubmit={submit}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                className="w-[520px] max-w-full h-dvh sm:h-auto sm:my-4 bg-white sm:rounded-3xl shadow-[0_24px_64px_-16px_rgba(15,23,42,0.35)] flex flex-col overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:pt-0 sm:pb-0 animate-zoom-in"
            >
                <div className="h-14 sm:h-16 shrink-0 flex items-center justify-between pl-4 sm:pl-6 pr-2 sm:pr-3 border-b border-slate-100">
                    <span className="flex items-center gap-2 text-[17px] font-semibold text-slate-800">
                        <HandCoins size={20} className={receive ? 'text-income-600' : 'text-rose-600'} />
                        {receive ? (isEdit ? 'แก้ไขรายการรับเงิน' : 'รับเงินคืน') : (isEdit ? 'แก้ไขรายการชำระ' : 'ชำระหนี้')}
                    </span>
                    <button type="button" onClick={onCancel} aria-label="ปิด" className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 min-h-0 sm:flex-none sm:max-h-[calc(92vh-144px)] overflow-y-auto px-4 sm:px-6 pt-5 pb-6 flex flex-col gap-5">
                    {/* หนี้ */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <CategoryAvatar name="HandCoins" size={40} />
                        <div className="flex-1 min-w-0 flex flex-col">
                            <span className="text-[15px] font-semibold text-slate-800 truncate">{debt.creditorName}</span>
                            <span className="text-xs text-slate-500 tabular-nums">
                                {receive ? 'ยังค้าง' : 'คงเหลือ'} {money(debt.remaining)} / {money(debt.totalAmount)}
                            </span>
                        </div>
                    </div>

                    {/* จำนวนเงิน */}
                    <div className="flex flex-col gap-2">
                        <label className={`flex flex-col gap-0.5 pt-3.5 pb-3 px-[18px] rounded-2xl cursor-text ${receive ? 'bg-income-50' : 'bg-expense-50'} ${amountErr ? 'ring-2 ring-inset ring-expense-600' : ''}`}>
                            <span className={`text-[13px] leading-[18px] font-semibold ${receive ? 'text-income-700' : 'text-expense-700'}`}>{receive ? 'ยอดที่ได้รับ' : 'ยอดที่จ่าย'}</span>
                            <span className="flex items-baseline gap-1">
                                <span className={`shrink-0 text-2xl sm:text-[28px] leading-[44px] sm:leading-[52px] font-semibold ${receive ? 'text-income-600' : 'text-expense-600'}`}>{receive ? '+฿' : '−฿'}</span>
                                <input
                                    value={toAmountDisplay(form.amount)}
                                    onChange={(e) => set({ amount: sanitizeAmount(e.target.value) })}
                                    inputMode="decimal"
                                    placeholder="0.00"
                                    aria-label={receive ? 'ยอดที่ได้รับ' : 'ยอดที่จ่าย'}
                                    autoFocus
                                    className={`flex-1 min-w-0 w-0 bg-transparent outline-none p-0 text-[36px] sm:text-[44px] leading-[44px] sm:leading-[52px] font-bold tracking-tight tabular-nums placeholder:text-slate-300 ${receive ? 'text-income-600 caret-income-600' : 'text-expense-600 caret-expense-600'}`}
                                />
                            </span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {quick.map((q) => (
                                <button key={q.label} type="button" onClick={() => set({ amount: q.value })} className={chipClass(form.amount === q.value)}>
                                    {q.label}
                                </button>
                            ))}
                        </div>
                        {amountErr && <FieldError text={amountErr} />}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-2">
                            <span className="text-sm font-semibold text-slate-700">{receive ? 'วันที่ได้รับ' : 'วันที่จ่าย'}</span>
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
                        <label className="flex flex-col gap-2">
                            <span className="text-sm font-semibold text-slate-700">หมายเหตุ <span className="font-normal text-slate-500">(ไม่บังคับ)</span></span>
                            <input
                                value={form.note}
                                onChange={(e) => set({ note: e.target.value })}
                                placeholder="เช่น โอนผ่านแอป"
                                maxLength={255}
                                className="h-12 w-full px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-base sm:text-[15px] text-slate-800 outline-none focus:bg-white focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/10"
                            />
                        </label>
                    </div>

                    {/* ผลหลังทำรายการ */}
                    <div className="px-3.5 py-0.5 bg-slate-50 border border-slate-100 rounded-xl text-sm">
                        <div className="flex justify-between gap-3 py-2">
                            <span className="text-slate-500">{receive ? 'ยังค้างหลังรับ' : 'หนี้คงเหลือหลังจ่าย'}</span>
                            <span className={`font-semibold tabular-nums ${remainingAfter <= 0.0001 ? 'text-income-600' : 'text-slate-800'}`}>
                                {remainingAfter <= 0.0001 ? (receive ? 'คืนครบ' : 'ชำระครบ') : money(Math.max(remainingAfter, 0))}
                            </span>
                        </div>
                        {availableAfter != null && (
                            <div className="flex justify-between gap-3 py-2 border-t border-slate-200">
                                <span className="text-slate-500">{receive ? 'ยอดสุทธิหลังรับ' : 'ยอดสุทธิหลังจ่าย'}</span>
                                <span className={`font-semibold tabular-nums ${availableAfter < 0 ? 'text-warn-700' : 'text-slate-800'}`}>{money(availableAfter)}</span>
                            </div>
                        )}
                    </div>

                    {!receive && availableAfter != null && availableAfter < 0 && (
                        <div className="flex gap-2 items-start px-3 py-2.5 rounded-[10px] bg-warn-50 text-warn-700 text-[13px] leading-[18px] font-medium">
                            <TriangleAlert size={16} className="shrink-0 mt-px" />
                            ยอดจ่ายเกินยอดสุทธิที่บันทึกไว้ จ่ายต่อได้ แต่ลองเช็กว่าบันทึกรายรับครบหรือยัง
                        </div>
                    )}
                    <div className="flex gap-2 items-start px-3 py-2.5 rounded-[10px] bg-brand-50 text-brand-700 text-[13px] leading-[18px] font-medium">
                        <Receipt size={16} className="shrink-0 mt-px" />
                        {isEdit
                            ? `${receive ? 'รายรับ' : 'รายจ่าย'}ที่ผูกอยู่ในประวัติธุรกรรมจะถูกแก้ตามไปด้วย`
                            : receive
                                ? `จะเพิ่มรายรับ ${money(amount)} หมวด "เงินคืน" ในประวัติธุรกรรม`
                                : `จะเพิ่มรายจ่าย ${money(amount)} หมวด "ชำระหนี้" ในประวัติธุรกรรม`}
                    </div>
                </div>

                <div className="shrink-0 flex gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200">
                    <button type="button" onClick={onCancel} className="w-24 sm:w-[120px] h-12 rounded-xl border border-slate-200 bg-white text-slate-700 text-[15px] font-semibold hover:bg-slate-50">
                        ยกเลิก
                    </button>
                    <button type="submit" className="flex-1 h-12 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-[15px] font-semibold flex items-center justify-center gap-2">
                        {isEdit ? 'บันทึกการแก้ไข' : receive ? 'รับเงินคืน' : 'ชำระเงิน'}
                    </button>
                </div>
            </form>
        </div>
    );
}
