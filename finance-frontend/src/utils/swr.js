import Swal from 'sweetalert2';

const MySwal = Swal.mixin({
    customClass: {
        popup: 'rounded-3xl border-none shadow-2xl',
        confirmButton: 'px-8 py-3 rounded-2xl font-bold transition-all',
        cancelButton: 'px-8 py-3 rounded-2xl font-bold transition-all'
    },
    buttonsStyling: false,
    showClass: {
        popup: 'animate-zoom-in'
    },
    hideClass: {
        popup: 'animate-fade-in'
    }
});

export const showSuccess = (title, text) => {
    return MySwal.fire({
        icon: 'success',
        title: `<span class="text-slate-800 font-black">${title || 'สำเร็จ!'}</span>`,
        text: text,
        iconColor: '#4F46E5', // สี Indigo-600
        confirmButtonText: 'ตกลง',
        customClass: {
            popup: 'rounded-[2rem] p-8',
            confirmButton: 'bg-indigo-600 text-white hover:bg-indigo-700 px-10 py-3 rounded-xl'
        }
    });
};

export const showError = (title, text) => {
    return MySwal.fire({
        icon: 'error',
        title: `<span class="text-slate-800 font-black">${title || 'พลาดแล้ว!'}</span>`,
        text: text,
        confirmButtonText: 'ลองใหม่',
        customClass: {
            popup: 'rounded-[2rem] p-8',
            confirmButton: 'bg-red-500 text-white hover:bg-red-600 px-10 py-3 rounded-xl'
        }
    });
};

export const showConfirm = (title, text) => {
    return Swal.fire({
        title: title,
        text: text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#4F46E5',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'ยืนยัน',
        cancelButtonText: 'ยกเลิก',
        reverseButtons: true
    });
};