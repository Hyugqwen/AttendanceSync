"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startBackgroundJobs = startBackgroundJobs;
const Attendance_1 = require("../models/Attendance");
const GuildConfig_1 = require("../models/GuildConfig");
let lastDigestDate = -1;
let lastLateAlertDate = -1;
function startBackgroundJobs(client) {
    setInterval(async () => {
        try {
            const now = new Date();
            // --- STATUS DASHBOARD (Every Minute) ---
            const allActiveSessions = await Attendance_1.Attendance.find({ status: { $in: ['IN', 'BREAK'] } });
            const allGuildConfigs = await GuildConfig_1.GuildConfig.find({ dashboardChannelId: { $ne: null } });
            for (const config of allGuildConfigs) {
                if (!config.dashboardChannelId)
                    continue;
                const guildId = config.guildId;
                const guildSessions = allActiveSessions.filter(s => s.guildId === guildId);
                try {
                    const channel = await client.channels.fetch(config.dashboardChannelId);
                    if (channel) {
                        let msgText = `🟢 **Live Attendance Dashboard** 🟢\n*Last Updated: ${now.toLocaleTimeString()}*\n\n`;
                        const clockedIn = guildSessions.filter(s => s.status === 'IN');
                        const onBreak = guildSessions.filter(s => s.status === 'BREAK');
                        msgText += `**Clocked In (${clockedIn.length}):**\n`;
                        if (clockedIn.length === 0)
                            msgText += `- Nobody\n`;
                        for (const s of clockedIn) {
                            const grossMs = now.getTime() - s.startTime.getTime();
                            const hrs = Math.floor(grossMs / (1000 * 60 * 60));
                            const mins = Math.floor((grossMs % (1000 * 60 * 60)) / (1000 * 60));
                            msgText += `- <@${s.userId}> (Since ${s.startTime.toLocaleTimeString()}) - ${hrs}h ${mins}m\n`;
                        }
                        msgText += `\n**On Break (${onBreak.length}):**\n`;
                        if (onBreak.length === 0)
                            msgText += `- Nobody\n`;
                        for (const s of onBreak) {
                            const lastBreak = s.breaks[s.breaks.length - 1];
                            const breakStartStr = lastBreak ? lastBreak.startTime.toLocaleTimeString() : 'Unknown';
                            msgText += `- <@${s.userId}> (Since ${breakStartStr})\n`;
                        }
                        if (config.dashboardMessageId) {
                            try {
                                const msg = await channel.messages.fetch(config.dashboardMessageId);
                                await msg.edit(msgText);
                            }
                            catch (e) {
                                const newMsg = await channel.send(msgText);
                                config.dashboardMessageId = newMsg.id;
                                await config.save();
                            }
                        }
                        else {
                            const newMsg = await channel.send(msgText);
                            config.dashboardMessageId = newMsg.id;
                            await config.save();
                        }
                    }
                }
                catch (e) { }
            }
            // --- LATE NOTIFICATIONS (10:00 AM) ---
            if (now.getHours() === 10 && now.getMinutes() === 0 && lastLateAlertDate !== now.getDate()) {
                lastLateAlertDate = now.getDate();
                const configsWithAlerts = await GuildConfig_1.GuildConfig.find({ lateAlertsChannelId: { $ne: null } });
                const startOfDay = new Date();
                startOfDay.setHours(0, 0, 0, 0);
                for (const config of configsWithAlerts) {
                    try {
                        const guild = await client.guilds.fetch(config.guildId);
                        if (!guild)
                            continue;
                        await guild.members.fetch();
                        const allMembers = guild.members.cache.filter(m => !m.user.bot);
                        const todaysRecords = await Attendance_1.Attendance.find({
                            guildId: config.guildId,
                            startTime: { $gte: startOfDay }
                        });
                        const clockedInUserIds = new Set(todaysRecords.map(r => r.userId));
                        const missingMembers = allMembers.filter(m => !clockedInUserIds.has(m.id));
                        if (missingMembers.size > 0 && config.lateAlertsChannelId) {
                            const channel = await client.channels.fetch(config.lateAlertsChannelId);
                            if (channel) {
                                let alertText = `⚠️ **Late Alert (${now.toLocaleDateString()})** ⚠️\nThe following members have not clocked in yet today:\n`;
                                for (const member of missingMembers.values()) {
                                    alertText += `- <@${member.id}>\n`;
                                }
                                await channel.send(alertText);
                            }
                        }
                    }
                    catch (e) {
                        console.error("Error in late notification:", e);
                    }
                }
            }
            // --- DAILY DIGEST LOGIC ---
            if (now.getHours() === 18 && now.getMinutes() === 0 && lastDigestDate !== now.getDate()) {
                lastDigestDate = now.getDate();
                const activeSessions = await Attendance_1.Attendance.find({ status: { $in: ['IN', 'BREAK'] } });
                const guildMap = {};
                for (const session of activeSessions) {
                    const gid = session.guildId;
                    if (gid) {
                        if (!guildMap[gid])
                            guildMap[gid] = [];
                        guildMap[gid].push(session);
                    }
                }
                for (const guildId of Object.keys(guildMap)) {
                    const guildConfig = await GuildConfig_1.GuildConfig.findOne({ guildId });
                    if (guildConfig && guildConfig.reportsChannelId) {
                        try {
                            const channel = await client.channels.fetch(guildConfig.reportsChannelId);
                            if (channel) {
                                let msg = `📊 **End of Day Summary (${now.toLocaleDateString()})**\nThe following users are still clocked in:\n`;
                                const sessionsForGuild = guildMap[guildId];
                                if (sessionsForGuild) {
                                    for (const session of sessionsForGuild) {
                                        const timeStr = session.startTime.toLocaleTimeString();
                                        const statusStr = session.status === 'BREAK' ? 'Currently on BREAK' : `Started at ${timeStr}`;
                                        msg += `- <@${session.userId}> (${statusStr})\n`;
                                    }
                                }
                                await channel.send(msg);
                            }
                        }
                        catch (e) {
                            console.error("Error sending daily digest:", e);
                        }
                    }
                }
            }
            // --- BREAK REMINDER LOGIC ---
            const sessions = await Attendance_1.Attendance.find({ status: 'BREAK' });
            for (const session of sessions) {
                const lastBreak = session.breaks[session.breaks.length - 1];
                if (lastBreak && !lastBreak.endTime) {
                    const durationMs = now.getTime() - lastBreak.startTime.getTime();
                    let overLimit = false;
                    if (lastBreak.type === 'LUNCH') {
                        if (now.getHours() >= 13) {
                            overLimit = true;
                        }
                    }
                    else {
                        if (durationMs >= 15 * 60 * 1000) {
                            overLimit = true;
                        }
                    }
                    if (overLimit) {
                        const lastReminded = lastBreak.lastReminderSentAt ? lastBreak.lastReminderSentAt.getTime() : 0;
                        const timeSinceLastReminder = now.getTime() - lastReminded;
                        if (timeSinceLastReminder >= 10 * 60 * 1000) {
                            lastBreak.lastReminderSentAt = now;
                            session.breaks.forEach((b) => {
                                if (!b.type)
                                    b.type = 'OTHER';
                            });
                            await session.save();
                            const guildConfig = await GuildConfig_1.GuildConfig.findOne({ guildId: session.guildId });
                            if (guildConfig && guildConfig.breakChannelId) {
                                const channel = await client.channels.fetch(guildConfig.breakChannelId);
                                if (channel) {
                                    channel.send(`⚠️ <@${session.userId}>, your break is over! Please use \`/continue\` to resume working.`);
                                }
                            }
                        }
                    }
                }
            }
        }
        catch (err) {
            console.error("Reminder loop error:", err);
        }
    }, 60 * 1000); // Run every minute
}
//# sourceMappingURL=backgroundJobs.js.map