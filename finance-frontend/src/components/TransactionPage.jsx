import React, { useState, useEffect, useMemo } from 'react';
import { showSuccess, showError } from '../utils/swr';
import { formatTxnId } from '../utils/format';
import CategoryIcon from '../utils/categoryIcons';
import { Save, Loader2, ArrowUpCircle, ArrowDownCircle, Calendar } from 'lucide-react';

// คืนค่าวันที่รูปแบบ YYYY-MM-DD (โซนเวลาเครื่องผู้ใช้)
const toDateInput = (d) => {
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
};

export default function TransactionPage({ userId }) {
    const [categories, setCategories] = useState([]);
    const [selectedType, setSelectedType] = useState('EXPENSE'); // เลือกประเภทก่อน default = รายจ่าย
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(toDateInput(new Date()));

    const [fetching, setFetching] = useState(true);
    const [loading, setLoading] = useState(false);
    const [recent, setRecent] = useState([]);

    const today = toDateInput(new Date());
    const yesterday = toDateInput(new Date(Date.now() - 86400000));

    const fetchCategories = async () => {
        setFetching(true);
        try {
            const res = await fetch('/api/finance-app/categories/getCategoriesList', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            if (res.ok) setCategories(await res.json());
        } catch (e) {
            console.error('Fetch categories error:', e);
        } finally {
            setFetching(false);
        }
    };

    const fetchRecent = async () => {
        if (!userId) return;
        try {
            const res = await fetch('/api/finance-app/transactions/list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: String(userId) }),
            });
            if (res.ok) setRecent(await res.json());
        } catch (e) {
            console.error('Fetch recent error:', e);
        }
    };

    useEffect(() => {
        fetchCategories();
        fetchRecent();
    }, [userId]);

    // หมวดหมู่ที่แสดง = กรองตามประเภทที่เลือก
    const visibleCategories = useMemo(
        () => categories.filter((c) => c.type === selectedType),
        [categories, selectedType]
    );

    // รายการวันนี้ + ยอดรวม (net)
    const todayItems = useMemo(
        () => recent.filter((t) => toDateInput(new Date(t.transactionDate)) === today),
        [recent, today]
    );
    const todayNet = useMemo(
        () =>
            todayItems.reduce(
                (sum, t) => sum + (t.categoryType === 'INCOME' ? Number(t.amount) : -Number(t.amount)),
                0
            ),
        [todayItems]
    );

    const handleSelectType = (type) => {
        setSelectedType(type);
        setSelectedCategoryId(null); // ล้างหมวดที่เลือกเมื่อสลับประเภท
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const amountNum = parseFloat(amount);
        if (!amountNum || amountNum <= 0) {
            showError('จำนวนเงินไม่ถูกต้อง', 'กรุณากรอกจำนวนเงินมากกว่า 0');
            return;
        }
        if (!selectedCategoryId) {
            showError('ยังไม่ได้เลือกหมวดหมู่', 'กรุณาเลือกหมวดหมู่ก่อนบันทึก');
            return;
        }

        setLoading(true);

        // ประกอบ transactionDate: ใช้วันที่ที่เลือก + เวลาปัจจุบัน (LocalDateTime ไม่มี timezone)
        const time = new Date().toTimeString().slice(0, 8);
        const transactionDate = `${date}T${time}`;

        try {
            const res = await fetch('/api/finance-app/add/transaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    categoryId: selectedCategoryId,
                    amount: amountNum,
                    description,
                    transactionDate,
                }),
            });

            if (res.ok) {
                showSuccess('บันทึกเรียบร้อย!', 'รายการของคุณถูกบันทึกแล้ว');
                setAmount('');
                setDescription('');
                setSelectedCategoryId(null);
                fetchRecent();
            } else {
                showError('บันทึกไม่สำเร็จ', 'กรุณาตรวจสอบข้อมูลอีกครั้ง');
            }
        } catch (e) {
            console.error('Error:', e);
            showError('เชื่อมต่อไม่สำเร็จ', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
        } finally {
            setLoading(false);
        }
    };

    const isExpense = selectedType === 'EXPENSE';

    return (
        <div className="max-w-xl mx-auto space-y-5">
            <h1 className="text-2xl font-black text-slate-800">บันทึกรายรับรายจ่าย</h1>

            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* 1. เลือกประเภทก่อน */}
                    <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl">
                        <button
                            type="button"
                            onClick={() => handleSelectType('EXPENSE')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${isExpense ? 'bg-red-500 text-white shadow' : 'text-slate-500'
                                }`}
                        >
                            <ArrowDownCircle size={20} /> รายจ่าย
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSelectType('INCOME')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${!isExpense ? 'bg-green-500 text-white shadow' : 'text-slate-500'
                                }`}
                        >
                            <ArrowUpCircle size={20} /> รายรับ
                        </button>
                    </div>

                    {/* 2. หมวดหมู่ เป็นไอคอนกดเลือก (filter ตามประเภท) */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">หมวดหมู่</label>
                        {fetching ? (
                            <div className="text-center text-slate-400 py-6">กำลังโหลดหมวดหมู่...</div>
                        ) : (
                            <div className="grid grid-cols-4 gap-2">
                                {visibleCategories.map((cat) => {
                                    const active = selectedCategoryId === cat.id;
                                    return (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setSelectedCategoryId(cat.id)}
                                            className={`flex flex-col items-center justify-center gap-1.5 min-h-[82px] px-1 py-2 rounded-2xl border text-center transition-all ${active
                                                    ? 'border-indigo-500 border-2 bg-indigo-50 text-indigo-600'
                                                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                                }`}
                                        >
                                            <CategoryIcon name={cat.icon} size={24} strokeWidth={1.75} />
                                            <span className="text-[11px] font-medium leading-tight line-clamp-2 break-words w-full">
                                                {cat.name}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* 3. จำนวนเงิน (ใต้หมวดหมู่ มีกรอบชัดเจน) */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">จำนวนเงิน</label>
                        <div
                            className={`flex items-center gap-2 rounded-2xl border-2 px-4 py-3 bg-slate-50 transition-all focus-within:ring-2 ${isExpense
                                    ? 'border-red-200 focus-within:border-red-400 focus-within:ring-red-100'
                                    : 'border-green-200 focus-within:border-green-400 focus-within:ring-green-100'
                                }`}
                        >
                            <span className={`text-2xl font-black ${isExpense ? 'text-red-400' : 'text-green-400'}`}>฿</span>
                            <input
                                type="number"
                                inputMode="decimal"
                                step="0.01"
                                min="0"
                                required
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className={`flex-1 min-w-0 text-right text-3xl md:text-4xl font-black bg-transparent outline-none placeholder:text-slate-300 ${isExpense ? 'text-red-500' : 'text-green-500'
                                    }`}
                            />
                            <span className="text-sm text-slate-400 font-medium">บาท</span>
                        </div>
                    </div>

                    {/* 4. วันที่ */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">วันที่</label>
                        <div className="flex flex-wrap gap-2 items-center">
                            <button
                                type="button"
                                onClick={() => setDate(today)}
                                className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${date === today ? 'bg-indigo-50 text-indigo-600 border-indigo-300' : 'bg-white text-slate-500 border-slate-200'
                                    }`}
                            >
                                วันนี้
                            </button>
                            <button
                                type="button"
                                onClick={() => setDate(yesterday)}
                                className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${date === yesterday ? 'bg-indigo-50 text-indigo-600 border-indigo-300' : 'bg-white text-slate-500 border-slate-200'
                                    }`}
                            >
                                เมื่อวาน
                            </button>
                            <div className="relative flex items-center">
                                <Calendar size={16} className="absolute left-3 text-slate-400 pointer-events-none" />
                                <input
                                    type="date"
                                    max={today}
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="pl-9 pr-3 py-2 rounded-full text-sm bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 5. รายละเอียด (ไม่บังคับ) */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            รายละเอียด <span className="text-slate-400 font-normal">(ไม่ใส่ก็ได้)</span>
                        </label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="เช่น ข้าวเที่ยง, ค่ารถ..."
                            className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || fetching}
                        className={`w-full py-4 rounded-2xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${loading ? 'bg-slate-400' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'
                            }`}
                    >
                        {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                        {loading ? 'กำลังบันทึก...' : 'บันทึกรายการ'}
                    </button>
                </form>
            </div>

            {/* รายการล่าสุดวันนี้ */}
            <div className="px-1">
                <div className="flex justify-between items-baseline mb-2">
                    <span className="text-sm font-bold text-slate-600">รายการล่าสุดวันนี้</span> 
                </div>

                {todayItems.length === 0 ? (
                    <div className="text-center text-slate-400 text-sm py-6 bg-white rounded-2xl border border-dashed border-slate-200">
                        ยังไม่มีรายการวันนี้ — เริ่มบันทึกได้เลย
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
                        {todayItems.slice(0, 3).map((t) => (
                            <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                                <CategoryIcon name={t.categoryIcon} size={20} strokeWidth={1.75} className="shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-700 truncate">
                                        {t.description || t.categoryName}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        {t.categoryName} · <span className="font-mono">#{formatTxnId(t.id)}</span>
                                    </p>
                                </div>
                                <span
                                    className={`text-sm font-bold ${t.categoryType === 'INCOME' ? 'text-green-600' : 'text-red-500'
                                        }`}
                                >
                                    {t.categoryType === 'INCOME' ? '+' : '-'}
                                    {Number(t.amount).toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
