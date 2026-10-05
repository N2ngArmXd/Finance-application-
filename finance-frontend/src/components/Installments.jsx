import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Plus, AlertCircle, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Check, Lock, Pencil, PencilOff, Trash2,
    CalendarRange, CircleCheckBig, Wallet, RotateCcw, CalendarCheck, Receipt, TriangleAlert,
} from 'lucide-react';
import { formatMoney, formatShortDate } from '../utils/format';
import {
    parsePaidPeriods, isInstallmentCompleted, calculateProgress, calculateOverallSummary, emptyInstallmentForm,
} from '../utils/installmentMath';
import InstallmentCard from './installments/InstallmentCard';
import InstallmentForm from './installments/InstallmentForm';
import ConfirmDialog from './ui/ConfirmDialog';
import { Toast } from './ui/Toast';
import { useToast } from './ui/useToast';

const PAGE_SIZE = 10;

const money = (n) => `฿${formatMoney(n)}`;
const methodLabel = (m) => (m === 'EFFECTIVE' ? 'ลดต้นลดดอก' : 'คงที่');
const rateText = (it) => `${parseFloat(it.interestRate || 0)}% ${it.interestType === 'MONTHLY' ? 'ต่อเดือน' : 'ต่อปี'}`;
// ข้อความ error สำหรับ toast (fetch ล้ม = เชื่อมต่อ server ไม่ได้)
const toErrorText = (error) =>
    (!error?.message || error instanceof TypeError) ? 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้' : error.message;
const currentMonthLabel = () => new Date().toLocaleDateString('th-TH-u-ca-buddhist', { month: 'long', year: 'numeric' });

// ข้อความ/ตารางสรุปของ dialog ยืนยันแต่ละแบบ
const dialogProps = (d) => {
    if (!d) return {};
    const it = d.item;
    if (d.kind === 'pay' || d.kind === 'undo') {
        const rows = [
            { k: 'รายการ', v: it.installmentsName },
            { k: 'งวดที่', v: `${d.row.month} / ${it.installmentMonths}` },
            { k: 'กำหนดชำระ', v: formatShortDate(d.row.date) },
            { k: 'ค่างวด', v: money(d.row.payment), tone: 'brand' },
        ];
        return d.kind === 'pay'
            ? { tone: 'brand', icon: Wallet, title: 'ยืนยันว่าจ่ายงวดนี้แล้ว?', rows, note: 'จะเพิ่มรายจ่ายในประวัติธุรกรรม ลงวันที่วันนี้', noteIcon: Receipt, confirmLabel: 'จ่ายงวดนี้', busyLabel: 'กำลังบันทึก…' }
            : { tone: 'brand', icon: RotateCcw, title: 'ยกเลิกสถานะจ่ายงวดนี้?', rows, note: 'จะลบรายจ่ายของงวดนี้ออกจากประวัติธุรกรรม', noteIcon: TriangleAlert, noteTone: 'warn', confirmLabel: 'ยกเลิกการจ่าย', cancelLabel: 'กลับ', busyLabel: 'กำลังบันทึก…' };
    }
    if (d.kind === 'close') {
        const paid = parsePaidPeriods(it).size;
        const left = Math.max((it.installmentMonths || 0) - paid, 0);
        return {
            tone: 'danger', icon: Lock, title: 'ยืนยันการปิดยอด?', text: 'รายการจะย้ายไป "ผ่อนเสร็จแล้ว" และแก้ไขไม่ได้อีก',
            rows: [
                { k: 'รายการ', v: it.installmentsName },
                { k: 'จ่ายแล้ว', v: `${paid} / ${it.installmentMonths} งวด` },
                { k: 'ค่างวดคงเหลือ', v: `${money(it.monthlyAmount * left)} (${left} งวด)`, tone: 'expense' },
            ],
            confirmLabel: 'ปิดยอด', busyLabel: 'กำลังปิดยอด…',
        };
    }
    if (d.kind === 'delete') {
        return {
            tone: 'danger', icon: Trash2, title: 'ยืนยันการลบรายการผ่อน?', text: 'รายการจะถูกซ่อนออกจากรายการของคุณ',
            rows: [
                { k: 'รายการ', v: it.installmentsName },
                { k: 'ยอดจัด', v: money(it.totalAmount) },
                { k: 'จำนวนงวด', v: `${it.installmentMonths} งวด (จ่ายแล้ว ${parsePaidPeriods(it).size})` },
            ],
            confirmLabel: 'ลบ', busyLabel: 'กำลังลบ…',
        };
    }
    // save
    const p = d.payload;
    return {
        tone: 'brand', icon: CalendarCheck,
        title: d.editing ? 'ยืนยันการแก้ไขตารางผ่อน?' : 'ยืนยันการบันทึกตารางผ่อน?',
        text: d.editing ? 'ระบบจะคำนวณยอดผ่อนและตารางใหม่ (งวดที่จ่ายเกินช่วงใหม่จะถูกตัดออก)' : '',
        rows: [
            { k: 'ชื่อรายการ', v: p.installmentsName || '-' },
            { k: 'ยอดจัด / เงินต้น', v: money(p.totalAmount) },
            { k: 'ดอกเบี้ย', v: `${rateText(p)} · ${methodLabel(p.calculationMethod)}` },
            { k: 'จำนวนงวด', v: `${p.installmentMonths} งวด` },
            { k: 'เริ่มชำระงวดแรก', v: formatShortDate(p.startDate) },
            { k: 'ยอดผ่อนต่อเดือน', v: money(p.monthlyAmount), tone: 'brand' },
        ],
        confirmLabel: 'บันทึก', busyLabel: 'กำลังบันทึก…',
    };
};

export default function Installments({ focusId, onFocusHandled }) {
    const [installmentsList, setInstallmentsList] = useState([]);
    const [fetching, setFetching] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [highlightId, setHighlightId] = useState(null); // การ์ดที่เปิดมาจาก Dashboard
    const [payingKey, setPayingKey] = useState(null);     // `${installmentsId}-${period}`
    const [currentPage, setCurrentPage] = useState(1);
    const [showCompleted, setShowCompleted] = useState(false);

    // ฟอร์มสร้าง/แก้ไข: null = ปิด · { mode, id, initial }
    const [form, setForm] = useState(null);
    // dialog ยืนยัน: { kind: 'pay'|'undo'|'close'|'delete'|'save', item?, row?, payload?, editing? }
    const [dialog, setDialog] = useState(null);
    const [dialogBusy, setDialogBusy] = useState(false);
    const [toast, showToast] = useToast();

    const fetchInstallments = useCallback(async () => {
        setFetching(true);
        try {
            const response = await fetch('/api/finance-app/installments/list', {
                method: 'POST',
            });
            if (response.ok) {
                setInstallmentsList(await response.json());
            }
        } catch (error) {
            console.error("Fetch installments error: ", error);
        } finally {
            setFetching(false);
        }
    }, []);

    useEffect(() => {
        fetchInstallments();
    }, [fetchInstallments]);

    // แยกรายการที่ผ่อนเสร็จแล้วออกจากรายการที่ยังผ่อนอยู่
    const activeInstallments = useMemo(() => installmentsList.filter((item) => !isInstallmentCompleted(item)), [installmentsList]);
    const completedInstallments = useMemo(() => installmentsList.filter(isInstallmentCompleted), [installmentsList]);
    const summary = useMemo(() => calculateOverallSummary(activeInstallments), [activeInstallments]);

    // แบ่งหน้ารายการผ่อน (เฉพาะที่ยังผ่อนอยู่) — clamp หน้าให้อยู่ในช่วงที่ถูกต้องเสมอ
    const totalPages = Math.max(1, Math.ceil(activeInstallments.length / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const pagedInstallments = activeInstallments.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const scrollToCard = (id) => {
        requestAnimationFrame(() => {
            document.getElementById(`installment-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    };

    // เปิดรายการที่ถูกส่งมาจากหน้าอื่น (เช่น กดจาก dashboard) — ไปหน้าที่มีรายการนั้น ไฮไลต์ แล้วเลื่อนไปหา (ไม่กางให้ ผู้ใช้กดเอง)
    useEffect(() => {
        if (fetching || focusId == null) return;
        const target = installmentsList.find((item) => item.installmentsId === focusId);
        if (target) {
            if (isInstallmentCompleted(target)) {
                setShowCompleted(true);
            } else {
                const index = activeInstallments.findIndex((item) => item.installmentsId === focusId);
                setCurrentPage(Math.floor(index / PAGE_SIZE) + 1);
            }
            setHighlightId(focusId);
            scrollToCard(focusId);
        }
        onFocusHandled?.();
    }, [fetching, focusId]);

    const toggleCard = (id) => {
        setHighlightId(null);
        setExpandedId((cur) => (cur === id ? null : id));
    };

    // ปุ่ม "ดูรายการ" ในกล่องค้างชำระ → กางการ์ดใบแรกที่มีงวดค้าง
    const goOverdue = () => {
        const index = activeInstallments.findIndex((it) => calculateProgress(it).overdueRows.length > 0);
        if (index < 0) return;
        const id = activeInstallments[index].installmentsId;
        setCurrentPage(Math.floor(index / PAGE_SIZE) + 1);
        setHighlightId(null);
        setExpandedId(id);
        scrollToCard(id);
    };

    const openCreate = () => setForm({ mode: 'create', id: null, initial: emptyInstallmentForm() });
    const openEdit = (item) => setForm({
        mode: 'edit',
        id: item.installmentsId,
        initial: {
            installmentsName: item.installmentsName || '',
            description: item.description || '',
            totalAmount: item.totalAmount != null ? String(item.totalAmount) : '',
            interestRate: item.interestRate != null ? String(item.interestRate) : '',
            interestType: item.interestType || 'YEARLY',
            calculationMethod: item.calculationMethod || 'FLAT',
            installmentMonths: item.installmentMonths != null ? String(item.installmentMonths) : '',
            startDate: item.startDate
                ? new Date(item.startDate).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0],
        },
    });
    const closeForm = useCallback(() => setForm(null), []);

    // ฟอร์มกดบันทึก → dialog ยืนยัน
    const handleFormSubmit = (values, preview) => {
        const payload = {
            installmentsName: values.installmentsName,
            description: values.description,
            totalAmount: parseFloat(values.totalAmount),
            interestRate: parseFloat(values.interestRate || 0),
            interestType: values.interestType,
            calculationMethod: values.calculationMethod,
            installmentMonths: parseInt(values.installmentMonths),
            monthlyAmount: parseFloat(preview.monthlyPayment.toFixed(2)),
            startDate: values.startDate,
        };
        if (form.mode === 'edit') payload.installmentsId = form.id;
        setDialog({ kind: 'save', payload, editing: form.mode === 'edit' });
    };

    const errorText = async (response, fallback) => (await response.text().catch(() => '')) || fallback;

    const runSave = async (d) => {
        const response = await fetch(
            d.editing ? '/api/finance-app/installments/update' : '/api/finance-app/create/installments',
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d.payload) }
        );
        if (!response.ok) throw new Error(await errorText(response, 'บันทึกไม่สำเร็จ · กรุณาตรวจสอบข้อมูลอีกครั้ง'));
        setForm(null);
        showToast(d.editing ? 'แก้ไขตารางผ่อนชำระแล้ว' : 'สร้างตารางผ่อนชำระใหม่แล้ว');
    };

    const runClose = async (item) => {
        const response = await fetch('/api/finance-app/installments/close', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ installmentsId: item.installmentsId })
        });
        if (!response.ok) throw new Error(await errorText(response, 'ปิดยอดไม่สำเร็จ · กรุณาลองใหม่อีกครั้ง'));
        if (expandedId === item.installmentsId) setExpandedId(null);
        // รายการที่ปิดยอดจะย้ายไปตาราง "ผ่อนเสร็จแล้ว" — เปิดตารางให้เห็นทันที
        setShowCompleted(true);
        showToast(`ปิดยอด "${item.installmentsName}" แล้ว`);
    };

    const runDelete = async (item) => {
        const response = await fetch('/api/finance-app/installments/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ installmentsId: item.installmentsId })
        });
        if (!response.ok) throw new Error(await errorText(response, 'ลบไม่สำเร็จ · กรุณาลองใหม่อีกครั้ง'));
        if (expandedId === item.installmentsId) setExpandedId(null);
        showToast('ลบรายการผ่อนชำระแล้ว');
    };

    // จ่าย / ยกเลิกจ่าย: ปิด dialog แล้วแสดง loading ในแถวนั้น
    const runPay = async (d) => {
        const markingPaid = d.kind === 'pay';
        setDialog(null);
        setPayingKey(`${d.item.installmentsId}-${d.row.month}`);
        try {
            const response = await fetch('/api/finance-app/installments/pay-period', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    installmentsId: d.item.installmentsId,
                    period: d.row.month,
                    paid: markingPaid
                })
            });
            if (!response.ok) throw new Error(await errorText(response, 'บันทึกไม่สำเร็จ · กรุณาลองใหม่อีกครั้ง'));
            showToast(markingPaid
                ? `บันทึกการจ่ายงวดที่ ${d.row.month} และเพิ่มรายจ่ายในประวัติธุรกรรมแล้ว`
                : `ยกเลิกการจ่ายงวดที่ ${d.row.month} และลบรายจ่ายของงวดนี้แล้ว`);
            await fetchInstallments();
        } catch (error) {
            console.error('Pay period error:', error);
            showToast(toErrorText(error), 'error');
        } finally {
            setPayingKey(null);
        }
    };

    const confirmDialog = async () => {
        const d = dialog;
        if (!d) return;
        if (d.kind === 'pay' || d.kind === 'undo') {
            runPay(d);
            return;
        }
        setDialogBusy(true);
        try {
            if (d.kind === 'save') await runSave(d);
            else if (d.kind === 'close') await runClose(d.item);
            else if (d.kind === 'delete') await runDelete(d.item);
            setDialog(null);
            await fetchInstallments();
        } catch (error) {
            console.error(`${d.kind} installment error:`, error);
            setDialog(null);
            showToast(toErrorText(error), 'error');
        } finally {
            setDialogBusy(false);
        }
    };

    const cancelDialog = useCallback(() => setDialog(null), []);
    const dlg = dialogProps(dialog);
    const hasOverdue = summary.overdueDue > 0;
    const paidPercent = summary.totalPayable > 0 ? (summary.totalPaid / summary.totalPayable) * 100 : 0;

    return (
        <div className="max-w-[928px] mx-auto flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4 mb-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-800">ตารางผ่อนชำระ</h1>
                <button
                    type="button"
                    onClick={openCreate}
                    className="shrink-0 h-11 pl-3.5 pr-[18px] rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-[15px] font-semibold flex items-center gap-2"
                >
                    <Plus size={18} /> เพิ่ม<span className="hidden sm:inline">รายการผ่อน</span>
                </button>
            </div>

            {fetching && installmentsList.length === 0 ? (
                <LoadingSkeleton />
            ) : installmentsList.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl px-6 py-10 flex flex-col items-center gap-2 text-center">
                    <span className="w-14 h-14 mb-1 rounded-full bg-brand-50 flex items-center justify-center">
                        <CalendarRange size={26} className="text-brand-600" />
                    </span>
                    <span className="text-base font-semibold text-slate-800">ยังไม่มีรายการผ่อนชำระ</span>
                    <span className="text-sm text-slate-600">เพิ่มรายการผ่อน แล้วระบบจะคำนวณค่างวดและตารางให้</span>
                    <button onClick={openCreate} className="mt-3 h-12 pl-4 pr-5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-[15px] font-semibold flex items-center gap-2">
                        <Plus size={18} /> เพิ่มรายการผ่อนแรก
                    </button>
                </div>
            ) : (
                <>
                    {/* สรุปยอด (เฉพาะที่กำลังผ่อน) */}
                    {activeInstallments.length > 0 && (
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                            <div className={`grid gap-4 sm:gap-6 items-center p-4 sm:p-6 ${hasOverdue ? 'grid-cols-1 md:grid-cols-[minmax(0,1fr)_380px]' : 'grid-cols-1'}`}>
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-sm font-semibold text-slate-600">ต้องจ่ายเดือนนี้ · {currentMonthLabel()}</span>
                                    <span className="text-[36px] leading-[44px] sm:text-[44px] sm:leading-[52px] font-bold tracking-tight text-slate-900 tabular-nums [overflow-wrap:anywhere]">{money(summary.thisMonthDue)}</span>
                                    <span className="text-[13px] text-slate-500">
                                        {summary.thisMonthCount
                                            ? `ยังไม่จ่าย ${summary.thisMonthCount} งวด จาก ${summary.thisMonthItemCount} รายการ`
                                            : 'จ่ายครบแล้วสำหรับเดือนนี้'}
                                    </span>
                                </div>
                                {hasOverdue && (
                                    <div className="flex gap-3 items-start p-4 rounded-xl bg-expense-50">
                                        <span className="w-9 h-9 shrink-0 rounded-full bg-white flex items-center justify-center">
                                            <AlertCircle size={18} className="text-expense-600" />
                                        </span>
                                        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                            <span className="text-[13px] font-semibold text-expense-700">ค้างชำระ</span>
                                            <span className="text-xl font-bold text-expense-700 tabular-nums">{money(summary.overdueDue)}</span>
                                            <span className="text-[13px] text-expense-800">{summary.overdueCount} งวด · {summary.overdueNames.join(', ')}</span>
                                        </div>
                                        <button onClick={goOverdue} className="h-9 px-3 shrink-0 rounded-xl bg-white hover:bg-expense-100 text-expense-700 text-sm font-semibold">
                                            ดูรายการ
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 px-4 sm:px-6 py-4 border-t border-slate-100">
                                {[
                                    { label: 'ต้องจ่ายเดือนหน้า', value: summary.nextMonthDue, color: 'text-slate-800' },
                                    { label: 'จ่ายไปแล้ว', value: summary.totalPaid, color: 'text-income-600' },
                                    { label: 'เหลือที่ต้องจ่าย', value: summary.totalRemaining, color: 'text-slate-800' },
                                    { label: 'ยอดต้องจ่ายทั้งหมด', value: summary.totalPayable, color: 'text-slate-600' },
                                ].map((st) => (
                                    <div key={st.label} className="flex flex-col gap-0.5">
                                        <span className="text-xs text-slate-600">{st.label}</span>
                                        <span className={`text-lg sm:text-xl font-bold tabular-nums [overflow-wrap:anywhere] ${st.color}`}>{money(st.value)}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-3 px-4 sm:px-6 pb-5">
                                <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                                    <div className="h-full rounded-full bg-income-500 transition-all duration-500" style={{ width: `${paidPercent}%` }} />
                                </div>
                                <span className="text-xs text-slate-600 whitespace-nowrap">จ่ายแล้ว {paidPercent.toFixed(1)}%<span className="hidden sm:inline"> ของยอดทั้งหมด</span></span>
                            </div>
                        </div>
                    )}

                    {/* กำลังผ่อน */}
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-base font-semibold text-slate-800">กำลังผ่อน</span>
                        <span className="text-[13px] text-slate-500">{activeInstallments.length} รายการ</span>
                    </div>

                    {activeInstallments.length === 0 ? (
                        <div className="bg-white border border-slate-200 rounded-2xl px-6 py-8 flex flex-col items-center gap-2 text-center">
                            <span className="w-14 h-14 mb-1 rounded-full bg-income-50 flex items-center justify-center">
                                <CircleCheckBig size={26} className="text-income-600" />
                            </span>
                            <span className="text-base font-semibold text-slate-800">ไม่มีรายการที่กำลังผ่อน</span>
                            <span className="text-sm text-slate-600">ผ่อนเสร็จแล้ว {completedInstallments.length} รายการ อยู่ด้านล่าง</span>
                        </div>
                    ) : (
                        pagedInstallments.map((item) => {
                            const paying = payingKey?.startsWith(`${item.installmentsId}-`) ? Number(payingKey.split('-')[1]) : null;
                            return (
                                <InstallmentCard
                                    key={item.installmentsId}
                                    item={item}
                                    progress={calculateProgress(item)}
                                    expanded={expandedId === item.installmentsId}
                                    highlight={highlightId === item.installmentsId}
                                    payingPeriod={paying}
                                    onToggle={() => toggleCard(item.installmentsId)}
                                    onPay={(row) => {
                                        if (payingKey) return;
                                        setDialog({ kind: row.paid ? 'undo' : 'pay', item, row });
                                    }}
                                    onEdit={() => openEdit(item)}
                                    onClose={() => setDialog({ kind: 'close', item })}
                                    onDelete={() => setDialog({ kind: 'delete', item })}
                                />
                            );
                        })
                    )}

                    {/* Pagination */}
                    {activeInstallments.length > PAGE_SIZE && (
                        <div className="flex flex-wrap items-center justify-center sm:justify-between gap-3 px-1 pt-1">
                            <span className="text-[13px] text-slate-500">
                                แสดง {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, activeInstallments.length)} จาก {activeInstallments.length} รายการ
                            </span>
                            <div className="flex items-center gap-1 text-sm font-semibold text-slate-600">
                                <button
                                    type="button"
                                    onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                                    disabled={safePage === 1}
                                    aria-label="หน้าก่อนหน้า"
                                    className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                                    .map((p, idx, arr) => (
                                        <React.Fragment key={p}>
                                            {idx > 0 && p - arr[idx - 1] > 1 && <span className="w-6 text-center text-slate-500">…</span>}
                                            <button
                                                type="button"
                                                onClick={() => setCurrentPage(p)}
                                                className={`min-w-9 h-9 px-2 rounded-xl ${safePage === p ? 'bg-brand-600 text-white' : 'hover:bg-slate-100'}`}
                                            >
                                                {p}
                                            </button>
                                        </React.Fragment>
                                    ))}
                                <button
                                    type="button"
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

                    {/* ผ่อนเสร็จแล้ว — เปิด/ปิดได้ */}
                    {completedInstallments.length > 0 && (
                        <div className="mt-2 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                            <button
                                type="button"
                                onClick={() => setShowCompleted((v) => !v)}
                                className="w-full h-14 pl-5 pr-4 flex items-center gap-2 hover:bg-slate-50 text-left"
                            >
                                <span className="text-base font-semibold text-slate-800">ผ่อนเสร็จแล้ว</span>
                                <span className="min-w-6 h-6 px-2 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold flex items-center justify-center">
                                    {completedInstallments.length}
                                </span>
                                <span className="flex-1" />
                                {showCompleted ? <ChevronUp size={20} className="text-slate-500" /> : <ChevronDown size={20} className="text-slate-500" />}
                            </button>

                            {showCompleted && (
                                // มือถือ: แถวแบบการ์ด (ชื่อ + สรุปตัวเลขบรรทัดเดียว) · sm ขึ้นไป: ตาราง 6 คอลัมน์
                                <div className="sm:overflow-x-auto">
                                    <div className="sm:min-w-[720px]">
                                        <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_120px_110px_64px_110px_88px] gap-3 items-center h-9 pl-5 pr-3 bg-slate-50 border-t border-slate-100 text-xs font-semibold text-slate-500">
                                            <span>รายการ</span><span className="text-right">ยอดจัด</span><span className="text-right">ค่างวด</span><span className="text-right">งวด</span><span>วันเริ่ม</span><span />
                                        </div>
                                        {completedInstallments.map((item) => {
                                            const closed = item.status === 'CLOSED';
                                            const paid = parsePaidPeriods(item).size;
                                            return (
                                                <div
                                                    key={item.installmentsId}
                                                    id={`installment-${item.installmentsId}`}
                                                    className={`scroll-mt-20 lg:scroll-mt-6 flex sm:grid sm:grid-cols-[minmax(0,1fr)_120px_110px_64px_110px_88px] gap-3 items-center min-h-16 py-2.5 sm:py-2 pl-4 sm:pl-5 pr-2 sm:pr-3 border-t border-slate-100 text-sm tabular-nums ${highlightId === item.installmentsId ? 'bg-gold-50' : ''}`}
                                                >
                                                    <div className="flex-1 sm:flex-none flex flex-col gap-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-semibold text-slate-800">{item.installmentsName}</span>
                                                            <span className={`h-[22px] pl-1.5 pr-2 rounded-full text-xs font-semibold flex items-center gap-1 ${closed ? 'bg-slate-100 text-slate-700' : 'bg-income-50 text-income-700'}`}>
                                                                {closed ? <Lock size={13} /> : <Check size={13} />}
                                                                {closed ? 'ปิดยอด' : 'ครบแล้ว'}
                                                            </span>
                                                        </div>
                                                        <span className="text-xs text-slate-500">
                                                            {closed
                                                                ? `${item.closedAt ? `ปิดเมื่อ ${formatShortDate(new Date(item.closedAt))} · ` : ''}จ่ายแล้ว ${paid}/${item.installmentMonths} งวด`
                                                                : `${item.description ? `${item.description} · ` : ''}จ่ายครบ ${item.installmentMonths} งวด`}
                                                        </span>
                                                        <span className="sm:hidden text-xs text-slate-600">
                                                            ยอดจัด {money(item.totalAmount)} · {money(item.monthlyAmount)} × {item.installmentMonths}
                                                        </span>
                                                    </div>
                                                    <span className="hidden sm:block text-right text-slate-700">{money(item.totalAmount)}</span>
                                                    <span className="hidden sm:block text-right text-slate-700">{money(item.monthlyAmount)}</span>
                                                    <span className="hidden sm:block text-right text-slate-700">{item.installmentMonths}</span>
                                                    <span className="hidden sm:block text-slate-600">{formatShortDate(new Date(item.startDate))}</span>
                                                    <div className="shrink-0 flex justify-end gap-0.5">
                                                        {/* รายการที่ปิดยอดแล้วแก้ไขไม่ได้ (backend ปฏิเสธ) */}
                                                        {closed ? (
                                                            <span title="ปิดยอดแล้ว แก้ไขไม่ได้" className="w-10 h-10 flex items-center justify-center text-slate-300">
                                                                <PencilOff size={18} />
                                                            </span>
                                                        ) : (
                                                            <button type="button" onClick={() => openEdit(item)} aria-label="แก้ไข" className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100">
                                                                <Pencil size={18} />
                                                            </button>
                                                        )}
                                                        <button type="button" onClick={() => setDialog({ kind: 'delete', item })} aria-label="ลบ" className="w-10 h-10 rounded-xl flex items-center justify-center text-expense-700 hover:bg-expense-50">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {form && (
                <InstallmentForm
                    key={`${form.mode}-${form.id ?? 'new'}`}
                    mode={form.mode}
                    initial={form.initial}
                    paused={!!dialog}
                    onCancel={closeForm}
                    onSubmit={handleFormSubmit}
                />
            )}

            <ConfirmDialog
                open={!!dialog}
                {...dlg}
                busy={dialogBusy}
                onCancel={cancelDialog}
                onConfirm={confirmDialog}
            />

            <Toast toast={toast} />
        </div>
    );
}

function LoadingSkeleton() {
    return (
        <div aria-busy="true" className="flex flex-col gap-4 animate-pulse">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-3">
                <span className="w-44 h-3 rounded-full bg-slate-200" />
                <span className="w-72 h-9 rounded-[10px] bg-slate-200" />
                <div className="grid grid-cols-4 gap-4 pt-4 mt-1 border-t border-slate-100">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex flex-col gap-2">
                            <span className="w-[70%] h-2.5 rounded-full bg-slate-100" />
                            <span className="w-[85%] h-[18px] rounded-full bg-slate-200" />
                        </div>
                    ))}
                </div>
            </div>
            {['40%', '30%', '36%'].map((w) => (
                <div key={w} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-3.5">
                    <div className="flex justify-between gap-4">
                        <div className="flex-1 flex flex-col gap-2">
                            <span className="h-3.5 rounded-full bg-slate-200" style={{ width: w }} />
                            <span className="w-[45%] h-2.5 rounded-full bg-slate-100" />
                        </div>
                        <span className="w-28 h-[22px] rounded-full bg-slate-200" />
                    </div>
                    <div className="flex justify-between gap-6 pt-3.5 border-t border-slate-100">
                        <span className="w-56 h-3 rounded-full bg-slate-100" />
                        <span className="w-64 h-1.5 rounded-full bg-slate-200" />
                    </div>
                </div>
            ))}
        </div>
    );
}
