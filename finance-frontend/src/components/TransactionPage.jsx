import React, { useState, useEffect } from 'react';
import { showAddCategoryModal } from '../utils/categorySwal';
import { showSuccess, showError } from '../utils/swr';
import { Save, DollarSign, FileText, Tag, ArrowUpCircle, ArrowDownCircle, Loader2, Plus } from 'lucide-react';

export default function TransactionPage({ userId }) {
    const [categories, setCategories] = useState([]); // สำหรับเก็บข้อมูลจาก API
    const [selectedType, setSelectedType] = useState(null); // สำหรับแสดงผล รายรับ/รายจ่าย
    const [fetching, setFetching] = useState(true); // สถานะการโหลดหมวดหมู่
    const [loading, setLoading] = useState(false); // สถานะการกดบันทึก

    const [formData, setFormData] = useState({
        categoryId: '',
        amount: '',
        description: ''
    });

    const fetchCategories = async () => {
        setFetching(true);
        try {
            const response = await fetch('/api/finance-app/categories/getCategoriesList', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            if (response.ok) {
                const data = await response.json();
                setCategories(data);
            }
        } catch (error) {
            console.error("Fetch categories error: ", error);
        } finally {
            setFetching(false);
        }
    }

    // 1. ดึงข้อมูล Categories จาก API ทันทีที่เข้าหน้า
    useEffect(() => {
        fetchCategories();
    }, []);

    // 2. จัดการเมื่อมีการเลือกหมวดหมู่ เพื่อแสดงผลประเภท (Type)
    const handleCategoryChange = (e) => {
        const catId = e.target.value;
        const selectedCat = categories.find(c => c.id === parseInt(catId));

        setFormData({ ...formData, categoryId: catId });
        setSelectedType(selectedCat ? selectedCat.type : null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const payload = {
            userId: userId,
            categoryId: parseInt(formData.categoryId),
            amount: parseFloat(formData.amount),
            description: formData.description
        };

        try {
            const response = await fetch('/api/finance-app/add/transaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                showSuccess('บันทึกเรียบร้อย!', 'ข้อมูลรายรับรายจ่ายของคุณถูกบันทึกแล้ว');
                setFormData({ categoryId: '', amount: '', description: '' });
                setSelectedType(null);
            } else {
                showError('บันทึกไม่สำเร็จ', 'กรุณาตรวจสอบข้อมูลอีกครั้ง');
            }
        } catch (error) {
            console.error("Error:", error);
            alert('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-black text-slate-800 mb-8">บันทึกรายรับรายจ่าย</h1>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* ส่วนแสดงประเภทรายการตามที่เลือกหมวดหมู่ */}
                    {selectedType && (
                        <div className={`flex items-center gap-2 p-4 rounded-2xl font-bold transition-all ${selectedType === 'INCOME' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                            }`}>
                            {selectedType === 'INCOME' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                            ประเภทรายการ: {selectedType === 'INCOME' ? 'รายรับ' : 'รายจ่าย'}
                        </div>
                    )}

                    {/* หมวดหมู่ (Dynamic จาก API) */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <Tag size={18} className="text-indigo-500" /> หมวดหมู่
                            </span>
                        </label>

                        <div className="flex gap-2"> {/* ใช้ flex เพื่อวางปุ่มต่อท้าย */}
                            <select
                                required
                                className="flex-1 p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={formData.categoryId}
                                onChange={handleCategoryChange}
                            >
                                <option value="">เลือกหมวดหมู่</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>

                            {/* ปุ่มเครื่องหมายบวก */}
                            <button
                                type="button"
                                onClick={() => showAddCategoryModal(fetchCategories)}
                                className="p-4 bg-indigo-100 text-indigo-600 rounded-2xl hover:bg-indigo-200 transition-colors"
                            >
                                <Plus size={24} />
                            </button>
                        </div>
                    </div>

                    {/* จำนวนเงิน */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                            <DollarSign size={18} className="text-indigo-500" /> จำนวนเงิน
                        </label>
                        <input
                            type="number"
                            required
                            className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-lg font-semibold"
                            placeholder="0.00"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        />
                    </div>



                    {/* รายละเอียด */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                            <FileText size={18} className="text-indigo-500" /> รายละเอียด
                        </label>
                        <textarea
                            className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            rows="3"
                            placeholder="ระบุรายละเอียดเพิ่มเติม..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || fetching}
                        className={`w-full py-4 rounded-2xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${loading ? 'bg-slate-400' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'
                            }`}
                    >
                        <Save size={20} />
                        {loading ? 'กำลังบันทึก...' : 'บันทึกรายการ'}
                    </button>
                </form>
            </div>
        </div>
    );
}