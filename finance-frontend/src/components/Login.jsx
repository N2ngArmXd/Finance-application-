import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, ArrowRight, Wallet, PartyPopper } from 'lucide-react';

export default function Login({ onLoginSuccess, onGoToRegister }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const response = await fetch('/api/finance-app/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            if (response.ok) {
                const userData = await response.json();
                onLoginSuccess(userData);
            } else {
                const errorText = await response.text();
                setError(errorText || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
            }
        } catch (err) {
            console.error("Login Error:", err);
            setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
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
                        ยินดีต้อนรับ<br />กลับมาอีกครั้ง!
                    </h2>
                    <p className="text-indigo-100 text-lg max-w-md font-medium">
                        จัดการการเงินของคุณให้เป็นเรื่องง่ายและชัดเจน <br />เข้าสู่ระบบเพื่อไปต่อ
                    </p>
                </div>

                <p className="text-sm text-indigo-200">© 2026 Finance Application. Clarity in Wealth.</p>
            </div>

            {/* ฝั่งขวา: ฟอร์มเข้าสู่ระบบ (พื้นสีขาว) */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white relative">

                {/* ปุ่ม Register มุมขวาบน (Option) */}
                <div className="absolute top-8 right-8 flex items-center gap-2">
                    <span className="text-sm text-slate-400 font-medium">ยังไม่มีบัญชี?</span>
                    <button
                        type="button"
                        onClick={onGoToRegister}
                        className="text-sm font-bold text-indigo-600 hover:text-indigo-700"
                    >
                        สมัครสมาชิกใหม่
                    </button>
                </div>

                {/* Form Wrapper - จัดกลางและจำกัดความกว้าง */}
                <div className="w-full max-w-sm">
                    <div className="mb-10">
                        <h2 className="text-3xl font-black text-slate-800">เข้าสู่ระบบ</h2>
                        <p className="text-slate-400 text-base mt-1.5">กรอกข้อมูลเพื่อเข้าสู่บัญชีของคุณ</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="p-4 bg-red-50 text-red-500 text-xs font-bold rounded-2xl text-center border border-red-100">
                                {error}
                            </div>
                        )}

                        {/* ตัวอย่างเฉพาะส่วน Username Input */}
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-600 ml-4">ชื่อผู้ใช้งาน</label>
                            <div className="relative group">
                                {/* ส่วนไอคอน: ใช้ flex และ h-full เพื่อบังคับให้อยู่กลางความสูงของ input */}
                                <div className="absolute left-5 inset-y-0 flex items-center justify-center pointer-events-none text-slate-400">
                                    <User size={19} className="mb-[1px]" /> {/* ถ้ายังรู้สึกว่าสูงไปนิด ให้ใช้ mb-[1px] เพื่อดึงมันลงมาแบบละเอียดครับ */}
                                </div>

                                <input
                                    type="text"
                                    placeholder="Username or Email"
                                    className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-full outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-500 transition-all text-sm leading-none"
                                    /* ใส่ leading-none เพื่อให้ข้อความอยู่กลางที่สุด */
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center px-4">
                                <label className="text-sm font-bold text-slate-600">รหัสผ่าน</label>
                                <button type="button" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">ลืมรหัสผ่าน?</button>
                            </div>
                            <div className="relative group">
                                {/* ไอคอนแม่กุญแจ: ใช้ inset-y-0 และ flex เพื่อให้อยู่กลางแนวตั้งเป๊ะ */}
                                <div className="absolute left-5 inset-y-0 flex items-center justify-center pointer-events-none text-slate-400">
                                    <Lock size={19} />
                                </div>

                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    className="w-full pl-14 pr-14 py-4 bg-slate-50 border border-slate-100 rounded-full outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-500 transition-all text-sm leading-none"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />

                                {/* ไอคอนลูกตา: ใช้ inset-y-0 และ flex เพื่อให้อยู่กลางแนวตั้งเป๊ะเช่นกัน */}
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-5 inset-y-0 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors px-1"
                                >
                                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                                </button>
                            </div>
                        </div>

                        {/* Action Buttons - โค้งมนแบบ Pill Shape */}
                        <div className="pt-6">
                            <button
                                type="submit"
                                className="w-full py-4 bg-indigo-600 text-white rounded-full font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-2 group"
                            >
                                เข้าสู่ระบบ
                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}