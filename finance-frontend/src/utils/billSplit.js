// หารบิล: คิดเป็นสตางค์ (จำนวนเต็ม) กันทศนิยมเพี้ยน
// members: [{ amount: string, edited: boolean }] — คนที่แก้ยอดเองคงยอดไว้ ที่เหลือหารเท่ากัน
// includeSelf = นับเราในการหาร · เศษสตางค์ตกเป็นของเรา (ถ้าไม่นับเรา ตกที่คนแรกที่ไม่ได้แก้ยอด)
// คืน { amounts: number[] (บาท ตามลำดับ members), selfShare: number (บาท), leftover: ยอดที่ยังไม่ถูกหาร (ไม่นับเรา) }
export function splitBill(total, members, includeSelf) {
    const totalC = Math.round((Number(total) || 0) * 100);
    const editedC = members.map((m) => (m.edited ? Math.round((Number(m.amount) || 0) * 100) : null));
    const fixed = editedC.reduce((s, c) => s + (c ?? 0), 0);
    const free = Math.max(totalC - fixed, 0);
    const freeIdx = members.map((m, i) => (m.edited ? -1 : i)).filter((i) => i >= 0);
    const slots = freeIdx.length + (includeSelf ? 1 : 0);

    const per = slots > 0 ? Math.floor(free / slots) : 0;
    const rest = slots > 0 ? free - per * slots : free;
    const cents = editedC.map((c) => c ?? per);
    let selfC = includeSelf ? per + rest : 0;
    if (!includeSelf && freeIdx.length > 0) cents[freeIdx[0]] += rest;

    // ยอดรวมหลังหาร: ถ้าคนที่แก้ยอดเองรวมกันเกินบิล ส่วนของเราติดลบ (ให้ฟอร์มแจ้ง error)
    const membersC = cents.reduce((s, c) => s + c, 0);
    if (includeSelf) selfC = totalC - membersC;
    return { amounts: cents.map((c) => c / 100), selfShare: selfC / 100, leftover: includeSelf ? 0 : (totalC - membersC) / 100 };
}
