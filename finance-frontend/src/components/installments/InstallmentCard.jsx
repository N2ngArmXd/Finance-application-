import { useEffect, useRef, useState } from 'react';
import {
    AlertCircle, CalendarClock, Calendar, CheckCircle2, Check, ChevronDown, ChevronUp,
    Ellipsis, Pencil, Lock, Trash2, Wallet, Loader2, LayoutDashboard,
} from 'lucide-react';
import { formatMoney, formatShortDate } from '../../utils/format';

const FUTURE_LIMIT = 6; // งวดที่ยังไม่ถึงกำหนด แสดงก่อน 6 งวด

const money = (n) => `฿${formatMoney(n)}`;

// สรุปบรรทัด "งวดถัดไป / ค้างชำระ" ของการ์ด
const nextInfo = (item, progress) => {
    const { overdueRows, next, total } = progress;
    if (overdueRows.length) {
        const first = overdueRows[0];
        const last = overdueRows[overdueRows.length - 1];
        return {
            tone: 'overdue', Icon: AlertCircle,
            label: `ค้างชำระ งวด ${overdueRows.length > 1 ? `${first.month}–${last.month}` : first.month}`,
            text: `${money(item.monthlyAmount * overdueRows.length)} · ครบกำหนดตั้งแต่ ${formatShortDate(first.date)}`,
        };
    }
    if (next && next.isDue) {
        return { tone: 'due', Icon: CalendarClock, label: `ถึงกำหนดแล้ว · งวด ${next.month}/${total}`, text: `${formatShortDate(next.date)} · ${money(next.payment)}` };
    }
    if (next) {
        return { tone: 'next', Icon: Calendar, label: `งวดถัดไป · งวด ${next.month}/${total}`, text: `${formatShortDate(next.date)} · ${money(next.payment)}` };
    }
    return { tone: 'done', Icon: CheckCircle2, label: 'จ่ายครบแล้ว', text: '' };
};

const NEXT_TONE = {
    overdue: { circle: 'bg-expense-50 text-expense-700', text: 'text-expense-700' },
    due: { circle: 'bg-warn-50 text-warn-700', text: 'text-warn-700' },
    next: { circle: 'bg-slate-100 text-slate-800', text: 'text-slate-800' },
    done: { circle: 'bg-income-50 text-income-600', text: 'text-income-600' },
};

const GRID = 'grid grid-cols-[64px_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_176px] items-center pl-4 pr-3';

export default function InstallmentCard({ item, progress, expanded, highlight, payingPeriod, onToggle, onPay, onEdit, onClose, onDelete }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [showPaid, setShowPaid] = useState(false);
    const [showAllFuture, setShowAllFuture] = useState(false);
    const menuRef = useRef(null);

    // ปิดเมนู ⋯ เมื่อคลิกข้างนอก / กด Esc
    useEffect(() => {
        if (!menuOpen) return;
        const onDown = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
        const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
        document.addEventListener('mousedown', onDown);
        window.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            window.removeEventListener('keydown', onKey);
        };
    }, [menuOpen]);

    const info = nextInfo(item, progress);
    const tone = NEXT_TONE[info.tone];
    const pct = progress.total ? (progress.paidCount / progress.total) * 100 : 0;
    const methodLabel = item.calculationMethod === 'EFFECTIVE' ? 'ลดต้นลดดอก' : 'คงที่';
    const rateText = `${parseFloat(item.interestRate || 0)}% ${item.interestType === 'MONTHLY' ? 'ต่อเดือน' : 'ต่อปี'}`;

    // ย่องวดที่จ่ายแล้ว (≥ 3 งวด) และงวดอนาคตที่เกิน 6 งวด
    const all = progress.schedule;
    const paidRows = all.filter((r) => r.paid && r.month !== payingPeriod);
    const canCollapsePaid = paidRows.length >= 3;
    const collapsePaid = canCollapsePaid && !showPaid;
    let rows = all.filter((r) => !(collapsePaid && r.paid && r.month !== payingPeriod));
    const future = rows.filter((r) => !r.paid && !r.isDue);
    const hiddenFuture = Math.max(future.length - FUTURE_LIMIT, 0);
    if (hiddenFuture > 0 && !showAllFuture) {
        const keep = new Set(future.slice(0, FUTURE_LIMIT).map((r) => r.month));
        rows = rows.filter((r) => r.paid || r.isDue || keep.has(r.month));
    }
    const nextMonth = progress.next?.month;

    const menuAction = (fn) => (e) => {
        e.stopPropagation();
        setMenuOpen(false);
        fn();
    };

    return (
        <div
            id={`installment-${item.installmentsId}`}
            className={`scroll-mt-6 relative bg-white border rounded-2xl transition-shadow ${highlight
                ? 'border-gold-400 shadow-[0_0_0_3px_var(--color-gold-100)]'
                : `border-slate-200 ${expanded ? 'shadow-[0_4px_16px_-6px_rgba(15,23,42,0.12)]' : 'shadow-[0_1px_2px_rgba(15,23,42,0.04)]'}`
                }`}
        >
            {highlight && (
                <div className="flex items-center gap-1.5 px-5 py-2 bg-gold-50 border-b border-gold-100 rounded-t-[15px] text-xs font-semibold text-gold-700">
                    <LayoutDashboard size={14} /> เปิดจากหน้าหลัก
                </div>
            )}

            <div onClick={onToggle} className="cursor-pointer">
                {/* หัวการ์ด */}
                <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-4 items-center pt-[18px] pb-3.5 pl-5 pr-3">
                    <div className="min-w-0 flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-base font-semibold text-slate-800">{item.installmentsName}</span>
                            {progress.overdueRows.length > 0 && (
                                <span className="h-6 pl-[7px] pr-[9px] rounded-full bg-expense-50 text-expense-700 text-xs font-semibold flex items-center gap-1">
                                    <AlertCircle size={14} /> ค้าง {progress.overdueRows.length} งวด
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap text-[13px] leading-[18px] text-slate-500">
                            {item.description && <><span>{item.description}</span><span className="text-slate-300">·</span></>}
                            <span>ยอดจัด <span className="tabular-nums">{money(item.totalAmount)}</span></span>
                            <span className="text-slate-300">·</span>
                            <span>ดอกเบี้ย {rateText}</span>
                            <span className="h-[22px] px-2 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold flex items-center">{methodLabel}</span>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-xl font-bold text-brand-600 tabular-nums whitespace-nowrap">{money(item.monthlyAmount)}</span>
                        <span className="text-xs text-slate-500">ต่อเดือน</span>
                    </div>
                    <div className="flex gap-0.5" ref={menuRef}>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
                            aria-label="เพิ่มเติม"
                            aria-expanded={menuOpen}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 ${menuOpen ? 'bg-slate-100' : ''}`}
                        >
                            <Ellipsis size={20} />
                        </button>
                        <span className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500">
                            {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </span>

                        {menuOpen && (
                            <div
                                onClick={(e) => e.stopPropagation()}
                                className={`absolute right-[52px] ${highlight ? 'top-24' : 'top-16'} z-10 w-[200px] p-1.5 bg-white border border-slate-200 rounded-xl shadow-[0_12px_32px_-8px_rgba(15,23,42,0.22)] flex flex-col animate-fade-in`}
                            >
                                <button type="button" onClick={menuAction(onEdit)} className="h-10 px-2.5 rounded-lg flex items-center gap-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                                    <Pencil size={18} /> แก้ไข
                                </button>
                                <button type="button" onClick={menuAction(onClose)} className="h-10 px-2.5 rounded-lg flex items-center gap-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                                    <Lock size={18} /> ปิดยอด
                                </button>
                                <button type="button" onClick={menuAction(onDelete)} className="h-10 mt-1 px-2.5 rounded-lg border-t border-slate-100 flex items-center gap-2.5 text-sm font-medium text-expense-700 hover:bg-slate-50">
                                    <Trash2 size={18} /> ลบรายการ
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* งวดถัดไป + ความคืบหน้า */}
                <div className="grid grid-cols-[minmax(0,1fr)_260px] gap-6 items-center pt-3 pb-4 px-5 border-t border-slate-100">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${tone.circle}`}>
                            <info.Icon size={16} />
                        </span>
                        <div className="flex flex-col min-w-0">
                            <span className="text-xs text-slate-500">{info.label}</span>
                            {info.text && <span className={`text-sm font-semibold tabular-nums ${tone.text}`}>{info.text}</span>}
                        </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between text-xs text-slate-600">
                            <span>จ่ายแล้ว <b className="font-semibold text-slate-800">{progress.paidCount}</b> / {progress.total} งวด</span>
                            <span className="tabular-nums">{Math.round(pct)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full rounded-full bg-income-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ส่วนกางออก: ตารางงวด */}
            {expanded && (
                <div className="border-t border-slate-100 px-5 pt-4 pb-5 flex flex-col gap-3.5">
                    <div className="flex items-baseline gap-6 flex-wrap text-[13px] text-slate-500">
                        <span>ถึงกำหนด <b className="text-[15px] font-semibold text-slate-800">{progress.due}</b> งวด</span>
                        <span>จ่ายแล้ว <b className="text-[15px] font-semibold text-income-600">{progress.paidCount}</b> งวด</span>
                        <span>เหลือ <b className="text-[15px] font-semibold text-slate-800">{progress.remaining}</b> งวด</span>
                        <span className="ml-auto">เริ่มชำระ {formatShortDate(new Date(item.startDate))}</span>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className={`${GRID} h-9 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500`}>
                            <span>งวด</span><span>วันครบกำหนด</span><span className="text-right">ค่างวด</span><span className="text-right">เงินต้นคงเหลือ</span><span className="text-right">สถานะ</span>
                        </div>

                        {canCollapsePaid && (
                            <button
                                type="button"
                                onClick={() => setShowPaid((v) => !v)}
                                className="w-full h-11 px-4 bg-white hover:bg-slate-50 flex items-center gap-2 text-[13px] font-medium text-income-600 text-left"
                            >
                                <CheckCircle2 size={16} />
                                <span className="flex-1">
                                    {collapsePaid ? `งวดที่จ่ายแล้ว ${paidRows.length} งวด ถูกย่อไว้` : `แสดงงวดที่จ่ายแล้วทั้งหมด ${paidRows.length} งวด`}
                                </span>
                                <span className="font-semibold text-brand-600">{collapsePaid ? 'แสดง' : 'ย่อ'}</span>
                            </button>
                        )}

                        {rows.map((row) => {
                            const loading = payingPeriod === row.month;
                            const isNext = !row.paid && row.month === nextMonth && !row.overdue;
                            return (
                                <div
                                    key={row.month}
                                    className={`${GRID} min-h-[52px] border-t border-slate-100 text-sm tabular-nums ${row.overdue ? 'bg-expense-50' : isNext ? 'bg-gold-50' : 'bg-white'}`}
                                >
                                    <span className={`font-semibold ${row.paid ? 'text-slate-500' : 'text-slate-800'}`}>{row.month}</span>
                                    <span className={`flex items-center gap-2 ${row.overdue ? 'text-expense-700' : row.paid ? 'text-slate-500' : 'text-slate-700'}`}>
                                        {formatShortDate(row.date)}
                                        {row.overdue && (
                                            <span className="h-5 px-[7px] rounded-full bg-white ring-1 ring-inset ring-expense-200 text-expense-700 text-xs font-semibold flex items-center">ค้าง</span>
                                        )}
                                        {isNext && (
                                            <span className="h-5 px-[7px] rounded-full bg-gold-100 text-gold-700 text-xs font-semibold flex items-center">งวดถัดไป</span>
                                        )}
                                    </span>
                                    <span className={`text-right font-semibold ${row.paid ? 'text-slate-500' : 'text-brand-600'}`}>{money(row.payment)}</span>
                                    <span className="text-right text-slate-500">{money(row.remaining)}</span>
                                    <span className="flex justify-end">
                                        {row.paid ? (
                                            loading ? (
                                                <span className="h-8 pl-2.5 pr-3 rounded-full bg-income-50 text-income-700 text-[13px] font-semibold flex items-center gap-1.5">
                                                    <Loader2 size={14} className="animate-spin" /> กำลังยกเลิก…
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => onPay(row)}
                                                    disabled={payingPeriod != null}
                                                    title="กดเพื่อยกเลิกการจ่ายงวดนี้"
                                                    className="h-8 pl-[9px] pr-3 rounded-full bg-income-50 hover:bg-income-100 text-income-700 text-[13px] font-semibold flex items-center gap-[5px] disabled:cursor-not-allowed"
                                                >
                                                    <Check size={16} /> จ่ายแล้ว
                                                </button>
                                            )
                                        ) : row.isDue ? (
                                            loading ? (
                                                <span className="h-9 px-3.5 rounded-xl bg-brand-500 text-white text-sm font-semibold flex items-center gap-2 opacity-90">
                                                    <Loader2 size={16} className="animate-spin" /> กำลังบันทึก…
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => onPay(row)}
                                                    disabled={payingPeriod != null}
                                                    className="h-9 px-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                                                >
                                                    <Wallet size={16} /> จ่ายงวดนี้
                                                </button>
                                            )
                                        ) : (
                                            <span className="h-8 px-3 rounded-full bg-slate-100 text-slate-500 text-[13px] font-medium flex items-center">ยังไม่ถึงกำหนด</span>
                                        )}
                                    </span>
                                </div>
                            );
                        })}

                        {hiddenFuture > 0 && (
                            <button
                                type="button"
                                onClick={() => setShowAllFuture((v) => !v)}
                                className="w-full h-11 px-4 border-t border-slate-100 bg-white hover:bg-slate-50 flex items-center justify-center gap-1.5 text-[13px] font-semibold text-brand-600"
                            >
                                {showAllFuture ? 'ย่องวดที่ยังไม่ถึงกำหนด' : `แสดงอีก ${hiddenFuture} งวดที่ยังไม่ถึงกำหนด`}
                                {showAllFuture ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
