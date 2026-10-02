import { useEffect, useMemo, useRef, useState } from 'react';
import { X, AlertCircle, Calendar, ListOrdered, Save, TriangleAlert } from 'lucide-react';
import { formatMoney, formatShortDate } from '../../utils/format';
import { calculatePreview } from '../../utils/installmentMath';

const money = (n) => `฿${formatMoney(n)}`;

// แสดงยอดที่พิมพ์พร้อมคอมมา / รับเฉพาะตัวเลข (เหมือน TxnForm)
const toDisplay = (raw) => {
    if (raw === '' || raw == null) return '';
    const [i, d] = String(raw).split('.');
    const ii = i === '' ? '0' : Number(i).toLocaleString('en-US');
    return d === undefined ? ii : `${ii}.${d}`;
};
const sanitize = (value) => {
    let v = value.replace(/[^\d.]/g, '');
    const parts = v.split('.');
    if (parts.length > 2) v = `${parts[0]}.${parts.slice(1).join('')}`;
    const [i, d] = v.split('.');
    return i.replace(/^0+(?=\d)/, '').slice(0, 9) + (d !== undefined ? `.${d.slice(0, 2)}` : '');
};

const FieldError = ({ text }) => (
    <span className="flex items-center gap-1.5 px-1 text-[13px] leading-[18px] font-medium text-expense-700">
        <AlertCircle size={16} className="shrink-0" /> {text}
    </span>
);

const inputBase = 'h-12 px-3.5 rounded-xl border bg-slate-50 text-base sm:text-[15px] text-slate-800 outline-none transition-colors focus:bg-white focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/10';

const PREVIEW_GRID = 'grid grid-cols-[40px_minmax(0,1fr)_auto] sm:grid-cols-[52px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-2 sm:gap-x-0 px-3 sm:px-4';

const segClass = (active) =>
    `rounded-[9px] font-semibold transition-all ${active
        ? 'bg-white text-brand-700 shadow-[0_1px_2px_rgba(15,23,42,0.08),0_1px_3px_rgba(15,23,42,0.06)]'
        : 'text-slate-500 hover:text-slate-700'
    }`;

// modal สร้าง/แก้ไขรายการผ่อน: ฟอร์มซ้าย + ตารางจำลองขวา (มือถือ: เต็มจอ ฟอร์มบน ตารางล่าง)
// paused = มี dialog ยืนยันซ้อนอยู่ (ไม่ให้ Esc ปิดฟอร์ม)
export default function InstallmentForm({ mode, initial, paused = false, onCancel, onSubmit }) {
    const [form, setForm] = useState(initial);
    const [tried, setTried] = useState(false);
    const dateRef = useRef(null);
    const isEdit = mode === 'edit';

    const set = (patch) => setForm((f) => ({ ...f, ...patch }));
    const preview = useMemo(() => calculatePreview(form), [form]);

    // ปิดด้วย Esc
    useEffect(() => {
        if (paused) return;
        const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [paused, onCancel]);

    const amt = parseFloat(form.totalAmount);
    const mo = parseInt(form.installmentMonths, 10);
    const amountErr = (form.totalAmount !== '' || tried) && !(amt > 0);
    const monthsErr = (form.installmentMonths !== '' || tried) && !(mo > 0);
    const nameErr = tried && !form.installmentsName.trim();

    const openDate = () => {
        const el = dateRef.current;
        if (!el) return;
        if (typeof el.showPicker === 'function') el.showPicker();
        else el.focus();
    };

    const submit = (e) => {
        e.preventDefault();
        setTried(true);
        if (!preview || !form.installmentsName.trim()) return;
        onSubmit(form, preview);
    };

    return (
        <div
            className="fixed inset-0 z-50 bg-slate-900/40 flex items-start md:items-center justify-center sm:p-4 overflow-y-auto animate-fade-in"
            onClick={onCancel}
        >
            <form
                onSubmit={submit}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                className="w-[1000px] max-w-full h-dvh sm:h-auto sm:my-4 bg-white sm:rounded-3xl shadow-[0_24px_64px_-16px_rgba(15,23,42,0.35)] flex flex-col overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:pt-0 sm:pb-0 animate-zoom-in"
            >
                <div className="h-14 sm:h-16 shrink-0 flex items-center justify-between pl-4 sm:pl-6 pr-2 sm:pr-3 border-b border-slate-100">
                    <span className="text-[17px] font-semibold text-slate-800">{isEdit ? 'แก้ไขรายการผ่อน' : 'สร้างรายการผ่อนใหม่'}</span>
                    <button type="button" onClick={onCancel} aria-label="ปิด" className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 min-h-0 sm:flex-none grid grid-cols-1 lg:grid-cols-[440px_minmax(0,1fr)] sm:max-h-[calc(92vh-144px)] overflow-y-auto">
                    {/* ฟอร์ม */}
                    <div className="px-4 sm:px-6 pt-5 pb-6 flex flex-col gap-[18px]">
                        <label className="flex flex-col gap-2">
                            <span className="text-sm font-semibold text-slate-700">ชื่อรายการ <span className="text-expense-600">*</span></span>
                            <input
                                value={form.installmentsName}
                                onChange={(e) => set({ installmentsName: e.target.value })}
                                placeholder="เช่น ผ่อนโทรศัพท์, ผ่อนรถ"
                                className={`${inputBase} ${nameErr ? 'border-expense-600' : 'border-slate-200'}`}
                            />
                            {nameErr && <FieldError text="กรอกชื่อรายการ" />}
                        </label>

                        <div className="flex flex-col gap-1.5">
                            <label className={`flex flex-col gap-0.5 pt-3.5 pb-3 px-[18px] rounded-2xl bg-brand-50 cursor-text ${amountErr ? 'ring-2 ring-inset ring-expense-600' : ''}`}>
                                <span className="text-[13px] leading-[18px] font-semibold text-brand-700">ยอดจัด / เงินต้น <span className="text-expense-600">*</span></span>
                                <span className="flex items-baseline gap-1">
                                    <span className="text-2xl sm:text-[28px] leading-[44px] sm:leading-[52px] font-semibold text-brand-600">฿</span>
                                    <input
                                        value={toDisplay(form.totalAmount)}
                                        onChange={(e) => set({ totalAmount: sanitize(e.target.value) })}
                                        inputMode="decimal"
                                        placeholder="0.00"
                                        aria-label="ยอดจัด"
                                        className="flex-1 min-w-0 w-0 bg-transparent outline-none p-0 text-[36px] sm:text-[44px] leading-[44px] sm:leading-[52px] font-bold tracking-tight tabular-nums text-brand-600 placeholder:text-brand-200"
                                    />
                                </span>
                            </label>
                            {amountErr && <FieldError text="ยอดเงินต้องมากกว่า 0" />}
                        </div>

                        <div className="flex flex-col gap-2">
                            <span className="text-sm font-semibold text-slate-700">อัตราดอกเบี้ย</span>
                            <div className="flex gap-2">
                                <label className={`flex-1 min-w-0 flex items-center gap-1.5 ${inputBase} border-slate-200 focus-within:bg-white focus-within:border-brand-500`}>
                                    <input
                                        value={form.interestRate}
                                        onChange={(e) => set({ interestRate: sanitize(e.target.value).slice(0, 6) })}
                                        inputMode="decimal"
                                        placeholder="0.00"
                                        aria-label="อัตราดอกเบี้ย"
                                        className="flex-1 min-w-0 w-0 bg-transparent outline-none tabular-nums"
                                    />
                                    <span className="text-slate-500">%</span>
                                </label>
                                <div className="h-12 flex gap-0.5 p-1 bg-slate-100 rounded-xl">
                                    {[['YEARLY', 'ต่อปี'], ['MONTHLY', 'ต่อเดือน']].map(([v, label]) => (
                                        <button key={v} type="button" onClick={() => set({ interestType: v })} className={`h-10 px-3.5 text-sm ${segClass(form.interestType === v)}`}>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-2">
                                <span className="text-sm font-semibold text-slate-700">จำนวนงวด <span className="text-expense-600">*</span></span>
                                <label className={`flex items-center gap-1.5 ${inputBase} ${monthsErr ? 'border-expense-600' : 'border-slate-200'} focus-within:bg-white focus-within:border-brand-500`}>
                                    <input
                                        value={form.installmentMonths}
                                        onChange={(e) => set({ installmentMonths: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                                        inputMode="numeric"
                                        placeholder="เช่น 10"
                                        aria-label="จำนวนงวด"
                                        className="flex-1 min-w-0 w-0 bg-transparent outline-none tabular-nums"
                                    />
                                    <span className="text-sm text-slate-500">งวด</span>
                                </label>
                                {monthsErr && <FieldError text="ต้องมากกว่า 0" />}
                            </div>
                            <div className="flex flex-col gap-2">
                                <span className="text-sm font-semibold text-slate-700">เริ่มชำระงวดแรก <span className="text-expense-600">*</span></span>
                                <div onClick={openDate} className={`relative flex items-center gap-2.5 cursor-pointer ${inputBase} border-slate-200`}>
                                    <Calendar size={18} className="shrink-0 text-slate-500" />
                                    <span className="flex-1">{formatShortDate(form.startDate)}</span>
                                    <input
                                        ref={dateRef}
                                        type="date"
                                        required
                                        tabIndex={-1}
                                        value={form.startDate}
                                        onChange={(e) => e.target.value && set({ startDate: e.target.value })}
                                        className="absolute inset-0 opacity-0 pointer-events-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <span className="text-sm font-semibold text-slate-700">วิธีคิดดอกเบี้ย</span>
                            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
                                {[
                                    ['FLAT', 'คงที่', 'ดอกเบี้ยคิดจากยอดเต็มทุกงวด'],
                                    ['EFFECTIVE', 'ลดต้นลดดอก', 'ดอกเบี้ยคิดจากเงินต้นคงเหลือ'],
                                ].map(([v, label, sub]) => (
                                    <button
                                        key={v}
                                        type="button"
                                        onClick={() => set({ calculationMethod: v })}
                                        className={`flex-1 min-h-[60px] px-2.5 py-2 flex flex-col items-center justify-center gap-0.5 ${segClass(form.calculationMethod === v)}`}
                                    >
                                        <span className="text-[15px]">{label}</span>
                                        <span className="text-xs font-normal text-slate-500">{sub}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <label className="flex flex-col gap-2">
                            <span className="text-sm font-semibold text-slate-700">รายละเอียด <span className="font-normal text-slate-500">(ไม่บังคับ)</span></span>
                            <input
                                value={form.description}
                                onChange={(e) => set({ description: e.target.value })}
                                placeholder="เช่น รุ่น, ร้านค้า"
                                className={`${inputBase} border-slate-200`}
                            />
                        </label>
                    </div>

                    {/* สรุป + ตารางจำลอง */}
                    <div className="bg-slate-50 lg:border-l border-slate-100 px-4 sm:px-6 pt-5 pb-6 flex flex-col gap-4 min-w-0">
                        <div className="bg-white border border-slate-200 rounded-2xl px-4 sm:px-5 py-[18px] flex flex-col gap-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                            <div className="flex flex-col">
                                <span className="text-[13px] font-semibold text-brand-700">ยอดผ่อนต่อเดือน</span>
                                <span className={`text-[36px] leading-[44px] sm:text-[44px] sm:leading-[52px] [overflow-wrap:anywhere] font-bold tracking-tight tabular-nums ${preview ? 'text-brand-600' : 'text-slate-300'}`}>
                                    {preview ? money(preview.monthlyPayment) : '฿—'}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                                <div className="flex flex-col">
                                    <span className="text-xs text-slate-600">ดอกเบี้ยรวม</span>
                                    <span className={`text-base font-semibold tabular-nums ${preview ? 'text-slate-800' : 'text-slate-300'}`}>{preview ? money(preview.totalInterest) : '—'}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs text-slate-600">ยอดรวมที่ต้องจ่าย</span>
                                    <span className={`text-base font-semibold tabular-nums ${preview ? 'text-slate-800' : 'text-slate-300'}`}>{preview ? money(preview.totalPayable) : '—'}</span>
                                </div>
                            </div>
                        </div>

                        {preview ? (
                            <div className="flex flex-col gap-2.5 min-h-0">
                                <div className="flex items-baseline justify-between">
                                    <span className="text-base font-semibold text-slate-800">ตารางจำลอง</span>
                                    <span className="text-[13px] text-slate-500">
                                        {preview.schedule.length} งวด · {form.calculationMethod === 'EFFECTIVE' ? 'ลดต้นลดดอก' : 'คงที่'}
                                    </span>
                                </div>
                                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                                    {/* มือถือซ่อนคอลัมน์เงินต้นคงเหลือ (ที่ไม่พอสำหรับ 4 คอลัมน์ตัวเลข) */}
                                    <div className={`${PREVIEW_GRID} h-9 items-center bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500`}>
                                        <span>งวด</span><span>วันครบกำหนด</span><span className="text-right">ค่างวด</span><span className="hidden sm:block text-right">เงินต้นคงเหลือ</span>
                                    </div>
                                    <div className="max-h-[316px] overflow-y-auto">
                                        {preview.schedule.map((r, i) => (
                                            <div key={r.month} className={`${PREVIEW_GRID} min-h-10 items-center text-sm tabular-nums ${i ? 'border-t border-slate-100' : ''}`}>
                                                <span className="font-semibold text-slate-700">{r.month}</span>
                                                <span className="text-slate-600">{formatShortDate(r.date)}</span>
                                                <span className="text-right font-semibold text-brand-600">{money(r.payment)}</span>
                                                <span className="hidden sm:block text-right text-slate-500">{money(r.remaining)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 min-h-[260px] flex flex-col items-center justify-center gap-2 text-center border-[1.5px] border-dashed border-slate-300 rounded-2xl p-6">
                                <span className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
                                    <ListOrdered size={26} className="text-slate-600" />
                                </span>
                                <span className="text-base font-semibold text-slate-800">กรอกยอดจัดและจำนวนงวด</span>
                                <span className="text-sm text-slate-600">ตารางจำลองจะแสดงที่นี่ทันทีที่คำนวณได้</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* มือถือ: ข้อความเตือนเต็มแถวด้านบน ปุ่มอยู่แถวล่าง */}
                <div className="shrink-0 flex flex-wrap sm:flex-nowrap items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200">
                    {isEdit ? (
                        <div className="basis-full sm:basis-auto flex-1 min-w-0 flex items-center gap-2 px-3 py-2.5 rounded-[10px] bg-warn-50 text-warn-700 text-[13px] leading-[18px] font-medium">
                            <TriangleAlert size={16} className="shrink-0" />
                            ระบบจะคำนวณตารางใหม่ งวดที่จ่ายเกินช่วงใหม่จะถูกตัดออก
                        </div>
                    ) : (
                        <span className="hidden sm:block flex-1 text-[13px] text-slate-500"><span className="text-expense-600">*</span> จำเป็นต้องกรอก</span>
                    )}
                    <button type="button" onClick={onCancel} className="w-24 sm:w-[120px] h-12 rounded-xl border border-slate-200 bg-white text-slate-700 text-[15px] font-semibold hover:bg-slate-50">
                        ยกเลิก
                    </button>
                    <button
                        type="submit"
                        disabled={!preview}
                        className="flex-1 sm:flex-none sm:w-[220px] h-12 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-[15px] font-semibold flex items-center justify-center gap-2 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed"
                    >
                        <Save size={18} /> {isEdit ? 'บันทึกการแก้ไข' : 'บันทึกตารางผ่อน'}
                    </button>
                </div>
            </form>
        </div>
    );
}
