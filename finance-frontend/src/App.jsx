
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from './components/Sidebar';
import TransactionForm from './components/TransactionForm';

const API_BASE = 'http://localhost:8081/finance-app';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activePage, setActivePage] = useState('dashboard');
  const [categories, setCategories] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);

  // 1. กำหนดโครงสร้างข้อมูลให้ครบ (Amount, Description, Category, Date)
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    categoryId: '',
    transactionDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axios.get('http://localhost:8081/finance-app/categories');
        setCategories(res.data);
      } catch (err) {
        console.error("Error:", err);
      }
    };
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_BASE}/categories`);
      setCategories(res.data);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      // 2. ส่งข้อมูลไปที่ Backend (ต้องตรงกับ DTO ใน Java)
      await axios.post(`${API_BASE}/transactions/create`, {
        amount: parseFloat(formData.amount),
        description: formData.description,
        categoryId: parseInt(formData.categoryId),
        transactionDate: formData.transactionDate
      });

      // 3. ล้างค่าฟอร์ม (ยกเว้นวันที่ให้คงไว้ที่วันนี้)
      setFormData({
        amount: '',
        description: '',
        categoryId: '',
        transactionDate: new Date().toISOString().split('T')[0]
      });

      setFormData({ amount: '', description: '', categoryId: '', transactionDate: new Date().toISOString().split('T')[0] });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (err) {
      console.error("Save error:", err);
      alert("เกิดข้อผิดพลาดในการบันทึก");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        activePage={activePage}
        setActivePage={setActivePage}
      />

      <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-72' : 'ml-20'}`}>
        <div className="max-w-4xl mx-auto px-6 py-10">

          {/* เงื่อนไขการแสดงผลหน้าจอ */}
          {activePage === 'dashboard' ? (
            <section>
              <h1 className="text-3xl font-black text-slate-800 mb-2">หน้าหลัก</h1>
              <p className="text-slate-500 mb-8">ภาพรวมการเงินของคุณ</p>
              <div className="bg-white p-10 rounded-[2.5rem] border border-dashed border-slate-200 text-center text-slate-400 font-bold">
                ยังไม่มีข้อมูลสรุปผล... บันทึกรายการก่อนนะ!
              </div>
            </section>
          ) : (
            <section>
              <h1 className="text-3xl font-black text-slate-800 mb-2">บันทึกรายรับรายจ่าย</h1>
              <p className="text-slate-500 mb-8">กรอกรายละเอียดเพื่อบันทึกรายการใหม่</p>

              <div className="max-w-xl mx-auto">
                <TransactionForm
                  formData={formData}
                  setFormData={setFormData}
                  onSubmit={handleSave}
                  categories={categories}
                />
              </div>
            </section>
          )}

        </div>
      </div>

      {/* ✅ Success Pop-up Modal */}
      {showSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">

          {/* 1. Backdrop (พื้นหลังมืด) - ใช้ animate-fadeIn ที่เราสร้างใน config */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fadeIn"
            onClick={() => setShowSuccess(false)}
          ></div>

          {/* 2. กล่อง Pop-up - ใช้ animate-zoomIn (ที่เด้งแบบ Bouncy นิดๆ) */}
          <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl relative z-10 w-full max-w-sm text-center animate-zoomIn">

            {/* ไอคอนวงกลมสีเขียวพร้อมเช็คถูก */}
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-emerald-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            {/* ข้อความแจ้งเตือน */}
            <h3 className="text-2xl font-black text-slate-800 mb-2">บันทึกสำเร็จ!</h3>
            <p className="text-slate-500 mb-8 font-medium leading-relaxed">
              ข้อมูลรายรับ-รายจ่ายของคุณ <br />
              ถูกจัดเก็บเข้าระบบเรียบร้อยแล้ว
            </p>

            {/* ปุ่มปิด */}
            <button
              onClick={() => setShowSuccess(false)}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all active:scale-[0.97] shadow-lg shadow-indigo-100"
            >
              ตกลง
            </button>
          </div>

        </div>
      )}
    </div>
  );
}

export default App;