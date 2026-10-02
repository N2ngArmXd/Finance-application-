import { useEffect } from 'react';
import { Trash2, Loader2, Info } from 'lucide-react';

// dialog ยืนยัน (แทน SweetAlert)
// tone: 'danger' (ค่าเริ่มต้น สำหรับลบ) | 'brand' · rows: [{ k, v, tone?: 'brand' | 'expense' }] · note + noteTone: 'brand' | 'warn'
export default function ConfirmDialog({
    open, title, text,
    tone = 'danger', icon = Trash2,
    rows = [], note, noteTone = 'brand', noteIcon = Info,
    confirmLabel = 'ลบ', cancelLabel = 'ยกเลิก', busyLabel = 'กำลังลบ…',
    busy = false, onCancel, onConfirm,
}) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => { if (e.key === 'Escape' && !busy) onCancel(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, busy, onCancel]);

    if (!open) return null;
    const danger = tone === 'danger';
    const Icon = icon;
    const NoteIcon = noteIcon;
    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 animate-fade-in">
            <div role="alertdialog" aria-modal="true" className="w-[360px] max-w-full bg-white rounded-3xl p-6 flex flex-col items-center gap-2 text-center shadow-[0_24px_48px_-12px_rgba(15,23,42,0.3)] animate-zoom-in">
                <span className={`w-12 h-12 mb-1 rounded-full flex items-center justify-center ${danger ? 'bg-expense-50' : 'bg-brand-50'}`}>
                    <Icon size={22} className={danger ? 'text-expense-600' : 'text-brand-600'} />
                </span>
                <span className="text-[17px] leading-6 font-semibold text-slate-800">{title}</span>
                {text && <span className="text-sm leading-5 text-slate-600">{text}</span>}

                {rows.length > 0 && (
                    <div className="w-full mt-2 px-3.5 py-0.5 bg-slate-50 border border-slate-100 rounded-xl text-left">
                        {rows.map((r, i) => (
                            <div key={r.k} className={`flex justify-between items-baseline gap-3 py-2 text-sm leading-5 ${i ? 'border-t border-slate-200' : ''}`}>
                                <span className="shrink-0 text-slate-500">{r.k}</span>
                                <span className={`min-w-0 text-right tabular-nums ${r.tone === 'brand' ? 'font-bold text-brand-600' : r.tone === 'expense' ? 'font-bold text-expense-600' : 'font-semibold text-slate-800'}`}>
                                    {r.v}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {note && (
                    <div className={`w-full flex gap-2 items-start px-3 py-2.5 rounded-[10px] text-[13px] leading-[18px] font-medium text-left ${noteTone === 'warn' ? 'bg-warn-50 text-warn-700' : 'bg-brand-50 text-brand-700'}`}>
                        <NoteIcon size={16} className="shrink-0 mt-px" />
                        <span>{note}</span>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-2 w-full mt-3">
                    <button
                        onClick={onCancel}
                        disabled={busy}
                        className="h-12 rounded-xl bg-slate-100 text-slate-700 text-[15px] font-semibold hover:bg-slate-200 disabled:opacity-50 transition-colors"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={busy}
                        className={`h-12 rounded-xl text-white text-[15px] font-semibold disabled:opacity-80 flex items-center justify-center gap-2 transition-colors ${danger ? 'bg-expense-600 hover:bg-expense-700' : 'bg-brand-600 hover:bg-brand-700'}`}
                    >
                        {busy && <Loader2 size={18} className="animate-spin" />}
                        {busy ? busyLabel : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
