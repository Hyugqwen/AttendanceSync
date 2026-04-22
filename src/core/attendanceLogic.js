"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleClockIn = handleClockIn;
exports.handleClockOut = handleClockOut;
exports.handleBreakStart = handleBreakStart;
exports.handleBreakEnd = handleBreakEnd;
const Attendance_1 = require("../models/Attendance");
const formatters_1 = require("../utils/formatters");
async function handleClockIn(userId, guildId) {
    try {
        const activeSession = await Attendance_1.Attendance.findOne({ userId, status: { $in: ['IN', 'BREAK'] } });
        if (activeSession) {
            return { success: false, message: "⚠️ You're already clocked in!" };
        }
        await Attendance_1.Attendance.create({ userId, guildId, startTime: new Date(), status: 'IN' });
        const now = new Date();
        return { success: true, message: `✅ **Clocked IN**\n👤 Name: <@${userId}>\n📅 Date: ${now.toLocaleDateString()}\n⏰ Time: ${now.toLocaleTimeString()}` };
    }
    catch (err) {
        console.error(err);
        return { success: false, message: "❌ Error saving to database." };
    }
}
async function handleClockOut(userId) {
    try {
        const activeSession = await Attendance_1.Attendance.findOne({ userId, status: { $in: ['IN', 'BREAK'] } });
        if (!activeSession) {
            return { success: false, message: "⚠️ You aren't clocked in yet! Type `/in` first." };
        }
        const now = new Date();
        activeSession.endTime = now;
        activeSession.status = 'OUT';
        if (activeSession.breaks.length > 0) {
            const lastBreak = activeSession.breaks[activeSession.breaks.length - 1];
            if (lastBreak && !lastBreak.endTime)
                lastBreak.endTime = now;
        }
        const totalGrossMs = now.getTime() - activeSession.startTime.getTime();
        let totalBreakMs = 0;
        activeSession.breaks.forEach((b) => {
            if (!b.type) {
                b.type = 'OTHER';
            }
            if (b.endTime && b.startTime) {
                totalBreakMs += b.endTime.getTime() - b.startTime.getTime();
            }
        });
        const netMs = totalGrossMs - totalBreakMs;
        await activeSession.save();
        let msg = `👋 **Clocked OUT**\n👤 Name: <@${userId}>\n📅 Date: ${now.toLocaleDateString()}\n⏰ Time: ${now.toLocaleTimeString()}\n⏱️ Total Time: ${(0, formatters_1.formatDuration)(netMs)}`;
        if (totalBreakMs > 0) {
            msg += ` (excluding ${(0, formatters_1.formatDuration)(totalBreakMs)} break time)`;
        }
        return { success: true, message: msg };
    }
    catch (err) {
        console.error(err);
        return { success: false, message: "❌ Error updating database." };
    }
}
async function handleBreakStart(userId) {
    try {
        const activeSession = await Attendance_1.Attendance.findOne({ userId, status: { $in: ['IN', 'BREAK'] } });
        if (!activeSession)
            return { success: false, message: "⚠️ You aren't clocked in yet!" };
        if (activeSession.status === 'BREAK')
            return { success: false, message: "⚠️ You're already on break!" };
        const now = new Date();
        const hour = now.getHours();
        let breakType = 'OTHER';
        if (hour >= 8 && hour < 12)
            breakType = 'MORNING';
        else if (hour >= 12 && hour < 13)
            breakType = 'LUNCH';
        else if (hour >= 13 && hour < 17)
            breakType = 'AFTERNOON';
        if (breakType !== 'OTHER') {
            const alreadyTook = activeSession.breaks.some((b) => b.type === breakType);
            if (alreadyTook) {
                return { success: false, message: `⚠️ You already took your ${breakType.toLowerCase()} break!` };
            }
        }
        activeSession.status = 'BREAK';
        activeSession.breaks.push({ type: breakType, startTime: now });
        await activeSession.save();
        return { success: true, message: `☕ **Break Started**\n👤 Name: <@${userId}>\n📅 Date: ${now.toLocaleDateString()}\n⏰ Time: ${now.toLocaleTimeString()}` };
    }
    catch (err) {
        console.error(err);
        return { success: false, message: "❌ Error updating database." };
    }
}
async function handleBreakEnd(userId) {
    try {
        const activeSession = await Attendance_1.Attendance.findOne({ userId, status: { $in: ['IN', 'BREAK'] } });
        if (!activeSession)
            return { success: false, message: "⚠️ You aren't clocked in yet!" };
        if (activeSession.status === 'IN')
            return { success: false, message: "⚠️ You aren't on break!" };
        const lastBreak = activeSession.breaks[activeSession.breaks.length - 1];
        if (lastBreak) {
            lastBreak.endTime = new Date();
        }
        activeSession.breaks.forEach((b) => {
            if (!b.type)
                b.type = 'OTHER';
        });
        activeSession.status = 'IN';
        await activeSession.save();
        const now = new Date();
        return { success: true, message: `▶️ **Break Ended**\n👤 Name: <@${userId}>\n📅 Date: ${now.toLocaleDateString()}\n⏰ Time: ${now.toLocaleTimeString()}` };
    }
    catch (err) {
        console.error(err);
        return { success: false, message: "❌ Error updating database." };
    }
}
//# sourceMappingURL=attendanceLogic.js.map