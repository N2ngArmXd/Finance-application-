import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, ArrowUpCircle, ArrowDownCircle, Edit2, Trash2, ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { showSuccess, showError, showConfirm } from '../utils/swr';
import Swal from 'sweetalert2';
import { formatTxnId, formatDate } from '../utils/format';

const PAGE_SIZE = 10;

const HistoryPage = ({ userId }) => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    // ผลลัพธ์จาก server (แบ่งหน้าแล้ว)
    const [pageData, setPageData] = useState({
        content: [],
        totalElements: 0,
        totalPages: 1,
        totalIncome: 0,
        totalExpense: 0,
    });

    // ค้นหา / ตัวกรอง / เรียงลำดับ / แบ่งหน้า (ส่งไป server)
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filterType, setFilterType] = useState('ALL'); // ALL | INCOME | EXPENSE
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [filterStart, setFilterStart] = useState('');
    const [filterEnd, setFilterEnd] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'transactionDate', direction: 'desc' });
    const [currentPage, setCurrentPage] = useState(1);

    // เลือกหลายรายการ
    const [selectedIds, setSelectedIds] = useState(() => new Set());
    const [bulkDeleting, setBulkDeleting] = useState(false);

    // trigger รีโหลดหลังแก้ไข/ลบ
    const [reloadFlag, setReloadFlag] = useState(0);
    const reload = () => setReloadFlag((f) => f + 1);

    const activeFilterCount = (filterType !== 'ALL' ? 1 : 0) + (filterCategory !== 'ALL' ? 1 : 0) + (filterStart ? 1 : 0) + (filterEnd ? 1 : 0);
    const hasQuery = activeFilterCount > 0 || debouncedSearch.trim() !== '';

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

        const fetchPage = async () => {
            setLoading(true);
            try {
                const response = await fetch('/api/finance-app/transactions/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: Number(userId),
                        search: debouncedSearch.trim() || null,
                        type: filterType,
                        categoryId: filterCategory === 'ALL' ? null : Number(filterCategory),
                        dateFrom: filterStart || null,
                        dateTo: filterEnd || null,
                        sortBy: sortConfig.key,
                        sortDir: sortConfig.direction,
                        page: currentPage,
                        size: PAGE_SIZE,
                    })
                });
                if (!response.ok) throw new Error('fetch failed');
                const data = await response.json();
                if (cancelled) return;

                // ถ้าหน้าปัจจุบันเกินช่วง (เช่น ลบจนหน้าท้ายว่าง) ให้ถอยไปหน้าสุดท้าย
                if (data.totalPages > 0 && currentPage > data.totalPages) {
                    setCurrentPage(data.totalPages);
                    return;
                }
                setPageData({
                    content: data.content || [],
                    totalElements: data.totalElements || 0,
                    totalPages: data.totalPages || 1,
                    totalIncome: Number(data.totalIncome) || 0,
                    totalExpense: Number(data.totalExpense) || 0,
                });
            } catch (error) {
                if (!cancelled) console.error("Error fetching history:", error);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchPage();
        return () => { cancelled = true; };
    }, [userId, debouncedSearch, filterType, filterCategory, filterStart, filterEnd, sortConfig, currentPage, reloadFlag]);

    const handleEdit = (item, allCategories) => {
        const getCategoryType = (id) => {
            const cat = allCategories.find(c => c.id === parseInt(id));
            return cat ? cat.type : '';
        };

        Swal.fire({
            title: '<span class="font-black text-xl">แก้ไขรายการ</span>',
            html: `
    <div class="text-left space-y-5 p-2">
        <div id="type-banner" class="banner-common p-3.5 px-6 rounded-full flex items-center gap-3 border transition-all duration-300">
            <span id="type-icon" class="flex items-center justify-center w-6 h-6 rounded-full bg-white shadow-sm font-bold text-[10px]"></span>
            <span id="type-text" class="font-bold text-xs"></span>
        </div>

        <div>
            <label class="finance-label">หมวดหมู่</label>
            <select id="edit-category" class="finance-select">
                ${allCategories.map(cat => `
                    <option value="${cat.id}" ${cat.id === item.categoryId ? 'selected' : ''}>
                        ${cat.name}
                    </option>
                `).join('')}
            </select>
        </div>

        <div>
            <label class="finance-label">จำนวนเงิน</label>
            <input id="edit-amount" type="number" class="finance-input-group" value="${item.amount}">
        </div>

        <div>
            <label class="finance-label">รายละเอียด</label>
            <input id="edit-desc" type="text" class="finance-input-group" value="${item.description}">
        </div>
    </div>
`,
            showCancelButton: true,
            confirmButtonText: 'บันทึกการแก้ไข',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#4F46E5',
            customClass: {
                popup: 'rounded-[2rem]',
                confirmButton: 'rounded-xl px-6 py-3 font-bold',
                cancelButton: 'rounded-xl px-6 py-3 font-bold'
            },
            didOpen: () => {
                const select = document.getElementById('edit-category');
                const banner = document.getElementById('type-banner');
                const typeText = document.getElementById('type-text');
                const typeIcon = document.getElementById('type-icon');

                const updateBanner = (val) => {
                    const type = getCategoryType(val);
                    if (type === 'INCOME') {
                        banner.className = 'p-3 rounded-2xl flex items-center gap-2 bg-green-50 text-green-600 border border-green-100';
                        typeText.innerText = 'ประเภทรายการ: รายรับ';
                        typeIcon.innerHTML = '↑';
                    } else {
                        banner.className = 'p-3 rounded-2xl flex items-center gap-2 bg-red-50 text-red-600 border border-red-100';
                        typeText.innerText = 'ประเภทรายการ: รายจ่าย';
                        typeIcon.innerHTML = '↓';
                    }
                };

                updateBanner(select.value);
                select.addEventListener('change', (e) => updateBanner(e.target.value));
            },
            preConfirm: async () => {
                const categoryId = document.getElementById('edit-category').value;
                const amount = document.getElementById('edit-amount').value;
                const description = document.getElementById('edit-desc').value;

                if (!amount || parseFloat(amount) <= 0) {
                    Swal.showValidationMessage('กรุณากรอกจำนวนเงินมากกว่า 0');
                    return false;
                }

                try {
                    const response = await fetch('/api/finance-app/transaction/update', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: item.id,
                            userId: { id: userId },
                            amount: parseFloat(amount),
                            description: description,
                            categoryId: { id: parseInt(categoryId) }
                        })
                    });
                    if (!response.ok) throw new Error('Update failed');
                    return true;
                } catch (error) {
                    Swal.showValidationMessage(`Error: ${error.message}`);
                }
            }
        }).then((result) => {
            if (result.isConfirmed) {
                showSuccess('เรียบร้อย!', 'แก้ไขข้อมูลสำเร็จแล้ว');
                reload();
            }
        });
    };

    const handleDelete = async (id) => {
        const result = await showConfirm('ยืนยันการลบ?', 'คุณจะไม่สามารถกู้คืนรายการนี้ได้!');
        if (result.isConfirmed) {
            try {
                const response = await fetch(`/api/finance-app/transactions/delete/${id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                if (response.ok) {
                    showSuccess('ลบสำเร็จ!', 'รายการของคุณถูกลบออกแล้ว');
                    setSelectedIds((prev) => {
                        const next = new Set(prev);
                        next.delete(id);
                        return next;
                    });
                    reload();
                } else {
                    showError('เกิดข้อผิดพลาด', 'ไม่สามารถลบรายการได้');
                }
            } catch {
                showError('Error', 'ไม่สามารถเชื่อมต่อกับ Server ได้');
            }
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

    // เลือก/ยกเลิกเลือกทุกรายการในหน้าปัจจุบัน
    const toggleSelectPage = (pageItems) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            const allSelected = pageItems.length > 0 && pageItems.every((t) => next.has(t.id));
            if (allSelected) pageItems.forEach((t) => next.delete(t.id));
            else pageItems.forEach((t) => next.add(t.id));
            return next;
        });
    };

    const clearSelection = () => setSelectedIds(new Set());

    // ลบหลายรายการพร้อมกัน (ยิงครั้งเดียวไป server)
    const handleBulkDelete = async () => {
        const ids = [...selectedIds];
        if (ids.length === 0) return;

        const result = await showConfirm(
            `ยืนยันการลบ ${ids.length} รายการ?`,
            'คุณจะไม่สามารถกู้คืนรายการเหล่านี้ได้!'
        );
        if (!result.isConfirmed) return;

        setBulkDeleting(true);
        try {
            const response = await fetch('/api/finance-app/transactions/delete-batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: Number(userId), ids })
            });
            if (!response.ok) throw new Error('bulk delete failed');
            clearSelection();
            reload();
            showSuccess('ลบสำเร็จ!', `ลบ ${ids.length} รายการเรียบร้อยแล้ว`);
        } catch {
            showError('Error', 'ไม่สามารถลบรายการได้');
        } finally {
            setBulkDeleting(false);
        }
    };

    // เปลี่ยนเงื่อนไข -> กลับหน้า 1 + ล้างการเลือก
    const resetToFirstPage = () => {
        setCurrentPage(1);
        clearSelection();
    };

    const handleSort = (key) => {
        resetToFirstPage();
        setSortConfig((prev) => (
            prev.key === key
                ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
                : { key, direction: 'desc' }
        ));
    };

    const renderSortIcon = (column) => {
        if (sortConfig.key !== column) return <ArrowUpDown size={14} className="inline-block ml-1 opacity-40" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp size={14} className="inline-block ml-1 text-indigo-500" />
            : <ArrowDown size={14} className="inline-block ml-1 text-indigo-500" />;
    };

    const clearFilters = () => {
        resetToFirstPage();
        setFilterType('ALL');
        setFilterCategory('ALL');
        setFilterStart('');
        setFilterEnd('');
    };

    const { content, totalElements, totalPages, totalIncome, totalExpense } = pageData;
    const safePage = Math.min(currentPage, Math.max(1, totalPages));

    return (
        <div className="space-y-6 animate-zoom-in">
            <h1 className="text-2xl font-black text-slate-800">ประวัติธุรกรรม</h1>

            {/* Section 1: Search + Filter */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex-1 min-w-[200px] relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => { resetToFirstPage(); setSearchTerm(e.target.value); }}
                            placeholder="ค้นหารายการ (รายละเอียด / หมวดหมู่ / รหัส)..."
                            className="w-full pl-12 pr-10 py-3 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => { resetToFirstPage(); setSearchTerm(''); }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => setShowFilters((s) => !s)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl transition-all ${showFilters || activeFilterCount > 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                    >
                        <Filter size={18} /> ตัวกรอง
                        {activeFilterCount > 0 && (
                            <span className="ml-1 flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-bold text-white bg-indigo-500 rounded-full">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                </div>

                {showFilters && (
                    <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-zoom-in">
                        {/* ประเภท */}
                        <div>
                            <label className="block text-sm font-medium text-slate-500 mb-2">ประเภท</label>
                            <div className="flex bg-slate-50 rounded-2xl p-1">
                                {[
                                    { v: 'ALL', label: 'ทั้งหมด' },
                                    { v: 'INCOME', label: 'รายรับ' },
                                    { v: 'EXPENSE', label: 'รายจ่าย' },
                                ].map((opt) => (
                                    <button
                                        key={opt.v}
                                        onClick={() => { resetToFirstPage(); setFilterType(opt.v); }}
                                        className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${filterType === opt.v ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* หมวดหมู่ */}
                        <div>
                            <label className="block text-sm font-medium text-slate-500 mb-2">หมวดหมู่</label>
                            <select
                                value={filterCategory}
                                onChange={(e) => { resetToFirstPage(); setFilterCategory(e.target.value); }}
                                className="w-full px-4 py-2.5 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            >
                                <option value="ALL">ทุกหมวดหมู่</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* วันที่เริ่ม */}
                        <div>
                            <label className="block text-sm font-medium text-slate-500 mb-2">ตั้งแต่วันที่</label>
                            <input
                                type="date"
                                value={filterStart}
                                onChange={(e) => { resetToFirstPage(); setFilterStart(e.target.value); }}
                                className="w-full px-4 py-2.5 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            />
                        </div>

                        {/* วันที่สิ้นสุด */}
                        <div>
                            <label className="block text-sm font-medium text-slate-500 mb-2">ถึงวันที่</label>
                            <input
                                type="date"
                                value={filterEnd}
                                onChange={(e) => { resetToFirstPage(); setFilterEnd(e.target.value); }}
                                className="w-full px-4 py-2.5 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            />
                        </div>

                        {activeFilterCount > 0 && (
                            <div className="md:col-span-2 lg:col-span-4">
                                <button
                                    onClick={clearFilters}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-500 hover:text-red-500 transition-colors"
                                >
                                    <X size={16} /> ล้างตัวกรองทั้งหมด
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Section 2: INCOME/EXPENSE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border-l-8 border-green-500 flex items-center justify-between">
                    <div>
                        <p className="text-slate-500 font-medium">รายรับรวม</p>
                        <h3 className="text-3xl font-black text-slate-800 mt-1">
                            ฿{totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </h3>
                    </div>
                    <ArrowUpCircle size={48} className="text-green-500 opacity-20" />
                </div>

                {/* Card รายจ่าย */}
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border-l-8 border-red-500 flex items-center justify-between">
                    <div>
                        <p className="text-slate-500 font-medium">รายจ่ายรวม</p>
                        <h3 className="text-3xl font-black text-slate-800 mt-1">
                            ฿{totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </h3>
                    </div>
                    <ArrowDownCircle size={48} className="text-red-500 opacity-20" />
                </div>
            </div>

            {/* Section 3: Transaction Table */}
            <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden border border-slate-100">
                <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">รายการธุรกรรม</h2>
                        <span className="text-sm text-slate-400"> User ID : {userId}</span>
                    </div>
                    <span className="text-sm font-medium text-slate-400">
                        {totalElements} รายการ
                    </span>
                </div>

                {/* แถบเมื่อเลือกหลายรายการ */}
                {selectedIds.size > 0 && (
                    <div className="px-6 py-3 bg-indigo-50 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-3 animate-zoom-in">
                        <span className="text-sm font-semibold text-indigo-700">
                            เลือกแล้ว {selectedIds.size} รายการ
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={clearSelection}
                                className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                            >
                                ยกเลิกการเลือก
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                disabled={bulkDeleting}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <Trash2 size={16} />
                                {bulkDeleting ? 'กำลังลบ...' : `ลบ ${selectedIds.size} รายการ`}
                            </button>
                        </div>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-sm uppercase font-semibold">
                            <tr>
                                <th className="px-6 py-4 w-12">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 accent-indigo-600 cursor-pointer align-middle"
                                        checked={content.length > 0 && content.every((t) => selectedIds.has(t.id))}
                                        onChange={() => toggleSelectPage(content)}
                                        disabled={content.length === 0}
                                        title="เลือกทั้งหน้า"
                                    />
                                </th>
                                <th className="px-6 py-4">รหัส</th>
                                <th
                                    className="px-6 py-4 cursor-pointer select-none hover:text-slate-700 transition-colors"
                                    onClick={() => handleSort('transactionDate')}
                                >
                                    วันที่ทำรายการ {renderSortIcon('transactionDate')}
                                </th>
                                <th className="px-6 py-4">หมวดหมู่</th>
                                <th className="px-6 py-4">รายละเอียด</th>
                                <th
                                    className="px-6 py-4 text-right cursor-pointer select-none hover:text-slate-700 transition-colors"
                                    onClick={() => handleSort('amount')}
                                >
                                    จำนวนเงิน {renderSortIcon('amount')}
                                </th>
                                <th className="px-6 py-4 text-center">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan="7" className="text-center py-10 text-slate-400">กำลังโหลดข้อมูล...</td></tr>
                            ) : content.length === 0 ? (
                                <tr><td colSpan="7" className="text-center py-12 text-slate-400">
                                    {hasQuery ? 'ไม่พบรายการที่ตรงกับเงื่อนไข' : 'ยังไม่มีรายการธุรกรรม'}
                                </td></tr>
                            ) : content.map((item) => (
                                <tr key={item.id} className={`transition-all ${selectedIds.has(item.id) ? 'bg-indigo-50/60' : 'hover:bg-slate-50/50'}`}>
                                    <td className="px-6 py-4">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 accent-indigo-600 cursor-pointer align-middle"
                                            checked={selectedIds.has(item.id)}
                                            onChange={() => toggleSelect(item.id)}
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 text-sm font-mono">#{formatTxnId(item.id)}</td>
                                    <td className="px-6 py-4 text-slate-600 text-sm">
                                        {formatDate(item.transactionDate)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${item.categoryType === 'INCOME' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                            {item.categoryName}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-700 font-medium">{item.description}</td>
                                    <td className={`px-6 py-4 text-right font-black ${item.categoryType === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                                        {item.categoryType === 'INCOME' ? '+' : '-'}{item.amount.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button
                                                onClick={() => handleEdit(item, categories)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!loading && totalElements > 0 && (
                    <div className="p-6 border-t border-slate-50 flex flex-wrap items-center justify-between gap-4">
                        <span className="text-sm text-slate-400">
                            แสดง {(safePage - 1) * PAGE_SIZE + 1}
                            {' - '}
                            {Math.min(safePage * PAGE_SIZE, totalElements)}
                            {' จาก '}{totalElements} รายการ
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                                disabled={safePage === 1}
                                className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                                .map((p, idx, arr) => (
                                    <React.Fragment key={p}>
                                        {idx > 0 && p - arr[idx - 1] > 1 && (
                                            <span className="px-2 text-slate-400">…</span>
                                        )}
                                        <button
                                            onClick={() => setCurrentPage(p)}
                                            className={`min-w-9 h-9 px-3 rounded-xl text-sm font-semibold transition-all ${safePage === p ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                                        >
                                            {p}
                                        </button>
                                    </React.Fragment>
                                ))}
                            <button
                                onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
                                disabled={safePage === totalPages}
                                className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HistoryPage;
