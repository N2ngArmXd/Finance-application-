// กติกา input ของฟอร์มสมัครสมาชิก — ต้องตรงกับ InputSanitizer.java ฝั่ง backend
// filter*  : ตัดอักขระที่ไม่อนุญาตทิ้งตั้งแต่ตอนพิมพ์ (บล็อกอักขระพิเศษ)
// validate : ตรวจรูปแบบเต็มก่อนกดถัดไป คืนข้อความ error หรือ '' ถ้าผ่าน

// อักษรไทย (พยัญชนะ สระ วรรณยุกต์) — ไม่รวม ฿ และเลขไทย
const THAI = 'ก-ฺเ-๎';

const keepOnly = (allowed) => {
    const notAllowed = new RegExp(`[^${allowed}]`, 'g');
    return (value) => value.replace(notAllowed, '');
};

export const PREFIXES = ['นาย', 'นาง', 'นางสาว'];

export const filters = {
    username: keepOnly('A-Za-z0-9_'),
    email: keepOnly('A-Za-z0-9._%+@-'),
    personName: keepOnly(`${THAI}A-Za-z `),
    placeName: keepOnly(`${THAI}A-Za-z. `),
    addressText: keepOnly(`${THAI}A-Za-z0-9/.,()\\- `),
    digits: keepOnly('0-9'),
};

// 0812345678 → 081-234-5678 (ระหว่างพิมพ์ก็จัดรูปให้ทีละส่วน)
export const formatPhone = (value) => {
    const d = filters.digits(value).slice(0, 10);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
    return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
};

const clean = (v) => (v ?? '').trim().replace(/\s+/g, ' ');

const rule = (pattern, message, { required = true, max } = {}) => (raw) => {
    const v = clean(raw);
    if (!v) return required ? 'กรุณากรอกข้อมูล' : '';
    if (max && v.length > max) return `ยาวได้ไม่เกิน ${max} ตัวอักษร`;
    return pattern.test(v) ? '' : message;
};

const NAME_MSG = 'ใช้ได้เฉพาะตัวอักษรไทย/อังกฤษ';
const ADDRESS_MSG = 'ใช้ได้เฉพาะตัวอักษร ตัวเลข และ / - . , ( )';
const PERSON_NAME = new RegExp(`^[${THAI}A-Za-z ]+$`);
const PLACE_NAME = new RegExp(`^[${THAI}A-Za-z. ]+$`);
const ADDRESS_TEXT = new RegExp(`^[${THAI}A-Za-z0-9/.,()\\- ]+$`);

export const validators = {
    username: rule(/^[A-Za-z0-9_]{4,20}$/, 'ใช้ได้เฉพาะ A-Z, a-z, 0-9 และ _ ความยาว 4–20 ตัว', { max: 20 }),
    email: rule(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/, 'รูปแบบอีเมลไม่ถูกต้อง', { max: 100 }),
    password: (v) => {
        if (!v) return 'กรุณากรอกข้อมูล';
        if (/[^\x21-\x7E]/.test(v)) return 'ห้ามมีช่องว่างหรือภาษาไทย (ตรวจสอบแป้นพิมพ์)';
        if (v.length < 8) return 'ต้องมีอย่างน้อย 8 ตัว';
        if (v.length > 64) return 'ยาวได้ไม่เกิน 64 ตัว';
        if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return 'ต้องมีทั้งตัวอักษรและตัวเลข';
        return '';
    },
    userPrefix: (v) => (PREFIXES.includes(v) ? '' : 'กรุณาเลือกคำนำหน้า'),
    userFirstName: rule(PERSON_NAME, NAME_MSG, { max: 50 }),
    userLastName: rule(PERSON_NAME, NAME_MSG, { max: 50 }),
    userNickName: rule(PERSON_NAME, NAME_MSG, { max: 30 }),
    userPhone: (v) => (/^0\d{9}$/.test(filters.digits(v)) ? '' : (v ? 'เบอร์โทรต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 0' : 'กรุณากรอกข้อมูล')),
    houseNo: rule(ADDRESS_TEXT, ADDRESS_MSG, { max: 20 }),
    moo: rule(/^\d{1,3}$/, 'ใส่ได้เฉพาะตัวเลข', { required: false, max: 3 }),
    alley: rule(ADDRESS_TEXT, ADDRESS_MSG, { required: false, max: 100 }),
    road: rule(ADDRESS_TEXT, ADDRESS_MSG, { required: false, max: 100 }),
    subDistrict: rule(PLACE_NAME, NAME_MSG, { max: 50 }),
    district: rule(PLACE_NAME, NAME_MSG, { max: 50 }),
    province: rule(PLACE_NAME, NAME_MSG, { max: 50 }),
    postalCode: rule(/^\d{5}$/, 'รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก'),
};

// 0–4 สำหรับแถบความแข็งแรงของรหัสผ่าน
export const passwordStrength = (v) => {
    if (!v || validators.password(v)) return v ? 1 : 0;
    let score = 1;
    if (v.length >= 12) score++;
    if (/[a-z]/.test(v) && /[A-Z]/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;
    return Math.min(score, 4);
};

export { clean as cleanText };
