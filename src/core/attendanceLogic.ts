import { Attendance, IAttendance, IBreak } from '../models/Attendance';
import { formatDuration } from '../utils/formatters';

export async function handleClockIn(userId: string, guildId: string): Promise<{ success: boolean, message: string }> {
    try {
        const activeSession = await Attendance.findOne({ userId, status: { $in: ['IN', 'BREAK'] } });
        if (activeSession) {
            return { success: false, message: "⚠️ You're already clocked in!" };
        }
        await Attendance.create({ userId, guildId, startTime: new Date(), status: 'IN' });
        const now = new Date();
        return { success: true, message: `✅ **Clocked IN**\n👤 Name: <@${userId}>\n📅 Date: ${now.toLocaleDateString()}\n⏰ Time: ${now.toLocaleTimeString()}` };
    } catch (err) {
        console.error(err);
        return { success: false, message: "❌ Error saving to database." };
    }
}

export async function handleClockOut(userId: string): Promise<{ success: boolean, message: string }> {
    try {
        const activeSession = await Attendance.findOne({ userId, status: { $in: ['IN', 'BREAK'] } });
        if (!activeSession) {
            return { success: false, message: "⚠️ You aren't clocked in yet! Type `/in` first." };
        }
        
        const now = new Date();
        activeSession.endTime = now;
        activeSession.status = 'OUT';
        
        if (activeSession.breaks.length > 0) {
            const lastBreak = activeSession.breaks[activeSession.breaks.length - 1];
            if (lastBreak && !lastBreak.endTime) lastBreak.endTime = now;
        }

        const totalGrossMs = now.getTime() - activeSession.startTime.getTime();
        let totalBreakMs = 0;
        activeSession.breaks.forEach((b: IBreak) => {
            if (!b.type) {
                b.type = 'OTHER';
            }
            if (b.endTime && b.startTime) {
                totalBreakMs += b.endTime.getTime() - b.startTime.getTime();
            }
        });
        const netMs = totalGrossMs - totalBreakMs;

        await activeSession.save();

        let msg = `👋 **Clocked OUT**\n👤 Name: <@${userId}>\n📅 Date: ${now.toLocaleDateString()}\n⏰ Time: ${now.toLocaleTimeString()}\n⏱️ Total Time: ${formatDuration(netMs)}`;
        if (totalBreakMs > 0) {
            msg += ` (excluding ${formatDuration(totalBreakMs)} break time)`;
        }

        return { success: true, message: msg };
    } catch (err) {
        console.error(err);
        return { success: false, message: "❌ Error updating database." };
    }
}

export async function handleBreakStart(userId: string): Promise<{ success: boolean, message: string }> {
    try {
        const activeSession = await Attendance.findOne({ userId, status: { $in: ['IN', 'BREAK'] } });
        if (!activeSession) return { success: false, message: "⚠️ You aren't clocked in yet!" };
        if (activeSession.status === 'BREAK') return { success: false, message: "⚠️ You're already on break!" };

        const now = new Date();
        const hour = now.getHours();
        let breakType: IBreak['type'] = 'OTHER';
        if (hour >= 8 && hour < 12) breakType = 'MORNING';
        else if (hour >= 12 && hour < 13) breakType = 'LUNCH';
        else if (hour >= 13 && hour < 17) breakType = 'AFTERNOON';

        if (breakType !== 'OTHER') {
            const alreadyTook = activeSession.breaks.some((b: IBreak) => b.type === breakType);
            if (alreadyTook) {
                return { success: false, message: `⚠️ You already took your ${breakType.toLowerCase()} break!` };
            }
        }

        activeSession.status = 'BREAK';
        activeSession.breaks.push({ type: breakType, startTime: now });
        await activeSession.save();

        return { success: true, message: `☕ **Break Started**\n👤 Name: <@${userId}>\n📅 Date: ${now.toLocaleDateString()}\n⏰ Time: ${now.toLocaleTimeString()}` };
    } catch (err) {
        console.error(err);
        return { success: false, message: "❌ Error updating database." };
    }
}

export async function handleBreakEnd(userId: string): Promise<{ success: boolean, message: string }> {
    try {
        const activeSession = await Attendance.findOne({ userId, status: { $in: ['IN', 'BREAK'] } });
        if (!activeSession) return { success: false, message: "⚠️ You aren't clocked in yet!" };
        if (activeSession.status === 'IN') return { success: false, message: "⚠️ You aren't on break!" };

        const lastBreak = activeSession.breaks[activeSession.breaks.length - 1];
        if (lastBreak) {
            lastBreak.endTime = new Date();
        }
        
        
        activeSession.breaks.forEach((b: IBreak) => {
            if (!b.type) b.type = 'OTHER';
        });

        activeSession.status = 'IN';
        await activeSession.save();

        const now = new Date();
        return { success: true, message: `▶️ **Break Ended**\n👤 Name: <@${userId}>\n📅 Date: ${now.toLocaleDateString()}\n⏰ Time: ${now.toLocaleTimeString()}` };
    } catch (err) {
        console.error(err);
        return { success: false, message: "❌ Error updating database." };
    }
}
