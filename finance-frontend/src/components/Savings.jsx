import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Plus, PiggyBank, ChevronDown, ChevronUp, ArchiveRestore, Trash2, Archive, ArrowDownToLine, ArrowUpFromLine,
    Receipt, Wallet, TriangleAlert, Pencil,
} from 'lucide-react';
import { formatMoney, formatShortDate, toDateInput } from '../utils/format';
import { savingsApi, toMovementDateTime } from '../utils/savingsApi';
import { emptyGoalForm } from '../utils/savingsTheme';
import GoalAvatar from './savings/GoalAvatar';
import SavingsGoalCard from './savings/SavingsGoalCard';
import GoalForm from './savings/GoalForm';
import MovementForm from './savings/MovementForm';
import GoalDetail from './savings/GoalDetail';
import ConfirmDialog from './ui/ConfirmDialog';
import { Toast } from './ui/Toast';
import { useToast } from './ui/useToast';

const money = (n) => `฿${formatMoney(n)}`;
const thisMonthKey = () => toDateInput(new Date()).slice(0, 7);

// ข้อความ/ตารางสรุปของ dialog ยืนยันแต่ละแบบ
const dialogProps = (d) => {
    if (!d) return {};
    const g = d.goal;
    if (d.kind === 'movement') {
        const { values, movement } = d;
        const amount = parseFloat(values.amount);
        const deposit = d.movementKind === 'deposit';
        const spend = !deposit && values.mode === 'SPEND';
        const rows = [
            { k: 'กระปุก', v: g.name },
            { k: deposit ? 'ยอดฝาก' : 'ยอดถอน', v: money(amount), tone: spend ? 'expense' : 'brand' },
            ...(spend && d.categoryName ? [{ k: 'หมวดหมู่', v: d.categoryName }] : []),
            { k: 'วันที่', v: formatShortDate(values.date) },
        ];
        if (movement) {
            return {
                tone: 'brand', icon: Pencil, title: 'บันทึกการแก้ไขรายการ?', rows,
                note: movement.mode === 'SPEND' ? 'รายจ่ายที่ผูกอยู่ในประวัติธุรกรรมจะถูกแก้ตามไปด้วย' : undefined,
                noteIcon: Receipt, confirmLabel: 'บันทึก', busyLabel: 'กำลังบันทึก…',
            };
        }
        if (deposit) {
            return { tone: 'brand', icon: ArrowDownToLine, title: 'ยืนยันการฝากเงิน?', rows, note: 'ย้ายจากเงินใช้ได้เข้ากระปุก ไม่นับเป็นรายจ่าย', confirmLabel: 'ฝากเงิน', busyLabel: 'กำลังบันทึก…' };
        }
        return spend
            ? { tone: 'brand', icon: ArrowUpFromLine, title: 'ยืนยันถอนไปใช้จ่าย?', rows, note: `จะเพิ่มรายจ่าย ${money(amount)} ในประวัติธุรกรรม`, noteIcon: Receipt, confirmLabel: 'ถอนไปใช้จ่าย', busyLabel: 'กำลังบันทึก…' }
            : { tone: 'brand', icon: Wallet, title: 'ยืนยันถอนกลับเข้ากระเป๋า?', rows, note: 'เงินกลับไปเป็นเงินใช้ได้ ยังไม่นับเป็นรายจ่าย', confirmLabel: 'ถอนเงิน', busyLabel: 'กำลังบันทึก…' };
    }
    if (d.kind === 'deleteMovement') {
        const m = d.movement;
        return {
            tone: 'danger', icon: Trash2, title: 'ลบรายการนี้?', text: 'ยอดในกระปุกจะคำนวณใหม่ทันที',
            rows: [
                { k: 'กระปุก', v: g.name },
                { k: m.type === 'DEPOSIT' ? 'ฝาก' : 'ถอน', v: money(m.amount) },
                { k: 'วันที่', v: formatShortDate(new Date(m.movementDate)) },
            ],
            note: m.mode === 'SPEND' ? 'จะลบรายจ่ายที่ผูกอยู่ในประวัติธุรกรรมด้วย' : undefined,
            noteTone: 'warn', noteIcon: TriangleAlert,
            confirmLabel: 'ลบ', busyLabel: 'กำลังลบ…',
        };
    }
    if (d.kind === 'archive') {
        const hasMoney = g.balance > 0;
        return {
            tone: hasMoney ? 'brand' : 'danger', icon: Archive, title: `ปิดกระปุก "${g.name}"?`,
            text: 'กระปุกจะย้ายไป "กระปุกที่ปิดแล้ว" เปิดใช้อีกครั้งได้ภายหลัง',
            rows: [{ k: 'ยอดในกระปุก', v: money(g.balance), tone: hasMoney ? 'brand' : undefined }],
            note: hasMoney ? `ต้องถอนเงินออกก่อนปิด — ระบบจะถอน ${money(g.balance)} กลับเข้ากระเป๋าให้` : undefined,
            noteIcon: Wallet,
            confirmLabel: hasMoney ? 'ถอนทั้งหมดแล้วปิด' : 'ปิดกระปุก', busyLabel: 'กำลังปิด…',
        };
    }
    // deleteGoal
    return {
        tone: 'danger', icon: Trash2, title: `ลบกระปุก "${g.name}"?`, text: 'กระปุกจะถูกซ่อนออกจากรายการของคุณ',
        rows: [{ k: 'ยอดในกระปุก', v: money(g.balance) }],
        confirmLabel: 'ลบ', busyLabel: 'กำลังลบ…',
    };
};

export default function Savings({ userId, focusId, onFocusHandled }) {
    const [goals, setGoals] = useState([]);
    const [summary, setSummary] = useState(null);
    const [categories, setCategories] = useState([]);
    const [fetching, setFetching] = useState(true);
    const [showArchived, setShowArchived] = useState(false);
    const [highlightId, setHighlightId] = useState(null);

    const [goalForm, setGoalForm] = useState(null);      // { mode, goal?, initial }
    const [movementForm, setMovementForm] = useState(null); // { kind, goalId, movement? }
    const [detailId, setDetailId] = useState(null);
    const [historyKey, setHistoryKey] = useState(0);
    const [dialog, setDialog] = useState(null);
    const [dialogBusy, setDialogBusy] = useState(false);
    const [toast, showToast] = useToast();

    const fetchAll = useCallback(async () => {
        setFetching(true);
        try {
            const [list, dash] = await Promise.all([
                savingsApi('list', { userId }),
                fetch('/api/finance-app/dashboard/summary', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, month: thisMonthKey() }),
                }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
            ]);
            setGoals(list || []);
            setSummary(dash);
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setFetching(false);
        }
    }, [userId, showToast]);

    useEffect(() => {
        if (userId) fetchAll();
    }, [userId, fetchAll]);

    // หมวดหมู่รายจ่าย ใช้ตอนถอนไปใช้จ่าย
    useEffect(() => {
        if (!userId) return;
        fetch('/api/finance-app/categories/getCategoriesList', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: String(userId) }),
        }).then((r) => (r.ok ? r.json() : [])).then(setCategories).catch(() => setCategories([]));
    }, [userId]);

    const activeGoals = useMemo(() => goals.filter((g) => g.status !== 'ARCHIVED'), [goals]);
    const archivedGoals = useMemo(() => goals.filter((g) => g.status === 'ARCHIVED'), [goals]);
    const goalById = (id) => goals.find((g) => g.savingsGoalId === id);
    const detailGoal = detailId != null ? goalById(detailId) : null;
    const movementGoal = movementForm ? goalById(movementForm.goalId) : null;

    // เปิดกระปุกที่ส่งมาจากหน้าอื่น (Dashboard / ประวัติธุรกรรม)
    useEffect(() => {
        if (fetching || focusId == null) return;
        const target = goals.find((g) => g.savingsGoalId === focusId);
        if (target) {
            if (target.status === 'ARCHIVED') setShowArchived(true);
            setHighlightId(focusId);
            requestAnimationFrame(() => {
                document.getElementById(`goal-${focusId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
        }
        onFocusHandled?.();
    }, [fetching, focusId]);

    const afterChange = async (message) => {
        showToast(message);
        setHistoryKey((k) => k + 1);
        await fetchAll();
    };

    // ---------- กระปุก ----------
    const openCreate = () => setGoalForm({ mode: 'create', initial: emptyGoalForm() });
    const openEdit = (g) => setGoalForm({
        mode: 'edit',
        goal: g,
        initial: {
            name: g.name || '',
            description: g.description || '',
            hasTarget: g.targetAmount != null,
            targetAmount: g.targetAmount != null ? String(g.targetAmount) : '',
            targetDate: g.targetDate || '',
            icon: g.icon || 'PiggyBank',
            color: g.color || 'navy',
            initialDeposit: '',
        },
    });

    const saveGoal = async (values) => {
        const payload = {
            userId,
            name: values.name.trim(),
            description: values.description.trim() || null,
            targetAmount: values.hasTarget ? parseFloat(values.targetAmount) : null,
            targetDate: values.hasTarget && values.targetDate ? values.targetDate : null,
            icon: values.icon,
            color: values.color,
        };
        try {
            if (goalForm.mode === 'edit') {
                await savingsApi('update', { ...payload, savingsGoalId: goalForm.goal.savingsGoalId });
            } else {
                await savingsApi('create', { ...payload, initialDeposit: parseFloat(values.initialDeposit) || null });
            }
            setGoalForm(null);
            await afterChange(goalForm.mode === 'edit' ? 'บันทึกการแก้ไขกระปุกแล้ว' : `สร้างกระปุก "${payload.name}" แล้ว`);
        } catch (error) {
            showToast(error.message, 'error');
        }
    };

    const reopenGoal = async (g) => {
        try {
            await savingsApi('reopen', { userId, savingsGoalId: g.savingsGoalId });
            await afterChange(`เปิดใช้กระปุก "${g.name}" อีกครั้งแล้ว`);
        } catch (error) {
            showToast(error.message, 'error');
        }
    };

    const askDeleteGoal = (g) => {
        if (g.balance > 0) {
            showToast(`ยังมีเงินในกระปุก ${money(g.balance)} ต้องถอนออกให้หมดก่อนลบ`, 'error');
            return;
        }
        setDialog({ kind: 'deleteGoal', goal: g });
    };

    // ---------- ฝาก / ถอน ----------
    const openMovement = (kind, g, movement = null) => setMovementForm({ kind, goalId: g.savingsGoalId, movement });

    const submitMovement = (values) => {
        const categoryName = categories.find((c) => c.id === values.categoryId)?.name;
        setDialog({
            kind: 'movement', movementKind: movementForm.kind, goal: movementGoal,
            movement: movementForm.movement, values, categoryName,
        });
    };

    const runMovement = async (d) => {
        const { values, movement } = d;
        const amount = parseFloat(values.amount);
        const note = values.note.trim() || null;
        if (movement) {
            // วันที่ไม่เปลี่ยน -> ส่งเวลาเดิมกลับไป
            const sameDay = toDateInput(new Date(movement.movementDate)) === values.date;
            await savingsApi('movement/update', {
                userId,
                savingsMovementId: movement.savingsMovementId,
                amount,
                movementDate: sameDay ? movement.movementDate : toMovementDateTime(values.date, movement.movementDate.slice(11, 19)),
                note,
                categoryId: movement.mode === 'SPEND' ? values.categoryId : null,
            });
            return 'บันทึกการแก้ไขรายการแล้ว';
        }
        const base = { userId, savingsGoalId: d.goal.savingsGoalId, amount, movementDate: toMovementDateTime(values.date), note };
        if (d.movementKind === 'deposit') {
            await savingsApi('deposit', base);
            return `ฝาก ${money(amount)} เข้า "${d.goal.name}" แล้ว`;
        }
        await savingsApi('withdraw', { ...base, mode: values.mode, categoryId: values.mode === 'SPEND' ? values.categoryId : null });
        return values.mode === 'SPEND'
            ? `ถอน ${money(amount)} ไปใช้จ่าย และเพิ่มรายจ่ายในประวัติธุรกรรมแล้ว`
            : `ถอน ${money(amount)} กลับเข้ากระเป๋าแล้ว`;
    };

    const confirmDialog = async () => {
        const d = dialog;
        if (!d) return;
        setDialogBusy(true);
        try {
            let message;
            if (d.kind === 'movement') {
                message = await runMovement(d);
                setMovementForm(null);
            } else if (d.kind === 'deleteMovement') {
                await savingsApi('movement/delete', { userId, savingsMovementId: d.movement.savingsMovementId });
                message = d.movement.mode === 'SPEND' ? 'ลบรายการถอนและรายจ่ายที่ผูกอยู่แล้ว' : 'ลบรายการแล้ว';
            } else if (d.kind === 'archive') {
                await savingsApi('archive', { userId, savingsGoalId: d.goal.savingsGoalId, withdrawAll: d.goal.balance > 0 });
                if (detailId === d.goal.savingsGoalId) setDetailId(null);
                setShowArchived(true);
                message = `ปิดกระปุก "${d.goal.name}" แล้ว`;
            } else {
                await savingsApi('delete', { userId, savingsGoalId: d.goal.savingsGoalId });
                if (detailId === d.goal.savingsGoalId) setDetailId(null);
                message = `ลบกระปุก "${d.goal.name}" แล้ว`;
            }
            setDialog(null);
            await afterChange(message);
        } catch (error) {
            setDialog(null);
            showToast(error.message, 'error');
        } finally {
            setDialogBusy(false);
        }
    };

    const cancelDialog = useCallback(() => setDialog(null), []);
    const closeGoalForm = useCallback(() => setGoalForm(null), []);
    const closeMovementForm = useCallback(() => setMovementForm(null), []);
    const closeDetail = useCallback(() => setDetailId(null), []);
    const dlg = dialogProps(dialog);

    const totalSaved = summary?.savingsTotal ?? activeGoals.reduce((s, g) => s + g.balance, 0);
    const netThisMonth = summary?.savingsNetThisMonth ?? 0;

    return (
        <div className="max-w-[928px] mx-auto flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4 mb-2">
                <h1 className="text-2xl font-bold text-slate-800">เงินออม</h1>
                <button
                    type="button"
                    onClick={openCreate}
                    className="h-11 pl-3.5 pr-[18px] rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-[15px] font-semibold flex items-center gap-2"
                >
                    <Plus size={18} /> สร้างกระปุก
                </button>
            </div>

            {fetching && goals.length === 0 ? (
                <LoadingSkeleton />
            ) : goals.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl px-6 py-10 flex flex-col items-center gap-2 text-center">
                    <span className="w-14 h-14 mb-1 rounded-full bg-brand-50 flex items-center justify-center">
                        <PiggyBank size={26} className="text-brand-600" />
                    </span>
                    <span className="text-base font-semibold text-slate-800">ยังไม่มีกระปุกเงินออม</span>
                    <span className="text-sm text-slate-600 max-w-[420px]">
                        แยกเงินเก็บตามเป้าหมาย เช่น เที่ยว · เงินสำรองฉุกเฉิน · ของชิ้นใหญ่ เงินที่ฝากจะไม่นับเป็นรายจ่าย
                    </span>
                    <button onClick={openCreate} className="mt-3 h-12 pl-4 pr-5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-[15px] font-semibold flex items-center gap-2">
                        <Plus size={18} /> สร้างกระปุกแรก
                    </button>
                </div>
            ) : (
                <>
                    {/* สรุป */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                        <div className="p-6 flex flex-col gap-0.5">
                            <span className="text-sm font-semibold text-slate-600">เงินออมรวม · {activeGoals.length} กระปุก</span>
                            <span className="text-[44px] leading-[52px] font-bold tracking-tight text-slate-900 tabular-nums">{money(totalSaved)}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-6 py-4 border-t border-slate-100">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-xs text-slate-600">ออมสุทธิเดือนนี้</span>
                                <span className={`text-xl font-bold tabular-nums ${netThisMonth < 0 ? 'text-expense-600' : 'text-brand-600'}`}>
                                    {netThisMonth < 0 ? '−' : '+'}{money(Math.abs(netThisMonth))}
                                </span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-xs text-slate-600">อัตราการออม (ของรายรับเดือนนี้)</span>
                                <span className="text-xl font-bold tabular-nums text-slate-800">
                                    {summary?.savingsRate != null ? `${(summary.savingsRate * 100).toFixed(1)}%` : '—'}
                                </span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-xs text-slate-600">เงินใช้ได้ (หลังหักเงินออม)</span>
                                <span className={`text-xl font-bold tabular-nums ${summary?.availableBalance < 0 ? 'text-expense-600' : 'text-slate-800'}`}>
                                    {summary ? money(summary.availableBalance) : '—'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-base font-semibold text-slate-800">กระปุกของฉัน</span>
                        <span className="text-[13px] text-slate-500">{activeGoals.length} กระปุก</span>
                    </div>

                    {activeGoals.length === 0 ? (
                        <div className="bg-white border border-slate-200 rounded-2xl px-6 py-8 flex flex-col items-center gap-2 text-center">
                            <span className="text-base font-semibold text-slate-800">ไม่มีกระปุกที่เปิดอยู่</span>
                            <span className="text-sm text-slate-600">กระปุกที่ปิดแล้ว {archivedGoals.length} ใบ อยู่ด้านล่าง</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {activeGoals.map((g) => (
                                <SavingsGoalCard
                                    key={g.savingsGoalId}
                                    goal={g}
                                    highlight={highlightId === g.savingsGoalId}
                                    onOpen={() => { setHighlightId(null); setDetailId(g.savingsGoalId); }}
                                    onDeposit={() => openMovement('deposit', g)}
                                    onWithdraw={() => openMovement('withdraw', g)}
                                    onEdit={() => openEdit(g)}
                                    onArchive={() => setDialog({ kind: 'archive', goal: g })}
                                    onDelete={() => askDeleteGoal(g)}
                                />
                            ))}
                        </div>
                    )}

                    {/* กระปุกที่ปิดแล้ว */}
                    {archivedGoals.length > 0 && (
                        <div className="mt-2 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                            <button
                                type="button"
                                onClick={() => setShowArchived((v) => !v)}
                                className="w-full h-14 pl-5 pr-4 flex items-center gap-2 hover:bg-slate-50 text-left"
                            >
                                <span className="text-base font-semibold text-slate-800">กระปุกที่ปิดแล้ว</span>
                                <span className="min-w-6 h-6 px-2 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold flex items-center justify-center">{archivedGoals.length}</span>
                                <span className="flex-1" />
                                {showArchived ? <ChevronUp size={20} className="text-slate-500" /> : <ChevronDown size={20} className="text-slate-500" />}
                            </button>
                            {showArchived && archivedGoals.map((g) => (
                                <div
                                    key={g.savingsGoalId}
                                    id={`goal-${g.savingsGoalId}`}
                                    className={`scroll-mt-6 min-h-16 py-2 pl-5 pr-3 flex items-center gap-3 border-t border-slate-100 ${highlightId === g.savingsGoalId ? 'bg-gold-50' : ''}`}
                                >
                                    <GoalAvatar icon={g.icon} color={g.color} size={36} />
                                    <div className="flex-1 min-w-0 flex flex-col">
                                        <span className="text-sm font-semibold text-slate-800 truncate">{g.name}</span>
                                        <span className="text-xs text-slate-500">
                                            {g.targetAmount != null ? `เป้า ${money(g.targetAmount)} · ` : ''}
                                            {g.archivedAt ? `ปิดเมื่อ ${formatShortDate(new Date(g.archivedAt))}` : 'ปิดแล้ว'}
                                        </span>
                                    </div>
                                    <button type="button" onClick={() => setDetailId(g.savingsGoalId)} className="h-9 px-3 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">
                                        ประวัติ
                                    </button>
                                    <button type="button" onClick={() => reopenGoal(g)} className="h-9 px-3 rounded-xl text-sm font-semibold text-brand-600 hover:bg-brand-50 flex items-center gap-1.5">
                                        <ArchiveRestore size={16} /> เปิดใช้อีกครั้ง
                                    </button>
                                    <button type="button" onClick={() => askDeleteGoal(g)} aria-label="ลบ" className="w-10 h-10 rounded-xl flex items-center justify-center text-expense-700 hover:bg-expense-50">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {detailGoal && (
                <GoalDetail
                    goal={detailGoal}
                    userId={userId}
                    reloadKey={historyKey}
                    paused={!!dialog || !!movementForm}
                    onClose={closeDetail}
                    onDeposit={() => (detailGoal.status === 'ARCHIVED'
                        ? showToast('กระปุกนี้ปิดแล้ว เปิดใช้อีกครั้งก่อนจึงจะฝากได้', 'error')
                        : openMovement('deposit', detailGoal))}
                    onWithdraw={() => (detailGoal.status === 'ARCHIVED'
                        ? showToast('กระปุกนี้ปิดแล้ว เปิดใช้อีกครั้งก่อนจึงจะถอนได้', 'error')
                        : openMovement('withdraw', detailGoal))}
                    onEditMovement={(m) => openMovement(m.type === 'DEPOSIT' ? 'deposit' : 'withdraw', detailGoal, m)}
                    onDeleteMovement={(m) => setDialog({ kind: 'deleteMovement', goal: detailGoal, movement: m })}
                />
            )}

            {goalForm && (
                <GoalForm
                    key={`${goalForm.mode}-${goalForm.goal?.savingsGoalId ?? 'new'}`}
                    mode={goalForm.mode}
                    initial={goalForm.initial}
                    balance={goalForm.goal?.balance ?? 0}
                    paused={!!dialog}
                    onCancel={closeGoalForm}
                    onSubmit={saveGoal}
                />
            )}

            {movementForm && movementGoal && (
                <MovementForm
                    key={`${movementForm.kind}-${movementForm.movement?.savingsMovementId ?? 'new'}`}
                    kind={movementForm.kind}
                    goal={movementGoal}
                    movement={movementForm.movement}
                    categories={categories}
                    available={summary?.availableBalance ?? null}
                    paused={!!dialog}
                    onCancel={closeMovementForm}
                    onSubmit={submitMovement}
                />
            )}

            <ConfirmDialog open={!!dialog} {...dlg} busy={dialogBusy} onCancel={cancelDialog} onConfirm={confirmDialog} />
            <Toast toast={toast} />
        </div>
    );
}

function LoadingSkeleton() {
    return (
        <div aria-busy="true" className="flex flex-col gap-4 animate-pulse">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-3">
                <span className="w-40 h-3 rounded-full bg-slate-200" />
                <span className="w-64 h-9 rounded-[10px] bg-slate-200" />
                <div className="grid grid-cols-3 gap-4 pt-4 mt-1 border-t border-slate-100">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex flex-col gap-2">
                            <span className="w-[70%] h-2.5 rounded-full bg-slate-100" />
                            <span className="w-[85%] h-[18px] rounded-full bg-slate-200" />
                        </div>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2].map((i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-3.5">
                        <div className="flex items-center gap-3">
                            <span className="w-11 h-11 rounded-full bg-slate-200" />
                            <span className="w-32 h-3.5 rounded-full bg-slate-200" />
                        </div>
                        <span className="w-40 h-6 rounded-full bg-slate-200" />
                        <span className="h-2 rounded-full bg-slate-100" />
                        <div className="grid grid-cols-2 gap-2"><span className="h-10 rounded-xl bg-slate-200" /><span className="h-10 rounded-xl bg-slate-100" /></div>
                    </div>
                ))}
            </div>
        </div>
    );
}
