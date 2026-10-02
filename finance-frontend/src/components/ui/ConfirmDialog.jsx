import { useEffect } from 'react';
import { Trash2, Loader2 } from 'lucide-react';

// dialog ยืนยันการลบ (ใช้แทน SweetAlert ในหน้าประวัติ)
export default function ConfirmDialog({ open, title, text, confirmLabel = 'ลบ', busy = false, onCancel, onConfirm }) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => { if (e.key === 'Escape' && !busy) onCancel(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, busy, onCancel]);

    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-slate-900/50 animate-fade-in">
            <div role="alertdialog" aria-modal="true" className="w-[360px] max-w-full bg-white rounded-3xl p-6 flex flex-col items-center gap-2 text-center animate-zoom-in">
                <span className="w-12 h-12 mb-1 rounded-full bg-expense-50 flex items-center justify-center">
                    <Trash2 size={22} className="text-expense-600" />
                </span>
                <span className="text-[17px] font-semibold text-slate-800">{title}</span>
                <span className="text-sm leading-5 text-slate-600">{text}</span>
                <div className="grid grid-cols-2 gap-2 w-full mt-3">
                    <button
                        onClick={onCancel}
                        disabled={busy}
                        className="h-12 rounded-xl bg-slate-100 text-slate-700 text-[15px] font-semibold hover:bg-slate-200 disabled:opacity-50 transition-colors"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={busy}
                        className="h-12 rounded-xl bg-expense-600 text-white text-[15px] font-semibold hover:bg-expense-700 disabled:opacity-80 flex items-center justify-center gap-2 transition-colors"
                    >
                        {busy && <Loader2 size={18} className="animate-spin" />}
                        {busy ? 'กำลังลบ…' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
