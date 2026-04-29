import React, { useState, useEffect } from 'react';
import { Search, Filter, ArrowUpCircle, ArrowDownCircle, Edit2, Trash2 } from 'lucide-react';
import { showSuccess, showError, showConfirm } from '../utils/swr';
import Swal from 'sweetalert2';

const HistoryPage = ({ userId }) => {
    const [transactions, setTransactions] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

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

                if (!amount || !description) {
                    Swal.showValidationMessage('กรุณากรอกข้อมูลให้ครบถ้วน');
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

    const totalIncome = React.useMemo(() => {
        return transactions.reduce((sum, t) => {
            // เช็คว่า type เป็น INCOME หรือไม่ (ลองหาจากทั้ง t.type หรือ t.categoryType)
            const isIncome = t.type === 'INCOME' || t.categoryType === 'INCOME';

            if (isIncome) {
                return sum + (Number(t.amount) || 0);
            }
            return sum;
        }, 0);
    }, [transactions]);

    const totalExpense = React.useMemo(() => {
        return transactions.reduce((sum, t) => {
            // เช็คว่า type เป็น EXPENSE หรือไม่
            const isExpense = t.type === 'EXPENSE' || t.categoryType === 'EXPENSE';

            if (isExpense) {
                return sum + (Number(t.amount) || 0);
            }
            return sum;
        }, 0);
    }, [transactions]);

    return (
        <div className="space-y-6 animate-zoom-in">
            {/* Summary Cards & Filters (เหมือนเดิม) */}
            {/* Section 1: Filter (Mockup) */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" placeholder="ค้นหารายการ..." className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                </div>
                <button className="flex items-center gap-2 px-6 py-3 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-100 transition-all">
                    <Filter size={18} /> ตัวกรอง
                </button>
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
                <div className="p-6 border-b border-slate-50">
                    <h2 className="text-xl font-bold text-slate-800">รายการธุรกรรม</h2>
                    <span className="text-sm text-slate-400"> User ID : {userId}</span>
                </div>

                {/* ... Header Table ... */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-sm uppercase font-semibold">
                            <tr>
                                <th className="px-6 py-4">วันที่</th>
                                <th className="px-6 py-4">หมวดหมู่</th>
                                <th className="px-6 py-4">รายละเอียด</th>
                                <th className="px-6 py-4 text-right">จำนวนเงิน</th>
                                <th className="px-6 py-4 text-center">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan="5" className="text-center py-10 text-slate-400">กำลังโหลดข้อมูล...</td></tr>
                            ) : transactions.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-all">
                                    <td className="px-6 py-4 text-slate-600 text-sm">
                                        {new Date(item.transactionDate).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })}
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
            </div>
        </div>
    );
};

export default HistoryPage;