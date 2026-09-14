import React, { useState, useEffect, useRef } from 'react';
import { Save, Tag, DollarSign, Calendar, Percent, ListOrdered, CalendarDays, ChevronDown, ChevronUp } from 'lucide-react';
import { showSuccess, showError } from '../utils/swr';

export default function Installments({ userId }) {
    const [loading, setLoading] = useState(false);
    const [installmentsList, setInstallmentsList] = useState([]);
    const [fetching, setFetching] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const dateInputRef = useRef(null);

    const openDatePicker = () => {
        const el = dateInputRef.current;
        if (!el) return;
        if (typeof el.showPicker === 'function') {
            el.showPicker();
        } else {
            el.focus();
        }
    };

    const [formData, setFormData] = useState({
        installmentsName: '',
        description: '',
        totalAmount: '',
        interestRate: '',
        interestType: 'YEARLY',
        installmentMonths: '',
        startDate: new Date().toISOString().split('T')[0]
    });

    const [previewSchedule, setPreviewSchedule] = useState([]);
    const [previewMonthlyAmount, setPreviewMonthlyAmount] = useState(0);
    const [previewTotalInterest, setPreviewTotalInterest] = useState(0);
    const [previewTotalPayable, setPreviewTotalPayable] = useState(0);

    const fetchInstallments = async () => {
        setFetching(true);
        try {
            const response = await fetch('/api/finance-app/installments/list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
            if (response.ok) {
                const data = await response.json();
                setInstallmentsList(data);
            }
        } catch (error) {
            console.error("Fetch installments error: ", error);
        } finally {
            setFetching(false);
        }
    };

    useEffect(() => {
        if (userId) {
            fetchInstallments();
        }
    }, [userId]);

    // Calculate preview when form data changes
    useEffect(() => {
        calculatePreview();
    }, [formData.totalAmount, formData.interestRate, formData.interestType, formData.installmentMonths, formData.startDate]);

    const calculatePreview = () => {
        const total = parseFloat(formData.totalAmount);
        const rate = parseFloat(formData.interestRate || 0);
        const months = parseInt(formData.installmentMonths);
        const startDate = new Date(formData.startDate);

        if (!isNaN(total) && total > 0 && !isNaN(months) && months > 0) {
            // Flat rate calculation
            let totalInterest = 0;
            if (formData.interestType === 'YEARLY') {
                totalInterest = total * (rate / 100) * (months / 12);
            } else {
                totalInterest = total * (rate / 100) * months;
            }
            const totalPayable = total + totalInterest;
            const monthlyPayment = totalPayable / months;

            setPreviewTotalInterest(totalInterest);
            setPreviewTotalPayable(totalPayable);
            setPreviewMonthlyAmount(monthlyPayment);

            const schedule = [];
            let remaining = totalPayable;
            const principalPerMonth = total / months;
            const interestPerMonth = totalInterest / months;

            for (let i = 1; i <= months; i++) {
                const payDate = new Date(startDate);
                payDate.setMonth(payDate.getMonth() + i - 1);

                remaining -= monthlyPayment;
                // Avoid tiny negative values due to floating point math
                if (Math.abs(remaining) < 0.01) remaining = 0;

                schedule.push({
                    month: i,
                    date: payDate.toISOString().split('T')[0],
                    payment: monthlyPayment,
                    principal: principalPerMonth,
                    interest: interestPerMonth,
                    remaining: remaining
                });
            }
            setPreviewSchedule(schedule);
        } else {
            setPreviewSchedule([]);
            setPreviewMonthlyAmount(0);
            setPreviewTotalInterest(0);
            setPreviewTotalPayable(0);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (previewSchedule.length === 0) {
            showError('ข้อมูลไม่ถูกต้อง', 'กรุณากรอกยอดเงินและจำนวนงวดให้ถูกต้อง');
            return;
        }

        setLoading(true);

        const payload = {
            userId: userId,
            installmentsName: formData.installmentsName,
            description: formData.description,
            totalAmount: parseFloat(formData.totalAmount),
            interestRate: parseFloat(formData.interestRate || 0),
            interestType: formData.interestType,
            installmentMonths: parseInt(formData.installmentMonths),
            monthlyAmount: parseFloat(previewMonthlyAmount.toFixed(2)),
            startDate: formData.startDate
        };

        try {
            const response = await fetch('/api/finance-app/create/installments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                showSuccess('บันทึกเรียบร้อย!', 'สร้างตารางผ่อนชำระใหม่แล้ว');
                setFormData({
                    installmentsName: '',
                    description: '',
                    totalAmount: '',
                    interestRate: '',
                    interestType: 'YEARLY',
                    installmentMonths: '',
                    startDate: new Date().toISOString().split('T')[0]
                });
                fetchInstallments(); // Refresh list
            } else {
                const errorText = await response.text();
                showError('บันทึกไม่สำเร็จ', errorText || 'กรุณาตรวจสอบข้อมูลอีกครั้ง');
            }
        } catch (error) {
            console.error("Error:", error);
            showError('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('th-TH-u-ca-buddhist', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const calculateProgress = (item) => {
        const startDate = new Date(item.startDate);
        // Normalize today to start of day for accurate comparison
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const months = item.installmentMonths;
        let paid = 0;
        const schedule = [];
        let remainingBalance = item.monthlyAmount * item.installmentMonths;

        for (let i = 1; i <= months; i++) {
            const payDate = new Date(startDate);
            payDate.setMonth(payDate.getMonth() + i - 1);
            if (payDate <= today) {
                paid++;
            }

            remainingBalance -= item.monthlyAmount;
            if (Math.abs(remainingBalance) < 0.01) remainingBalance = 0;

            schedule.push({
                month: i,
                date: payDate.toISOString().split('T')[0],
                payment: item.monthlyAmount,
                remaining: remainingBalance
            });
        }

        return {
            paid,
            remaining: months - paid,
            total: months,
            schedule
        };
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <h1 className="text-2xl font-black text-slate-800">ตารางผ่อนชำระ</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* ฟอร์มกรอกข้อมูล */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-fit">
                    <h2 className="text-xl font-bold text-slate-700 mb-6 border-b pb-4">สร้างรายการผ่อนใหม่</h2>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                <Tag size={18} className="text-indigo-500" /> ชื่อรายการผ่อนชำระ
                            </label>
                            <input
                                type="text"
                                required
                                className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="เช่น ผ่อนโทรศัพท์, ผ่อนรถ"
                                value={formData.installmentsName}
                                onChange={(e) => setFormData({ ...formData, installmentsName: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                <DollarSign size={18} className="text-indigo-500" /> ยอดจัด / เงินต้น (บาท)
                            </label>
                            <input
                                type="number"
                                required
                                min="1"
                                className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-lg font-semibold"
                                placeholder="0.00"
                                value={formData.totalAmount}
                                onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <Percent size={18} className="text-indigo-500" /> อัตราดอกเบี้ย
                                    </span>
                                </label>
                                <div className="flex bg-slate-50 rounded-2xl focus-within:ring-2 focus-within:ring-indigo-500 overflow-hidden">
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="w-full p-4 bg-transparent border-none outline-none"
                                        placeholder="0.00"
                                        value={formData.interestRate}
                                        onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                                    />
                                    <select
                                        className="bg-slate-100 border-none outline-none text-sm font-bold text-slate-600 px-3 cursor-pointer"
                                        value={formData.interestType}
                                        onChange={(e) => setFormData({ ...formData, interestType: e.target.value })}
                                    >
                                        <option value="YEARLY">ต่อปี</option>
                                        <option value="MONTHLY">ต่อเดือน</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                    <ListOrdered size={18} className="text-indigo-500" /> จำนวนงวด (เดือน)
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="เช่น 10, 24, 36"
                                    value={formData.installmentMonths}
                                    onChange={(e) => setFormData({ ...formData, installmentMonths: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                <CalendarDays size={18} className="text-indigo-500" /> เริ่มชำระงวดแรก
                            </label>
                            <div
                                onClick={openDatePicker}
                                className="relative w-full p-4 bg-slate-50 rounded-2xl flex items-center justify-between cursor-pointer focus-within:ring-2 focus-within:ring-indigo-500"
                            >
                                <span className={formData.startDate ? 'text-slate-700' : 'text-slate-400'}>
                                    {formData.startDate ? formatDate(formData.startDate) : 'วว/ดด/ปปปป'}
                                </span>
                                <CalendarDays size={18} className="text-slate-400" />
                                <input
                                    ref={dateInputRef}
                                    type="date"
                                    required
                                    className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-0 pointer-events-none"
                                    tabIndex={-1}
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                <Calendar size={18} className="text-indigo-500" /> รายละเอียดเพิ่มเติม (ถ้ามี)
                            </label>
                            <textarea
                                className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                rows="2"
                                placeholder="บันทึกช่วยจำ..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        {/* สรุปข้อมูลเบื้องต้น */}
                        {previewSchedule.length > 0 && (
                            <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                                <h3 className="font-bold text-indigo-800 mb-4 text-center">สรุปการคำนวณเบื้องต้น</h3>
                                <div className="space-y-2 text-sm text-indigo-700">
                                    <div className="flex justify-between">
                                        <span>เงินต้น:</span>
                                        <span className="font-semibold">{formatCurrency(formData.totalAmount)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>ดอกเบี้ยรวม:</span>
                                        <span className="font-semibold">{formatCurrency(previewTotalInterest)}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-lg pt-2 border-t border-indigo-200">
                                        <span>ยอดผ่อนต่อเดือน:</span>
                                        <span>{formatCurrency(previewMonthlyAmount)}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || previewSchedule.length === 0}
                            className={`w-full py-4 rounded-2xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${loading || previewSchedule.length === 0 ? 'bg-slate-400' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'
                                }`}
                        >
                            <Save size={20} />
                            {loading ? 'กำลังบันทึก...' : 'บันทึกตารางผ่อนชำระ'}
                        </button>
                    </form>
                </div>

                {/* ตารางจำลอง & รายการที่มีอยู่ */}
                <div className="space-y-8">
                    {previewSchedule.length > 0 && (
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                            <h2 className="text-xl font-bold text-slate-700 mb-4">ตารางจำลองการผ่อนชำระ</h2>
                            <div className="overflow-x-auto h-[400px]">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 rounded-t-lg sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3 rounded-tl-lg">งวดที่</th>
                                            <th className="px-4 py-3">วันที่ชำระ</th>
                                            <th className="px-4 py-3">ค่างวด</th>
                                            <th className="px-4 py-3 rounded-tr-lg">ยอดคงเหลือ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {previewSchedule.map((row) => (
                                            <tr key={row.month} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 font-semibold text-slate-700">{row.month}</td>
                                                <td className="px-4 py-3 text-slate-600">{formatDate(row.date)}</td>
                                                <td className="px-4 py-3 font-semibold text-indigo-600">{formatCurrency(row.payment)}</td>
                                                <td className="px-4 py-3 text-slate-500">{formatCurrency(row.remaining)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                        <h2 className="text-xl font-bold text-slate-700 mb-4">รายการผ่อนชำระของคุณ</h2>

                        {fetching ? (
                            <div className="text-center text-slate-500 py-8">กำลังโหลดข้อมูล...</div>
                        ) : installmentsList.length === 0 ? (
                            <div className="text-center text-slate-400 py-8 border-2 border-dashed border-slate-100 rounded-2xl">
                                ยังไม่มีรายการผ่อนชำระ
                            </div>
                        ) : (
                            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                                {installmentsList.map((item) => {
                                    const progress = calculateProgress(item);
                                    const isExpanded = expandedId === item.installmentsId;

                                    return (
                                        <div key={item.installmentsId} className="border border-slate-100 rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
                                            <div
                                                className="p-4 cursor-pointer bg-white"
                                                onClick={() => setExpandedId(isExpanded ? null : item.installmentsId)}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                                            {item.installmentsName}
                                                            {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                                                        </h3>
                                                        <p className="text-xs text-slate-500">เริ่ม: {formatDate(item.startDate)}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-black text-indigo-600">{formatCurrency(item.monthlyAmount)}</div>
                                                        <div className="text-xs text-slate-500">ต่อเดือน ({item.installmentMonths} งวด)</div>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center text-sm text-slate-600 bg-slate-50 p-2 rounded-lg mt-3">
                                                    <span>ยอดจัด: <span className="font-semibold">{formatCurrency(item.totalAmount)}</span></span>
                                                    <span>ดบ.: <span className="font-semibold">{item.interestRate}% {item.interestType === 'MONTHLY' ? '(ต่อเดือน)' : '(ต่อปี)'}</span></span>
                                                </div>
                                            </div>

                                            {/* ส่วนขยายแสดงความคืบหน้า */}
                                            {isExpanded && (
                                                <div className="bg-slate-50 border-t border-slate-100">
                                                    <div className="p-4">
                                                        <h4 className="font-bold text-slate-700 mb-3 text-sm">ความคืบหน้าการผ่อนชำระ</h4>

                                                        {/* Progress Bar */}
                                                        <div className="w-full bg-slate-200 rounded-full h-2.5 mb-3">
                                                            <div
                                                                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                                                                style={{ width: `${(progress.paid / progress.total) * 100}%` }}
                                                            ></div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-4 text-center">
                                                            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                                                <div className="text-xs text-slate-500 mb-1">งวดที่ถึงกำหนดแล้ว</div>
                                                                <div className="font-black text-indigo-600 text-xl">{progress.paid} <span className="text-sm font-normal text-slate-500">งวด</span></div>
                                                            </div>
                                                            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                                                <div className="text-xs text-slate-500 mb-1">เหลืออีก</div>
                                                                <div className="font-black text-slate-700 text-xl">{progress.remaining} <span className="text-sm font-normal text-slate-500">งวด</span></div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* ตารางเต็ม */}
                                                    <div className="bg-white border-t border-slate-100 p-4">
                                                        <h4 className="font-bold text-slate-700 mb-3 text-sm">ตารางจำลองการผ่อนชำระ</h4>
                                                        <div className="overflow-y-auto max-h-[300px] border border-slate-100 rounded-xl">
                                                            <table className="w-full text-sm text-left">
                                                                <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 shadow-sm">
                                                                    <tr>
                                                                        <th className="px-4 py-3">งวดที่</th>
                                                                        <th className="px-4 py-3">วันที่ชำระ</th>
                                                                        <th className="px-4 py-3">ค่างวด</th>
                                                                        <th className="px-4 py-3">ยอดคงเหลือ</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100">
                                                                    {progress.schedule.map((row) => (
                                                                        <tr key={row.month} className="hover:bg-slate-50">
                                                                            <td className="px-4 py-3 font-semibold text-slate-700">{row.month}</td>
                                                                            <td className="px-4 py-3 text-slate-600">{formatDate(row.date)}</td>
                                                                            <td className="px-4 py-3 font-semibold text-indigo-600">{formatCurrency(row.payment)}</td>
                                                                            <td className="px-4 py-3 text-slate-500">{formatCurrency(row.remaining)}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
