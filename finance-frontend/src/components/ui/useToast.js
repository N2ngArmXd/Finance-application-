import { useCallback, useEffect, useRef, useState } from 'react';

// state ของ Toast + ตั้งเวลาซ่อนอัตโนมัติ (สำเร็จ 4 วิ / ผิดพลาด 6 วิ)
export function useToast() {
    const [toast, setToast] = useState(null);
    const timer = useRef(null);

    const show = useCallback((text, kind = 'success') => {
        clearTimeout(timer.current);
        setToast({ text, kind });
        timer.current = setTimeout(() => setToast(null), kind === 'error' ? 6000 : 4000);
    }, []);

    useEffect(() => () => clearTimeout(timer.current), []);

    return [toast, show];
}
