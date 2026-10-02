import { CheckCircle2, AlertCircle } from 'lucide-react';

// แถบแจ้งผลลอยด้านล่างจอ (แทน success modal) ใช้คู่กับ useToast
export function Toast({ toast }) {
    if (!toast) return null;
    const isError = toast.kind === 'error';
    const Icon = isError ? AlertCircle : CheckCircle2;
    return (
        <div className="fixed left-1/2 bottom-7 z-[60] w-[400px] max-w-[calc(100vw-32px)] -translate-x-1/2">
            <div
                role="status"
                className="flex items-center gap-3 min-h-12 py-1.5 pr-1.5 pl-4 rounded-xl bg-slate-900 text-white text-sm font-medium tabular-nums shadow-[0_12px_32px_-8px_rgba(15,23,42,0.45)] animate-toast-in"
            >
                <Icon size={20} className={`shrink-0 ${isError ? 'text-expense-300' : 'text-income-300'}`} />
                <span className="flex-1 min-w-0 py-1.5">{toast.text}</span>
            </div>
        </div>
    );
}
