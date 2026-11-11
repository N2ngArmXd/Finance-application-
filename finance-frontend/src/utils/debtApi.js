// เรียก API ติดตามหนี้ — error ทางธุรกิจ backend ตอบ 400 พร้อมข้อความภาษาไทย ให้โยนเป็น Error(ข้อความ)
// ไม่ต้องส่ง userId — backend ใช้ของคนที่ login อยู่ (JWT)
export async function debtApi(path, body = {}) {
    let response;
    try {
        response = await fetch(`/api/finance-app/debts/${path}`, {
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
