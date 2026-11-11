import { CalendarClock, TriangleAlert, CircleCheck } from 'lucide-react';
import { formatShortDate } from './format';

// บรรทัดสถานะของหนี้ (ใต้แถบความคืบหน้า) — ใช้ร่วมกันทั้งการ์ดและ drawer
export const debtStatusLine = (d) => {
    if (d.status === 'PAID') {
        return { Icon: CircleCheck, tone: 'text-income-600', text: d.paidOffAt ? `ชำระครบเมื่อ ${formatShortDate(new Date(d.paidOffAt))}` : 'ชำระครบแล้ว' };
    }
    if (d.overdue) {
        return { Icon: TriangleAlert, tone: 'text-expense-700', text: `เลยกำหนดคืน ${formatShortDate(d.dueDate)}` };
    }
    if (d.dueDate) {
        return { Icon: CalendarClock, tone: 'text-slate-600', text: `กำหนดคืน ${formatShortDate(d.dueDate)}` };
    }
    return { Icon: CalendarClock, tone: 'text-slate-500', text: `ยืมเมื่อ ${formatShortDate(d.borrowDate)} · ไม่กำหนดวันคืน` };
};
