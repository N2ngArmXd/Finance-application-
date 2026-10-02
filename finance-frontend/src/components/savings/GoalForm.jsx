import { useEffect, useRef, useState } from 'react';
import { X, AlertCircle, Calendar, Save, Check } from 'lucide-react';
import { formatMoney, formatShortDate, toAmountDisplay, sanitizeAmount, toDateInput } from '../../utils/format';
import { GOAL_ICONS, GOAL_COLORS } from '../../utils/savingsTheme';
import { monthsUntil } from '../../utils/savingsApi';
import GoalAvatar from './GoalAvatar';

const money = (n) => `฿${formatMoney(n)}`;

const inputBase = 'h-12 px-3.5 rounded-xl border bg-slate-50 text-[15px] text-slate-800 outline-none transition-colors focus:bg-white focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/10';

const FieldError = ({ text }) => (
    <span className="flex items-center gap-1.5 px-1 text-[13px] leading-[18px] font-medium text-expense-700">
        <AlertCircle size={16} className="shrink-0" /> {text}
    </span>
);

// modal สร้าง/แก้ไขกระปุก + preview การ์ดสด
// paused = มี dialog ยืนยันซ้อนอยู่ (ไม่ให้ Esc ปิดฟอร์ม)
export default function GoalForm({ mode, initial, balance = 0, paused = false, onCancel, onSubmit }) {
    const [form, setForm] = useState(initial);
    const [tried, setTried] = useState(false);
    const dateRef = useRef(null);
    const isEdit = mode === 'edit';
    const set = (patch) => setForm((f) => ({ ...f, ...patch }));

    useEffect(() => {
        if (paused) return;
        const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [paused, onCancel]);

    const target = parseFloat(form.targetAmount);
    const initialDeposit = parseFloat(form.initialDeposit) || 0;
    const nameErr = tried && !form.name.trim();
    const targetErr = form.hasTarget && (form.targetAmount !== '' || tried) && !(target > 0);

    // preview: ยอดปัจจุบัน (แก้ไข) หรือฝากครั้งแรก (สร้าง)
    const previewBalance = isEdit ? balance : initialDeposit;
    const pct = form.hasTarget && target > 0 ? Math.min(previewBalance / target, 1) * 100 : null;
    const suggested = form.hasTarget && target > previewBalance && form.targetDate
        ? (target - previewBalance) / monthsUntil(form.targetDate)
        : null;
    const c = GOAL_COLORS[form.color] || GOAL_COLORS.navy;

    const openDate = () => {
        const el = dateRef.current;
        if (!el) return;
        if (typeof el.showPicker === 'function') el.showPicker();
        else el.focus();
    };

    const submit = (e) => {
        e.preventDefault();
        setTried(true);
        if (!form.name.trim() || (form.hasTarget && !(target > 0))) return;
        onSubmit(form);
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-start md:items-center justify-center p-4 overflow-y-auto animate-fade-in" onClick={onCancel}>
            <form
                onSubmit={submit}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                className="w-[840px] max-w-full my-4 bg-white rounded-3xl shadow-[0_24px_64px_-16px_rgba(15,23,42,0.35)] flex flex-col overflow-hidden animate-zoom-in"
            >
                <div className="h-16 shrink-0 flex items-center justify-between pl-6 pr-3 border-b border-slate-100">
                    <span className="text-[17px] font-semibold text-slate-800">{isEdit ? 'แก้ไขกระปุก' : 'สร้างกระปุกใหม่'}</span>
                    <button type="button" onClick={onCancel} aria-label="ปิด" className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100">
                        <X size={20} />
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] max-h-[calc(92vh-144px)] overflow-y-auto">
                    <div className="px-6 pt-5 pb-6 flex flex-col gap-[18px]">
                        <label className="flex flex-col gap-2">
                            <span className="text-sm font-semibold text-slate-700">ชื่อกระปุก <span className="text-expense-600">*</span></span>
                            <input
                                value={form.name}
                                onChange={(e) => set({ name: e.target.value })}
                                placeholder="เช่น เที่ยวญี่ปุ่น, เงินสำรองฉุกเฉิน"
                                autoFocus={!isEdit}
                                className={`${inputBase} ${nameErr ? 'border-expense-600' : 'border-slate-200'}`}
                            />
                            {nameErr && <FieldError text="ตั้งชื่อกระปุก" />}
                        </label>

                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-semibold text-slate-700">ยอดเป้าหมาย</span>
                                <label className="flex items-center gap-2 text-[13px] text-slate-600 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={!form.hasTarget}
                                        onChange={(e) => set({ hasTarget: !e.target.checked })}
                                        className="w-4 h-4 accent-brand-600"
                                    />
                                    ไม่กำหนดเป้า (เก็บไปเรื่อย ๆ)
                                </label>
                            </div>
                            {form.hasTarget && (
                                <>
                                    <label className={`flex items-baseline gap-1 pt-2 pb-1.5 px-[18px] rounded-2xl bg-brand-50 cursor-text ${targetErr ? 'ring-2 ring-inset ring-expense-600' : ''}`}>
                                        <span className="text-[24px] leading-[44px] font-semibold text-brand-600">฿</span>
                                        <input
                                            value={toAmountDisplay(form.targetAmount)}
                                            onChange={(e) => set({ targetAmount: sanitizeAmount(e.target.value) })}
                                            inputMode="decimal"
                                            placeholder="0.00"
                                            aria-label="ยอดเป้าหมาย"
                                            className="flex-1 min-w-0 w-0 bg-transparent outline-none p-0 text-[36px] leading-[44px] font-bold tracking-tight tabular-nums text-brand-600 placeholder:text-brand-200"
                                        />
                                    </label>
                                    {targetErr && <FieldError text="ยอดเป้าหมายต้องมากกว่า 0" />}
                                </>
                            )}
                        </div>

                        <div className={`grid gap-3 ${isEdit ? 'grid-cols-1' : 'grid-cols-2'}`}>
                            {form.hasTarget && (
                                <div className="flex flex-col gap-2">
                                    <span className="text-sm font-semibold text-slate-700">อยากถึงเป้าภายใน <span className="font-normal text-slate-500">(ไม่บังคับ)</span></span>
                                    <div onClick={openDate} className={`relative flex items-center gap-2.5 cursor-pointer ${inputBase} border-slate-200`}>
                                        <Calendar size={18} className="shrink-0 text-slate-500" />
                                        <span className={`flex-1 ${form.targetDate ? '' : 'text-slate-400'}`}>
                                            {form.targetDate ? formatShortDate(form.targetDate) : 'เลือกวันที่'}
                                        </span>
                                        {form.targetDate && (
                                            <button type="button" onClick={(e) => { e.stopPropagation(); set({ targetDate: '' }); }} aria-label="ล้างวันที่" className="text-slate-400 hover:text-slate-600">
                                                <X size={16} />
                                            </button>
                                        )}
                                        <input
                                            ref={dateRef}
                                            type="date"
                                            tabIndex={-1}
                                            min={toDateInput(new Date())}
                                            value={form.targetDate}
                                            onChange={(e) => set({ targetDate: e.target.value })}
                                            className="absolute inset-0 opacity-0 pointer-events-none"
                                        />
                                    </div>
                                </div>
                            )}
                            {!isEdit && (
                                <div className="flex flex-col gap-2">
                                    <span className="text-sm font-semibold text-slate-700">ฝากครั้งแรก <span className="font-normal text-slate-500">(ไม่บังคับ)</span></span>
                                    <label className={`flex items-center gap-1.5 ${inputBase} border-slate-200 focus-within:bg-white focus-within:border-brand-500`}>
                                        <span className="text-slate-500">฿</span>
                                        <input
                                            value={toAmountDisplay(form.initialDeposit)}
                                            onChange={(e) => set({ initialDeposit: sanitizeAmount(e.target.value) })}
                                            inputMode="decimal"
                                            placeholder="0.00"
                                            aria-label="ฝากครั้งแรก"
                                            className="flex-1 min-w-0 w-0 bg-transparent outline-none tabular-nums"
                                        />
                                    </label>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <span className="text-sm font-semibold text-slate-700">ไอคอน</span>
                            <div className="grid grid-cols-6 gap-2">
                                {Object.keys(GOAL_ICONS).map((key) => {
                                    const Icon = GOAL_ICONS[key];
                                    const active = form.icon === key;
                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            aria-pressed={active}
                                            aria-label={key}
                                            onClick={() => set({ icon: key })}
                                            className={`h-12 rounded-xl flex items-center justify-center transition-colors ${active ? `${c.soft} ring-2 ring-inset ring-brand-500` : 'bg-white ring-1 ring-inset ring-slate-200 hover:bg-slate-50'}`}
                                        >
                                            <Icon size={20} className={active ? c.text : 'text-slate-600'} />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <span className="text-sm font-semibold text-slate-700">สี</span>
                            <div className="flex flex-wrap gap-2.5">
                                {Object.entries(GOAL_COLORS).map(([key, col]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        aria-pressed={form.color === key}
                                        aria-label={key}
                                        onClick={() => set({ color: key })}
                                        className={`w-9 h-9 rounded-full flex items-center justify-center ${col.dot} ${form.color === key ? 'ring-2 ring-offset-2 ring-brand-500' : ''}`}
                                    >
                                        {form.color === key && <Check size={16} className="text-white" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <label className="flex flex-col gap-2">
                            <span className="text-sm font-semibold text-slate-700">รายละเอียด <span className="font-normal text-slate-500">(ไม่บังคับ)</span></span>
                            <input
                                value={form.description}
                                onChange={(e) => set({ description: e.target.value })}
                                placeholder="เช่น ทริปเดือนเมษา 5 วัน"
                                className={`${inputBase} border-slate-200`}
                            />
                        </label>
                    </div>

                    {/* preview การ์ด */}
                    <div className="bg-slate-50 lg:border-l border-slate-100 px-6 pt-5 pb-6 flex flex-col gap-3">
                        <span className="text-[13px] font-semibold text-slate-600">ตัวอย่าง</span>
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                            <div className="flex items-center gap-3 min-w-0">
                                <GoalAvatar icon={form.icon} color={form.color} size={44} />
                                <div className="min-w-0 flex flex-col">
                                    <span className="text-base font-semibold text-slate-800 truncate">{form.name.trim() || 'ชื่อกระปุก'}</span>
                                    {form.description && <span className="text-xs leading-[18px] text-slate-500 line-clamp-2 break-words">{form.description}</span>}
                                </div>
                            </div>
                            <div className="flex items-baseline gap-1.5 flex-wrap">
                                <span className="text-2xl font-bold text-slate-900 tabular-nums">{money(previewBalance)}</span>
                                {form.hasTarget && target > 0 && <span className="text-[13px] text-slate-500 tabular-nums">/ {money(target)}</span>}
                            </div>
                            {pct != null ? (
                                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                    <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${pct}%` }} />
                                </div>
                            ) : (
                                <span className="text-xs text-slate-500">ไม่กำหนดเป้า</span>
                            )}
                            {suggested != null && (
                                <span className="text-[13px] text-slate-600">
                                    ต้องออมเดือนละ ~<b className="font-semibold text-slate-800 tabular-nums">{money(suggested)}</b>
                                    {' '}เพื่อถึงเป้าใน {formatShortDate(form.targetDate)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="shrink-0 flex items-center gap-3 px-6 py-4 border-t border-slate-200">
                    <span className="flex-1 text-[13px] text-slate-500"><span className="text-expense-600">*</span> จำเป็นต้องกรอก</span>
                    <button type="button" onClick={onCancel} className="w-[120px] h-12 rounded-xl border border-slate-200 bg-white text-slate-700 text-[15px] font-semibold hover:bg-slate-50">
                        ยกเลิก
                    </button>
                    <button type="submit" className="w-[200px] h-12 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-[15px] font-semibold flex items-center justify-center gap-2">
                        <Save size={18} /> {isEdit ? 'บันทึกการแก้ไข' : 'สร้างกระปุก'}
                    </button>
                </div>
            </form>
        </div>
    );
}
