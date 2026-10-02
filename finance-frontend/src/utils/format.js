// แปลง Transaction id (14 หลัก: ประเภท + DDMMYY + สุ่ม 7)
// ให้แสดงหน้าบ้านแค่ ประเภท + 7 หลักสุ่มท้าย เช่น 21234567
// ข้อมูลเก่า (id สั้นกว่า 14 หลัก) แสดงตามเดิม
export const formatTxnId = (id) => {
    const s = String(id);
    if (s.length < 14) return s;
    return s[0] + s.slice(-7);
};

// ยอดเงิน 2 ตำแหน่งพร้อมคอมมา เช่น 1,250.00
export const formatMoney = (n) =>
    Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ยอดแบบมีเครื่องหมาย เช่น +1,250.00 / −120.00 (ศูนย์ไม่มีเครื่องหมาย)
export const formatSigned = (n, withBaht = false) => {
    const sign = n > 0 ? '+' : n < 0 ? '−' : '';
    return `${sign}${withBaht ? '฿' : ''}${formatMoney(Math.abs(n))}`;
};

// คืนค่าวันที่รูปแบบ YYYY-MM-DD ตามโซนเวลาเครื่องผู้ใช้
export const toDateInput = (d) => {
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
};

// หัวกลุ่มวัน เช่น "ศ. 2 ต.ค. 2569" (รับ Date หรือ string YYYY-MM-DD)
export const formatDayLabel = (value) => {
    const d = typeof value === 'string' && value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('th-TH-u-ca-buddhist', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};

// วันที่แบบสั้น เช่น "2 ต.ค. 2569" (รับ Date หรือ string YYYY-MM-DD)
export const formatShortDate = (value) => {
    const d = typeof value === 'string' && value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('th-TH-u-ca-buddhist', { day: 'numeric', month: 'short', year: 'numeric' });
};

// เวลา HH:mm
export const formatTime = (value) => {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// แปลงวันที่ให้อยู่ในรูปแบบ DD/MM/YYYY (ปฏิทินพุทธศักราช)
export const formatDate = (value) => {
    if (!value) return '-';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('th-TH-u-ca-buddhist', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};
