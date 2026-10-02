import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Search, X, ArrowUp, ArrowDown, ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight,
    Calendar, Filter, Trash2, Loader2, Inbox, SearchX, CloudOff, RefreshCw, Plus, TrendingDown,
} from 'lucide-react';
import { formatTxnId, formatMoney, formatSigned, toDateInput, formatDayLabel, formatTime } from '../utils/format';
import { CategoryAvatar } from '../utils/categoryIcons';
import TxnForm from './TxnForm';
import TxnRow from './TxnRow';
import ConfirmDialog from './ui/ConfirmDialog';
import { Toast } from './ui/Toast';
import { useToast } from './ui/useToast';

const PAGE_SIZE = 10;

const SORT_OPTIONS = [
    { key: 'transactionDate', direction: 'desc', label: 'วันที่ ใหม่ → เก่า' },
    { key: 'transactionDate', direction: 'asc', label: 'วันที่ เก่า → ใหม่' },
    { key: 'amount', direction: 'desc', label: 'ยอด มาก → น้อย' },
    { key: 'amount', direction: 'asc', label: 'ยอด น้อย → มาก' },
];

// ช่วงวันที่ลัด (คืน [from, to] เป็น YYYY-MM-DD)
const datePresets = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    return [
        { id: 'thisMonth', label: 'เดือนนี้', range: [toDateInput(new Date(y, m, 1)), toDateInput(new Date(y, m + 1, 0))] },
        { id: 'lastMonth', label: 'เดือนก่อน', range: [toDateInput(new Date(y, m - 1, 1)), toDateInput(new Date(y, m, 0))] },
        { id: 'last30', label: '30 วัน', range: [toDateInput(new Date(Date.now() - 29 * 86400000)), toDateInput(now)] },
        { id: 'thisYear', label: 'ปีนี้', range: [toDateInput(new Date(y, 0, 1)), toDateInput(new Date(y, 11, 31))] },
    ];
};

// [วันนี้, เมื่อวาน] เป็น YYYY-MM-DD ใช้ทำป้ายหัวกลุ่มวัน
const relativeDayKeys = () => [toDateInput(new Date()), toDateInput(new Date(Date.now() - 86400000))];

const presetChip = (on) =>
    `h-9 px-3.5 rounded-full text-sm flex items-center gap-1.5 transition-colors ${on
        ? 'bg-brand-50 text-brand-700 font-semibold ring-1 ring-inset ring-brand-300'
        : 'bg-white text-slate-700 font-medium ring-1 ring-inset ring-slate-200 hover:bg-slate-50'
    }`;

const HistoryPage = ({ userId, onNavigate }) => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    // ผลลัพธ์จาก server (แบ่งหน้าแล้ว)
    const [pageData, setPageData] = useState({
        content: [],
        totalElements: 0,
        totalPages: 1,
        totalIncome: 0,
        totalExpense: 0,
    });
    // ยอดสุทธิของแต่ละวันที่อยู่ในหน้านี้ (นับทุกหน้า ตามตัวกรองเดียวกัน) { 'YYYY-MM-DD': net }
    const [dayTotals, setDayTotals] = useState({});

    // ค้นหา / ตัวกรอง / เรียงลำดับ / แบ่งหน้า (ส่งไป server)
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filterType, setFilterType] = useState('ALL'); // ALL | INCOME | EXPENSE
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [filterStart, setFilterStart] = useState('');
    const [filterEnd, setFilterEnd] = useState('');
    const [showCustomDate, setShowCustomDate] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: 'transactionDate', direction: 'desc' });
    const [currentPage, setCurrentPage] = useState(1);

    // เลือกหลายรายการ
    const [selectedIds, setSelectedIds] = useState(() => new Set());

    // drawer แก้ไข
    const [editing, setEditing] = useState(null); // { item, type, categoryId, amount, description, errors }
    const [savingEdit, setSavingEdit] = useState(false);

    // dialog ยืนยันลบ
    const [confirmIds, setConfirmIds] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const [toast, showToast] = useToast();

    // trigger รีโหลดหลังแก้ไข/ลบ
    const [reloadFlag, setReloadFlag] = useState(0);
    const reload = () => setReloadFlag((f) => f + 1);

    const presets = useMemo(() => datePresets(), []);
    const [todayKey, yesterdayKey] = useMemo(() => relativeDayKeys(), []);
    const activePreset = presets.find((p) => p.range[0] === filterStart && p.range[1] === filterEnd);
    const hasDateFilter = !!(filterStart || filterEnd);

    // debounce ช่องค้นหา 400ms
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // ฟังก์ชันดึงหมวดหมู่
    const fetchCategories = useCallback(async () => {
        try {
            const response = await fetch('/api/finance-app/categories/getCategoriesList', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: String(userId) })
            });
            if (response.ok) {
                setCategories(await response.json());
            }
        } catch (error) {
            console.error("Error fetching categories:", error);
        }
    }, [userId]);

    useEffect(() => {
        if (userId) fetchCategories();
    }, [userId, fetchCategories]);

    // ดึงข้อมูลตามเงื่อนไข (ค้นหา/กรอง/เรียง/หน้า) จาก server
    useEffect(() => {
        if (!userId) return;
        let cancelled = false;

        const baseQuery = {
            userId: Number(userId),
            search: debouncedSearch.trim() || null,
            type: filterType,
            categoryId: filterCategory === 'ALL' ? null : Number(filterCategory),
        };
        const searchApi = (body) => fetch('/api/finance-app/transactions/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const fetchPage = async () => {
            setLoading(true);
            setLoadError(false);
            try {
                const response = await searchApi({
                    ...baseQuery,
                    dateFrom: filterStart || null,
                    dateTo: filterEnd || null,
                    sortBy: sortConfig.key,
                    sortDir: sortConfig.direction,
                    page: currentPage,
                    size: PAGE_SIZE,
                });
                if (!response.ok) throw new Error('fetch failed');
                const data = await response.json();
                if (cancelled) return;

                // ถ้าหน้าปัจจุบันเกินช่วง (เช่น ลบจนหน้าท้ายว่าง) ให้ถอยไปหน้าสุดท้าย
                if (data.totalPages > 0 && currentPage > data.totalPages) {
                    setCurrentPage(data.totalPages);
                    return;
                }
                const content = data.content || [];
                setPageData({
                    content,
                    totalElements: data.totalElements || 0,
                    totalPages: data.totalPages || 1,
                    totalIncome: Number(data.totalIncome) || 0,
                    totalExpense: Number(data.totalExpense) || 0,
                });

                // ยอดสุทธิรายวัน: ถามยอดรวมของแต่ละวันในหน้านี้ (ตัวกรองเดียวกัน) เพื่อให้นับครบแม้วันถูกแบ่งข้ามหน้า
                if (sortConfig.key === 'transactionDate') {
                    const days = [...new Set(content.map((t) => toDateInput(new Date(t.transactionDate))))];
                    const results = await Promise.all(days.map(async (day) => {
                        try {
                            const res = await searchApi({ ...baseQuery, dateFrom: day, dateTo: day, page: 1, size: 1 });
                            if (!res.ok) return [day, null];
                            const d = await res.json();
                            return [day, (Number(d.totalIncome) || 0) - (Number(d.totalExpense) || 0)];
                        } catch {
                            return [day, null];
                        }
                    }));
                    if (!cancelled) setDayTotals(Object.fromEntries(results));
                }
            } catch (error) {
                if (!cancelled) {
                    console.error("Error fetching history:", error);
                    setLoadError(true);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchPage();
        return () => { cancelled = true; };
    }, [userId, debouncedSearch, filterType, filterCategory, filterStart, filterEnd, sortConfig, currentPage, reloadFlag]);

    // ---------- แก้ไขใน drawer ----------
    const openEdit = (item) => {
        setEditing({
            item,
            type: item.categoryType,
            categoryId: item.categoryId,
            amount: String(item.amount),
            description: item.description || '',
            errors: {},
        });
    };
    const closeEdit = useCallback(() => { if (!savingEdit) setEditing(null); }, [savingEdit]);
    const patchEdit = (patch) => setEditing((cur) => (cur ? { ...cur, ...patch } : cur));

    const saveEdit = async () => {
        if (!editing || savingEdit) return;
        const amount = parseFloat(editing.amount);
        const errors = {};
        if (!amount || amount <= 0) errors.amt = 'กรอกจำนวนเงินมากกว่า 0';
        if (!editing.categoryId) errors.cat = 'เลือกหมวดหมู่ก่อนบันทึก';
        if (Object.keys(errors).length) {
            patchEdit({ errors });
            return;
        }

        setSavingEdit(true);
        try {
            const response = await fetch('/api/finance-app/transaction/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editing.item.id,
                    userId: { id: userId },
                    amount,
                    description: editing.description,
                    categoryId: { id: editing.categoryId }
                })
            });
            if (!response.ok) throw new Error('Update failed');
            setEditing(null);
            showToast('บันทึกการแก้ไขแล้ว');
            reload();
        } catch {
            showToast('แก้ไขไม่สำเร็จ · ลองใหม่อีกครั้ง', 'error');
        } finally {
            setSavingEdit(false);
        }
    };

    // ปิด drawer ด้วย Esc
    useEffect(() => {
        if (!editing || confirmIds) return;
        const onKey = (e) => { if (e.key === 'Escape') closeEdit(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [editing, confirmIds, closeEdit]);

    // ---------- ลบ (รายการเดียว / หลายรายการ) ----------
    const doDelete = async () => {
        const ids = confirmIds;
        if (!ids || ids.length === 0) return;
        setDeleting(true);
        try {
            const response = ids.length === 1
                ? await fetch(`/api/finance-app/transactions/delete/${ids[0]}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                })
                : await fetch('/api/finance-app/transactions/delete-batch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: Number(userId), ids })
                });
            if (!response.ok) throw new Error('delete failed');
            setSelectedIds((prev) => {
                const next = new Set(prev);
                ids.forEach((id) => next.delete(id));
                return next;
            });
            if (editing && ids.includes(editing.item.id)) setEditing(null);
            setConfirmIds(null);
            showToast(`ลบ ${ids.length} รายการแล้ว`);
            reload();
        } catch {
            showToast('ไม่สามารถลบรายการได้', 'error');
        } finally {
            setDeleting(false);
        }
    };

    // เลือก/ยกเลิกเลือกรายการเดียว
    const toggleSelect = (id) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const clearSelection = () => setSelectedIds(new Set());

    // เปลี่ยนเงื่อนไข -> กลับหน้า 1 + ล้างการเลือก
    const resetToFirstPage = () => {
        setCurrentPage(1);
        clearSelection();
    };

    const setDateRange = (from, to) => {
        resetToFirstPage();
        setFilterStart(from);
        setFilterEnd(to);
    };

    const clearFilters = () => {
        resetToFirstPage();
        setFilterType('ALL');
        setFilterCategory('ALL');
        setFilterStart('');
        setFilterEnd('');
        setShowCustomDate(false);
    };

    const { content, totalElements, totalPages, totalIncome, totalExpense } = pageData;
    const safePage = Math.min(currentPage, Math.max(1, totalPages));
    const netAmount = totalIncome - totalExpense;
    const incomePct = totalIncome + totalExpense > 0 ? Math.round((totalIncome / (totalIncome + totalExpense)) * 100) : 50;
    const groupByDay = sortConfig.key === 'transactionDate';

    // chip ตัวกรองที่ใช้อยู่
    const categoryName = categories.find((c) => String(c.id) === String(filterCategory))?.name;
    const dateChipLabel = activePreset
        ? activePreset.label
        : `${filterStart ? formatDayLabel(filterStart) : 'เริ่มต้น'} – ${filterEnd ? formatDayLabel(filterEnd) : 'ปัจจุบัน'}`;
    const chips = [
        filterType !== 'ALL' && { key: 'type', label: filterType === 'INCOME' ? 'รายรับ' : 'รายจ่าย', remove: () => { resetToFirstPage(); setFilterType('ALL'); } },
        filterCategory !== 'ALL' && { key: 'cat', label: categoryName || 'หมวดหมู่', remove: () => { resetToFirstPage(); setFilterCategory('ALL'); } },
        hasDateFilter && { key: 'date', label: dateChipLabel, remove: () => { setDateRange('', ''); setShowCustomDate(false); } },
    ].filter(Boolean);
    const hasQuery = chips.length > 0 || debouncedSearch.trim() !== '';

    // จัดกลุ่มรายการในหน้านี้ตามวัน (เฉพาะตอนเรียงตามวันที่)
    const groups = useMemo(() => {
        if (!groupByDay) return [{ key: 'all', rows: content }];
        const map = new Map();
        content.forEach((t) => {
            const key = toDateInput(new Date(t.transactionDate));
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(t);
        });
        return [...map.entries()].map(([key, rows]) => ({ key, rows }));
    }, [content, groupByDay]);

    const dayLabel = (key) => {
        const base = formatDayLabel(key);
        if (key === todayKey) return `วันนี้ · ${base}`;
        if (key === yesterdayKey) return `เมื่อวาน · ${base}`;
        return base;
    };

    const sortIndex = SORT_OPTIONS.findIndex((o) => o.key === sortConfig.key && o.direction === sortConfig.direction);

    const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
        .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1);

    const editingItem = editing?.item;

    return (
        <div className="max-w-[928px] mx-auto flex flex-col gap-4 animate-zoom-in">
            <div className="flex items-baseline justify-between gap-4 mb-2">
                <h1 className="text-2xl font-bold text-slate-800">ประวัติธุรกรรม</h1>
                <span className="text-sm text-slate-500">{totalElements} รายการ</span>
            </div>

            {/* ค้นหา + ตัวกรอง */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <div className="flex flex-wrap gap-3">
                    <div className="flex-1 min-w-[220px] h-11 flex items-center gap-2.5 px-3.5 bg-slate-50 border border-slate-200 rounded-xl focus-within:bg-white focus-within:border-brand-500 transition-colors">
                        <Search size={18} className="shrink-0 text-slate-500" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => { resetToFirstPage(); setSearchTerm(e.target.value); }}
                            placeholder="ค้นหารายละเอียด / หมวดหมู่ / รหัส"
                            className="flex-1 min-w-0 bg-transparent outline-none text-[15px] text-slate-800"
                        />
                        {searchTerm && (
                            <button onClick={() => { resetToFirstPage(); setSearchTerm(''); }} aria-label="ล้างคำค้นหา" className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        )}
                    </div>
                    <label className="relative h-11 pl-3.5 pr-9 flex items-center gap-2 border border-slate-200 rounded-xl bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer">
                        <ArrowUpDown size={16} className="text-slate-500" />
                        {SORT_OPTIONS[sortIndex]?.label}
                        <ChevronDown size={16} className="absolute right-3 text-slate-500 pointer-events-none" />
                        <select
                            aria-label="เรียงลำดับ"
                            value={sortIndex}
                            onChange={(e) => {
                                const o = SORT_OPTIONS[Number(e.target.value)];
                                resetToFirstPage();
                                setSortConfig({ key: o.key, direction: o.direction });
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        >
                            {SORT_OPTIONS.map((o, i) => <option key={i} value={i}>{o.label}</option>)}
                        </select>
                    </label>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {presets.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => { setShowCustomDate(false); setDateRange(p.range[0], p.range[1]); }}
                            className={presetChip(activePreset?.id === p.id)}
                        >
                            {p.label}
                        </button>
                    ))}
                    <button
                        onClick={() => setShowCustomDate((s) => !s)}
                        className={presetChip(showCustomDate || (hasDateFilter && !activePreset))}
                    >
                        <Calendar size={16} /> กำหนดเอง
                    </button>

                    <span className="w-px h-6 bg-slate-200 mx-1" />

                    <div className="flex gap-0.5 p-[3px] bg-slate-100 rounded-[10px]">
                        {[
                            { v: 'ALL', label: 'ทั้งหมด', tone: 'text-brand-700' },
                            { v: 'INCOME', label: 'รายรับ', tone: 'text-income-600' },
                            { v: 'EXPENSE', label: 'รายจ่าย', tone: 'text-expense-600' },
                        ].map((opt) => (
                            <button
                                key={opt.v}
                                onClick={() => { resetToFirstPage(); setFilterType(opt.v); }}
                                className={`h-[30px] px-3 rounded-lg text-[13px] transition-all ${filterType === opt.v ? `bg-white font-semibold shadow-[0_1px_2px_rgba(15,23,42,0.08)] ${opt.tone}` : 'font-medium text-slate-600 hover:text-slate-800'}`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    <label className={`relative ${presetChip(filterCategory !== 'ALL')} pr-8 cursor-pointer`}>
                        {filterCategory !== 'ALL' ? categoryName : 'หมวดหมู่'}
                        <ChevronDown size={14} className="absolute right-3 text-slate-500 pointer-events-none" />
                        <select
                            aria-label="หมวดหมู่"
                            value={filterCategory}
                            onChange={(e) => { resetToFirstPage(); setFilterCategory(e.target.value); }}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        >
                            <option value="ALL">ทุกหมวดหมู่</option>
                            {categories
                                .filter((c) => filterType === 'ALL' || c.type === filterType)
                                .map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                    </label>
                </div>

                {showCustomDate && (
                    <div className="flex flex-wrap items-end gap-3 animate-fade-in">
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs text-slate-500">ตั้งแต่วันที่</span>
                            <input
                                type="date"
                                value={filterStart}
                                max={filterEnd || undefined}
                                onChange={(e) => setDateRange(e.target.value, filterEnd)}
                                className="h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:border-brand-500"
                            />
                        </label>
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs text-slate-500">ถึงวันที่</span>
                            <input
                                type="date"
                                value={filterEnd}
                                min={filterStart || undefined}
                                onChange={(e) => setDateRange(filterStart, e.target.value)}
                                className="h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:border-brand-500"
                            />
                        </label>
                    </div>
                )}

                {chips.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
                        <span className="text-xs text-slate-500 mr-1">ตัวกรองที่ใช้อยู่</span>
                        {chips.map((c) => (
                            <span key={c.key} className="h-8 flex items-center gap-0.5 pl-3 pr-1 rounded-full bg-brand-50 ring-1 ring-inset ring-brand-200 text-brand-700 text-[13px] font-medium">
                                {c.label}
                                <button onClick={c.remove} aria-label="ลบตัวกรอง" className="w-6 h-6 rounded-full flex items-center justify-center text-brand-400 hover:bg-brand-100">
                                    <X size={14} />
                                </button>
                            </span>
                        ))}
                        <button onClick={clearFilters} className="h-8 px-2 text-[13px] font-semibold text-slate-600 hover:text-expense-600">
                            ล้างทั้งหมด
                        </button>
                    </div>
                )}
            </div>

            {/* สรุปยอด (ตามตัวกรอง) */}
            <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 grid grid-cols-1 sm:grid-cols-[auto_auto_auto_minmax(0,1fr)] gap-x-9 gap-y-4 items-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <div className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-1 text-xs text-slate-600"><ArrowUp size={12} className="text-income-600" />รายรับ</span>
                    <span className="text-xl font-bold text-income-600 tabular-nums">+฿{formatMoney(totalIncome)}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-1 text-xs text-slate-600"><ArrowDown size={12} className="text-expense-600" />รายจ่าย</span>
                    <span className="text-xl font-bold text-expense-600 tabular-nums">−฿{formatMoney(totalExpense)}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-slate-600">สุทธิ · {netAmount < 0 ? 'ใช้เกินรายรับ' : 'เหลือเก็บ'}</span>
                    <span className={`text-xl font-bold tabular-nums ${netAmount < 0 ? 'text-expense-600' : 'text-income-600'}`}>{formatSigned(netAmount, true)}</span>
                </div>
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between gap-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1.5"><Filter size={14} />ตามตัวกรองที่เลือก</span>
                        {totalIncome > 0 && (
                            <span className={netAmount < 0 ? 'font-semibold text-expense-700' : ''}>
                                จ่ายไป {Math.round((totalExpense / totalIncome) * 100)}% ของรายรับ
                            </span>
                        )}
                    </div>
                    <div className="h-2 rounded-full bg-expense-500 overflow-hidden flex">
                        <span className="bg-income-500 border-r-2 border-white" style={{ width: `${incomePct}%` }} />
                    </div>
                </div>
                {netAmount < 0 && (
                    <div className="sm:col-span-4 flex items-center gap-2 px-2.5 py-2 rounded-[10px] bg-expense-50 text-expense-700 text-[13px] font-medium">
                        <TrendingDown size={16} className="shrink-0" />
                        ใช้เกินรายรับ ฿{formatMoney(Math.abs(netAmount))} ในช่วงที่เลือก
                    </div>
                )}
            </div>

            {/* รายการ */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                {loading ? (
                    <div aria-busy="true" className="animate-pulse">
                        <div className="h-10 px-5 flex items-center justify-between bg-slate-50 border-b border-slate-100">
                            <span className="w-32 h-3 rounded-full bg-slate-200" />
                            <span className="w-16 h-3 rounded-full bg-slate-200" />
                        </div>
                        {['70%', '50%', '62%', '44%', '56%'].map((w, i) => (
                            <div key={i} className={`h-16 px-5 flex items-center gap-3 ${i ? 'border-t border-slate-100' : ''}`}>
                                <span className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
                                <div className="flex-1 flex flex-col gap-2">
                                    <span className="h-3 rounded-full bg-slate-200" style={{ width: w }} />
                                    <span className="w-24 h-2.5 rounded-full bg-slate-100" />
                                </div>
                                <span className="w-16 h-3 rounded-full bg-slate-200" />
                            </div>
                        ))}
                    </div>
                ) : loadError ? (
                    <EmptyState
                        icon={<CloudOff size={26} className="text-warn-600" />}
                        iconBg="bg-warn-50"
                        title="โหลดประวัติไม่สำเร็จ"
                        text="ตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง ตัวกรองที่เลือกยังอยู่"
                        action={<PrimaryButton onClick={reload} icon={<RefreshCw size={18} />}>ลองใหม่</PrimaryButton>}
                    />
                ) : content.length === 0 ? (
                    hasQuery ? (
                        <EmptyState
                            icon={<SearchX size={26} className="text-slate-600" />}
                            iconBg="bg-slate-100"
                            title="ไม่พบรายการตามตัวกรอง"
                            text={[debouncedSearch.trim() && `“${debouncedSearch.trim()}”`, ...chips.map((c) => c.label)].filter(Boolean).join(' · ')}
                            action={
                                <button
                                    onClick={() => { clearFilters(); setSearchTerm(''); }}
                                    className="h-12 px-5 rounded-xl border border-slate-200 bg-white text-brand-600 text-[15px] font-semibold flex items-center gap-2 hover:bg-slate-50"
                                >
                                    <X size={18} /> ล้างตัวกรอง
                                </button>
                            }
                        />
                    ) : (
                        <EmptyState
                            icon={<Inbox size={26} className="text-brand-600" />}
                            iconBg="bg-brand-50"
                            title="ยังไม่มีรายการ"
                            text="เริ่มจดรายรับรายจ่ายรายการแรก แล้วประวัติจะแสดงที่นี่"
                            action={<PrimaryButton onClick={() => onNavigate && onNavigate('transaction')} icon={<Plus size={18} />}>บันทึกรายการแรก</PrimaryButton>}
                        />
                    )
                ) : (
                    groups.map((g, gi) => {
                        const net = dayTotals[g.key];
                        return (
                            <React.Fragment key={g.key}>
                                {groupByDay && (
                                    <div className={`h-10 flex items-center justify-between gap-3 pl-5 pr-12 bg-slate-50 border-b border-slate-100 ${gi ? 'border-t' : ''}`}>
                                        <span className="text-[13px] font-semibold text-slate-600">
                                            {dayLabel(g.key)} <span className="font-normal text-slate-500">· {g.rows.length} รายการ</span>
                                        </span>
                                        {net != null && (
                                            <span className={`text-[13px] font-semibold tabular-nums ${net < 0 ? 'text-expense-600' : net > 0 ? 'text-income-600' : 'text-slate-500'}`}>
                                                {formatSigned(net)}
                                            </span>
                                        )}
                                    </div>
                                )}
                                {g.rows.map((item, i) => (
                                    <TxnRow
                                        key={item.id}
                                        item={item}
                                        variant="table"
                                        bordered={i > 0}
                                        showDate={!groupByDay}
                                        selected={selectedIds.has(item.id)}
                                        active={editingItem?.id === item.id}
                                        anySelected={selectedIds.size > 0}
                                        onPress={() => openEdit(item)}
                                        onToggle={() => toggleSelect(item.id)}
                                    />
                                ))}
                            </React.Fragment>
                        );
                    })
                )}

                {/* Pagination */}
                {!loading && !loadError && totalElements > 0 && (
                    <div className="px-5 py-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                        <span className="text-[13px] text-slate-500">
                            แสดง {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, totalElements)} จาก {totalElements} รายการ
                        </span>
                        <div className="flex items-center gap-1 text-sm font-semibold text-slate-600">
                            <button
                                onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                                disabled={safePage === 1}
                                aria-label="หน้าก่อนหน้า"
                                className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            {pageNumbers.map((p, idx, arr) => (
                                <React.Fragment key={p}>
                                    {idx > 0 && p - arr[idx - 1] > 1 && <span className="w-6 text-center text-slate-500">…</span>}
                                    <button
                                        onClick={() => setCurrentPage(p)}
                                        className={`min-w-9 h-9 px-2 rounded-xl transition-colors ${safePage === p ? 'bg-brand-600 text-white' : 'hover:bg-slate-100'}`}
                                    >
                                        {p}
                                    </button>
                                </React.Fragment>
                            ))}
                            <button
                                onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
                                disabled={safePage === totalPages}
                                aria-label="หน้าถัดไป"
                                className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* แถบเมื่อเลือกหลายรายการ */}
            {selectedIds.size > 0 && !editing && (
                <div className="fixed left-1/2 bottom-7 z-50 w-[440px] max-w-[calc(100vw-32px)] -translate-x-1/2 h-14 flex items-center gap-2 pl-[18px] pr-2 rounded-2xl bg-slate-900 text-white shadow-[0_12px_32px_-8px_rgba(15,23,42,0.45)] animate-toast-in">
                    <span className="flex-1 text-sm font-medium">เลือกแล้ว {selectedIds.size} รายการ</span>
                    <button onClick={clearSelection} className="h-10 px-3 rounded-[10px] text-sm font-semibold text-slate-300 hover:text-white">
                        ยกเลิก
                    </button>
                    <button
                        onClick={() => setConfirmIds([...selectedIds])}
                        className="h-10 px-3.5 rounded-[10px] bg-expense-600 hover:bg-expense-700 text-sm font-semibold flex items-center gap-1.5"
                    >
                        <Trash2 size={16} /> ลบ {selectedIds.size} รายการ
                    </button>
                </div>
            )}

            {/* Drawer แก้ไขรายการ */}
            {editing && (
                <>
                    <div onClick={closeEdit} className="fixed inset-0 z-40 bg-slate-900/30 animate-fade-in" />
                    <aside role="dialog" aria-modal="true" aria-label="รายละเอียดรายการ" className="fixed top-0 right-0 bottom-0 z-50 w-[440px] max-w-full bg-white flex flex-col shadow-[-24px_0_48px_-16px_rgba(15,23,42,0.3)] animate-drawer-in">
                        <div className="h-16 shrink-0 flex items-center justify-between pl-6 pr-3 border-b border-slate-100">
                            <span className="text-[17px] font-semibold text-slate-800">รายละเอียดรายการ</span>
                            <button onClick={closeEdit} aria-label="ปิด" className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="shrink-0 flex items-center gap-3.5 px-6 py-5 border-b border-slate-100">
                            <CategoryAvatar name={editingItem.categoryIcon} size={48} />
                            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                <span className="text-base font-semibold text-slate-800 truncate">{editingItem.description || editingItem.categoryName}</span>
                                <span className="text-[13px] text-slate-500 truncate">
                                    {editingItem.categoryName} · <span className="font-mono text-xs">#{formatTxnId(editingItem.id)}</span>
                                </span>
                                <span className="text-[13px] text-slate-500">
                                    {formatDayLabel(editingItem.transactionDate)} · {formatTime(editingItem.transactionDate)}
                                </span>
                            </div>
                            <span className={`text-[22px] font-bold tabular-nums whitespace-nowrap ${editingItem.categoryType === 'INCOME' ? 'text-income-600' : 'text-expense-600'}`}>
                                {editingItem.categoryType === 'INCOME' ? '+' : '−'}{formatMoney(editingItem.amount)}
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 pt-5 pb-6 flex flex-col gap-6">
                            <TxnForm
                                type={editing.type}
                                onTypeChange={(type) => type !== editing.type && patchEdit({ type, categoryId: null })}
                                amount={editing.amount}
                                onAmountChange={(amount) => patchEdit({ amount, errors: { ...editing.errors, amt: undefined } })}
                                categories={categories}
                                categoryId={editing.categoryId}
                                onCategoryChange={(categoryId) => patchEdit({ categoryId, errors: { ...editing.errors, cat: undefined } })}
                                dateMode="readonly"
                                dateText={`${formatDayLabel(editingItem.transactionDate)} · ${formatTime(editingItem.transactionDate)}`}
                                description={editing.description}
                                onDescriptionChange={(description) => patchEdit({ description })}
                                errors={editing.errors}
                            />
                            <button
                                onClick={() => setConfirmIds([editingItem.id])}
                                className="h-12 shrink-0 rounded-xl bg-expense-50 text-expense-700 text-[15px] font-semibold flex items-center justify-center gap-2 hover:bg-expense-100"
                            >
                                <Trash2 size={18} /> ลบรายการ
                            </button>
                        </div>

                        <div className="shrink-0 flex gap-3 px-6 py-4 border-t border-slate-200">
                            <button
                                onClick={closeEdit}
                                disabled={savingEdit}
                                className="w-[120px] h-12 rounded-xl border border-slate-200 bg-white text-slate-700 text-[15px] font-semibold hover:bg-slate-50 disabled:text-slate-400"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={saveEdit}
                                disabled={savingEdit}
                                className="flex-1 h-12 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-[15px] font-semibold flex items-center justify-center gap-2 disabled:opacity-85"
                            >
                                {savingEdit && <Loader2 size={18} className="animate-spin" />}
                                {savingEdit ? 'กำลังบันทึก…' : 'บันทึกการแก้ไข'}
                            </button>
                        </div>
                    </aside>
                </>
            )}

            <ConfirmDialog
                open={!!confirmIds}
                title={`ลบ ${confirmIds?.length ?? 0} รายการ?`}
                text="ลบแล้วกู้คืนไม่ได้ ยอดสรุปจะคำนวณใหม่ทันที"
                busy={deleting}
                onCancel={() => setConfirmIds(null)}
                onConfirm={doDelete}
            />

            <Toast toast={toast} />
        </div>
    );
};

function EmptyState({ icon, iconBg, title, text, action }) {
    return (
        <div className="py-10 px-6 flex flex-col items-center gap-2 text-center">
            <span className={`w-14 h-14 mb-1 rounded-full flex items-center justify-center ${iconBg}`}>{icon}</span>
            <span className="text-base font-semibold text-slate-800">{title}</span>
            {text && <span className="text-sm leading-5 text-slate-600">{text}</span>}
            {action && <div className="mt-3">{action}</div>}
        </div>
    );
}

function PrimaryButton({ onClick, icon, children }) {
    return (
        <button onClick={onClick} className="h-12 px-5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-[15px] font-semibold flex items-center gap-2">
            {icon} {children}
        </button>
    );
}

export default HistoryPage;
