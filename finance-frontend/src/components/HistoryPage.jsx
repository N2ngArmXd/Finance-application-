import React, { useState, useEffect } from 'react';
import { Search, Filter, ArrowUpCircle, ArrowDownCircle, Edit2, Trash2, ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { showSuccess, showError, showConfirm } from '../utils/swr';
import Swal from 'sweetalert2';
import { formatTxnId, formatDate } from '../utils/format';

const PAGE_SIZE = 10;

const HistoryPage = ({ userId }) => {
    const [transactions, setTransactions] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    // ค้นหา / ตัวกรอง / เรียงลำดับ / แบ่งหน้า
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filterType, setFilterType] = useState('ALL'); // ALL | INCOME | EXPENSE
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [filterStart, setFilterStart] = useState('');
    const [filterEnd, setFilterEnd] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'transactionDate', direction: 'desc' });
    const [currentPage, setCurrentPage] = useState(1);

    // ฟังก์ชันดึงข้อมูลประวัติ 
    const fetchHistory = async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const response = await fetch('/api/finance-app/transactions/list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: String(userId) })
            });
            if (response.ok) {
                const data = await response.json();
                setTransactions(data);
            }
        } catch (error) {
            console.error("Error fetching history:", error);
        } finally {
            setLoading(false);
        }
    };

    // ฟังก์ชันดึงหมวดหมู่
    const fetchCategories = async () => {
        try {
            const response = await fetch('/api/finance-app/categories/getCategoriesList', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: String(userId) })
            });
            if (response.ok) {
                const data = await response.json();
                setCategories(data);
            }
        } catch (error) {
            console.error("Error fetching categories:", error);
        }
    };

    useEffect(() => {
        if (userId) {
            fetchHistory();
            fetchCategories();
        }
    }, [userId]);

    const handleEdit = (item, allCategories) => {
        // ฟังก์ชันช่วยหาประเภทของหมวดหมู่เพื่อแสดง Banner
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

                // ฟังก์ชันอัปเดตหน้าตาของ Banner
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

                // อัปเดตครั้งแรกตอนเปิด Modal
                updateBanner(select.value);

                // ดักจับตอนเปลี่ยนหมวดหมู่
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
                fetchHistory();
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
                    fetchHistory();
                } else {
                    showError('เกิดข้อผิดพลาด', 'ไม่สามารถลบรายการได้');
                }
            } catch (error) {
                showError('Error', 'ไม่สามารถเชื่อมต่อกับ Server ได้');
            }
        }
    };

    const getType = (t) => t.type || t.categoryType || '';

    // 1) กรองข้อมูลตามคำค้นหา + ตัวกรอง
    const filteredTransactions = React.useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        const startTs = filterStart ? new Date(filterStart).setHours(0, 0, 0, 0) : null;
        const endTs = filterEnd ? new Date(filterEnd).setHours(23, 59, 59, 999) : null;

        return transactions.filter((t) => {
            // ค้นหาจากรายละเอียด + ชื่อหมวดหมู่ + รหัส
            if (term) {
                const haystack = `${t.description || ''} ${t.categoryName || ''} ${formatTxnId(t.id)}`.toLowerCase();
                if (!haystack.includes(term)) return false;
            }
            // ประเภท
            if (filterType !== 'ALL' && getType(t) !== filterType) return false;
            // หมวดหมู่
            if (filterCategory !== 'ALL' && parseInt(t.categoryId) !== parseInt(filterCategory)) return false;
            // ช่วงวันที่
            if (startTs || endTs) {
                const d = new Date(t.transactionDate).getTime();
                if (startTs && d < startTs) return false;
                if (endTs && d > endTs) return false;
            }
            return true;
        });
    }, [transactions, searchTerm, filterType, filterCategory, filterStart, filterEnd]);

    // 2) เรียงลำดับ
    const sortedTransactions = React.useMemo(() => {
        const list = [...filteredTransactions];
        const { key, direction } = sortConfig;
        const dir = direction === 'asc' ? 1 : -1;
        list.sort((a, b) => {
            let av, bv;
            if (key === 'amount') {
                av = Number(a.amount) || 0;
                bv = Number(b.amount) || 0;
            } else { // transactionDate
                av = new Date(a.transactionDate).getTime() || 0;
                bv = new Date(b.transactionDate).getTime() || 0;
            }
            if (av < bv) return -1 * dir;
            if (av > bv) return 1 * dir;
            return 0;
        });
        return list;
    }, [filteredTransactions, sortConfig]);

    // 3) แบ่งหน้า — clamp หน้าให้อยู่ในช่วงที่ถูกต้องเสมอ (ไม่ต้องพึ่ง effect)
    const totalPages = Math.max(1, Math.ceil(sortedTransactions.length / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const pagedTransactions = React.useMemo(() => {
        const start = (safePage - 1) * PAGE_SIZE;
        return sortedTransactions.slice(start, start + PAGE_SIZE);
    }, [sortedTransactions, safePage]);

    const handleSort = (key) => {
        setCurrentPage(1);
        setSortConfig((prev) => {
            if (prev.key === key) {
                return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'desc' };
        });
    };

    const renderSortIcon = (column) => {
        if (sortConfig.key !== column) return <ArrowUpDown size={14} className="inline-block ml-1 opacity-40" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp size={14} className="inline-block ml-1 text-indigo-500" />
            : <ArrowDown size={14} className="inline-block ml-1 text-indigo-500" />;
    };

    const activeFilterCount = (filterType !== 'ALL' ? 1 : 0) + (filterCategory !== 'ALL' ? 1 : 0) + (filterStart ? 1 : 0) + (filterEnd ? 1 : 0);

    const clearFilters = () => {
        setCurrentPage(1);
        setFilterType('ALL');
        setFilterCategory('ALL');
        setFilterStart('');
        setFilterEnd('');
    };

    // สรุปยอดตามผลการกรอง (ให้ตัวเลขตรงกับที่แสดง)
    const totalIncome = React.useMemo(() => {
        return filteredTransactions.reduce((sum, t) => (
            getType(t) === 'INCOME' ? sum + (Number(t.amount) || 0) : sum
        ), 0);
    }, [filteredTransactions]);

    const totalExpense = React.useMemo(() => {
        return filteredTransactions.reduce((sum, t) => (
            getType(t) === 'EXPENSE' ? sum + (Number(t.amount) || 0) : sum
        ), 0);
    }, [filteredTransactions]);

    return (
        <div className="space-y-6 animate-zoom-in">
            <h1 className="text-2xl font-black text-slate-800">ประวัติธุรกรรม</h1>

            {/* Summary Cards & Filters (เหมือนเดิม) */}
            {/* Section 1: Search + Filter */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex-1 min-w-[200px] relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => { setCurrentPage(1); setSearchTerm(e.target.value); }}
                            placeholder="ค้นหารายการ (รายละเอียด / หมวดหมู่ / รหัส)..."
                            className="w-full pl-12 pr-10 py-3 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
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
                                        onClick={() => { setCurrentPage(1); setFilterType(opt.v); }}
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
                                onChange={(e) => { setCurrentPage(1); setFilterCategory(e.target.value); }}
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
                                onChange={(e) => { setCurrentPage(1); setFilterStart(e.target.value); }}
                                className="w-full px-4 py-2.5 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            />
                        </div>

                        {/* วันที่สิ้นสุด */}
                        <div>
                            <label className="block text-sm font-medium text-slate-500 mb-2">ถึงวันที่</label>
                            <input
                                type="date"
                                value={filterEnd}
                                onChange={(e) => { setCurrentPage(1); setFilterEnd(e.target.value); }}
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

            {/* Section 2: INCOME/ExPENSE */}
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

            {/* Section 3: Transaction Table (Real API Data) */}
            <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden border border-slate-100">
                <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">รายการธุรกรรม</h2>
                        <span className="text-sm text-slate-400"> User ID : {userId}</span>
                    </div>
                    <span className="text-sm font-medium text-slate-400">
                        {sortedTransactions.length} รายการ
                    </span>
                </div>

                {/* ... Header Table ... */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-sm uppercase font-semibold">
                            <tr>
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
                                <tr><td colSpan="6" className="text-center py-10 text-slate-400">กำลังโหลดข้อมูล...</td></tr>
                            ) : pagedTransactions.length === 0 ? (
                                <tr><td colSpan="6" className="text-center py-12 text-slate-400">
                                    {transactions.length === 0 ? 'ยังไม่มีรายการธุรกรรม' : 'ไม่พบรายการที่ตรงกับเงื่อนไข'}
                                </td></tr>
                            ) : pagedTransactions.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-all">
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
                {!loading && sortedTransactions.length > 0 && (
                    <div className="p-6 border-t border-slate-50 flex flex-wrap items-center justify-between gap-4">
                        <span className="text-sm text-slate-400">
                            แสดง {(safePage - 1) * PAGE_SIZE + 1}
                            {' - '}
                            {Math.min(safePage * PAGE_SIZE, sortedTransactions.length)}
                            {' จาก '}{sortedTransactions.length} รายการ
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