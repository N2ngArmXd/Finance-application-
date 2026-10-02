import { useRef } from 'react';
import { ArrowDownCircle, ArrowUpCircle, AlertCircle, Calendar, Lock } from 'lucide-react';
import { CategoryAvatar } from '../utils/categoryIcons';
import { formatDayLabel } from '../utils/format';

// แสดงยอดที่พิมพ์พร้อมคอมมา (เก็บค่าจริงเป็นตัวเลขล้วน เช่น "1250.5")
const toDisplay = (raw) => {
    if (raw === '' || raw == null) return '';
    const [i, d] = String(raw).split('.');
    const ii = i === '' ? '0' : Number(i).toLocaleString('en-US');
    return d === undefined ? ii : `${ii}.${d}`;
};

// รับเฉพาะตัวเลขและจุด ทศนิยมไม่เกิน 2 ตำแหน่ง
const sanitize = (value) => {
    let v = value.replace(/[^\d.]/g, '');
    const parts = v.split('.');
    if (parts.length > 2) v = `${parts[0]}.${parts.slice(1).join('')}`;
    const [i, d] = v.split('.');
    return i.replace(/^0+(?=\d)/, '').slice(0, 9) + (d !== undefined ? `.${d.slice(0, 2)}` : '');
};

const chipClass = (on) =>
    `h-10 px-3.5 rounded-full text-sm font-medium flex items-center gap-1.5 transition-colors ${on
        ? 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300'
        : 'bg-white text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50'
    }`;

const FieldError = ({ text }) => (
    <span className="flex items-center gap-1.5 px-1 text-[13px] leading-[18px] font-medium text-expense-700">
        <AlertCircle size={16} className="shrink-0" /> {text}
    </span>
);

// ฟอร์มรายการ (ใช้ทั้งหน้าบันทึกและ drawer แก้ไข)
// dateMode: 'chips' = เลือกวันนี้/เมื่อวาน/เลือกวัน · 'readonly' = แสดงวันที่อย่างเดียว
export default function TxnForm({
    type, onTypeChange,
    amount, onAmountChange,
    categories, loadingCats = false, categoryId, onCategoryChange,
    dateMode = 'chips', date, onDateChange, today, yesterday, dateText,
    description, onDescriptionChange,
    errors = {},
    autoFocusAmount = false,
}) {
    const dateInputRef = useRef(null);
    const isExpense = type === 'EXPENSE';
    const visible = categories.filter((c) => c.type === type);
    const selected = visible.find((c) => c.id === categoryId);
    const isCustomDate = dateMode === 'chips' && date !== today && date !== yesterday;

    const openPicker = () => {
        const el = dateInputRef.current;
        if (!el) return;
        if (el.showPicker) el.showPicker();
        else el.click();
    };

    const segment = (active, tone) =>
        `flex-1 h-11 rounded-[9px] flex items-center justify-center gap-2 text-[15px] font-semibold transition-all duration-200 ${active
            ? `bg-white shadow-[0_1px_2px_rgba(15,23,42,0.08),0_1px_3px_rgba(15,23,42,0.06)] ${tone}`
            : 'text-slate-500 hover:text-slate-700'
        }`;

    return (
        <div className="flex flex-col gap-5">
            {/* ประเภท */}
            <div role="tablist" className="flex gap-1 p-1 bg-slate-100 rounded-xl">
                <button type="button" role="tab" aria-selected={isExpense} onClick={() => onTypeChange('EXPENSE')} className={segment(isExpense, 'text-expense-600')}>
                    <ArrowDownCircle size={18} /> รายจ่าย
                </button>
                <button type="button" role="tab" aria-selected={!isExpense} onClick={() => onTypeChange('INCOME')} className={segment(!isExpense, 'text-income-600')}>
                    <ArrowUpCircle size={18} /> รายรับ
                </button>
            </div>

            {/* จำนวนเงิน */}
            <div className="flex flex-col gap-1.5">
                <label
                    className={`flex flex-col gap-0.5 pt-3.5 pb-3 px-[18px] rounded-2xl cursor-text transition-colors duration-200 ${isExpense ? 'bg-expense-50' : 'bg-income-50'} ${errors.amt ? 'ring-2 ring-inset ring-expense-600' : ''}`}
                >
                    <span className={`text-[13px] leading-[18px] font-semibold ${isExpense ? 'text-expense-700' : 'text-income-700'}`}>จำนวนเงิน</span>
                    <span className="flex items-baseline gap-1">
                        <span className={`shrink-0 whitespace-nowrap text-2xl sm:text-[28px] leading-[44px] sm:leading-[52px] font-semibold tabular-nums ${isExpense ? 'text-expense-600' : 'text-income-600'}`}>
                            {isExpense ? '−' : '+'}฿
                        </span>
                        <input
                            value={toDisplay(amount)}
                            onChange={(e) => onAmountChange(sanitize(e.target.value))}
                            inputMode="decimal"
                            placeholder="0.00"
                            aria-label="จำนวนเงิน"
                            autoFocus={autoFocusAmount}
                            className={`flex-1 min-w-0 w-0 bg-transparent outline-none p-0 text-[36px] sm:text-[44px] leading-[44px] sm:leading-[52px] font-bold tracking-tight tabular-nums placeholder:text-slate-300 ${isExpense ? 'text-expense-600 caret-expense-600' : 'text-income-600 caret-income-600'}`}
                        />
                    </span>
                </label>
                {errors.amt && <FieldError text={errors.amt} />}
            </div>

            {/* หมวดหมู่ */}
            <div className="flex flex-col gap-2.5">
                <div className="flex justify-between items-baseline gap-2">
                    <span className="text-sm font-semibold text-slate-700">หมวดหมู่</span>
                    <span className="text-xs text-slate-500">{selected ? `เลือกแล้ว: ${selected.name}` : 'แตะเพื่อเลือก'}</span>
                </div>
                {loadingCats ? (
                    <div aria-busy="true" className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2">
                        {Array.from({ length: 8 }, (_, i) => (
                            <div key={i} className="min-h-20 rounded-xl bg-slate-50 ring-1 ring-inset ring-slate-100 flex flex-col items-center justify-center gap-2 animate-pulse">
                                <span className="w-9 h-9 rounded-full bg-slate-200" />
                                <span className="w-10 h-2.5 rounded-full bg-slate-200" />
                            </div>
                        ))}
                    </div>
                ) : visible.length === 0 ? (
                    <div className="flex flex-col items-center gap-1 py-5 px-4 rounded-xl border-[1.5px] border-dashed border-slate-300 text-center">
                        <span className="text-sm font-semibold text-slate-700">ยังไม่มีหมวด{isExpense ? 'รายจ่าย' : 'รายรับ'}</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2">
                        {visible.map((cat) => {
                            const active = cat.id === categoryId;
                            return (
                                <button
                                    key={cat.id}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => onCategoryChange(cat.id)}
                                    className={`min-h-20 px-1 py-2 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-colors ${active
                                        ? 'bg-brand-50 ring-2 ring-inset ring-brand-500'
                                        : `bg-white hover:bg-slate-50 ring-1 ring-inset ${errors.cat ? 'ring-expense-200' : 'ring-slate-200'}`
                                        }`}
                                >
                                    <CategoryAvatar name={cat.icon} size={36} />
                                    <span className={`text-xs leading-4 text-center line-clamp-2 break-words w-full ${active ? 'font-semibold text-brand-700' : 'font-medium text-slate-700'}`}>
                                        {cat.name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
                {errors.cat && <FieldError text={errors.cat} />}
            </div>

            {/* วันที่ */}
            <div className="flex flex-col gap-2.5">
                <span className="text-sm font-semibold text-slate-700">วันที่</span>
                {dateMode === 'chips' ? (
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => onDateChange(today)} className={chipClass(date === today)}>วันนี้</button>
                        <button type="button" onClick={() => onDateChange(yesterday)} className={chipClass(date === yesterday)}>เมื่อวาน</button>
                        <button type="button" onClick={openPicker} className={`relative ${chipClass(isCustomDate)}`}>
                            <Calendar size={16} />
                            {isCustomDate ? formatDayLabel(date) : 'เลือกวัน'}
                            <input
                                ref={dateInputRef}
                                type="date"
                                max={today}
                                value={date}
                                onChange={(e) => e.target.value && onDateChange(e.target.value)}
                                tabIndex={-1}
                                aria-hidden="true"
                                className="absolute inset-0 opacity-0 pointer-events-none"
                            />
                        </button>
                    </div>
                ) : (
                    <div className="h-12 px-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-2.5 text-[15px] text-slate-700">
                        <Calendar size={18} className="shrink-0 text-slate-500" />
                        <span className="flex-1">{dateText}</span>
                        <Lock size={14} className="shrink-0 text-slate-400" aria-label="แก้ไขวันที่ไม่ได้" />
                    </div>
                )}
            </div>

            {/* รายละเอียด */}
            <label className="flex flex-col gap-2.5">
                <span className="text-sm font-semibold text-slate-700">
                    รายละเอียด <span className="font-normal text-slate-500">(ไม่บังคับ)</span>
                </span>
                <input
                    type="text"
                    value={description}
                    onChange={(e) => onDescriptionChange(e.target.value)}
                    placeholder="เช่น ข้าวเที่ยง, ค่ารถ"
                    className="h-12 w-full px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-[15px] text-slate-800 outline-none focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-colors"
                />
            </label>
        </div>
    );
}
