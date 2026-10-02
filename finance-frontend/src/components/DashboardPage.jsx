import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Wallet, Coins, Check, AlertTriangle, ArrowRight, PiggyBank } from 'lucide-react';
import CategoryIcon from '../utils/categoryIcons';
import { goalColor } from '../utils/savingsTheme';
import GoalAvatar from './savings/GoalAvatar';
import { savingsApi } from '../utils/savingsApi';
import { showError } from '../utils/swr';
import { formatDate } from '../utils/format';

const TOP_CATEGORIES = 5;
// สัดส่วนค่างวดต่อรายรับที่เกินนี้ถือว่าเริ่มตึงมือ
const DEBT_RATIO_WARN = 0.4;

const formatCurrency = (amount) =>
    new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount || 0);

// yyyy-MM ของ Date ตามเวลาท้องถิ่น
const toMonthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const shiftMonth = (key, delta) => {
    const [y, m] = key.split('-').map(Number);
    return toMonthKey(new Date(y, m - 1 + delta, 1));
};

const monthLabel = (key) => {
    const [y, m] = key.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('th-TH-u-ca-buddhist', { month: 'long', year: 'numeric' });
};

// % เปลี่ยนแปลงเทียบเดือนก่อน — null เมื่อเดือนก่อนไม่มีข้อมูล
const percentChange = (current, previous) => {
    if (!previous) return null;
    return ((current - previous) / previous) * 100;
};

export default function DashboardPage({ userId, onOpenInstallment, onOpenSavings }) {
    const thisMonth = toMonthKey(new Date());
    const [month, setMonth] = useState(thisMonth);
    const [data, setData] = useState(null);
    const [fetching, setFetching] = useState(true);

    const fetchSummary = async () => {
        setFetching(true);
        try {
            const response = await fetch('/api/finance-app/dashboard/summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, month })
            });
            if (response.ok) {
                setData(await response.json());
            } else {
                showError('โหลดข้อมูลไม่สำเร็จ', await response.text());
            }
        } catch (error) {
            console.error('Fetch dashboard error: ', error);
            showError('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
        } finally {
            setFetching(false);
        }
    };

    useEffect(() => {
        if (userId) fetchSummary();
    }, [userId, month]);

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* หัวข้อ + เลือกเดือน */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-black text-slate-800">ภาพรวมการเงิน</h1>
                <div className="flex items-center gap-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-1">
                    <button
                        type="button"
                        onClick={() => setMonth(shiftMonth(month, -1))}
                        className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-all"
                        aria-label="เดือนก่อนหน้า"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span className="min-w-36 text-center font-bold text-slate-700">{monthLabel(month)}</span>
                    <button
                        type="button"
                        onClick={() => setMonth(shiftMonth(month, 1))}
                        className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-all"
                        aria-label="เดือนถัดไป"
                    >
                        <ChevronRight size={18} />
                    </button>
                    {month !== thisMonth && (
                        <button
                            type="button"
                            onClick={() => setMonth(thisMonth)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-brand-600 hover:bg-brand-50 transition-all"
                        >
                            เดือนนี้
                        </button>
                    )}
                </div>
            </div>

            {fetching && !data ? (
                <div className="bg-white p-10 rounded-3xl border border-slate-100 text-center text-slate-500">กำลังโหลดข้อมูล...</div>
            ) : data && (
                <div className={`space-y-6 transition-opacity ${fetching ? 'opacity-60' : ''}`}>
                    <KpiRow data={data} />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ExpenseByCategory items={data.expenseByCategory} total={data.totalExpense} />
                        <InstallmentsDue data={data} onOpen={onOpenInstallment} />
                    </div>
                    <SavingsOverview data={data} userId={userId} onOpen={onOpenSavings} />
                </div>
            )}
        </div>
    );
}

function KpiRow({ data }) {
    // นับเฉพาะงวดของเดือนนี้ (งวดค้างชำระแสดงแยก)
    const thisMonthRows = data.installmentsDue.filter((r) => !r.overdue);
    const dueCount = thisMonthRows.length;
    const paidCount = thisMonthRows.filter((r) => r.paid).length;
    let installmentSub = dueCount === 0 ? 'ไม่มีงวดที่ต้องจ่าย' : `จ่ายแล้ว ${paidCount} / ${dueCount} รายการ`;
    if (data.installmentOverdueTotal > 0) {
        installmentSub += ` · ค้าง ${formatCurrency(data.installmentOverdueTotal)}`;
    }
    // เงินที่ฝากเข้ากระปุกไม่ใช่รายจ่าย แต่ไม่ใช่เงินที่ใช้ได้แล้ว จึงหักออกจากคงเหลือ
    const savingsNet = data.savingsNetThisMonth || 0;
    const remaining = data.net - savingsNet;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
                label="รายรับเดือนนี้"
                value={data.totalIncome}
                icon={<TrendingUp size={20} />}
                tone="income"
                change={percentChange(data.totalIncome, data.prevIncome)}
                goodWhenUp
            />
            <KpiCard
                label="รายจ่ายเดือนนี้"
                value={data.totalExpense}
                icon={<TrendingDown size={20} />}
                tone="expense"
                change={percentChange(data.totalExpense, data.prevExpense)}
            />
            <KpiCard
                label="คงเหลือสุทธิ"
                value={remaining}
                icon={<Wallet size={20} />}
                tone={remaining < 0 ? 'expense' : 'brand'}
                valueClass={remaining < 0 ? 'text-expense-600' : undefined}
                sub={savingsNet ? `รายรับ − รายจ่าย − ออม ${formatCurrency(savingsNet)}` : 'รายรับ − รายจ่าย'}
            />
            <KpiCard
                label="ค่างวดเดือนนี้"
                value={data.installmentDueTotal}
                icon={<Coins size={20} />}
                tone="warn"
                sub={installmentSub}
            />
        </div>
    );
}

const TONES = {
    income: 'bg-income-50 text-income-600',
    expense: 'bg-expense-50 text-expense-600',
    brand: 'bg-brand-50 text-brand-600',
    warn: 'bg-warn-50 text-warn-600',
};

function KpiCard({ label, value, icon, tone, change, goodWhenUp = false, sub, valueClass = 'text-slate-800' }) {
    let changeEl = null;
    if (change != null) {
        const up = change >= 0;
        // รายรับขึ้น = ดี, รายจ่ายขึ้น = ไม่ดี
        const good = up === goodWhenUp;
        changeEl = (
            <span className={`font-bold ${good ? 'text-income-600' : 'text-expense-600'}`}>
                {up ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
            </span>
        );
    }

    return (
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-slate-500">{label}</span>
                <span className={`p-2 rounded-xl ${TONES[tone]}`}>{icon}</span>
            </div>
            <div className={`text-2xl font-black ${valueClass}`}>
                {formatCurrency(value)}
            </div>
            <div className="text-xs text-slate-400 mt-1">
                {changeEl ? <>{changeEl} เทียบเดือนก่อน</> : (sub || 'ไม่มีข้อมูลเดือนก่อน')}
            </div>
        </div>
    );
}

function ExpenseByCategory({ items, total }) {
    // แสดง 5 อันดับแรก ที่เหลือรวมเป็น "อื่น ๆ"
    const top = items.slice(0, TOP_CATEGORIES);
    const rest = items.slice(TOP_CATEGORIES);
    const rows = rest.length > 0
        ? [...top, {
            categoryId: 'others',
            categoryName: `อื่น ๆ (${rest.length} หมวด)`,
            categoryIcon: null,
            amount: rest.reduce((sum, r) => sum + r.amount, 0)
        }]
        : top;
    const max = rows.reduce((m, r) => Math.max(m, r.amount), 0);

    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold text-slate-700 mb-4">รายจ่ายแยกหมวด</h2>
            {rows.length === 0 ? (
                <div className="text-center text-slate-400 py-8 border-2 border-dashed border-slate-100 rounded-2xl">
                    ยังไม่มีรายจ่ายในเดือนนี้
                </div>
            ) : (
                <div className="space-y-4">
                    {rows.map((row) => {
                        const share = total > 0 ? (row.amount / total) * 100 : 0;
                        return (
                            <div key={row.categoryId}>
                                <div className="flex items-center justify-between gap-3 mb-1.5 text-sm">
                                    <span className="flex items-center gap-2 font-semibold text-slate-700 min-w-0">
                                        <CategoryIcon name={row.categoryIcon} size={18} className="shrink-0" />
                                        <span className="truncate">{row.categoryName}</span>
                                    </span>
                                    <span className="shrink-0 text-slate-600">
                                        <span className="font-bold">{formatCurrency(row.amount)}</span>
                                        <span className="text-slate-400 ml-2">{share.toFixed(0)}%</span>
                                    </span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2.5">
                                    <div
                                        className="bg-expense-500 h-2.5 rounded-full transition-all duration-500"
                                        style={{ width: `${max > 0 ? (row.amount / max) * 100 : 0}%` }}
                                    ></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}


const TOP_GOALS = 3;

// เงินออม: ยอดรวม ณ สิ้นเดือนที่เลือก + ออมเดือนนี้ + กระปุก (ยอดปัจจุบัน) 3 ใบแรก
function SavingsOverview({ data, userId, onOpen }) {
    const [goals, setGoals] = useState(null);

    useEffect(() => {
        if (!userId) return;
        savingsApi('list', { userId })
            .then((list) => setGoals((list || []).filter((g) => g.status !== 'ARCHIVED')))
            .catch(() => setGoals([]));
    }, [userId]);

    // กระปุกที่ใกล้เป้าที่สุดขึ้นก่อน (ไม่มีเป้าไว้ท้าย)
    const top = (goals || [])
        .slice()
        .sort((a, b) => (b.progress ?? -1) - (a.progress ?? -1))
        .slice(0, TOP_GOALS);
    const net = data.savingsNetThisMonth || 0;

    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-xl font-bold text-slate-700">เงินออม</h2>
                <button
                    type="button"
                    onClick={() => onOpen()}
                    className="inline-flex items-center gap-1 text-sm font-bold text-brand-600 hover:text-brand-700 transition-colors"
                >
                    ไปหน้าเงินออม <ArrowRight size={16} />
                </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="text-xs text-slate-500 mb-1">เงินออมรวม</div>
                    <div className="font-black text-slate-700 text-lg">{formatCurrency(data.savingsTotal)}</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="text-xs text-slate-500 mb-1">ออมสุทธิเดือนนี้</div>
                    <div className={`font-black text-lg ${net < 0 ? 'text-expense-600' : 'text-brand-600'}`}>{formatCurrency(net)}</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="text-xs text-slate-500 mb-1">อัตราการออม</div>
                    <div className="font-black text-slate-700 text-lg">
                        {data.savingsRate == null ? '-' : `${(data.savingsRate * 100).toFixed(0)}%`}
                    </div>
                </div>
                <div className={`p-3 rounded-2xl border ${data.availableBalance < 0 ? 'bg-expense-50 border-expense-100' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="text-xs text-slate-500 mb-1">เงินใช้ได้ (สะสม)</div>
                    <div className={`font-black text-lg ${data.availableBalance < 0 ? 'text-expense-600' : 'text-slate-700'}`}>{formatCurrency(data.availableBalance)}</div>
                </div>
            </div>

            {goals == null ? null : top.length === 0 ? (
                <button
                    type="button"
                    onClick={() => onOpen()}
                    className="w-full flex items-center justify-center gap-2 text-slate-500 py-6 border-2 border-dashed border-slate-100 rounded-2xl hover:bg-slate-50"
                >
                    <PiggyBank size={18} /> ยังไม่มีกระปุก · สร้างกระปุกแรก
                </button>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {top.map((g) => (
                        <button
                            type="button"
                            key={g.savingsGoalId}
                            onClick={() => onOpen(g.savingsGoalId)}
                            title="เปิดในหน้าเงินออม"
                            className="text-left p-3 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors flex flex-col gap-2"
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                <GoalAvatar icon={g.icon} color={g.color} size={32} />
                                <span className="font-semibold text-slate-700 truncate">{g.name}</span>
                            </div>
                            <div className="text-sm text-slate-600">
                                <span className="font-bold text-slate-800">{formatCurrency(g.balance)}</span>
                                {g.targetAmount != null && <span className="text-slate-400"> / {formatCurrency(g.targetAmount)}</span>}
                            </div>
                            {g.progress != null && (
                                <div className="w-full bg-slate-100 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full ${g.reached ? 'bg-income-500' : goalColor(g.color).bar}`}
                                        style={{ width: `${Math.min(g.progress, 1) * 100}%` }}
                                    />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// สถานะงวด: ค้างชำระ > จ่ายแล้ว > ถึงกำหนดแล้ว > ยังไม่ถึงกำหนด
function DueStatus({ row, today }) {
    if (row.overdue) {
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-expense-100 text-expense-600">ค้างชำระ</span>;
    }
    if (row.paid) {
        return (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-income-100 text-income-700">
                <Check size={14} /> จ่ายแล้ว
            </span>
        );
    }
    // แยก yyyy-MM-dd เองให้เป็นเวลาท้องถิ่น (new Date('yyyy-MM-dd') จะได้ UTC)
    const [y, m, d] = row.dueDate.split('-').map(Number);
    if (new Date(y, m - 1, d) <= today) {
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-warn-100 text-warn-600">ถึงกำหนดแล้ว</span>;
    }
    return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-400">ยังไม่ถึงกำหนด</span>;
}

function InstallmentsDue({ data, onOpen }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const ratio = data.totalIncome > 0 ? data.installmentDueTotal / data.totalIncome : null;
    const ratioHigh = ratio != null && ratio > DEBT_RATIO_WARN;

    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-xl font-bold text-slate-700">ค่างวดที่ต้องจ่ายเดือนนี้</h2>
                <button
                    type="button"
                    onClick={() => onOpen()}
                    className="inline-flex items-center gap-1 text-sm font-bold text-brand-600 hover:text-brand-700 transition-colors"
                >
                    ไปหน้าตารางผ่อน <ArrowRight size={16} />
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="text-xs text-slate-500 mb-1">ค่างวดคงเหลือทั้งหมด</div>
                    <div className="font-black text-slate-700 text-lg">{formatCurrency(data.totalDebtRemaining)}</div>
                </div>
                <div className={`p-3 rounded-2xl border ${ratioHigh ? 'bg-expense-50 border-expense-100' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                        ค่างวด / รายรับ
                        {ratioHigh && <AlertTriangle size={12} className="text-expense-500" />}
                    </div>
                    <div className={`font-black text-lg ${ratioHigh ? 'text-expense-600' : 'text-slate-700'}`}>
                        {ratio == null ? '-' : `${(ratio * 100).toFixed(0)}%`}
                    </div>
                </div>
            </div>

            {data.paidLateCount > 0 && (
                <div className="mb-4 px-4 py-2.5 rounded-2xl bg-warn-50 border border-warn-100 text-sm text-warn-600">
                    เดือนนี้จ่ายงวดค้างจากเดือนก่อน {data.paidLateCount} งวด{' '}
                    <b>{formatCurrency(data.paidLateTotal)}</b> (รวมอยู่ในรายจ่ายเดือนนี้แล้ว)
                </div>
            )}

            {data.installmentsDue.length === 0 ? (
                <div className="text-center text-slate-400 py-8 border-2 border-dashed border-slate-100 rounded-2xl">
                    ไม่มีงวดที่ครบกำหนดในเดือนนี้
                </div>
            ) : (
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                    {data.installmentsDue.map((row) => (
                        <button
                            type="button"
                            key={`${row.installmentsId}-${row.period}`}
                            onClick={() => onOpen(row.installmentsId)}
                            title="เปิดในหน้าตารางผ่อน"
                            className={`w-full text-left flex items-center justify-between gap-3 p-3 hover:bg-slate-50 transition-colors ${row.overdue ? 'bg-expense-50/50' : row.paid ? 'bg-income-50/60' : ''}`}
                        >
                            <div className="min-w-0">
                                <div className="font-semibold text-slate-700 truncate">{row.installmentsName}</div>
                                <div className="text-xs text-slate-500">
                                    งวด {row.period}/{row.totalPeriods} · ครบกำหนด {formatDate(row.dueDate)}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <span className="font-bold text-brand-600">{formatCurrency(row.amount)}</span>
                                <DueStatus row={row} today={today} />
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
