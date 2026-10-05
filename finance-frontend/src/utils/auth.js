// ยืนยันตัวตนด้วย JWT ใน httpOnly cookie — JS อ่าน/แตะ token ไม่ได้ browser แนบให้เองทุก request
// ไฟล์นี้: ดัก 401 จากทุก API → แจ้ง App ให้เด้งกลับหน้า login, และ helper เช็ค/ออกจากระบบ

export const AUTH_EXPIRED_EVENT = 'auth:expired';

// endpoint ที่ 401 แล้วไม่ใช่ "session หมดอายุ" (เช่น login รหัสผิด)
const PUBLIC_PATHS = ['/api/finance-app/login', '/api/finance-app/logout', '/api/finance-app/register'];

let installed = false;

export function installAuthFetch() {
    if (installed) return;
    installed = true;

    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
        const response = await originalFetch(input, init);
        const url = typeof input === 'string' ? input : input?.url || '';
        if (response.status === 401 && url.includes('/api/') && !PUBLIC_PATHS.some(p => url.includes(p))) {
            window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
        }
        return response;
    };
}

// เปิดแอปมา: ถาม backend ว่า cookie ยังใช้ได้ไหม — คืนข้อมูลผู้ใช้ หรือ null
export async function fetchCurrentUser() {
    try {
        const response = await fetch('/api/finance-app/me', { method: 'POST' });
        return response.ok ? await response.json() : null;
    } catch {
        return null;
    }
}

export async function logout() {
    try {
        await fetch('/api/finance-app/logout', { method: 'POST' });
    } catch {
        // ลบ cookie ไม่สำเร็จก็ยังเคลียร์ฝั่งหน้าบ้านต่อ — cookie จะหมดอายุเอง
    }
}
