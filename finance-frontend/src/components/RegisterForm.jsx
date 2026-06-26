import React, { useState } from 'react';
import { User, Lock, Mail, Phone, Home, ArrowRight, ArrowLeft, Wallet, PartyPopper } from 'lucide-react';
import Swal from 'sweetalert2';

export default function RegisterForm({ onGoToLogin }) {

    const [step, setStep] = useState(1);
    const [userId, setUserId] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        // Step 1
        username: '', password: '', email: '',
        // Step 2
        profileImage: '', userPrefix: '', userFirstName: '', userLastName: '', userNickname: '', userPhone: '',
        // Step 3
        province: '', district: '', subDistrict: '', road: '', alley: '', moo: '', houseNo: '', postalCode: ''
    });

    const handleChange = async (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    }

    const handleNext = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (step === 1) {
                // Call Step 1 API
                const response = await fetch('/api/finance-app/register/step1', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: formData.username,
                        password: formData.password,
                        email: formData.email
                    }),
                });
                if (!response.ok) {
                    if (response.status >= 500) {
                        const errorText = await response.text();
                        throw new Error(`Server Error (${response.status}): ${errorText}`);
                    }
                    throw new Error('ไม่สามารถสร้างบัญชีได้ หรือชื่อผู้ใช้นี้มีคนใช้แล้ว');
                }
                const newUserId = await response.json();
                setUserId(newUserId);
                setStep(2);

            } else if (step === 2) {
                if (!userId) throw new Error('เกิดข้อผิดพลาด: ไม่พบรหัสผู้ใช้');
                // Call Step 2 API
                const response = await fetch(`/api/finance-app/register/step2/${userId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userPrefix: formData.userPrefix,
                        userFirstName: formData.userFirstName,
                        userLastName: formData.userLastName,
                        userNickName: formData.userNickname,
                        userPhone: formData.userPhone
                    }),
                });
                if (!response.ok) {
                    if (response.status >= 500) {
                        const errorText = await response.text();
                        throw new Error(`Server Error (${response.status}): ${errorText}`);
                    }
                    throw new Error('ไม่สามารถบันทึกข้อมูลส่วนตัวได้');
                }
                setStep(3);

            } else if (step === 3) {
                if (!userId) throw new Error('เกิดข้อผิดพลาด: ไม่พบรหัสผู้ใช้');
                // Call Step 3 API
                const response = await fetch(`/api/finance-app/register/step3/${userId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        houseNo: formData.houseNo,
                        moo: formData.moo,
                        alley: formData.alley,
                        road: formData.road,
                        subDistrict: formData.subDistrict,
                        district: formData.district,
                        province: formData.province,
                        postalCode: formData.postalCode
                    }),
                });
                if (!response.ok) {
                    if (response.status >= 500) {
                        const errorText = await response.text();
                        throw new Error(`Server Error (${response.status}): ${errorText}`);
                    }
                    throw new Error('ไม่สามารถบันทึกข้อมูลที่อยู่ได้');
                }

                await Swal.fire({
                    icon: 'success',
                    title: 'สมัครสมาชิกเสร็จสิ้น!',
                    text: 'คุณสามารถเข้าสู่ระบบเพื่อเริ่มต้นใช้งานได้ทันที',
                    confirmButtonText: 'ตกลง',
                    confirmButtonColor: '#4f46e5'
                });
                onGoToLogin();
            }
        } catch (err) {
            console.error("Register Error:", err);
            // โยน Error ออกไปให้ Global Listener (ErrorDebug) ทำงาน ถ้าเป็น Server Error
            if (err.message && err.message.includes('Server Error')) {
                throw err;
            }
            setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen h-screen flex bg-white overflow-hidden">
            {/* ฝั่งซ้าย: โลโก้และข้อความต้อนรับ (พื้นสีคราม) */}
            <div className="hidden lg:flex w-1/2 bg-indigo-600 p-12 flex-col justify-between rounded-r-[4rem] text-white">
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
                    <p className="text-indigo-100 text-lg max-w-md font-medium">
                        จัดการการเงินของคุณให้เป็นเรื่องง่ายและชัดเจน <br />สมัครสมาชิกเพื่อใช้งานได้เลย
                    </p>
                </div>

                <p className="text-sm text-indigo-200">© 2026 Finance Application. Clarity in Wealth.</p>
            </div>

            {/* ฝั่งขวา: ฟอร์มสมัครสมาชิก */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white relative overflow-y-auto">
                <div className="w-full max-w-lg bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-indigo-100 border border-slate-100 relative my-auto">
                    {/* ส่วนหัวบอกสถานะ Progress Bar (1 -> 2 -> 3) */}
                    <div className="mb-8 flex justify-between text-xs font-bold text-slate-300 px-4 relative">
                        {/* เส้นเชื่อม */}
                        <div className="absolute top-1/2 left-8 right-8 h-[2px] bg-slate-100 -z-10 -translate-y-1/2"></div>

                        {/* Step 1 */}
                        <div className={`flex flex-col items-center gap-2 bg-white px-2 ${step >= 1 ? 'text-indigo-600' : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100'}`}>1</div>
                            <span>บัญชี</span>
                        </div>
                        {/* Step 2 */}
                        <div className={`flex flex-col items-center gap-2 bg-white px-2 ${step >= 2 ? 'text-indigo-600' : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100'}`}>2</div>
                            <span>ข้อมูลส่วนตัว</span>
                        </div>
                        {/* Step 3 */}
                        <div className={`flex flex-col items-center gap-2 bg-white px-2 ${step >= 3 ? 'text-indigo-600' : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100'}`}>3</div>
                            <span>ที่อยู่</span>
                        </div>
                    </div>

                    <form onSubmit={handleNext} className="space-y-6">
                        {error && (
                            <div className="p-4 bg-red-50 text-red-500 text-xs font-bold rounded-2xl text-center border border-red-100 animate-in fade-in zoom-in duration-300">
                                {error}
                            </div>
                        )}

                        {step === 1 && (
                            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="text-center mb-8">
                                    <h3 className="text-2xl font-black text-slate-800">สร้างบัญชีของคุณ</h3>
                                    <p className="text-slate-400 mt-2 text-sm">เริ่มต้นจัดการการเงินของคุณได้ง่ายๆ</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600 ml-4">ชื่อผู้ใช้งาน</label>
                                    <input type="text" name="username" value={formData.username} onChange={handleChange} required className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-full outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-500 transition-all text-sm" placeholder="Username" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600 ml-4">รหัสผ่าน</label>
                                    <input type="password" name="password" value={formData.password} onChange={handleChange} required className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-full outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-500 transition-all text-sm" placeholder="••••••••" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600 ml-4">อีเมล</label>
                                    <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-full outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-500 transition-all text-sm" placeholder="your@email.com" />
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="text-center mb-8">
                                    <h3 className="text-2xl font-black text-slate-800">ข้อมูลส่วนตัว</h3>
                                    <p className="text-slate-400 mt-2 text-sm">บอกเราสักนิดว่าคุณคือใคร</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-600 ml-4">คำนำหน้า</label>
                                        <input type="text" name="userPrefix" value={formData.userPrefix} onChange={handleChange} required className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-full outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-500 transition-all text-sm" placeholder="นาย, นาง, นางสาว" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-600 ml-4">ชื่อเล่น</label>
                                        <input type="text" name="userNickname" value={formData.userNickname} onChange={handleChange} required className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-full outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-500 transition-all text-sm" placeholder="ชื่อเล่น" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-600 ml-4">ชื่อจริง</label>
                                        <input type="text" name="userFirstName" value={formData.userFirstName} onChange={handleChange} required className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-full outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-500 transition-all text-sm" placeholder="ชื่อจริง" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-600 ml-4">นามสกุล</label>
                                        <input type="text" name="userLastName" value={formData.userLastName} onChange={handleChange} required className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-full outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-500 transition-all text-sm" placeholder="นามสกุล" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600 ml-4">เบอร์โทรศัพท์</label>
                                    <input type="tel" name="userPhone" value={formData.userPhone} onChange={handleChange} required className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-full outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-500 transition-all text-sm" placeholder="08x-xxx-xxxx" />
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="text-center mb-8">
                                    <h3 className="text-2xl font-black text-slate-800">ข้อมูลที่อยู่</h3>
                                    <p className="text-slate-400 mt-2 text-sm">ข้อมูลสำหรับติดต่อและจัดส่งเอกสาร</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-600 ml-4">บ้านเลขที่</label>
                                        <input type="text" name="houseNo" value={formData.houseNo} onChange={handleChange} required className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-full outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-500 transition-all text-sm" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-600 ml-4">หมู่ที่</label>
                                        <input type="text" name="moo" value={formData.moo} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-full outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-500 transition-all text-sm" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-600 ml-4">ตรอก/ซอย</label>
                                        <input type="text" name="alley" value={formData.alley} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-full outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-500 transition-all text-sm" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-600 ml-4">ถนน</label>
                                        <input type="text" name="road" value={formData.road} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-full outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-500 transition-all text-sm" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-600 ml-4">ตำบล/แขวง</label>
                                        <input type="text" name="subDistrict" value={formData.subDistrict} onChange={handleChange} required className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-full outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-500 transition-all text-sm" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-600 ml-4">อำเภอ/เขต</label>
                                        <input type="text" name="district" value={formData.district} onChange={handleChange} required className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-full outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-500 transition-all text-sm" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-600 ml-4">จังหวัด</label>
                                        <input type="text" name="province" value={formData.province} onChange={handleChange} required className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-full outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-500 transition-all text-sm" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-600 ml-4">รหัสไปรษณีย์</label>
                                        <input type="text" name="postalCode" value={formData.postalCode} onChange={handleChange} required className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-full outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-500 transition-all text-sm" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ปุ่มควบคุมด้านล่าง */}
                        <div className="flex gap-4 pt-6 mt-6 border-t border-slate-50">
                            <button type="button" onClick={() => {
                                if (step > 1) setStep(step - 1);
                                else onGoToLogin();
                            }} className="px-8 py-4 bg-white border border-slate-200 text-slate-600 rounded-full font-bold hover:bg-slate-50 hover:text-slate-900 transition-all">
                                {step > 1 ? 'ย้อนกลับ' : 'กลับไปหน้าเข้าสู่ระบบ'}
                            </button>

                            <button type="submit" disabled={loading} className="flex-1 py-4 bg-indigo-600 text-white rounded-full font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-2 group disabled:bg-indigo-400 disabled:cursor-not-allowed">
                                {loading ? 'กำลังโหลด...' : (step === 3 ? 'ยืนยันการสมัคร' : 'ถัดไป')}
                                {(!loading && step !== 3) && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
