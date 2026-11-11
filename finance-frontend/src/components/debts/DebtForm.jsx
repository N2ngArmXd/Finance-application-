import { useEffect, useRef, useState } from 'react';
import { X, AlertCircle, Calendar, HandCoins, Info } from 'lucide-react';
import { formatMoney, formatDayLabel, toAmountDisplay, sanitizeAmount, toDateInput } from '../../utils/format';

const money = (n) => `฿${formatMoney(n)}`;

const FieldError = ({ text }) => (
    <span className="flex items-center gap-1.5 px-1 text-[13px] leading-[18px] font-medium text-expense-700">
        <AlertCircle size={16} className="shrink-0" /> {text}
    </span>
);

const inputClass = (err) =>
    `h-12 w-full px-3.5 rounded-xl border bg-slate-50 text-base sm:text-[15px] text-slate-800 outline-none focus:bg-white focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/10 ${err ? 'border-expense-600' : 'border-slate-200'}`;

// ช่องเลือกวันที่ (แตะทั้งช่องเพื่อเปิดปฏิทิน)
function DateField({ label, value, onChange, min, max, placeholder, onClear }) {
    const ref = useRef(null);
    const open = () => {
        const el = ref.current;
        if (!el) return;
        // iOS/iPad เปิดปฏิทินเองจากการแตะ input โดยตรง — showPicker ใช้กับ desktop (อาจ throw ได้)
        try { el.showPicker?.(); } catch { el.focus(); }
    };
    return (
        <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700">{label}</span>
            <div onClick={open} className="relative h-12 px-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-2.5 cursor-pointer text-base sm:text-[15px] text-slate-800">
                <Calendar size={18} className="shrink-0 text-slate-500" />
                <span className={`flex-1 truncate ${value ? '' : 'text-slate-400'}`}>{value ? formatDayLabel(value) : placeholder}</span>
                <input
                    ref={ref}
                    type="date"
                    tabIndex={-1}
                    min={min}
                    max={max}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {value && onClear && (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onClear(); }}
                        aria-label="ล้างวันที่"
                        className="relative z-10 -mr-1.5 w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>
        </div>
    );
}

// modal สร้าง / แก้ไขรายการหนี้ · paidAmount = ยอดที่จ่ายไปแล้ว (โหมดแก้ไข ยอดหนี้ต้องไม่น้อยกว่านี้)
export default function DebtForm({ mode, initial, paidAmount = 0, paused = false, onCancel, onSubmit }) {
    const isEdit = mode === 'edit';
    const today = toDateInput(new Date());
    const [form, setForm] = useState(initial);
    const [tried, setTried] = useState(false);
    const set = (patch) => setForm((f) => ({ ...f, ...patch }));

    useEffect(() => {
        if (paused) return;
        const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [paused, onCancel]);

    const amount = parseFloat(form.totalAmount) || 0;
    const nameErr = tried && !form.creditorName.trim() ? 'ระบุว่าติดหนี้ใคร' : null;
    const amountErr = (form.totalAmount !== '' || tried) && !(amount > 0)
        ? 'กรอกยอดหนี้มากกว่า 0'
        : isEdit && amount < paidAmount
            ? `ยอดหนี้ต้องไม่น้อยกว่ายอดที่จ่ายไปแล้ว (${money(paidAmount)})`
            : null;
    const dueErr = form.dueDate && form.dueDate < form.borrowDate ? 'กำหนดคืนต้องไม่ก่อนวันที่ยืม' : null;

    const submit = (e) => {
        e.preventDefault();
        setTried(true);
        if (!form.creditorName.trim() || !(amount > 0) || (isEdit && amount < paidAmount) || dueErr) return;
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
                        <HandCoins size={20} className="text-rose-600" />
                        {isEdit ? 'แก้ไขรายการหนี้' : 'เพิ่มรายการหนี้'}
                    </span>
                    <button type="button" onClick={onCancel} aria-label="ปิด" className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 min-h-0 sm:flex-none sm:max-h-[calc(92vh-144px)] overflow-y-auto px-4 sm:px-6 pt-5 pb-6 flex flex-col gap-5">
                    <label className="flex flex-col gap-2">
                        <span className="text-sm font-semibold text-slate-700">ติดหนี้ใคร</span>
                        <input
                            value={form.creditorName}
                            onChange={(e) => set({ creditorName: e.target.value })}
                            placeholder="เช่น พี่เอ · แม่ · บัตรเพื่อน"
                            maxLength={100}
                            autoFocus={!isEdit}
                            className={inputClass(nameErr)}
                        />
                        {nameErr && <FieldError text={nameErr} />}
                    </label>

                    <div className="flex flex-col gap-2">
                        <label className={`flex flex-col gap-0.5 pt-3.5 pb-3 px-[18px] rounded-2xl cursor-text bg-rose-50 ${amountErr ? 'ring-2 ring-inset ring-expense-600' : ''}`}>
                            <span className="text-[13px] leading-[18px] font-semibold text-rose-700">ยอดหนี้ทั้งหมด</span>
                            <span className="flex items-baseline gap-1">
                                <span className="shrink-0 text-2xl sm:text-[28px] leading-[44px] sm:leading-[52px] font-semibold text-rose-700">฿</span>
                                <input
                                    value={toAmountDisplay(form.totalAmount)}
                                    onChange={(e) => set({ totalAmount: sanitizeAmount(e.target.value) })}
                                    inputMode="decimal"
                                    placeholder="0.00"
                                    aria-label="ยอดหนี้ทั้งหมด"
                                    className="flex-1 min-w-0 w-0 bg-transparent outline-none p-0 text-[36px] sm:text-[44px] leading-[44px] sm:leading-[52px] font-bold tracking-tight tabular-nums text-rose-700 caret-rose-700 placeholder:text-rose-200"
                                />
                            </span>
                        </label>
                        {amountErr && <FieldError text={amountErr} />}
                        {isEdit && paidAmount > 0 && !amountErr && (
                            <span className="px-1 text-[13px] text-slate-500">จ่ายไปแล้ว {money(paidAmount)} · คงเหลือหลังแก้ {money(Math.max(amount - paidAmount, 0))}</span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <DateField
                            label="วันที่ยืม"
                            value={form.borrowDate}
                            max={today}
                            onChange={(v) => v && set({ borrowDate: v })}
                        />
                        <div className="flex flex-col gap-2">
                            <DateField
                                label={<>กำหนดคืน <span className="font-normal text-slate-500">(ไม่บังคับ)</span></>}
                                value={form.dueDate}
                                min={form.borrowDate}
                                placeholder="ไม่กำหนด"
                                onChange={(v) => set({ dueDate: v })}
                                onClear={() => set({ dueDate: '' })}
                            />
                            {dueErr && <FieldError text={dueErr} />}
                        </div>
                    </div>

                    <label className="flex flex-col gap-2">
                        <span className="text-sm font-semibold text-slate-700">หมายเหตุ <span className="font-normal text-slate-500">(ไม่บังคับ)</span></span>
                        <textarea
                            value={form.description}
                            onChange={(e) => set({ description: e.target.value })}
                            placeholder="เช่น ยืมค่าเทอม คืนเดือนละ 1,000"
                            rows={2}
                            maxLength={500}
                            className="w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-slate-50 text-base sm:text-[15px] text-slate-800 outline-none resize-none focus:bg-white focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/10"
                        />
                    </label>

                    {!isEdit && (
                        <div className="flex gap-2 items-start px-3 py-2.5 rounded-[10px] bg-brand-50 text-brand-700 text-[13px] leading-[18px] font-medium">
                            <Info size={16} className="shrink-0 mt-px" />
                            จดไว้เฉยๆ ยังไม่หักเงิน · ยอดสุทธิจะลดตอนกด "ชำระ" (ระบบลงรายจ่ายหมวดชำระหนี้ให้)
                        </div>
                    )}
                </div>

                <div className="shrink-0 flex gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200">
                    <button type="button" onClick={onCancel} className="w-24 sm:w-[120px] h-12 rounded-xl border border-slate-200 bg-white text-slate-700 text-[15px] font-semibold hover:bg-slate-50">
                        ยกเลิก
                    </button>
                    <button type="submit" className="flex-1 h-12 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-[15px] font-semibold flex items-center justify-center gap-2">
                        {isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มรายการหนี้'}
                    </button>
                </div>
            </form>
        </div>
    );
}
