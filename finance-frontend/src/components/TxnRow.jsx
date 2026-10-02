import { Check, ChevronRight, PiggyBank } from 'lucide-react';
import { CategoryAvatar } from '../utils/categoryIcons';
import { formatTxnId, formatMoney, formatTime, formatDayLabel, txnTone, isSavingType } from '../utils/format';

// แถวรายการ: ไอคอนหมวด · รายละเอียด / หมวด + รหัส · (เวลา) · ยอด
// variant 'list' = การ์ด "วันนี้" · 'table' = หน้าประวัติ (มี checkbox ตอน hover, เวลา, ลูกศร)
export default function TxnRow({
    item, variant = 'list', bordered = false,
    selected = false, active = false, anySelected = false,
    showDate = false, animate = false,
    onPress, onToggle,
}) {
    const table = variant === 'table';
    const tone = txnTone(item.categoryType);
    const title = item.description || item.categoryName;
    const amountText = `${tone.sign}${formatMoney(item.amount)}`;
    const highlight = selected || active;
    // รายการที่ระบบสร้างจากเงินออม (ฝาก/ถอน/ถอนไปใช้) — เลือกเพื่อลบหลายรายการไม่ได้ (จัดการที่หน้าเงินออม)
    const fromSavings = item.savingsMovementId != null;
    const savingBadge = isSavingType(item.categoryType)
        ? item.savingsGoalName || 'เงินออม'
        : `จากเงินออม${item.savingsGoalName ? ` · ${item.savingsGoalName}` : ''}`;
    const selectable = table && !fromSavings;

    const handleKey = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onPress && onPress();
        }
    };

    return (
        <div
            role={table ? 'button' : undefined}
            tabIndex={table ? 0 : undefined}
            onClick={table ? onPress : undefined}
            onKeyDown={table ? handleKey : undefined}
            className={`group flex items-center gap-3 min-h-16 py-2.5 ${table ? 'px-5 cursor-pointer outline-none focus-visible:bg-slate-50' : 'px-4'} ${bordered ? 'border-t border-slate-100' : ''} ${highlight ? 'bg-brand-50' : table ? 'bg-white hover:bg-slate-50' : 'bg-white'} ${animate ? 'animate-row-in' : ''} transition-colors`}
        >
            {table && !selectable && <span className="w-7 shrink-0" />}
            {selectable && (
                <span
                    onClick={(e) => { e.stopPropagation(); onToggle && onToggle(); }}
                    className={`w-7 h-11 -my-2.5 shrink-0 flex items-center justify-center transition-opacity ${selected || anySelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'}`}
                >
                    <span
                        role="checkbox"
                        aria-checked={selected}
                        aria-label="เลือกรายการ"
                        className={`w-5 h-5 rounded-md flex items-center justify-center ${selected ? 'bg-brand-600' : 'bg-white ring-[1.5px] ring-inset ring-slate-400'}`}
                    >
                        {selected && <Check size={14} strokeWidth={3} className="text-white" />}
                    </span>
                </span>
            )}

            <CategoryAvatar name={item.categoryIcon} size={40} />

            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <span className="text-[15px] leading-[22px] font-medium text-slate-800 truncate">{title}</span>
                <span className="flex items-center gap-1.5 min-w-0 text-[13px] leading-[18px] text-slate-500">
                    <span className="truncate">
                        {item.categoryName} · <span className="font-mono text-xs">#{formatTxnId(item.id)}</span>
                    </span>
                    {fromSavings && (
                        <span className="shrink-0 h-5 pl-1.5 pr-2 rounded-full bg-gold-50 text-gold-700 text-xs font-semibold flex items-center gap-1 max-w-[180px]">
                            <PiggyBank size={12} className="shrink-0" />
                            <span className="truncate">{savingBadge}</span>
                        </span>
                    )}
                </span>
            </div>

            {table && (
                <span className={`${showDate ? 'w-32' : 'w-14'} shrink-0 text-[13px] text-slate-500 tabular-nums`}>
                    {showDate ? `${formatDayLabel(item.transactionDate)}` : formatTime(item.transactionDate)}
                </span>
            )}

            <span className={`shrink-0 ${table ? 'min-w-[120px]' : ''} text-right text-[15px] leading-[22px] font-semibold tabular-nums whitespace-nowrap ${tone.color}`}>
                {amountText}
            </span>

            {table && <ChevronRight size={16} className="shrink-0 text-slate-400" />}
        </div>
    );
}
