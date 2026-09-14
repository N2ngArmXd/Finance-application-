// แปลง Transaction id (14 หลัก: ประเภท + DDMMYY + สุ่ม 7)
// ให้แสดงหน้าบ้านแค่ ประเภท + 7 หลักสุ่มท้าย เช่น 21234567
// ข้อมูลเก่า (id สั้นกว่า 14 หลัก) แสดงตามเดิม
export const formatTxnId = (id) => {
    const s = String(id);
    if (s.length < 14) return s;
    return s[0] + s.slice(-7);
};
