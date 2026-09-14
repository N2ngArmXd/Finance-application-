import {
    Utensils,
    Car,
    ShoppingBag,
    Home,
    ReceiptText,
    HeartPulse,
    Music,
    GraduationCap,
    Wallet,
    Coins,
    TrendingUp,
    Gift,
    Circle,
} from 'lucide-react';

// map ชื่อไอคอน (เก็บใน DB) -> component ของ lucide-react
const ICON_MAP = {
    Utensils,
    Car,
    ShoppingBag,
    Home,
    ReceiptText,
    HeartPulse,
    Music,
    GraduationCap,
    Wallet,
    Coins,
    TrendingUp,
    Gift,
    Circle,
};

// สีประจำแต่ละไอคอน (โทนใกล้เคียง emoji เดิม)
const COLOR_MAP = {
    Utensils: 'text-orange-500',
    Car: 'text-blue-500',
    ShoppingBag: 'text-pink-500',
    Home: 'text-emerald-500',
    ReceiptText: 'text-amber-600',
    HeartPulse: 'text-red-500',
    Music: 'text-purple-500',
    GraduationCap: 'text-indigo-500',
    Wallet: 'text-teal-500',
    Coins: 'text-yellow-500',
    TrendingUp: 'text-green-500',
    Gift: 'text-rose-500',
    Circle: 'text-slate-400',
};

// แสดงไอคอนหมวดหมู่จากชื่อที่เก็บใน DB พร้อมสีประจำหมวด
// ส่ง className มาเพิ่มได้ (จะต่อท้าย จึง override สีได้ถ้าต้องการ)
export default function CategoryIcon({ name, className = '', ...props }) {
    const Icon = ICON_MAP[name] || Circle;
    const color = COLOR_MAP[name] || 'text-slate-400';
    return <Icon className={`${color} ${className}`} {...props} />;
}
