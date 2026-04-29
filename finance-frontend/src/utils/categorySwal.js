import Swal from 'sweetalert2';

export const showAddCategoryModal = (onSuccess) => {

    const iconList = [
        { name: 'Utensils', emoji: '🍔' },
        { name: 'Car', emoji: '🚗' },
        { name: 'ShoppingBag', emoji: '🛍️' },
        { name: 'Heart', emoji: '❤️' },
        { name: 'Home', emoji: '🏠' },
        { name: 'Smartphone', emoji: '📱' },
        { name: 'Briefcase', emoji: '💼' },
        { name: 'Music', emoji: '🎵' }
    ];

    window.currentSelectedIcon = iconList[0].name;

    Swal.fire({
        title: '<span class="text-xl font-black">เพิ่มหมวดหมู่ใหม่</span>',
        html: `
            <div class="text-left space-y-4">
                <div>
                    <label class="block text-sm font-bold mb-2">เลือกไอคอน</label>
                    <div id="icon-grid" class="grid grid-cols-4 gap-2 bg-slate-50 p-3 rounded-2xl">
                        ${iconList.map(icon => `
                            <div 
                                onclick="window.selectSwalIcon('${icon.name}')"
                                id="icon-btn-${icon.name}"
                                class="icon-option cursor-pointer text-2xl p-2 flex items-center justify-center rounded-xl hover:bg-indigo-100 transition-all 
                                ${icon.name === window.currentSelectedIcon ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white'}"
                            >
                                ${icon.emoji}
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-bold mb-1">ชื่อหมวดหมู่</label>
                    <input id="swal-input-name" class="swal2-input !w-full !m-0 !rounded-xl" placeholder="เช่น ค่าอาหาร, เงินเดือน">
                </div>

                <div class="mt-4">
                    <label class="block text-sm font-bold mb-1">ประเภท</label>
                    <select id="swal-input-type" class="swal2-select !w-full !m-0 !rounded-xl">
                        <option value="EXPENSE">รายจ่าย (Expense)</option>
                        <option value="INCOME">รายรับ (Income)</option>
                    </select>
                </div>
            </div>
        `,
        didOpen: () => {
            // สร้างฟังก์ชันชั่วคราวใน window เพื่อให้ HTML String เรียกใช้ได้
            window.selectSwalIcon = (iconName) => {
                window.currentSelectedIcon = iconName;
                // ลบคลาสที่เลือกอยู่ออกทั้งหมด
                document.querySelectorAll('.icon-option').forEach(el => {
                    el.classList.remove('bg-indigo-600', 'text-white', 'shadow-lg');
                    el.classList.add('bg-white');
                });
                // เพิ่มคลาสให้ตัวที่ถูกเลือก
                const selectedEl = document.getElementById(`icon-btn-${iconName}`);
                selectedEl.classList.remove('bg-white');
                selectedEl.classList.add('bg-indigo-600', 'text-white', 'shadow-lg');
            };
        },
        showCancelButton: true,
        confirmButtonText: 'บันทึกรายการ',
        cancelButtonText: 'ปิด',
        confirmButtonColor: '#4F46E5',
        cancelButtonColor: '#94a3b8',
        customClass: {
            popup: 'rounded-[2rem] p-6',
            confirmButton: 'rounded-xl px-6 py-3 font-bold',
            cancelButton: 'rounded-xl px-6 py-3 font-bold'
        },
        focusConfirm: false,
        preConfirm: async () => {
            const name = document.getElementById('swal-input-name').value;
            const type = document.getElementById('swal-input-type').value;
            const icon = window.currentSelectedIcon;

            if (!name) {
                Swal.showValidationMessage('กรุณากรอกชื่อหมวดหมู่');
                return false;
            }

            try {
                const response = await fetch('/api/finance-app/add/categories', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, type, icon })
                });

                if (!response.ok) throw new Error('บันทึกไม่สำเร็จ');
                return true;
            } catch (error) {
                Swal.showValidationMessage(`Request failed: ${error}`);
            }
        }
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({
                icon: 'success',
                title: 'สำเร็จ!',
                text: 'เพิ่มหมวดหมู่ใหม่เรียบร้อยแล้ว',
                confirmButtonColor: '#4F46E5',
            });
            onSuccess();
            delete window.selectSwalIcon;
            delete window.currentSelectedIcon;
        }
    });
};