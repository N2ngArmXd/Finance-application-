import {
    PiggyBank, Plane, ShieldCheck, Home, Car, GraduationCap, Gift, Smartphone, HeartPulse, Gem, Laptop, Target,
    PartyPopper, CalendarClock, CalendarX,
} from 'lucide-react';
import { formatMoney, formatShortDate } from './format';

// ไอคอนกระปุก (key เก็บใน savings_goal.icon)
export const GOAL_ICONS = {
    PiggyBank, Plane, ShieldCheck, Home, Car, GraduationCap, Gift, Smartphone, Laptop, HeartPulse, Gem, Target,
};

// สีกระปุก (key เก็บใน savings_goal.color) — เขียน class เต็มเพื่อให้ Tailwind เห็น
export const GOAL_COLORS = {
    navy: { soft: 'bg-brand-50', text: 'text-brand-600', bar: 'bg-brand-500', dot: 'bg-brand-600' },
    gold: { soft: 'bg-gold-50', text: 'text-gold-600', bar: 'bg-gold-500', dot: 'bg-gold-500' },
    green: { soft: 'bg-income-50', text: 'text-income-600', bar: 'bg-income-500', dot: 'bg-income-500' },
    sky: { soft: 'bg-sky-50', text: 'text-sky-600', bar: 'bg-sky-500', dot: 'bg-sky-500' },
    violet: { soft: 'bg-violet-50', text: 'text-violet-600', bar: 'bg-violet-500', dot: 'bg-violet-500' },
    rose: { soft: 'bg-rose-50', text: 'text-rose-600', bar: 'bg-rose-500', dot: 'bg-rose-500' },
    teal: { soft: 'bg-teal-50', text: 'text-teal-600', bar: 'bg-teal-500', dot: 'bg-teal-500' },
    slate: { soft: 'bg-slate-100', text: 'text-slate-600', bar: 'bg-slate-500', dot: 'bg-slate-500' },
};

export const goalColor = (key) => GOAL_COLORS[key] || GOAL_COLORS.navy;

export const emptyGoalForm = () => ({
    name: '', description: '', hasTarget: true, targetAmount: '', targetDate: '',
    icon: 'PiggyBank', color: 'navy', initialDeposit: '',
});

const money = (n) => `฿${formatMoney(n)}`;

// บรรทัดสถานะของกระปุก: ถึงเป้า / เลยกำหนด / ต้องออมเดือนละ / ขาดอีก (null = ไม่มีเป้า)
export const goalStatusLine = (goal) => {
    if (goal.reached) return { Icon: PartyPopper, tone: 'text-income-600', text: 'ถึงเป้าแล้ว 🎉' };
    if (goal.overdue) return { Icon: CalendarX, tone: 'text-warn-700', text: `เลยวันเป้า ${formatShortDate(goal.targetDate)} · ขาดอีก ${money(goal.targetAmount - goal.balance)}` };
    if (goal.suggestedMonthly != null) return { Icon: CalendarClock, tone: 'text-slate-600', text: `ต้องออมเดือนละ ~${money(goal.suggestedMonthly)} ถึงเป้า ${formatShortDate(goal.targetDate)}` };
    if (goal.targetAmount) return { Icon: CalendarClock, tone: 'text-slate-600', text: `ขาดอีก ${money(goal.targetAmount - goal.balance)}` };
    return null;
};
