// src/components/TransactionForm.jsx
export default function TransactionForm({ formData, setFormData, onSubmit, categories }) {
    return (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100">
            <form onSubmit={onSubmit} className="space-y-6">

                {/* หมวดหมู่ */}
                <div>
                    <label className="text-xs font-bold text-slate-400 uppercase ml-2 mb-2 block tracking-wider">หมวดหมู่</label>
                    <select
                        required
                        className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-indigo-500 focus:bg-white transition-all outline-none appearance-none"
                        value={formData.categoryId}
                        onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    >
                        <option value="">---- เลือกหมวดหมู่ ----</option>
                        {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                                {cat.name} ({cat.type === 'INCOME' ? 'รายรับ' : 'รายจ่าย'})
                            </option>
                        ))}
                    </select>
                </div>

                {/* จำนวนเงิน */}
                <div>
                    <label className="text-xs font-bold text-slate-400 uppercase ml-2 mb-2 block tracking-wider">จำนวนเงิน</label>
                    <input
                        type="number" step="0.01" placeholder="0.00" required
                        className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-indigo-500 focus:bg-white transition-all font-bold text-2xl text-indigo-600 outline-none"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    />
                </div>

                {/* รายละเอียด */}
                <div>
                    <label className="text-xs font-bold text-slate-400 uppercase ml-2 mb-2 block tracking-wider">รายละเอียด</label>
                    <input
                        type="text" placeholder="ซื้ออะไรมา? หรือรายรับจากไหน?"
                        className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-indigo-500 focus:bg-white transition-all outline-none"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                </div>

                {/* วันที่ */}
                <div>
                    <label className="text-xs font-bold text-slate-400 uppercase ml-2 mb-2 block tracking-wider">วันที่ใช้จ่าย</label>
                    <input
                        type="date" required
                        className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-indigo-500 focus:bg-white transition-all outline-none"
                        value={formData.transactionDate}
                        onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })}
                    />
                </div>

                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-2xl font-black text-lg shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] mt-4">
                    บันทึกข้อมูล
                </button>
            </form>
        </div>
    );
}