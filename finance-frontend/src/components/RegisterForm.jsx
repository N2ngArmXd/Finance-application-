import React, { useState } from 'react';
import { User, Lock, Mail, Phone, ArrowRight, ArrowLeft, Wallet, PartyPopper, Eye, EyeOff, Check } from 'lucide-react';
import Swal from 'sweetalert2';
import { PREFIXES, filters, formatPhone, validators, passwordStrength, cleanText } from '../utils/inputRules';

const STEPS = [
    { label: 'บัญชี', title: 'สร้างบัญชีของคุณ', subtitle: 'เริ่มต้นจัดการการเงินของคุณได้ง่ายๆ' },
    { label: 'ข้อมูลส่วนตัว', title: 'ข้อมูลส่วนตัว', subtitle: 'บอกเราสักนิดว่าคุณคือใคร' },
    { label: 'ที่อยู่', title: 'ข้อมูลที่อยู่', subtitle: 'ข้อมูลสำหรับติดต่อและจัดส่งเอกสาร' },
];

// ฟิลด์ของแต่ละ step — ใช้ตรวจก่อนกดถัดไป และพาไป step ที่มี error ตอน backend ตีกลับ
const STEP_FIELDS = {
    1: ['username', 'email', 'password', 'confirmPassword'],
    2: ['userPrefix', 'userFirstName', 'userLastName', 'userNickName', 'userPhone'],
    3: ['houseNo', 'moo', 'alley', 'road', 'subDistrict', 'district', 'province', 'postalCode'],
};

// ตัดอักขระที่ไม่อนุญาตทิ้งตั้งแต่ตอนพิมพ์ — password ไม่กรอง (ช่องปิดตัวอักษร ถ้าตัดทิ้งเงียบๆ ผู้ใช้จะงง)
const FIELD_FILTERS = {
    username: filters.username,
    email: filters.email,
    userFirstName: filters.personName,
    userLastName: filters.personName,
    userNickName: filters.personName,
    userPhone: formatPhone,
    houseNo: filters.addressText,
    moo: filters.digits,
    alley: filters.addressText,
    road: filters.addressText,
    subDistrict: filters.placeName,
    district: filters.placeName,
    province: filters.placeName,
    postalCode: filters.digits,
};

const STRENGTH = [
    null,
    { label: 'อ่อน', color: 'bg-expense-500', text: 'text-expense-500' },
    { label: 'พอใช้', color: 'bg-amber-400', text: 'text-amber-500' },
    { label: 'ดี', color: 'bg-income-500', text: 'text-income-500' },
    { label: 'แข็งแรงมาก', color: 'bg-income-600', text: 'text-income-600' },
];

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ตารางสรุปข้อมูลใน popup ยืนยัน — escape ทุกค่าเพราะเป็นข้อความที่ผู้ใช้พิมพ์
const confirmSummaryHtml = (d) => {
    const address = [
        d.houseNo,
        d.moo && `หมู่ ${d.moo}`,
        d.alley && `ซ. ${d.alley}`,
        d.road && `ถ. ${d.road}`,
        d.subDistrict, d.district, d.province, d.postalCode,
    ].filter(Boolean).join(' ');
    const rows = [
        ['ชื่อผู้ใช้งาน', d.username],
        ['อีเมล', d.email],
        ['ชื่อ-นามสกุล', `${d.userPrefix}${d.userFirstName} ${d.userLastName}`],
        ['ชื่อเล่น', d.userNickName],
        ['เบอร์โทร', formatPhone(d.userPhone)],
        ['ที่อยู่', address],
    ];
    return `<table style="width:100%;text-align:left;font-size:14px;border-collapse:collapse">${rows.map(([k, v]) =>
        `<tr><td style="padding:6px 8px;color:#64748b;white-space:nowrap;vertical-align:top">${k}</td>` +
        `<td style="padding:6px 8px;color:#1e293b;font-weight:600;word-break:break-word">${escapeHtml(v)}</td></tr>`).join('')}</table>`;
};

const inputClass = (hasError, extra = '') =>
    `w-full px-5 py-3.5 bg-slate-50 border rounded-full outline-none focus:bg-white transition-all text-sm ${extra} ${hasError
        ? 'border-expense-300 focus:ring-2 focus:ring-expense-500/20 focus:border-expense-500'
        : 'border-slate-100 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500'}`;

function Field({ label, error, hint, optional, children }) {
    return (
        <div className="space-y-1.5">
            <label className="block text-sm font-bold text-slate-600 ml-4">
                {label}
                {optional && <span className="ml-1 font-medium text-slate-400">(ไม่บังคับ)</span>}
            </label>
            {children}
            {error
                ? <p className="text-xs font-bold text-expense-500 ml-4">{error}</p>
                : hint && <p className="text-xs text-slate-400 ml-4">{hint}</p>}
        </div>
    );
}

function IconInput({ icon, error, right, ...props }) {
    return (
        <div className="relative">
            <div className="absolute left-5 inset-y-0 flex items-center pointer-events-none text-slate-400">
                {React.createElement(icon, { size: 18 })}
            </div>
            <input {...props} className={inputClass(error, `pl-12 ${right ? 'pr-12' : ''}`)} />
            {right}
        </div>
    );
}

export default function RegisterForm({ onGoToLogin }) {

    const [step, setStep] = useState(1);
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [formData, setFormData] = useState({
        // Step 1
        username: '', email: '', password: '', confirmPassword: '',
        // Step 2
        userPrefix: '', userFirstName: '', userLastName: '', userNickName: '', userPhone: '',
        // Step 3
        houseNo: '', moo: '', alley: '', road: '', subDistrict: '', district: '', province: '', postalCode: ''
    });

    const setField = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        // พิมพ์แก้แล้วเอา error ของช่องนั้นออก
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        const filter = FIELD_FILTERS[name];
        setField(name, filter ? filter(value) : value);
    };

    const validateStep = (s) => {
        const stepErrors = {};
        for (const field of STEP_FIELDS[s]) {
            const message = field === 'confirmPassword'
                ? (formData.confirmPassword !== formData.password ? 'รหัสผ่านไม่ตรงกัน' : '')
                : validators[field](formData[field]);
            if (message) stepErrors[field] = message;
        }
        return stepErrors;
    };

    const payload = () => ({
        username: cleanText(formData.username),
        email: cleanText(formData.email),
        password: formData.password,
        userPrefix: formData.userPrefix,
        userFirstName: cleanText(formData.userFirstName),
        userLastName: cleanText(formData.userLastName),
        userNickName: cleanText(formData.userNickName),
        userPhone: filters.digits(formData.userPhone),
        houseNo: cleanText(formData.houseNo),
        moo: cleanText(formData.moo),
        alley: cleanText(formData.alley),
        road: cleanText(formData.road),
        subDistrict: cleanText(formData.subDistrict),
        district: cleanText(formData.district),
        province: cleanText(formData.province),
        postalCode: cleanText(formData.postalCode),
    });

    const postJson = async (url, body) => {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (response.ok) return { ok: true };
        if (response.status >= 500) {
            const errorText = await response.text();
            throw new Error(`Server Error (${response.status}): ${errorText}`);
        }
        const data = await response.json().catch(() => ({}));
        return { ok: false, errors: data.errors || {}, message: data.message };
    };

    // backend ตีกลับ → แสดง error ใต้ช่อง และพากลับไป step แรกที่มีปัญหา
    const showServerErrors = (serverErrors, message) => {
        setErrors(serverErrors);
        const firstStep = [1, 2, 3].find(s => STEP_FIELDS[s].some(f => serverErrors[f]));
        if (firstStep) setStep(firstStep);
        else setFormError(message || 'ข้อมูลไม่ถูกต้อง');
    };

    const handleNext = async (e) => {
        e.preventDefault();
        setFormError('');

        const stepErrors = validateStep(step);
        setErrors(stepErrors);
        if (Object.keys(stepErrors).length > 0) return;

        setLoading(true);
        try {
            if (step === 1) {
                // เช็ค username/อีเมลซ้ำก่อนไปต่อ — ยังไม่สร้างบัญชี
                const { username, email, password } = payload();
                const result = await postJson('/api/finance-app/register/check', { username, email, password });
                if (!result.ok) return showServerErrors(result.errors, result.message);
                setStep(2);

            } else if (step === 2) {
                setStep(3);

            } else {
                const data = payload();

                // 1) ให้ backend ตรวจทุกช่อง + ข้อมูลซ้ำ (username/อีเมล/เบอร์โทร) ก่อน — ยังไม่บันทึก
                const check = await postJson('/api/finance-app/register/validate', data);
                if (!check.ok) return showServerErrors(check.errors, check.message);

                // 2) popup สรุปข้อมูลให้ผู้ใช้ยืนยัน
                setLoading(false);
                const confirm = await Swal.fire({
                    icon: 'question',
                    title: 'ยืนยันการสมัครสมาชิก?',
                    html: confirmSummaryHtml(data),
                    showCancelButton: true,
                    confirmButtonText: 'ยืนยันการสมัคร',
                    cancelButtonText: 'กลับไปแก้ไข',
                    confirmButtonColor: '#12305C',
                    reverseButtons: true,
                    focusCancel: true,
                });
                if (!confirm.isConfirmed) return;
                setLoading(true);

                // 3) บันทึกจริง — backend ตรวจซ้ำอีกรอบก่อน INSERT
                const result = await postJson('/api/finance-app/register', data);
                if (!result.ok) return showServerErrors(result.errors, result.message);

                await Swal.fire({
                    icon: 'success',
                    title: 'สมัครสมาชิกเสร็จสิ้น!',
                    text: 'คุณสามารถเข้าสู่ระบบเพื่อเริ่มต้นใช้งานได้ทันที',
                    confirmButtonText: 'ตกลง',
                    confirmButtonColor: '#12305C'
                });
                onGoToLogin();
            }
        } catch (err) {
            console.error("Register Error:", err);
            // โยน Error ออกไปให้ Global Listener (ErrorDebug) ทำงาน ถ้าเป็น Server Error
            if (err.message && err.message.includes('Server Error')) {
                throw err;
            }
            setFormError('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        setErrors({});
        setFormError('');
        if (step > 1) setStep(step - 1);
        else onGoToLogin();
    };

    const strength = STRENGTH[passwordStrength(formData.password)];
    const strengthScore = passwordStrength(formData.password);

    // props ทั่วไปของช่องข้อความ
    const text = (name, extra = {}) => ({
        name,
        value: formData[name],
        onChange: handleChange,
        'aria-invalid': !!errors[name],
        ...extra,
    });

    return (
        <div className="min-h-screen lg:h-screen flex bg-white lg:overflow-hidden">
            {/* ฝั่งซ้าย: โลโก้และข้อความต้อนรับ (พื้นสีคราม) — เฉพาะจอใหญ่ */}
            <div className="hidden lg:flex w-1/2 bg-brand-600 p-12 flex-col justify-between rounded-r-[4rem] text-white">
                <div className="inline-flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white">
                        <Wallet size={20} />
                    </div>
                    <h1 className="text-2xl font-black">Finance Application</h1>
                </div>

                <div className="space-y-6">
                    <div className="w-20 h-20 bg-white/10 rounded-[2rem] flex items-center justify-center text-white/90">
                        <PartyPopper size={40} />
                    </div>
                    <h2 className="text-5xl font-black leading-tight">
                        มาเริ่มต้น<br />สร้างบัญชีใหม่กัน!
                    </h2>
                    <p className="text-brand-100 text-lg max-w-md font-medium">
                        จัดการการเงินของคุณให้เป็นเรื่องง่ายและชัดเจน <br />สมัครสมาชิกเพื่อใช้งานได้เลย
                    </p>
                </div>

                <p className="text-sm text-brand-200">© 2026 Finance Application. Clarity in Wealth.</p>
            </div>

            {/* ฝั่งขวา: ฟอร์มสมัครสมาชิก */}
            <div className="w-full lg:w-1/2 flex flex-col items-center px-4 py-6 sm:p-8 bg-white lg:overflow-y-auto">
                {/* โลโก้บนมือถือ (ฝั่งซ้ายถูกซ่อน) */}
                <div className="lg:hidden w-full max-w-lg flex items-center gap-2.5 mb-6 px-2">
                    <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center text-white">
                        <Wallet size={18} />
                    </div>
                    <span className="text-lg font-black text-slate-800">Finance Application</span>
                </div>

                <div className="w-full max-w-lg bg-white p-5 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] sm:shadow-2xl sm:shadow-brand-100 sm:border border-slate-100 my-auto">
                    {/* Progress (1 -> 2 -> 3) */}
                    <ol className="mb-8 flex items-start">
                        {STEPS.map((s, i) => {
                            const n = i + 1;
                            const done = step > n;
                            const active = step >= n;
                            return (
                                <li key={s.label} className="flex-1 flex flex-col items-center relative">
                                    {i > 0 && (
                                        <span className={`absolute top-4 right-1/2 w-full h-[2px] -z-0 ${active ? 'bg-brand-600' : 'bg-slate-100'}`} />
                                    )}
                                    <span className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${active ? 'bg-brand-600 text-white shadow-lg shadow-brand-200' : 'bg-slate-100 text-slate-400'}`}>
                                        {done ? <Check size={16} strokeWidth={3} /> : n}
                                    </span>
                                    <span className={`mt-2 text-xs font-bold ${active ? 'text-brand-600' : 'text-slate-300'}`}>{s.label}</span>
                                </li>
                            );
                        })}
                    </ol>

                    <div className="text-center mb-6 sm:mb-8">
                        <h3 className="text-xl sm:text-2xl font-black text-slate-800">{STEPS[step - 1].title}</h3>
                        <p className="text-slate-400 mt-1.5 text-sm">{STEPS[step - 1].subtitle}</p>
                    </div>

                    <form onSubmit={handleNext} noValidate className="space-y-5">
                        {formError && (
                            <div className="p-4 bg-expense-50 text-expense-500 text-xs font-bold rounded-2xl text-center border border-expense-100 animate-in fade-in zoom-in duration-300">
                                {formError}
                            </div>
                        )}

                        {step === 1 && (
                            <div key="step1" className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <Field label="ชื่อผู้ใช้งาน" error={errors.username} hint="A-Z, a-z, 0-9 และ _ ความยาว 4–20 ตัว (ตอนเข้าสู่ระบบไม่สนตัวพิมพ์เล็ก/ใหญ่)">
                                    <IconInput icon={User} error={errors.username} {...text('username', {
                                        type: 'text', maxLength: 20, autoComplete: 'username',
                                        autoCapitalize: 'none', spellCheck: false, placeholder: 'username',
                                    })} />
                                </Field>
                                <Field label="อีเมล" error={errors.email}>
                                    <IconInput icon={Mail} error={errors.email} {...text('email', {
                                        type: 'email', maxLength: 100, autoComplete: 'email',
                                        autoCapitalize: 'none', spellCheck: false, placeholder: 'your@email.com',
                                    })} />
                                </Field>
                                <Field label="รหัสผ่าน" error={errors.password} hint="อย่างน้อย 8 ตัว มีทั้งตัวอักษรและตัวเลข">
                                    <IconInput icon={Lock} error={errors.password} {...text('password', {
                                        type: showPassword ? 'text' : 'password', maxLength: 64,
                                        autoComplete: 'new-password', placeholder: '••••••••',
                                    })} right={
                                        <button type="button" onClick={() => setShowPassword(v => !v)}
                                            aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                                            className="absolute right-4 inset-y-0 flex items-center px-1 text-slate-400 hover:text-slate-600">
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    } />
                                    {formData.password && (
                                        <div className="flex items-center gap-3 px-4 pt-1">
                                            <div className="flex-1 grid grid-cols-4 gap-1.5">
                                                {[1, 2, 3, 4].map(i => (
                                                    <span key={i} className={`h-1.5 rounded-full ${i <= strengthScore ? strength.color : 'bg-slate-100'}`} />
                                                ))}
                                            </div>
                                            <span className={`text-xs font-bold w-16 text-right ${strength.text}`}>{strength.label}</span>
                                        </div>
                                    )}
                                </Field>
                                <Field label="ยืนยันรหัสผ่าน" error={errors.confirmPassword}>
                                    <IconInput icon={Lock} error={errors.confirmPassword} {...text('confirmPassword', {
                                        type: showPassword ? 'text' : 'password', maxLength: 64,
                                        autoComplete: 'new-password', placeholder: '••••••••',
                                    })} />
                                </Field>
                            </div>
                        )}

                        {step === 2 && (
                            <div key="step2" className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <Field label="คำนำหน้า" error={errors.userPrefix}>
                                    <div role="radiogroup" className="grid grid-cols-3 gap-2">
                                        {PREFIXES.map(p => (
                                            <button key={p} type="button" role="radio" aria-checked={formData.userPrefix === p}
                                                onClick={() => setField('userPrefix', p)}
                                                className={`py-3 rounded-full text-sm font-bold border transition-all ${formData.userPrefix === p
                                                    ? 'bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-200'
                                                    : `bg-slate-50 text-slate-600 hover:bg-white hover:border-brand-500 ${errors.userPrefix ? 'border-expense-300' : 'border-slate-100'}`}`}>
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </Field>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field label="ชื่อจริง" error={errors.userFirstName}>
                                        <input {...text('userFirstName', { type: 'text', maxLength: 50, autoComplete: 'given-name', placeholder: 'ชื่อจริง' })} className={inputClass(errors.userFirstName)} />
                                    </Field>
                                    <Field label="นามสกุล" error={errors.userLastName}>
                                        <input {...text('userLastName', { type: 'text', maxLength: 50, autoComplete: 'family-name', placeholder: 'นามสกุล' })} className={inputClass(errors.userLastName)} />
                                    </Field>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field label="ชื่อเล่น" error={errors.userNickName}>
                                        <input {...text('userNickName', { type: 'text', maxLength: 30, autoComplete: 'nickname', placeholder: 'ชื่อเล่น' })} className={inputClass(errors.userNickName)} />
                                    </Field>
                                    <Field label="เบอร์โทรศัพท์" error={errors.userPhone}>
                                        <IconInput icon={Phone} error={errors.userPhone} {...text('userPhone', {
                                            type: 'tel', inputMode: 'numeric', maxLength: 12, autoComplete: 'tel-national', placeholder: '08x-xxx-xxxx',
                                        })} />
                                    </Field>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div key="step3" className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="บ้านเลขที่" error={errors.houseNo}>
                                        <input {...text('houseNo', { type: 'text', maxLength: 20, placeholder: '99/1' })} className={inputClass(errors.houseNo)} />
                                    </Field>
                                    <Field label="หมู่ที่" optional error={errors.moo}>
                                        <input {...text('moo', { type: 'text', inputMode: 'numeric', maxLength: 3 })} className={inputClass(errors.moo)} />
                                    </Field>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field label="ตรอก/ซอย" optional error={errors.alley}>
                                        <input {...text('alley', { type: 'text', maxLength: 100 })} className={inputClass(errors.alley)} />
                                    </Field>
                                    <Field label="ถนน" optional error={errors.road}>
                                        <input {...text('road', { type: 'text', maxLength: 100 })} className={inputClass(errors.road)} />
                                    </Field>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field label="ตำบล/แขวง" error={errors.subDistrict}>
                                        <input {...text('subDistrict', { type: 'text', maxLength: 50 })} className={inputClass(errors.subDistrict)} />
                                    </Field>
                                    <Field label="อำเภอ/เขต" error={errors.district}>
                                        <input {...text('district', { type: 'text', maxLength: 50 })} className={inputClass(errors.district)} />
                                    </Field>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field label="จังหวัด" error={errors.province}>
                                        <input {...text('province', { type: 'text', maxLength: 50 })} className={inputClass(errors.province)} />
                                    </Field>
                                    <Field label="รหัสไปรษณีย์" error={errors.postalCode}>
                                        <input {...text('postalCode', { type: 'text', inputMode: 'numeric', maxLength: 5, autoComplete: 'postal-code' })} className={inputClass(errors.postalCode)} />
                                    </Field>
                                </div>
                            </div>
                        )}

                        {/* ปุ่มควบคุมด้านล่าง */}
                        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 mt-2 border-t border-slate-50">
                            <button type="button" onClick={handleBack} className="px-6 py-3.5 bg-white border border-slate-200 text-slate-600 rounded-full font-bold hover:bg-slate-50 hover:text-slate-900 transition-all flex items-center justify-center gap-2 text-sm">
                                {step > 1 && <ArrowLeft size={18} />}
                                {step > 1 ? 'ย้อนกลับ' : 'กลับไปหน้าเข้าสู่ระบบ'}
                            </button>

                            <button type="submit" disabled={loading} className="flex-1 py-3.5 bg-brand-600 text-white rounded-full font-bold hover:bg-brand-700 shadow-xl shadow-brand-200 transition-all flex items-center justify-center gap-2 group disabled:bg-brand-400 disabled:cursor-not-allowed">
                                {loading ? 'กำลังตรวจสอบ...' : (step === 3 ? 'ยืนยันการสมัคร' : 'ถัดไป')}
                                {(!loading && step !== 3) && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
