// เรียก API เงินออม — error ทางธุรกิจ backend ตอบ 400 พร้อมข้อความภาษาไทย ให้โยนเป็น Error(ข้อความ)
export async function savingsApi(path, body) {
    let response;
    try {
        response = await fetch(`/api/finance-app/savings/${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
    } catch {
        throw new Error('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    }
    const text = await response.text().catch(() => '');
    if (!response.ok) throw new Error(text || 'ทำรายการไม่สำเร็จ · กรุณาลองใหม่อีกครั้ง');
    try {
        return text ? JSON.parse(text) : null;
    } catch {
        return text;
    }
}

// วันที่ YYYY-MM-DD -> LocalDateTime ของ backend
// วันนี้ใช้เวลาปัจจุบัน · วันอื่นใช้เวลาเดิม (ตอนแก้ไข) หรือเที่ยงวัน
export const toMovementDateTime = (date, keepTime) => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    if (date === todayKey) return `${date}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    return `${date}T${keepTime || '12:00:00'}`;
};

// จำนวนเดือนที่เหลือถึงวันเป้า (นับรวมเดือนนี้ เหมือน backend) อย่างน้อย 1
export const monthsUntil = (targetDate) => {
    const [y, m] = targetDate.split('-').map(Number);
    const now = new Date();
    return Math.max((y - now.getFullYear()) * 12 + (m - 1 - now.getMonth()), 1);
};
