import { Wallet } from 'lucide-react';

export default function Navbar() {
    return (
        <nav className="bg-white border-b border-slate-100 py-4 mb-8">
            <div className="max-w-6xl mx-auto px-4 flex items-center gap-3">
                <div className="bg-indigo-600 p-2 rounded-xl text-white">
                    <Wallet size={24} />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-slate-800">Finance Application Management</h1>
            </div>
        </nav>
    );
}