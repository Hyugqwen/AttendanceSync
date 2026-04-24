import { Client, TextChannel, AttachmentBuilder } from 'discord.js';
import { Attendance, IAttendance, IBreak } from '../models/Attendance';
import { GuildConfig, IGuildConfig } from '../models/GuildConfig';
import { generateAttendanceCSV } from '../utils/csvGenerator';

let lastDigestDate = -1;
let lastLateAlertDate = -1;

export function startBackgroundJobs(client: Client) {
    const runJobs = async () => {
        const now = new Date();
        try {

            // --- STATUS DASHBOARD (Every Minute) ---
            const allActiveSessions = await Attendance.find({ status: { $in: ['IN', 'BREAK'] } });
            const allGuildConfigs = await GuildConfig.find({ dashboardChannelId: { $ne: null } });
            
            for (const config of allGuildConfigs) {
                if (!config.dashboardChannelId) continue;
                const guildId = config.guildId;
                const guildSessions = allActiveSessions.filter((s: IAttendance) => s.guildId === guildId);
                
                try {
                    const channel = await client.channels.fetch(config.dashboardChannelId) as TextChannel;
                    if (channel) {
                        let msgText = `🟢 **Live Attendance Dashboard** 🟢\n*Last Updated: ${now.toLocaleTimeString()}*\n\n`;
                        
                        const clockedIn = guildSessions.filter((s: IAttendance) => s.status === 'IN');
                        const onBreak = guildSessions.filter((s: IAttendance) => s.status === 'BREAK');
                        
                        msgText += `**Clocked In (${clockedIn.length}):**\n`;
                        if (clockedIn.length === 0) msgText += `- Nobody\n`;
                        for (const s of clockedIn) {
                            const grossMs = now.getTime() - s.startTime.getTime();
                            const hrs = Math.floor(grossMs / (1000 * 60 * 60));
                            const mins = Math.floor((grossMs % (1000 * 60 * 60)) / (1000 * 60));
                            msgText += `- <@${s.userId}> (Since ${s.startTime.toLocaleTimeString()}) - ${hrs}h ${mins}m\n`;
                        }
                        
                        msgText += `\n**On Break (${onBreak.length}):**\n`;
                        if (onBreak.length === 0) msgText += `- Nobody\n`;
                        for (const s of onBreak) {
                            const lastBreak = s.breaks[s.breaks.length - 1];
                            const breakStartStr = lastBreak ? lastBreak.startTime.toLocaleTimeString() : 'Unknown';
                            msgText += `- <@${s.userId}> (Since ${breakStartStr})\n`;
                        }
                        
                        if (config.dashboardMessageId) {
                            try {
                                const msg = await channel.messages.fetch(config.dashboardMessageId);
                                if (msg.content !== msgText) {
                                    await msg.edit(msgText);
                                }
                            } catch(e) {
                                console.log(`🔄 Dashboard message missing for guild ${config.guildId}, sending new one...`);
                                // Message might have been deleted, send a new one
                                const newMsg = await channel.send(msgText);
                                config.dashboardMessageId = newMsg.id;
                                await config.save();
                            }
                        } else {
                            console.log(`🆕 Creating new dashboard for guild ${config.guildId}...`);
                            const newMsg = await channel.send(msgText);
                            config.dashboardMessageId = newMsg.id;
                            await config.save();
                        }
                    }
                } catch(err) {
                    console.error(`Failed to update dashboard for guild ${config.guildId}:`, err);
                }
            }

            // --- LATE NOTIFICATIONS (10:00 AM) ---
            if (now.getHours() === 10 && now.getMinutes() === 0 && lastLateAlertDate !== now.getDate()) {
                lastLateAlertDate = now.getDate();
                const configsWithAlerts = await GuildConfig.find({ lateAlertsChannelId: { $ne: null } });
                const startOfDay = new Date();
                startOfDay.setHours(0,0,0,0);
                
                for (const config of configsWithAlerts) {
                    try {
                        const guild = await client.guilds.fetch(config.guildId as string);
                        if (!guild) continue;
                        
                        await guild.members.fetch();
                        const allMembers = guild.members.cache.filter(m => !m.user.bot);
                        
                        const todaysRecords = await Attendance.find({ 
                            guildId: config.guildId, 
                            startTime: { $gte: startOfDay }
                        });
                        
                        const clockedInUserIds = new Set(todaysRecords.map(r => r.userId));
                        const missingMembers = allMembers.filter(m => !clockedInUserIds.has(m.id));
                        
                        if (missingMembers.size > 0 && config.lateAlertsChannelId) {
                            const channel = await client.channels.fetch(config.lateAlertsChannelId) as TextChannel;
                            if (channel) {
                                let alertText = `⚠️ **Late Alert (${now.toLocaleDateString()})** ⚠️\nThe following members have not clocked in yet today:\n`;
                                for (const member of missingMembers.values()) {
                                    alertText += `- <@${member.id}>\n`;
                                }
                                await channel.send(alertText);
                            }
                        }
                    } catch(e) {
                        console.error("Error in late notification:", e);
                    }
                }
            }

            // --- DAILY DIGEST LOGIC (6:00 PM) ---
            if (now.getHours() === 18 && now.getMinutes() === 0 && lastDigestDate !== now.getDate()) {
                lastDigestDate = now.getDate();
                
                const startOfDay = new Date(now);
                startOfDay.setHours(0,0,0,0);
                
                // Fetch ALL records for today
                const todaysRecords = await Attendance.find({ 
                    startTime: { $gte: startOfDay }
                });

                // Group by Guild
                const guildMap: { [key: string]: IAttendance[] } = {};
                for (const record of todaysRecords) {
                    const gid = record.guildId as string;
                    if (gid) {
                        if (!guildMap[gid]) guildMap[gid] = [];
                        guildMap[gid]!.push(record);
                    }
                }

                for (const guildId of Object.keys(guildMap)) {
                    const guildConfig = await GuildConfig.findOne({ guildId });
                    if (guildConfig && guildConfig.reportsChannelId) {
                        try {
                            const channel = await client.channels.fetch(guildConfig.reportsChannelId) as TextChannel;
                            if (channel) {
                                const sessionsForGuild = guildMap[guildId] || [];
                                const stillClockedIn = sessionsForGuild.filter(s => s.status !== 'OUT');
                                
                                let msg = `📊 **End of Day Summary (${now.toLocaleDateString()})**\n`;
                                msg += `Total members clocked in today: **${sessionsForGuild.length}**\n`;
                                
                                if (stillClockedIn.length > 0) {
                                    msg += `\nThe following users are still clocked in:\n`;
                                    for (const session of stillClockedIn) {
                                        const timeStr = session.startTime.toLocaleTimeString();
                                        const statusStr = session.status === 'BREAK' ? 'Currently on BREAK' : `Started at ${timeStr}`;
                                        msg += `- <@${session.userId}> (${statusStr})\n`;
                                    }
                                } else {
                                    msg += `\nAll members have clocked out for the day.`;
                                }

                                // Generate CSV
                                const csvData = await generateAttendanceCSV(sessionsForGuild, client, guildId);
                                const attachment = new AttachmentBuilder(Buffer.from(csvData), { name: `daily-attendance-${now.toISOString().split('T')[0]}.csv` });

                                await channel.send({ 
                                    content: msg, 
                                    files: [attachment] 
                                });
                            }
                        } catch(e) {
                            console.error(`Error sending daily digest for guild ${guildId}:`, e);
                        }
                    }
                }
            }

            // --- BREAK REMINDER LOGIC ---
            const sessions = await Attendance.find({ status: 'BREAK' });
            for (const session of sessions) {
                const lastBreak = session.breaks[session.breaks.length - 1];
                if (lastBreak && !lastBreak.endTime) {
                    const durationMs = now.getTime() - lastBreak.startTime.getTime();
                    let overLimit = false;

                    if (lastBreak.type === 'LUNCH') {
                        if (now.getHours() >= 13) {
                            overLimit = true;
                        }
                    } else {
                        if (durationMs >= 15 * 60 * 1000) {
                            overLimit = true;
                        }
                    }

                    if (overLimit) {
                        const lastReminded = lastBreak.lastReminderSentAt ? lastBreak.lastReminderSentAt.getTime() : 0;
                        const timeSinceLastReminder = now.getTime() - lastReminded;

                        if (timeSinceLastReminder >= 10 * 60 * 1000) {
                            lastBreak.lastReminderSentAt = now;
                            session.breaks.forEach((b: IBreak) => {
                                if (!b.type) b.type = 'OTHER';
                            });
                            await session.save();
                            
                            const guildConfig = await GuildConfig.findOne({ guildId: session.guildId });
                            if (guildConfig && guildConfig.breakChannelId) {
                                try {
                                    const channel = await client.channels.fetch(guildConfig.breakChannelId) as TextChannel;
                                    if (channel) {
                                        channel.send(`⚠️ <@${session.userId}>, your break is over! Please use \`/continue\` to resume working.`);
                                    }
                                } catch (e) {
                                    console.error(`Error sending break reminder for user ${session.userId}:`, e);
                                }
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Critical error in background jobs loop:", err);
        } finally {
            // Schedule next run in 60 seconds, ensuring no overlaps
            setTimeout(runJobs, 60 * 1000);
        }
    };

    // Start the first run
    runJobs();
}

