import React, { useState, useEffect, useMemo } from 'react';
import { showConfirm } from '../utils/swr';
import { formatMoney, formatSigned, toDateInput, formatDayLabel, txnTone } from '../utils/format';
import { Loader2, ArrowRight, NotebookPen } from 'lucide-react';
import TxnForm from './TxnForm';
import TxnRow from './TxnRow';
import { Toast } from './ui/Toast';
import { useToast } from './ui/useToast';

// กัน HTML แตกเวลาเอาข้อความผู้ใช้ไปใส่ใน dialog ยืนยัน
const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// โฟกัสช่องยอดเงินอัตโนมัติเฉพาะเครื่องที่ใช้เมาส์ (จอสัมผัสคีย์บอร์ดจะเด้งบังหน้าทันที)
const canAutoFocus = typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;

export default function TransactionPage({ onNavigate }) {
    const [categories, setCategories] = useState([]);
    const [selectedType, setSelectedType] = useState('EXPENSE'); // เลือกประเภทก่อน default = รายจ่าย
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(toDateInput(new Date()));
    const [errors, setErrors] = useState({});

    const [fetching, setFetching] = useState(true);
    const [loading, setLoading] = useState(false);
    const [recent, setRecent] = useState([]);
    const [addedId, setAddedId] = useState(null);
    const [toast, showToast] = useToast();

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
        try {
            const res = await fetch('/api/finance-app/transactions/list', {
                method: 'POST',
            });
            if (res.ok) setRecent(await res.json());
        } catch (e) {
            console.error('Fetch recent error:', e);
        }
    };

    useEffect(() => {
        fetchCategories();
        fetchRecent();
    }, []);

    // รายการวันนี้ (ใหม่ → เก่า) + ยอดรวม (net)
    const todayItems = useMemo(
        () => recent
            .filter((t) => toDateInput(new Date(t.transactionDate)) === today)
            .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate)),
        [recent, today]
    );
    const todayNet = useMemo(
        () =>
            todayItems.reduce(
                // ฝากเงินออมหักออก / ถอนเงินออมบวกกลับ เหมือนสุทธิในหน้าประวัติ
                (sum, t) => sum + (txnTone(t.categoryType).sign === '+' ? Number(t.amount) : -Number(t.amount)),
                0
            ),
        [todayItems]
    );

    const isExpense = selectedType === 'EXPENSE';
    const amountNum = parseFloat(amount);

    const handleSelectType = (type) => {
        if (type === selectedType) return;
        setSelectedType(type);
        setSelectedCategoryId(null); // ล้างหมวดที่เลือกเมื่อสลับประเภท
    };

    const handleAmountChange = (v) => {
        setAmount(v);
        setErrors((e) => ({ ...e, amt: undefined }));
    };

    const handleCategoryChange = (id) => {
        setSelectedCategoryId(id);
        setErrors((e) => ({ ...e, cat: undefined }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;

        const nextErrors = {};
        if (!amountNum || amountNum <= 0) nextErrors.amt = 'กรอกจำนวนเงินมากกว่า 0';
        if (!selectedCategoryId) nextErrors.cat = 'เลือกหมวดหมู่ก่อนบันทึก';
        if (Object.keys(nextErrors).length) {
            setErrors(nextErrors);
            return;
        }

        // ยืนยันก่อนบันทึกทุกครั้ง
        const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
        const typeLabel = isExpense ? 'รายจ่าย' : 'รายรับ';
        const amountColor = isExpense ? '#C2412D' : '#0F7A55';
        const summaryHtml = `
            <div style="text-align:left; font-size:0.95rem; color:#334155; line-height:1.9;">
                <div><span style="color:#64748b;">ประเภท:</span> <b>${typeLabel}</b></div>
                <div><span style="color:#64748b;">หมวดหมู่:</span> <b>${escapeHtml(selectedCategory?.name ?? '-')}</b></div>
                <div><span style="color:#64748b;">จำนวนเงิน:</span> <b style="color:${amountColor};">${isExpense ? '−' : '+'}${formatMoney(amountNum)} บาท</b></div>
                <div><span style="color:#64748b;">วันที่:</span> <b>${formatDayLabel(date)}</b></div>
                ${description ? `<div><span style="color:#64748b;">รายละเอียด:</span> <b>${escapeHtml(description)}</b></div>` : ''}
            </div>
        `;
        const confirmResult = await showConfirm('ยืนยันการบันทึกรายการ?', '', summaryHtml, 'question');
        if (!confirmResult.isConfirmed) return;

        setLoading(true);

        // ประกอบ transactionDate: ใช้วันที่ที่เลือก + เวลาปัจจุบัน (LocalDateTime ไม่มี timezone)
        const time = new Date().toTimeString().slice(0, 8);
        const transactionDate = `${date}T${time}`;

        try {
            const res = await fetch('/api/finance-app/add/transaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    categoryId: selectedCategoryId,
                    amount: amountNum,
                    description,
                    transactionDate,
                }),
            });

            if (res.ok) {
                const saved = await res.json().catch(() => null);
                const when = date === today ? '' : ` · ${formatDayLabel(date)}`;
                showToast(`บันทึกแล้ว ${isExpense ? '−' : '+'}฿${formatMoney(amountNum)}${when}`);
                setAddedId(saved?.id ?? null);
                setAmount('');
                setDescription('');
                setSelectedCategoryId(null);
                fetchRecent();
            } else {
                showToast('บันทึกไม่สำเร็จ · กรุณาตรวจสอบข้อมูลอีกครั้ง', 'error');
            }
        } catch (e) {
            console.error('Error:', e);
            showToast('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ · ข้อมูลยังอยู่ครบ', 'error');
        } finally {
            setLoading(false);
        }
    };

    const saveLabel = loading
        ? 'กำลังบันทึก…'
        : `บันทึก${isExpense ? 'รายจ่าย' : 'รายรับ'}${amountNum > 0 ? ` · ${isExpense ? '−' : '+'}฿${formatMoney(amountNum)}` : ''}`;

    const goHistory = () => onNavigate && onNavigate('history');

    return (
        <div className="max-w-[928px] mx-auto flex flex-col gap-4 sm:gap-6">
            <div className="flex items-center justify-between gap-4">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-800">บันทึกรายการ</h1>
                <button onClick={goHistory} className="h-10 px-1 flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700">
                    ประวัติธุรกรรม <ArrowRight size={16} />
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-4 sm:gap-6 items-start">
                {/* ฟอร์ม */}
                <form
                    onSubmit={handleSubmit}
                    className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 flex flex-col gap-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                >
                    <TxnForm
                        type={selectedType}
                        onTypeChange={handleSelectType}
                        amount={amount}
                        onAmountChange={handleAmountChange}
                        categories={categories}
                        loadingCats={fetching}
                        categoryId={selectedCategoryId}
                        onCategoryChange={handleCategoryChange}
                        date={date}
                        onDateChange={setDate}
                        today={today}
                        yesterday={yesterday}
                        description={description}
                        onDescriptionChange={setDescription}
                        errors={errors}
                        autoFocusAmount={canAutoFocus}
                    />
                    {/* จอเล็กกว่า lg: ปุ่มบันทึกติดอยู่เหนือ BottomNav ไม่ต้องเลื่อนผ่านหมวดหมู่ลงมากด */}
                    <div className="sticky bottom-above-nav z-10 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 px-4 sm:px-6 py-3 rounded-b-2xl bg-white/95 backdrop-blur border-t border-slate-100 lg:static lg:m-0 lg:p-0 lg:bg-transparent lg:backdrop-blur-none lg:border-0 flex flex-col gap-2">
                        <button
                            type="submit"
                            disabled={loading || fetching}
                            className={`w-full h-[52px] rounded-xl text-white text-base font-semibold tabular-nums flex items-center justify-center gap-2 transition-colors duration-200 disabled:cursor-not-allowed ${loading ? 'opacity-85' : ''} ${isExpense ? 'bg-expense-600 hover:bg-expense-700' : 'bg-income-600 hover:bg-income-700'}`}
                        >
                            {loading && <Loader2 size={20} className="animate-spin" />}
                            {saveLabel}
                        </button>
                        <span className="pointer-coarse:hidden text-xs text-slate-500 text-center">
                            กด <span className="font-mono px-1.5 py-px border border-slate-200 rounded-md bg-slate-50">Enter</span> เพื่อบันทึก · ประเภทและวันที่จะคงไว้สำหรับรายการถัดไป
                        </span>
                    </div>
                </form>

                {/* รายการวันนี้ */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col gap-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                    <div className="flex items-baseline justify-between gap-3">
                        <div className="flex items-baseline gap-2">
                            <span className="text-base font-semibold text-slate-800">วันนี้</span>
                            {todayItems.length > 0 && <span className="text-[13px] text-slate-500">{todayItems.length} รายการ</span>}
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            {todayItems.length > 0 && <span className="text-xs text-slate-500">สุทธิ</span>}
                            <span className={`text-base font-bold tabular-nums ${todayNet < 0 ? 'text-expense-600' : todayNet > 0 ? 'text-income-600' : 'text-slate-500'}`}>
                                {formatSigned(todayNet, true)}
                            </span>
                        </div>
                    </div>

                    {todayItems.length === 0 ? (
                        <div className="flex flex-col items-center gap-1.5 py-6 px-4 rounded-2xl border-[1.5px] border-dashed border-slate-300 text-center">
                            <span className="w-11 h-11 mb-1 rounded-full bg-brand-50 flex items-center justify-center">
                                <NotebookPen size={22} className="text-brand-600" />
                            </span>
                            <span className="text-[15px] font-semibold text-slate-800">ยังไม่มีรายการวันนี้</span>
                            <span className="text-[13px] leading-[18px] text-slate-500">พิมพ์ยอดเงินแล้วเลือกหมวด รายการจะขึ้นที่นี่ทันที</span>
                        </div>
                    ) : (
                        <>
                            <div className="-mx-4 sm:-mx-5 border-y border-slate-100">
                                {todayItems.slice(0, 5).map((t, i) => (
                                    <TxnRow key={t.id} item={t} bordered={i > 0} animate={t.id === addedId} />
                                ))}
                            </div>
                            <button onClick={goHistory} className="self-start h-10 flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
                                ดูทั้งหมด <ArrowRight size={16} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            <Toast toast={toast} />
        </div>
    );
}
