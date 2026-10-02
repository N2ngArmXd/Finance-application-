import {
    Utensils,
    Car,
    ShoppingBag,
    Home,
    ReceiptText,
    HeartPulse,
    Music,
    GraduationCap,
    CreditCard,
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
    CreditCard,
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
    CreditCard: 'text-sky-600',
    Wallet: 'text-teal-500',
    Coins: 'text-yellow-500',
    TrendingUp: 'text-green-500',
    Gift: 'text-rose-500',
    Circle: 'text-slate-400',
};

// พื้นวงกลมอ่อน (-50) คู่กับสีไอคอน ใช้กับ CategoryAvatar
const SOFT_MAP = {
    Utensils: 'bg-orange-50',
    Car: 'bg-blue-50',
    ShoppingBag: 'bg-pink-50',
    Home: 'bg-emerald-50',
    ReceiptText: 'bg-amber-50',
    HeartPulse: 'bg-red-50',
    Music: 'bg-purple-50',
    GraduationCap: 'bg-indigo-50',
    CreditCard: 'bg-sky-50',
    Wallet: 'bg-teal-50',
    Coins: 'bg-yellow-50',
    TrendingUp: 'bg-green-50',
    Gift: 'bg-rose-50',
    Circle: 'bg-slate-100',
};

// ไอคอนหมวดในวงกลมพื้นอ่อน (size = เส้นผ่านศูนย์กลาง px)
export function CategoryAvatar({ name, size = 40, className = '' }) {
    const soft = SOFT_MAP[name] || SOFT_MAP.Circle;
    return (
        <span
            className={`shrink-0 rounded-full flex items-center justify-center ${soft} ${className}`}
            style={{ width: size, height: size }}
        >
            <CategoryIcon name={name} size={Math.round(size / 2)} strokeWidth={1.9} />
        </span>
    );
}

// แสดงไอคอนหมวดหมู่จากชื่อที่เก็บใน DB พร้อมสีประจำหมวด
// ส่ง className มาเพิ่มได้ (จะต่อท้าย จึง override สีได้ถ้าต้องการ)
export default function CategoryIcon({ name, className = '', ...props }) {
    const Icon = ICON_MAP[name] || Circle;
    const color = COLOR_MAP[name] || 'text-slate-400';
    return <Icon className={`${color} ${className}`} {...props} />;
}
