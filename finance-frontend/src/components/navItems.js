import { LayoutDashboard, PlusCircle, Wallet, Coins, PiggyBank } from 'lucide-react';

// เมนูหลักของแอป ใช้ร่วมกันทั้ง Sidebar (desktop) และ BottomNav (มือถือ)
// shortLabel = ชื่อสั้นสำหรับแถบล่างที่มีที่จำกัด
export const navItems = [
    { id: 'dashboard', Icon: LayoutDashboard, label: 'หน้าหลัก', shortLabel: 'หน้าหลัก' },
    { id: 'history', Icon: Wallet, label: 'ประวัติธุรกรรม', shortLabel: 'ประวัติ' },
    { id: 'transaction', Icon: PlusCircle, label: 'บันทึกรายธุรกรรม', shortLabel: 'บันทึก' },
    { id: 'installment', Icon: Coins, label: 'ตารางผ่อนชำระ', shortLabel: 'ผ่อนชำระ' },
    { id: 'savings', Icon: PiggyBank, label: 'เงินออม', shortLabel: 'เงินออม' },
];
