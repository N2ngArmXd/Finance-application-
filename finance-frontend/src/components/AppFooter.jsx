import { APP_NAME, APP_VERSION, COPYRIGHT_YEAR } from '../utils/appInfo';

// footer ท้ายทุกหน้า: ชื่อระบบ + เวอร์ชัน
export default function AppFooter({ className = '' }) {
    return (
        <footer className={`text-xs text-slate-400 ${className}`}>
            © {COPYRIGHT_YEAR} {APP_NAME} · v{APP_VERSION}
        </footer>
    );
}
