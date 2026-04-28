import React, { useState } from 'react';

export default function Login({ onLoginSuccess }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
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
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <form onSubmit={handleLogin} className="p-8 bg-white rounded-3xl shadow-xl w-96">
                <h2 className="text-2xl font-black mb-6 text-center text-indigo-600">เข้าสู่ระบบ</h2>

                {error && <div className="mb-4 text-red-500 text-sm font-bold text-center">{error}</div>}

                <input
                    type="text"
                    placeholder="Username"
                    className="w-full p-4 mb-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <input
                    type="password"
                    placeholder="Password"
                    className="w-full p-4 mb-6 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">
                    Login
                </button>
            </form>
        </div>
    );
} 