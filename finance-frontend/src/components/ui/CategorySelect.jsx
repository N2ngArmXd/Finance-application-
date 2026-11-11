import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { CategoryAvatar } from '../../utils/categoryIcons';

// ป้ายบอกว่าหมวดนี้ลิงก์กับรายการของหน้าไหน (เช่น ค่างวด -> ตารางผ่อนชำระ)
function LinkHint({ hint }) {
    const Icon = hint.Icon;
    return (
        <span className="flex items-center gap-1 min-w-0 text-xs font-medium text-brand-600">
            {Icon && <Icon size={12} className="shrink-0" />}
            <span className="truncate">ลิงก์กับหน้า{hint.page}</span>
        </span>
    );
}

// dropdown เลือกหมวดหมู่ (มีไอคอน) — ใช้ใน TxnForm แทนตารางปุ่มหมวด
// hints = { [ชื่อหมวด]: { page, Icon } } สำหรับหมวดที่ดึงรายการจากหน้าอื่นมาให้เลือก
// คีย์บอร์ด: ↑/↓ เลื่อน · Enter/Space เลือก · Esc ปิด
export default function CategorySelect({ categories, value, onChange, error = false, placeholder = 'เลือกหมวดหมู่', hints = {} }) {
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const rootRef = useRef(null);
    const listRef = useRef(null);
    const selected = categories.find((c) => c.id === value);

    useEffect(() => {
        if (!open) return;
        const onDown = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('touchstart', onDown);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('touchstart', onDown);
        };
    }, [open]);

    // เลื่อนให้เห็นตัวที่ไฮไลต์อยู่
    useEffect(() => {
        if (!open || active < 0) return;
        listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' });
    }, [open, active]);

    const openList = () => {
        setActive(Math.max(categories.findIndex((c) => c.id === value), 0));
        setOpen(true);
    };

    const pick = (cat) => {
        onChange(cat.id);
        setOpen(false);
    };

    const onKeyDown = (e) => {
        if (e.key === 'Escape' && open) {
            // กันไม่ให้ drawer/modal ที่ครอบอยู่ปิดตามไปด้วย
            e.stopPropagation();
            setOpen(false);
            return;
        }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (!open) { openList(); return; }
            const step = e.key === 'ArrowDown' ? 1 : -1;
            setActive((i) => (i + step + categories.length) % categories.length);
            return;
        }
        if ((e.key === 'Enter' || e.key === ' ') && open) {
            e.preventDefault();
            if (categories[active]) pick(categories[active]);
        }
    };

    return (
        <div ref={rootRef} className="relative" onKeyDown={onKeyDown}>
            <button
                type="button"
                onClick={() => (open ? setOpen(false) : openList())}
                aria-haspopup="listbox"
                aria-expanded={open}
                className={`w-full h-14 pl-2.5 pr-3.5 rounded-xl bg-white flex items-center gap-3 text-left transition-colors ring-inset ${open
                    ? 'ring-2 ring-brand-500'
                    : `ring-1 hover:bg-slate-50 ${error ? 'ring-expense-600' : 'ring-slate-200'}`
                    }`}
            >
                {selected ? (
                    <>
                        <CategoryAvatar name={selected.icon} size={36} />
                        <span className="flex-1 min-w-0 flex flex-col">
                            <span className="truncate text-[15px] font-semibold text-slate-800">{selected.name}</span>
                            {hints[selected.name] && <LinkHint hint={hints[selected.name]} />}
                        </span>
                    </>
                ) : (
                    <>
                        <span className="w-9 h-9 shrink-0 rounded-full border-[1.5px] border-dashed border-slate-300" />
                        <span className="flex-1 min-w-0 truncate text-[15px] text-slate-400">{placeholder}</span>
                    </>
                )}
                <ChevronDown size={20} className={`shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <ul
                    ref={listRef}
                    role="listbox"
                    aria-label="หมวดหมู่"
                    className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-[min(360px,50vh)] overflow-y-auto p-1.5 bg-white border border-slate-200 rounded-xl shadow-[0_12px_32px_-8px_rgba(15,23,42,0.22)] animate-fade-in"
                >
                    {categories.map((cat, i) => {
                        const isSelected = cat.id === value;
                        return (
                            <li
                                key={cat.id}
                                role="option"
                                aria-selected={isSelected}
                                onMouseEnter={() => setActive(i)}
                                onClick={() => pick(cat)}
                                className={`min-h-12 px-2 py-1.5 rounded-lg flex items-center gap-3 cursor-pointer ${i === active ? 'bg-slate-50' : ''}`}
                            >
                                <CategoryAvatar name={cat.icon} size={32} />
                                <span className="flex-1 min-w-0 flex flex-col">
                                    <span className={`truncate text-[15px] ${isSelected ? 'font-semibold text-brand-700' : 'font-medium text-slate-700'}`}>
                                        {cat.name}
                                    </span>
                                    {hints[cat.name] && <LinkHint hint={hints[cat.name]} />}
                                </span>
                                {isSelected && <Check size={18} className="shrink-0 text-brand-600" />}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
