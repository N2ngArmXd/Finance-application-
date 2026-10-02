import { useEffect, useRef, useState } from 'react';
import { X, AlertCircle, Calendar, TriangleAlert, Receipt, ArrowDownToLine, ArrowUpFromLine, Wallet, ShoppingCart } from 'lucide-react';
import { formatMoney, formatDayLabel, toAmountDisplay, sanitizeAmount, toDateInput } from '../../utils/format';
import { CategoryAvatar } from '../../utils/categoryIcons';
import GoalAvatar from './GoalAvatar';

// รูปแบบการถอน
const WITHDRAW_MODES = [
    { value: 'TO_WALLET', Icon: Wallet, label: 'กลับเข้ากระเป๋า', sub: 'ยังไม่นับเป็นรายจ่าย' },
    { value: 'SPEND', Icon: ShoppingCart, label: 'ใช้จ่ายเลย', sub: 'บันทึกเป็นรายจ่ายให้อัตโนมัติ' },
];

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

const segClass = (active) =>
    `flex-1 min-h-[60px] px-2.5 py-2 rounded-[9px] flex flex-col items-center justify-center gap-0.5 font-semibold transition-all ${active
        ? 'bg-white text-brand-700 shadow-[0_1px_2px_rgba(15,23,42,0.08),0_1px_3px_rgba(15,23,42,0.06)]'
        : 'text-slate-500 hover:text-slate-700'
    }`;

// modal ฝาก / ถอน / แก้ไขรายการ
// kind: 'deposit' | 'withdraw' · movement = รายการเดิม (โหมดแก้ไข เปลี่ยนประเภท/รูปแบบถอนไม่ได้)
// available = เงินใช้ได้ (ไว้เตือนตอนฝากเกิน)
export default function MovementForm({ kind, goal, movement, categories, available, paused = false, onCancel, onSubmit }) {
    const isEdit = !!movement;
    const deposit = kind === 'deposit';
    const today = toDateInput(new Date());
    const [form, setForm] = useState(() => movement
        ? {
            mode: movement.mode === 'SPEND' ? 'SPEND' : 'TO_WALLET',
            amount: String(movement.amount),
            categoryId: movement.categoryId ?? null,
            date: toDateInput(new Date(movement.movementDate)),
            note: movement.note || '',
        }
        : { mode: 'TO_WALLET', amount: '', categoryId: null, date: today, note: '' });
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
    const spend = !deposit && form.mode === 'SPEND';
    // ตอนแก้ไข ยอดเดิมของรายการนี้ถูกนับในยอดกระปุกอยู่แล้ว
    const oldSigned = isEdit ? (deposit ? movement.amount : -movement.amount) : 0;
    const baseBalance = goal.balance - oldSigned;
    const balanceAfter = baseBalance + (deposit ? amount : -amount);
    const availableAfter = available != null ? available - (deposit ? amount - (isEdit ? movement.amount : 0) : 0) : null;
    const remainingToTarget = goal.targetAmount ? Math.max(goal.targetAmount - baseBalance, 0) : 0;

    const amountErr = (form.amount !== '' || tried) && !(amount > 0)
        ? 'กรอกจำนวนเงินมากกว่า 0'
        : balanceAfter < 0
            ? (deposit ? 'ลดยอดฝากนี้ไม่ได้ เพราะเงินถูกถอนออกไปแล้ว' : `ถอนได้ไม่เกิน ${money(Math.max(baseBalance, 0))}`)
            : null;
    const catErr = tried && spend && !form.categoryId ? 'เลือกหมวดหมู่รายจ่าย' : null;
    const expenseCats = categories.filter((c) => c.type === 'EXPENSE');

    const quick = deposit
        ? [500, 1000, 5000].map((v) => ({ label: `+${v.toLocaleString('en-US')}`, value: (amount + v).toFixed(2).replace(/\.00$/, '') }))
            .concat(remainingToTarget > 0 ? [{ label: 'ถึงเป้า', value: String(remainingToTarget) }] : [])
        : baseBalance > 0 ? [{ label: 'ถอนทั้งหมด', value: String(baseBalance) }] : [];

    const openDate = () => {
        const el = dateRef.current;
        if (!el) return;
        if (typeof el.showPicker === 'function') el.showPicker();
        else el.focus();
    };

    const submit = (e) => {
        e.preventDefault();
        setTried(true);
        if (!(amount > 0) || balanceAfter < 0 || (spend && !form.categoryId)) return;
        onSubmit(form);
    };

    const title = isEdit ? (deposit ? 'แก้ไขรายการฝาก' : 'แก้ไขรายการถอน') : (deposit ? 'ฝากเงินเข้ากระปุก' : 'ถอนเงินจากกระปุก');
    const tone = deposit
        ? { bg: 'bg-brand-50', label: 'text-brand-700', num: 'text-brand-600 caret-brand-600', ph: 'placeholder:text-brand-200', sign: '+' }
        : { bg: 'bg-slate-100', label: 'text-slate-700', num: 'text-slate-800 caret-slate-800', ph: 'placeholder:text-slate-300', sign: '−' };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-start md:items-center justify-center p-4 overflow-y-auto animate-fade-in" onClick={onCancel}>
            <form
                onSubmit={submit}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                className="w-[520px] max-w-full my-4 bg-white rounded-3xl shadow-[0_24px_64px_-16px_rgba(15,23,42,0.35)] flex flex-col overflow-hidden animate-zoom-in"
            >
                <div className="h-16 shrink-0 flex items-center justify-between pl-6 pr-3 border-b border-slate-100">
                    <span className="flex items-center gap-2 text-[17px] font-semibold text-slate-800">
                        {deposit ? <ArrowDownToLine size={20} className="text-brand-600" /> : <ArrowUpFromLine size={20} className="text-slate-600" />}
                        {title}
                    </span>
                    <button type="button" onClick={onCancel} aria-label="ปิด" className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100">
                        <X size={20} />
                    </button>
                </div>

                <div className="max-h-[calc(92vh-144px)] overflow-y-auto px-6 pt-5 pb-6 flex flex-col gap-5">
                    {/* กระปุก */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <GoalAvatar icon={goal.icon} color={goal.color} size={40} />
                        <div className="flex-1 min-w-0 flex flex-col">
                            <span className="text-[15px] font-semibold text-slate-800 truncate">{goal.name}</span>
                            <span className="text-xs text-slate-500 tabular-nums">
                                ยอดในกระปุก {money(goal.balance)}{goal.targetAmount ? ` / ${money(goal.targetAmount)}` : ''}
                            </span>
                        </div>
                    </div>

                    {/* รูปแบบการถอน */}
                    {!deposit && (
                        <div className="flex flex-col gap-2">
                            <span className="text-sm font-semibold text-slate-700">ถอนไปทำอะไร</span>
                            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
                                {WITHDRAW_MODES.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        disabled={isEdit && form.mode !== opt.value}
                                        onClick={() => set({ mode: opt.value })}
                                        className={`${segClass(form.mode === opt.value)} disabled:opacity-40 disabled:cursor-not-allowed`}
                                    >
                                        <span className="flex items-center gap-1.5 text-[15px]"><opt.Icon size={16} />{opt.label}</span>
                                        <span className="text-xs font-normal text-slate-500">{opt.sub}</span>
                                    </button>
                                ))}
                            </div>
                            {isEdit && <span className="text-xs text-slate-500">เปลี่ยนรูปแบบการถอนไม่ได้ ถ้าต้องการให้ลบรายการนี้แล้วทำใหม่</span>}
                        </div>
                    )}

                    {/* จำนวนเงิน */}
                    <div className="flex flex-col gap-2">
                        <label className={`flex flex-col gap-0.5 pt-3.5 pb-3 px-[18px] rounded-2xl cursor-text ${tone.bg} ${amountErr ? 'ring-2 ring-inset ring-expense-600' : ''}`}>
                            <span className={`text-[13px] leading-[18px] font-semibold ${tone.label}`}>จำนวนเงิน</span>
                            <span className="flex items-baseline gap-1">
                                <span className={`shrink-0 text-[28px] leading-[52px] font-semibold ${tone.num}`}>{tone.sign}฿</span>
                                <input
                                    value={toAmountDisplay(form.amount)}
                                    onChange={(e) => set({ amount: sanitizeAmount(e.target.value) })}
                                    inputMode="decimal"
                                    placeholder="0.00"
                                    aria-label="จำนวนเงิน"
                                    autoFocus
                                    className={`flex-1 min-w-0 w-0 bg-transparent outline-none p-0 text-[44px] leading-[52px] font-bold tracking-tight tabular-nums ${tone.num} ${tone.ph}`}
                                />
                            </span>
                        </label>
                        {quick.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {quick.map((q) => (
                                    <button key={q.label} type="button" onClick={() => set({ amount: q.value })} className={chipClass(form.amount === q.value)}>
                                        {q.label}
                                    </button>
                                ))}
                            </div>
                        )}
                        {amountErr && <FieldError text={amountErr} />}
                    </div>

                    {/* หมวดหมู่ (ใช้จ่ายเลย) */}
                    {spend && (
                        <div className="flex flex-col gap-2.5">
                            <div className="flex justify-between items-baseline gap-2">
                                <span className="text-sm font-semibold text-slate-700">หมวดหมู่รายจ่าย</span>
                                <span className="text-xs text-slate-500">{expenseCats.find((c) => c.id === form.categoryId)?.name ?? 'แตะเพื่อเลือก'}</span>
                            </div>
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2">
                                {expenseCats.map((cat) => {
                                    const active = cat.id === form.categoryId;
                                    return (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            aria-pressed={active}
                                            onClick={() => set({ categoryId: cat.id })}
                                            className={`min-h-20 px-1 py-2 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-colors ${active
                                                ? 'bg-brand-50 ring-2 ring-inset ring-brand-500'
                                                : `bg-white hover:bg-slate-50 ring-1 ring-inset ${catErr ? 'ring-expense-200' : 'ring-slate-200'}`
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
                            {catErr && <FieldError text={catErr} />}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-2">
                            <span className="text-sm font-semibold text-slate-700">วันที่</span>
                            <div onClick={openDate} className="relative h-12 px-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-2.5 cursor-pointer text-[15px] text-slate-800">
                                <Calendar size={18} className="shrink-0 text-slate-500" />
                                <span className="flex-1 truncate">{form.date === today ? 'วันนี้' : formatDayLabel(form.date)}</span>
                                <input
                                    ref={dateRef}
                                    type="date"
                                    tabIndex={-1}
                                    max={today}
                                    value={form.date}
                                    onChange={(e) => e.target.value && set({ date: e.target.value })}
                                    className="absolute inset-0 opacity-0 pointer-events-none"
                                />
                            </div>
                        </div>
                        <label className="flex flex-col gap-2">
                            <span className="text-sm font-semibold text-slate-700">หมายเหตุ <span className="font-normal text-slate-500">(ไม่บังคับ)</span></span>
                            <input
                                value={form.note}
                                onChange={(e) => set({ note: e.target.value })}
                                placeholder={spend ? 'เช่น ตั๋วเครื่องบิน' : 'เช่น เงินเดือน ต.ค.'}
                                maxLength={255}
                                className="h-12 w-full px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-[15px] text-slate-800 outline-none focus:bg-white focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/10"
                            />
                        </label>
                    </div>

                    {/* ผลหลังทำรายการ */}
                    <div className="px-3.5 py-0.5 bg-slate-50 border border-slate-100 rounded-xl text-sm">
                        <div className="flex justify-between gap-3 py-2">
                            <span className="text-slate-500">คงเหลือในกระปุก</span>
                            <span className={`font-semibold tabular-nums ${balanceAfter < 0 ? 'text-expense-600' : 'text-slate-800'}`}>{money(balanceAfter)}</span>
                        </div>
                        {deposit && availableAfter != null && (
                            <div className="flex justify-between gap-3 py-2 border-t border-slate-200">
                                <span className="text-slate-500">เงินใช้ได้หลังฝาก</span>
                                <span className={`font-semibold tabular-nums ${availableAfter < 0 ? 'text-warn-700' : 'text-slate-800'}`}>{money(availableAfter)}</span>
                            </div>
                        )}
                    </div>

                    {deposit && availableAfter != null && availableAfter < 0 && (
                        <div className="flex gap-2 items-start px-3 py-2.5 rounded-[10px] bg-warn-50 text-warn-700 text-[13px] leading-[18px] font-medium">
                            <TriangleAlert size={16} className="shrink-0 mt-px" />
                            ยอดฝากเกินเงินใช้ได้ที่บันทึกไว้ ฝากต่อได้ แต่ลองเช็กว่าบันทึกรายรับครบหรือยัง
                        </div>
                    )}
                    {spend && (
                        <div className="flex gap-2 items-start px-3 py-2.5 rounded-[10px] bg-brand-50 text-brand-700 text-[13px] leading-[18px] font-medium">
                            <Receipt size={16} className="shrink-0 mt-px" />
                            {isEdit ? 'รายจ่ายที่ผูกอยู่ในประวัติธุรกรรมจะถูกแก้ตามไปด้วย' : `จะเพิ่มรายจ่าย ${money(amount)} ในประวัติธุรกรรม`}
                        </div>
                    )}
                </div>

                <div className="shrink-0 flex gap-3 px-6 py-4 border-t border-slate-200">
                    <button type="button" onClick={onCancel} className="w-[120px] h-12 rounded-xl border border-slate-200 bg-white text-slate-700 text-[15px] font-semibold hover:bg-slate-50">
                        ยกเลิก
                    </button>
                    <button type="submit" className="flex-1 h-12 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-[15px] font-semibold flex items-center justify-center gap-2">
                        {isEdit ? 'บันทึกการแก้ไข' : deposit ? 'ฝากเงิน' : spend ? 'ถอนไปใช้จ่าย' : 'ถอนกลับเข้ากระเป๋า'}
                    </button>
                </div>
            </form>
        </div>
    );
}
