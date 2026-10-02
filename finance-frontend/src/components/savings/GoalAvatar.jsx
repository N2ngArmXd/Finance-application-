import { PiggyBank } from 'lucide-react';
import { GOAL_ICONS, goalColor } from '../../utils/savingsTheme';

// ไอคอนกระปุกในวงกลมพื้นอ่อนตามสีกระปุก (size = เส้นผ่านศูนย์กลาง px)
export default function GoalAvatar({ icon, color, size = 44 }) {
    const Icon = GOAL_ICONS[icon] || PiggyBank;
    const c = goalColor(color);
    return (
        <span className={`shrink-0 rounded-full flex items-center justify-center ${c.soft}`} style={{ width: size, height: size }}>
            <Icon size={Math.round(size / 2)} strokeWidth={1.9} className={c.text} />
        </span>
    );
}
