import React, { useState, useEffect, useRef } from 'react';
import { Save, Tag, DollarSign, Calendar, Percent, ListOrdered, CalendarDays, ChevronDown, ChevronUp, Check, Plus, X, Pencil, Trash2 } from 'lucide-react';
import { showSuccess, showError, showConfirm } from '../utils/swr';

export default function Installments({ userId }) {
    const [loading, setLoading] = useState(false);
    const [installmentsList, setInstallmentsList] = useState([]);
    const [fetching, setFetching] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [payingKey, setPayingKey] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null); // null = สร้างใหม่, มีค่า = กำลังแก้ไข
    const [deletingId, setDeletingId] = useState(null);
    const dateInputRef = useRef(null);

    const emptyForm = {
        installmentsName: '',
        description: '',
        totalAmount: '',
        interestRate: '',
        interestType: 'YEARLY',
        calculationMethod: 'FLAT',
        installmentMonths: '',
        startDate: new Date().toISOString().split('T')[0]
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingId(null);
    };

    const openCreateModal = () => {
        setEditingId(null);
        setFormData(emptyForm);
        setShowModal(true);
    };

    const openEditModal = (item) => {
        setEditingId(item.installmentsId);
        setFormData({
            installmentsName: item.installmentsName || '',
            description: item.description || '',
            totalAmount: item.totalAmount != null ? String(item.totalAmount) : '',
            interestRate: item.interestRate != null ? String(item.interestRate) : '',
            interestType: item.interestType || 'YEARLY',
            calculationMethod: item.calculationMethod || 'FLAT',
            installmentMonths: item.installmentMonths != null ? String(item.installmentMonths) : '',
            startDate: item.startDate
                ? new Date(item.startDate).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0]
        });
        setShowModal(true);
    };

    // ปิด modal ด้วยปุ่ม Escape
    useEffect(() => {
        if (!showModal) return;
        const onKey = (e) => { if (e.key === 'Escape') setShowModal(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [showModal]);

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
        calculationMethod: 'FLAT',
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
    }, [formData.totalAmount, formData.interestRate, formData.interestType, formData.calculationMethod, formData.installmentMonths, formData.startDate]);

    const calculatePreview = () => {
        const total = parseFloat(formData.totalAmount);
        const rate = parseFloat(formData.interestRate || 0);
        const months = parseInt(formData.installmentMonths);
        const startDate = new Date(formData.startDate);

        if (!isNaN(total) && total > 0 && !isNaN(months) && months > 0) {
            // อัตราดอกเบี้ยต่อเดือน (ทศนิยม) — YEARLY หารด้วย 12, MONTHLY ใช้ตามที่กรอก
            const monthlyRate = formData.interestType === 'YEARLY'
                ? (rate / 100) / 12
                : (rate / 100);

            let monthlyPayment;
            let totalPayable;

            if (formData.calculationMethod === 'EFFECTIVE') {
                // ลดต้นลดดอก: ผ่อนคงที่ด้วยสูตร Amortization (PMT)
                if (monthlyRate === 0) {
                    monthlyPayment = total / months;
                } else {
                    const pow = Math.pow(1 + monthlyRate, months);
                    monthlyPayment = (total * monthlyRate * pow) / (pow - 1);
                }
                totalPayable = monthlyPayment * months;
            } else {
                // ดอกเบี้ยคงที่ (Flat): ดอกเบี้ยคิดจากยอดเต็มทุกงวด
                const totalInterestFlat = total * monthlyRate * months;
                totalPayable = total + totalInterestFlat;
                monthlyPayment = totalPayable / months;
            }

            const totalInterest = totalPayable - total;

            setPreviewTotalInterest(totalInterest);
            setPreviewTotalPayable(totalPayable);
            setPreviewMonthlyAmount(monthlyPayment);

            // ตารางผ่อน — ยอดคงเหลือ = เงินต้นคงเหลือ (ลดตามการตัดต้นในแต่ละงวด)
            const schedule = [];
            let balance = total;

            for (let i = 1; i <= months; i++) {
                const payDate = new Date(startDate);
                payDate.setMonth(payDate.getMonth() + i - 1);

                let interest;
                let principal;
                if (formData.calculationMethod === 'EFFECTIVE') {
                    // ดอกเบี้ยงวดนี้คิดจากเงินต้นคงเหลือจริง
                    interest = balance * monthlyRate;
                    principal = monthlyPayment - interest;
                } else {
                    // Flat: เงินต้นและดอกเบี้ยเฉลี่ยเท่ากันทุกงวด
                    principal = total / months;
                    interest = totalInterest / months;
                }

                balance -= principal;
                // Avoid tiny negative values due to floating point math
                if (Math.abs(balance) < 0.01) balance = 0;

                schedule.push({
                    month: i,
                    date: payDate.toISOString().split('T')[0],
                    payment: monthlyPayment,
                    principal: principal,
                    interest: interest,
                    remaining: balance
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

        const isEditing = editingId != null;

        // ยืนยันก่อนบันทึกทุกครั้ง
        const methodLabel = formData.calculationMethod === 'EFFECTIVE' ? 'ลดต้นลดดอก' : 'คงที่';
        const summaryHtml = `
            <div style="text-align:left; font-size:0.95rem; color:#334155; line-height:1.9;">
                <div><span style="color:#94a3b8;">ชื่อรายการ:</span> <b>${formData.installmentsName || '-'}</b></div>
                <div><span style="color:#94a3b8;">ยอดจัด / เงินต้น:</span> <b>${formatCurrency(formData.totalAmount)}</b></div>
                <div><span style="color:#94a3b8;">ดอกเบี้ย:</span> <b>${parseFloat(formData.interestRate || 0)}% ${formData.interestType === 'MONTHLY' ? '(ต่อเดือน)' : '(ต่อปี)'} · ${methodLabel}</b></div>
                <div><span style="color:#94a3b8;">จำนวนงวด:</span> <b>${formData.installmentMonths} งวด</b></div>
                <div><span style="color:#94a3b8;">เริ่มชำระงวดแรก:</span> <b>${formatDate(formData.startDate)}</b></div>
                <div style="margin-top:0.4rem; padding-top:0.4rem; border-top:1px solid #e2e8f0;"><span style="color:#94a3b8;">ยอดผ่อนต่อเดือน:</span> <b style="color:#4F46E5;">${formatCurrency(previewMonthlyAmount)}</b></div>
            </div>
        `;
        const confirmResult = await showConfirm(
            isEditing ? 'ยืนยันการแก้ไขตารางผ่อน?' : 'ยืนยันการบันทึกตารางผ่อน?',
            isEditing ? 'ระบบจะคำนวณยอดผ่อนและตารางใหม่ (งวดที่จ่ายเกินช่วงใหม่จะถูกตัดออก)' : '',
            summaryHtml,
            'question'
        );
        if (!confirmResult.isConfirmed) return;

        setLoading(true);

        const payload = {
            userId: userId,
            installmentsName: formData.installmentsName,
            description: formData.description,
            totalAmount: parseFloat(formData.totalAmount),
            interestRate: parseFloat(formData.interestRate || 0),
            interestType: formData.interestType,
            calculationMethod: formData.calculationMethod,
            installmentMonths: parseInt(formData.installmentMonths),
            monthlyAmount: parseFloat(previewMonthlyAmount.toFixed(2)),
            startDate: formData.startDate
        };
        if (isEditing) {
            payload.installmentsId = editingId;
        }

        try {
            const response = await fetch(
                isEditing ? '/api/finance-app/installments/update' : '/api/finance-app/create/installments',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                }
            );

            if (response.ok) {
                showSuccess('บันทึกเรียบร้อย!', isEditing ? 'แก้ไขตารางผ่อนชำระแล้ว' : 'สร้างตารางผ่อนชำระใหม่แล้ว');
                setShowModal(false);
                setEditingId(null);
                setFormData(emptyForm);
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
        let due = 0;
        const schedule = [];

        // งวดที่ผู้ใช้ยืนยันว่าจ่ายแล้ว (เก็บเป็น "1,2,3" ในฐานข้อมูล)
        const paidSet = new Set(
            (item.paidPeriods || '')
                .split(',')
                .map((s) => parseInt(s.trim(), 10))
                .filter((n) => !isNaN(n))
        );

        // อัตราดอกเบี้ยต่อเดือน (ทศนิยม) — YEARLY หารด้วย 12, MONTHLY ใช้ตามที่เก็บไว้
        const rate = parseFloat(item.interestRate || 0);
        const monthlyRate = item.interestType === 'YEARLY'
            ? (rate / 100) / 12
            : (rate / 100);

        // ยอดคงเหลือ = เงินต้นคงเหลือ ลดตามการตัดต้นในแต่ละงวด
        let balance = item.totalAmount;

        for (let i = 1; i <= months; i++) {
            const payDate = new Date(startDate);
            payDate.setMonth(payDate.getMonth() + i - 1);
            const isDue = payDate <= today;
            if (isDue) {
                due++;
            }

            let principal;
            if (item.calculationMethod === 'EFFECTIVE') {
                // ลดต้นลดดอก: ดอกเบี้ยงวดนี้คิดจากเงินต้นคงเหลือจริง
                const interest = balance * monthlyRate;
                principal = item.monthlyAmount - interest;
            } else {
                // Flat: ตัดต้นเท่ากันทุกงวด
                principal = item.totalAmount / months;
            }

            balance -= principal;
            if (Math.abs(balance) < 0.01) balance = 0;

            schedule.push({
                month: i,
                date: payDate.toISOString().split('T')[0],
                payment: item.monthlyAmount,
                remaining: balance,
                isDue,
                paid: paidSet.has(i)
            });
        }

        const paidCount = paidSet.size;

        return {
            due,
            paidCount,
            remaining: months - paidCount,
            total: months,
            schedule
        };
    };

    const handlePayPeriod = async (item, row) => {
        const markingPaid = !row.paid;

        const actionLabel = markingPaid ? 'ยืนยันว่าจ่ายงวดนี้แล้ว?' : 'ยกเลิกสถานะจ่ายงวดนี้?';
        const detailHtml = `
            <div style="text-align:left; font-size:0.95rem; color:#334155; line-height:1.9;">
                <div><span style="color:#94a3b8;">รายการ:</span> <b>${item.installmentsName}</b></div>
                <div><span style="color:#94a3b8;">งวดที่:</span> <b>${row.month} / ${item.installmentMonths}</b></div>
                <div><span style="color:#94a3b8;">กำหนดชำระ:</span> <b>${formatDate(row.date)}</b></div>
                <div><span style="color:#94a3b8;">ค่างวด:</span> <b style="color:#4F46E5;">${formatCurrency(row.payment)}</b></div>
            </div>
        `;
        const confirmResult = await showConfirm(actionLabel, '', detailHtml, 'question');
        if (!confirmResult.isConfirmed) return;

        const key = `${item.installmentsId}-${row.month}`;
        setPayingKey(key);
        try {
            const response = await fetch('/api/finance-app/installments/pay-period', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    installmentsId: item.installmentsId,
                    userId,
                    period: row.month,
                    paid: markingPaid
                })
            });

            if (response.ok) {
                showSuccess('บันทึกแล้ว!', markingPaid ? `บันทึกการจ่ายงวดที่ ${row.month} เรียบร้อย` : `ยกเลิกสถานะจ่ายงวดที่ ${row.month} แล้ว`);
                await fetchInstallments();
            } else {
                const errorText = await response.text();
                showError('บันทึกไม่สำเร็จ', errorText || 'กรุณาลองใหม่อีกครั้ง');
            }
        } catch (error) {
            console.error('Pay period error:', error);
            showError('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
        } finally {
            setPayingKey(null);
        }
    };

    const handleDelete = async (item) => {
        const paidCount = (item.paidPeriods || '')
            .split(',')
            .map((s) => parseInt(s.trim(), 10))
            .filter((n) => !isNaN(n)).length;

        const detailHtml = `
            <div style="text-align:left; font-size:0.95rem; color:#334155; line-height:1.9;">
                <div><span style="color:#94a3b8;">รายการ:</span> <b>${item.installmentsName}</b></div>
                <div><span style="color:#94a3b8;">ยอดจัด:</span> <b>${formatCurrency(item.totalAmount)}</b></div>
                <div><span style="color:#94a3b8;">จำนวนงวด:</span> <b>${item.installmentMonths} งวด (จ่ายแล้ว ${paidCount})</b></div>
            </div>
        `;
        const confirmResult = await showConfirm('ยืนยันการลบรายการผ่อน?', 'รายการจะถูกซ่อนออกจากรายการของคุณ', detailHtml, 'warning');
        if (!confirmResult.isConfirmed) return;

        setDeletingId(item.installmentsId);
        try {
            const response = await fetch('/api/finance-app/installments/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ installmentsId: item.installmentsId, userId })
            });

            if (response.ok) {
                showSuccess('ลบเรียบร้อย!', 'ลบรายการผ่อนชำระแล้ว');
                if (expandedId === item.installmentsId) setExpandedId(null);
                await fetchInstallments();
            } else {
                const errorText = await response.text();
                showError('ลบไม่สำเร็จ', errorText || 'กรุณาลองใหม่อีกครั้ง');
            }
        } catch (error) {
            console.error('Delete installment error:', error);
            showError('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <h1 className="text-2xl font-black text-slate-800">ตารางผ่อนชำระ</h1>

            {/* Modal: สร้างรายการผ่อนใหม่ */}
            {showModal && (
                <div
                    className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-start md:items-center justify-center p-4 overflow-y-auto"
                    onClick={closeModal}
                >
                    <div
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl my-4 max-h-[92vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-6 md:px-8 py-5 border-b border-slate-100 sticky top-0 bg-white z-10 rounded-t-3xl">
                            <h2 className="text-xl font-bold text-slate-700">{editingId != null ? 'แก้ไขรายการผ่อน' : 'สร้างรายการผ่อนใหม่'}</h2>
                            <button
                                type="button"
                                onClick={closeModal}
                                className="p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                aria-label="ปิด"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6 md:p-8">
                            {/* ฟอร์มกรอกข้อมูล */}
                            <div>
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
                                <Percent size={18} className="text-indigo-500" /> วิธีคิดดอกเบี้ย
                            </label>
                            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1.5 rounded-2xl">
                                {[
                                    { value: 'FLAT', label: 'คงที่', sub: 'Flat Rate' },
                                    { value: 'EFFECTIVE', label: 'ลดต้นลดดอก', sub: 'Effective Rate' },
                                ].map((opt) => {
                                    const active = formData.calculationMethod === opt.value;
                                    return (
                                        <button
                                            type="button"
                                            key={opt.value}
                                            onClick={() => setFormData({ ...formData, calculationMethod: opt.value })}
                                            className={`py-2.5 px-3 rounded-xl text-center transition-all ${active
                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                : 'text-slate-600 hover:bg-slate-100'
                                                }`}
                                        >
                                            <span className="block font-bold text-sm">{opt.label}</span>
                                            <span className={`block text-[11px] ${active ? 'text-indigo-100' : 'text-slate-400'}`}>{opt.sub}</span>
                                        </button>
                                    );
                                })}
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
                                        <span>วิธีคิด:</span>
                                        <span className="font-semibold">{formData.calculationMethod === 'EFFECTIVE' ? 'ลดต้นลดดอก (Effective)' : 'คงที่ (Flat)'}</span>
                                    </div>
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
                            {loading ? 'กำลังบันทึก...' : (editingId != null ? 'บันทึกการแก้ไข' : 'บันทึกตารางผ่อนชำระ')}
                        </button>
                                </form>
                            </div>

                            {/* ตารางจำลองการผ่อนชำระ (ในโมดัล) */}
                            <div>
                                {previewSchedule.length > 0 ? (
                                    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 h-full">
                                        <h3 className="text-lg font-bold text-slate-700 mb-4">ตารางจำลองการผ่อนชำระ</h3>
                                        <div className="overflow-x-auto max-h-[440px] overflow-y-auto">
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
                                ) : (
                                    <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl p-6">
                                        <ListOrdered size={28} className="mb-2 text-slate-300" />
                                        กรอกยอดเงินและจำนวนงวด<br />เพื่อดูตารางจำลอง
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* รายการผ่อนชำระของคุณ — เต็มความกว้าง */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h2 className="text-xl font-bold text-slate-700">รายการผ่อนชำระของคุณ</h2>
                    <button
                        type="button"
                        onClick={openCreateModal}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
                    >
                        <Plus size={18} /> เพิ่มรายการผ่อนใหม่
                    </button>
                </div>

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
                                                    <div className="flex items-start gap-3">
                                                        <div className="text-right">
                                                            <div className="font-black text-indigo-600">{formatCurrency(item.monthlyAmount)}</div>
                                                            <div className="text-xs text-slate-500">ต่อเดือน ({item.installmentMonths} งวด)</div>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => { e.stopPropagation(); openEditModal(item); }}
                                                                title="แก้ไขรายการ"
                                                                className="p-2 rounded-xl text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                                            >
                                                                <Pencil size={16} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={deletingId === item.installmentsId}
                                                                onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                                                                title="ลบรายการ"
                                                                className="p-2 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center text-sm text-slate-600 bg-slate-50 p-2 rounded-lg mt-3">
                                                    <span>ยอดจัด: <span className="font-semibold">{formatCurrency(item.totalAmount)}</span></span>
                                                    <span className="flex items-center gap-2">
                                                        <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 text-[11px] font-bold">
                                                            {item.calculationMethod === 'EFFECTIVE' ? 'ลดต้นลดดอก' : 'คงที่'}
                                                        </span>
                                                        <span>ดอกเบี้ย: <span className="font-semibold">{item.interestRate}% {item.interestType === 'MONTHLY' ? '(ต่อเดือน)' : '(ต่อปี)'}</span></span>
                                                    </span>
                                                </div>
                                            </div>

                                            {/* ส่วนขยายแสดงความคืบหน้า */}
                                            {isExpanded && (
                                                <div className="bg-slate-50 border-t border-slate-100">
                                                    <div className="p-4">
                                                        <h4 className="font-bold text-slate-700 mb-3 text-sm">ความคืบหน้าการผ่อนชำระ</h4>

                                                        {/* Progress Bar — อิงจากงวดที่จ่ายจริง */}
                                                        <div className="w-full bg-slate-200 rounded-full h-2.5 mb-3">
                                                            <div
                                                                className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                                                                style={{ width: `${(progress.paidCount / progress.total) * 100}%` }}
                                                            ></div>
                                                        </div>

                                                        <div className="grid grid-cols-3 gap-3 text-center">
                                                            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                                                <div className="text-xs text-slate-500 mb-1">ถึงกำหนดแล้ว</div>
                                                                <div className="font-black text-indigo-600 text-xl">{progress.due} <span className="text-sm font-normal text-slate-500">งวด</span></div>
                                                            </div>
                                                            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                                                <div className="text-xs text-slate-500 mb-1">จ่ายแล้ว</div>
                                                                <div className="font-black text-emerald-600 text-xl">{progress.paidCount} <span className="text-sm font-normal text-slate-500">งวด</span></div>
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
                                                                        <th className="px-4 py-3 text-center">สถานะ</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100">
                                                                    {progress.schedule.map((row) => {
                                                                        const rowKey = `${item.installmentsId}-${row.month}`;
                                                                        const isProcessing = payingKey === rowKey;
                                                                        // งวดที่ยังไม่ถึงกำหนด และยังไม่จ่าย → ปิดปุ่มเป็นสีเทา
                                                                        const locked = !row.isDue && !row.paid;
                                                                        return (
                                                                            <tr key={row.month} className={`hover:bg-slate-50 ${row.paid ? 'bg-emerald-50/60' : ''}`}>
                                                                                <td className="px-4 py-3 font-semibold text-slate-700">{row.month}</td>
                                                                                <td className="px-4 py-3 text-slate-600">{formatDate(row.date)}</td>
                                                                                <td className="px-4 py-3 font-semibold text-indigo-600">{formatCurrency(row.payment)}</td>
                                                                                <td className="px-4 py-3 text-slate-500">{formatCurrency(row.remaining)}</td>
                                                                                <td className="px-4 py-3 text-center">
                                                                                    {row.paid ? (
                                                                                        <button
                                                                                            type="button"
                                                                                            disabled={isProcessing}
                                                                                            onClick={() => handlePayPeriod(item, row)}
                                                                                            title="คลิกเพื่อยกเลิกสถานะจ่าย"
                                                                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors disabled:opacity-50"
                                                                                        >
                                                                                            <Check size={14} /> จ่ายแล้ว
                                                                                        </button>
                                                                                    ) : locked ? (
                                                                                        <button
                                                                                            type="button"
                                                                                            disabled
                                                                                            title="ยังไม่ถึงกำหนดชำระ"
                                                                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-400 cursor-not-allowed"
                                                                                        >
                                                                                            ยังไม่ถึงกำหนด
                                                                                        </button>
                                                                                    ) : (
                                                                                        <button
                                                                                            type="button"
                                                                                            disabled={isProcessing}
                                                                                            onClick={() => handlePayPeriod(item, row)}
                                                                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                                                                        >
                                                                                            {isProcessing ? 'กำลังบันทึก...' : 'จ่ายไปแล้ว'}
                                                                                        </button>
                                                                                    )}
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })}
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
    );
}
