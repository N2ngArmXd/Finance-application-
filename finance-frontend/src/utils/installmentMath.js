// คำนวณตารางผ่อน (ย้ายมาจาก Installments.jsx — สูตรเดิมทั้งหมด)
import { toDateInput } from './format';

// ค่าเริ่มต้นของฟอร์มสร้างรายการผ่อน
export const emptyInstallmentForm = () => ({
    installmentsName: '',
    description: '',
    totalAmount: '',
    interestRate: '',
    interestType: 'YEARLY',
    calculationMethod: 'FLAT',
    installmentMonths: '',
    startDate: toDateInput(new Date()),
});

// งวดที่ผู้ใช้ยืนยันว่าจ่ายแล้ว (เก็บเป็น "1,2,3" ในฐานข้อมูล)
export const parsePaidPeriods = (item) => new Set(
    (item.paidPeriods || '')
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n))
);

// อัตราดอกเบี้ยต่อเดือน (ทศนิยม) — YEARLY หารด้วย 12, MONTHLY ใช้ตามที่กรอก
const monthlyRateOf = (rate, interestType) => (interestType === 'YEARLY' ? (rate / 100) / 12 : rate / 100);

// วันครบกำหนดของงวด i (เริ่มที่ 1)
export const periodDate = (startDate, i) => {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + i - 1);
    return d;
};

// ผ่อนเสร็จ = จ่ายครบทุกงวด หรือ ปิดยอดแล้ว (CLOSED)
export const isInstallmentCompleted = (item) =>
    item.status === 'CLOSED'
    || ((item.installmentMonths || 0) > 0 && parsePaidPeriods(item).size >= item.installmentMonths);

// ตารางงวดของรายการที่บันทึกแล้ว + สถานะแต่ละงวด
export const calculateProgress = (item) => {
    // Normalize today to start of day for accurate comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();
    const curMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const months = item.installmentMonths;
    const paidSet = parsePaidPeriods(item);
    const monthlyRate = monthlyRateOf(parseFloat(item.interestRate || 0), item.interestType);

    // ยอดคงเหลือ = เงินต้นคงเหลือ ลดตามการตัดต้นในแต่ละงวด
    let balance = item.totalAmount;
    let due = 0;
    const schedule = [];

    for (let i = 1; i <= months; i++) {
        const payDate = periodDate(item.startDate, i);
        const isDue = payDate <= today;
        if (isDue) due++;

        let principal;
        if (item.calculationMethod === 'EFFECTIVE') {
            // ลดต้นลดดอก: ดอกเบี้ยงวดนี้คิดจากเงินต้นคงเหลือจริง
            principal = item.monthlyAmount - balance * monthlyRate;
        } else {
            // Flat: ตัดต้นเท่ากันทุกงวด
            principal = item.totalAmount / months;
        }

        balance -= principal;
        if (Math.abs(balance) < 0.01) balance = 0;

        const paid = paidSet.has(i);
        schedule.push({
            month: i,
            date: payDate.toISOString().split('T')[0],
            payment: item.monthlyAmount,
            remaining: balance,
            isDue,
            paid,
            // ค้างชำระ: ครบกำหนดก่อนเดือนนี้แต่ยังไม่จ่าย
            overdue: !paid && payDate < curMonthStart,
        });
    }

    const paidCount = paidSet.size;
    return {
        due,
        paidCount,
        remaining: months - paidCount,
        total: months,
        schedule,
        next: schedule.find((r) => !r.paid) || null,
        overdueRows: schedule.filter((r) => r.overdue),
    };
};

// คำนวณยอดผ่อน + ตารางจำลองจากข้อมูลในฟอร์ม (null = ข้อมูลยังไม่พอ)
export const calculatePreview = (form) => {
    const total = parseFloat(form.totalAmount);
    const rate = parseFloat(form.interestRate || 0);
    const months = parseInt(form.installmentMonths);

    if (isNaN(total) || total <= 0 || isNaN(months) || months <= 0) return null;

    const monthlyRate = monthlyRateOf(rate, form.interestType);
    let monthlyPayment;
    let totalPayable;

    if (form.calculationMethod === 'EFFECTIVE') {
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
        totalPayable = total + total * monthlyRate * months;
        monthlyPayment = totalPayable / months;
    }

    const totalInterest = totalPayable - total;

    // ตารางผ่อน — ยอดคงเหลือ = เงินต้นคงเหลือ (ลดตามการตัดต้นในแต่ละงวด)
    const schedule = [];
    let balance = total;
    for (let i = 1; i <= months; i++) {
        const payDate = periodDate(form.startDate, i);
        const principal = form.calculationMethod === 'EFFECTIVE'
            ? monthlyPayment - balance * monthlyRate
            : total / months;
        balance -= principal;
        // Avoid tiny negative values due to floating point math
        if (Math.abs(balance) < 0.01) balance = 0;
        schedule.push({ month: i, date: payDate.toISOString().split('T')[0], payment: monthlyPayment, remaining: balance });
    }

    return { monthlyPayment, totalInterest, totalPayable, schedule };
};

// สรุปยอดรวม — นับเฉพาะรายการที่กำลังผ่อนอยู่ (ไม่รวมที่จ่ายครบ/ปิดยอดแล้ว)
export const calculateOverallSummary = (activeInstallments) => {
    let totalPayable = 0;
    let totalPaid = 0;
    let thisMonthDue = 0;
    let thisMonthCount = 0;
    const thisMonthItems = new Set();
    let nextMonthDue = 0;
    let overdueDue = 0;
    let overdueCount = 0;
    const overdueNames = [];

    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();
    const curMonthStart = new Date(curYear, curMonth, 1);

    // เดือนถัดไป (ข้ามปีอัตโนมัติเมื่อเป็นเดือนธันวาคม)
    const nextMonthDate = new Date(curYear, curMonth + 1, 1);
    const nextMonth = nextMonthDate.getMonth();
    const nextYear = nextMonthDate.getFullYear();

    activeInstallments.forEach((item) => {
        const months = item.installmentMonths || 0;
        const monthly = item.monthlyAmount || 0;
        const paidSet = parsePaidPeriods(item);

        totalPayable += monthly * months;
        totalPaid += monthly * paidSet.size;

        let itemOverdue = 0;
        for (let i = 1; i <= months; i++) {
            if (paidSet.has(i)) continue;
            const payDate = periodDate(item.startDate, i);
            // งวดที่ครบกำหนดในเดือนนี้และยังไม่ได้จ่าย
            if (payDate.getMonth() === curMonth && payDate.getFullYear() === curYear) {
                thisMonthDue += monthly;
                thisMonthCount++;
                thisMonthItems.add(item.installmentsId);
            }
            // งวดค้างชำระ: ครบกำหนดก่อนเดือนนี้แต่ยังไม่จ่าย
            if (payDate < curMonthStart) {
                overdueDue += monthly;
                overdueCount++;
                itemOverdue++;
            }
            // งวดที่ครบกำหนดในเดือนหน้าและยังไม่ได้จ่าย
            if (payDate.getMonth() === nextMonth && payDate.getFullYear() === nextYear) {
                nextMonthDue += monthly;
            }
        }
        if (itemOverdue) overdueNames.push(item.installmentsName);
    });

    return {
        totalPayable,
        totalPaid,
        totalRemaining: Math.max(totalPayable - totalPaid, 0),
        thisMonthDue,
        thisMonthCount,
        thisMonthItemCount: thisMonthItems.size,
        nextMonthDue,
        overdueDue,
        overdueCount,
        overdueNames,
    };
};
