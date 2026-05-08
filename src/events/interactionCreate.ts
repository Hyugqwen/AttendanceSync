import { Events, Client, AttachmentBuilder, MessageFlags, TextChannel } from 'discord.js';
import { Attendance, IAttendance, IBreak } from '../models/Attendance';
import { GuildConfig, IGuildConfig } from '../models/GuildConfig';
import { handleClockIn, handleClockOut, handleBreakStart, handleBreakEnd } from '../core/attendanceLogic';
import { generateAttendanceCSV } from '../utils/csvGenerator';

export function setupInteractionCreateEvent(client: Client) {
    client.on(Events.InteractionCreate, async (interaction) => {
        try {
            if (!interaction.isChatInputCommand()) return;

            const { commandName, user, guildId, channelId } = interaction;
            console.log(`📥 Received command: /${commandName} from ${user.tag} in channel ${channelId}`);

            if (!guildId) return;

            // --- ADMIN COMMANDS ---

            if (commandName === 'report') {
                await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                try {
                    const timeframe = interaction.options.getString('timeframe');
                    const now = new Date();
                    let startDate = new Date();
                    if (timeframe === 'daily') startDate.setDate(now.getDate() - 1);
                    else if (timeframe === 'weekly') startDate.setDate(now.getDate() - 7);
                    else if (timeframe === 'monthly') startDate.setDate(now.getDate() - 30);

                    const records = await Attendance.find({
                        guildId,
                        startTime: { $gte: startDate }
                    });

                    if (records.length === 0) {
                        return interaction.editReply("⚠️ No attendance records found for this timeframe.");
                    }

                    const csvData = await generateAttendanceCSV(records, client, guildId);
                    const attachment = new AttachmentBuilder(Buffer.from(csvData), { name: `attendance-report-${timeframe}.csv` });
                    
                    return interaction.editReply({ content: `✅ Here is your **${timeframe}** attendance report:`, files: [attachment] });
                } catch (err) {
                    console.error(`Error in /report:`, err);
                    return interaction.editReply("❌ Error generating report.");
                }
            }

            if (commandName === 'force-out') {
                const targetUser = interaction.options.getUser('user');
                if (!targetUser) return interaction.reply({ content: "⚠️ User not provided.", flags: [MessageFlags.Ephemeral] });
                
                // Pre-check for force-out
                const activeSession = await Attendance.findOne({ userId: targetUser.id, guildId, status: { $in: ['IN', 'BREAK'] } });
                if (!activeSession) {
                    return interaction.reply({ content: "⚠️ This user is not clocked in on this server.", flags: [MessageFlags.Ephemeral] });
                }

                await interaction.deferReply();
                const result = await handleClockOut(targetUser.id, guildId);
                return interaction.editReply({ content: result.message });
            }

            if (commandName === 'adjust-time') {
                await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                const targetUser = interaction.options.getUser('user');
                const action = interaction.options.getString('action');
                const timeStr = interaction.options.getString('time') || '';
                
                if (!targetUser || !action) return interaction.editReply({ content: "⚠️ Missing parameters." });
                
                const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/i);
                if (!match) {
                    return interaction.editReply({ content: "⚠️ Invalid time format. Please use HH:MM AM/PM (e.g., 09:00 AM)." });
                }
                
                let hours = parseInt(match[1] as string);
                const mins = parseInt(match[2] as string);
                const modifier = match[3] ? match[3].toUpperCase() : null;
                
                if (modifier === 'PM' && hours < 12) hours += 12;
                if (modifier === 'AM' && hours === 12) hours = 0;
                
                const adjustDate = new Date();
                adjustDate.setHours(hours, mins, 0, 0);
                
                const startOfDay = new Date();
                startOfDay.setHours(0,0,0,0);
                
                let session = await Attendance.findOne({
                    userId: targetUser.id,
                    guildId,
                    startTime: { $gte: startOfDay }
                });
                
                if (action === 'in') {
                    if (!session) {
                        session = new Attendance({
                            userId: targetUser.id,
                            guildId,
                            status: 'IN',
                            startTime: adjustDate
                        });
                    } else {
                        session.startTime = adjustDate;
                    }
                    await session.save();
                    return interaction.editReply({ content: `✅ Adjusted <@${targetUser.id}>'s Clock In time to **${adjustDate.toLocaleTimeString()}**.` });
                } else if (action === 'out') {
                    if (!session) {
                        return interaction.editReply({ content: "⚠️ Cannot set a Clock Out time because the user hasn't clocked in today." });
                    }
                    session.endTime = adjustDate;
                    session.status = 'OUT';
                    await session.save();
                    return interaction.editReply({ content: `✅ Adjusted <@${targetUser.id}>'s Clock Out time to **${adjustDate.toLocaleTimeString()}**.` });
                }
            }

            if (commandName === 'set-auto-out') {
                await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                const timeStr = interaction.options.getString('time') || '';
                
                const match = timeStr.trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/);
                if (!match) {
                    return interaction.editReply({ content: "⚠️ Invalid time format. Please use 24h format HH:mm (e.g., 22:00 or 23:59)." });
                }
                
                await GuildConfig.findOneAndUpdate(
                    { guildId },
                    { autoClockOutTime: timeStr },
                    { upsert: true }
                );
                
                return interaction.editReply({ content: `✅ Automatic clock-out time set to **${timeStr}**.` });
            }

            // --- ATTENDANCE COMMANDS ---

            if (['in', 'out', 'break', 'continue'].includes(commandName)) {
                const guildConfig: IGuildConfig | null = await GuildConfig.findOne({ guildId });
                if (!guildConfig) {
                    return interaction.reply({ 
                        content: "⚠️ An admin must use `/setchannel` before attendance can be recorded.", 
                        flags: [MessageFlags.Ephemeral] 
                     });
                }

                let requiredChannelId;
                if (commandName === 'in') requiredChannelId = guildConfig.clockInChannelId;
                else if (commandName === 'out') requiredChannelId = guildConfig.clockOutChannelId;
                else requiredChannelId = guildConfig.breakChannelId;

                if (!requiredChannelId) {
                    return interaction.reply({ 
                        content: `⚠️ This server hasn't configured a channel for this action yet. Ask an admin to use \`/setchannel\`.`, 
                        flags: [MessageFlags.Ephemeral] 
                    });
                }

                if (interaction.channelId !== requiredChannelId) {
                    return interaction.reply({ 
                        content: `⚠️ You must use this command in <#${requiredChannelId}>.`, 
                        flags: [MessageFlags.Ephemeral] 
                    });
                }

                // --- PRE-FLIGHT SESSION CHECKS (EPHEMERAL ALERTS) ---
                const activeSession = await Attendance.findOne({ userId: user.id, guildId, status: { $in: ['IN', 'BREAK'] } });
                const globalSession = await Attendance.findOne({ userId: user.id, status: { $in: ['IN', 'BREAK'] } });

                if (commandName === 'in') {
                    if (activeSession) {
                        return interaction.reply({ content: "⚠️ You're already clocked in on this server!", flags: [MessageFlags.Ephemeral] });
                    }
                    if (globalSession) {
                        const otherGuild = client.guilds.cache.get(globalSession.guildId as string);
                        const guildName = otherGuild ? `**${otherGuild.name}**` : "another server";
                        return interaction.reply({ 
                            content: `⚠️ You are currently clocked in on ${guildName}. Please clock out there first.`, 
                            flags: [MessageFlags.Ephemeral] 
                        });
                    }
                }

                if (commandName === 'out' && !activeSession) {
                    if (globalSession) {
                        const otherGuild = client.guilds.cache.get(globalSession.guildId as string);
                        const guildName = otherGuild ? `**${otherGuild.name}**` : "another server";
                        return interaction.reply({ 
                            content: `⚠️ You are clocked in on ${guildName}, not here. Please clock out on that server.`, 
                            flags: [MessageFlags.Ephemeral] 
                        });
                    }
                    return interaction.reply({ content: "⚠️ You aren't clocked in yet! Type `/in` first.", flags: [MessageFlags.Ephemeral] });
                }

                if (['break', 'continue'].includes(commandName)) {
                    if (!activeSession) {
                        if (globalSession) {
                            const otherGuild = client.guilds.cache.get(globalSession.guildId as string);
                            const guildName = otherGuild ? `**${otherGuild.name}**` : "another server";
                            return interaction.reply({ 
                                content: `⚠️ Your active session is on ${guildName}. Please manage your breaks there.`, 
                                flags: [MessageFlags.Ephemeral] 
                            });
                        }
                        return interaction.reply({ content: "⚠️ You aren't clocked in yet!", flags: [MessageFlags.Ephemeral] });
                    }
                    if (commandName === 'break' && activeSession.status === 'BREAK') {
                        return interaction.reply({ content: "⚠️ You're already on break!", flags: [MessageFlags.Ephemeral] });
                    }
                    if (commandName === 'break' && activeSession.status === 'IN') {
                        const now = new Date();
                        const hour = now.getHours();
                        let breakType: IBreak['type'] = 'OTHER';
                        if (hour >= 8 && hour < 12) breakType = 'MORNING';
                        else if (hour >= 12 && hour < 13) breakType = 'LUNCH';
                        else if (hour >= 13 && hour < 17) breakType = 'AFTERNOON';

                        if (breakType !== 'OTHER') {
                            const alreadyTook = activeSession.breaks.some((b: IBreak) => b.type === breakType);
                            if (alreadyTook) {
                                return interaction.reply({ 
                                    content: `⚠️ You already took your ${breakType.toLowerCase()} break!`, 
                                    flags: [MessageFlags.Ephemeral] 
                                });
                            }
                        }
                    }
                    if (commandName === 'continue' && activeSession.status === 'IN') {
                        return interaction.reply({ content: "⚠️ You aren't on break!", flags: [MessageFlags.Ephemeral] });
                    }
                }

                // All basic checks passed, now defer publicly for the success message
                await interaction.deferReply(); 

                let result;
                if (commandName === 'in') result = await handleClockIn(user.id, guildId);
                else if (commandName === 'out') result = await handleClockOut(user.id, guildId);
                else if (commandName === 'break') result = await handleBreakStart(user.id, guildId);
                else if (commandName === 'continue') result = await handleBreakEnd(user.id, guildId);
                
                if (result) {
                    await interaction.editReply({ content: result.message });
                }
            }

            if (commandName === 'test-digest') {
                await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                try {
                    const now = new Date();
                    const startOfDay = new Date(now);
                    startOfDay.setHours(0,0,0,0);
                    
                    const todaysRecords = await Attendance.find({ 
                        guildId,
                        startTime: { $gte: startOfDay }
                    });

                    if (todaysRecords.length === 0) {
                        return interaction.editReply("⚠️ No attendance records found for today yet.");
                    }

                    const stillClockedIn = todaysRecords.filter(s => s.status !== 'OUT');
                    let msg = `📊 **Sample Daily Digest (${now.toLocaleDateString()})**\n`;
                    msg += `Total members clocked in today: **${todaysRecords.length}**\n`;
                    
                    if (stillClockedIn.length > 0) {
                        msg += `\nThe following users are still clocked in:\n`;
                        for (const session of stillClockedIn) {
                            const timeStr = session.startTime.toLocaleTimeString();
                            const statusStr = session.status === 'BREAK' ? 'Currently on BREAK' : `Started at ${timeStr}`;
                            msg += `- <@${session.userId}> (${statusStr})\n`;
                        }
                    }

                    const csvData = await generateAttendanceCSV(todaysRecords, client, guildId);
                    const attachment = new AttachmentBuilder(Buffer.from(csvData), { name: `sample-daily-digest.csv` });

                    await interaction.editReply({ 
                        content: msg, 
                        files: [attachment] 
                    });
                } catch (err) {
                    console.error(`Error in /test-digest:`, err);
                    return interaction.editReply("❌ Error generating sample digest.");
                }
            }
        } catch (error) {
            const cmdName = interaction.isChatInputCommand() ? interaction.commandName : 'unknown';
            console.error(`❌ Interaction Error (${cmdName}):`, error);
            
            try {
                if (interaction.isRepliable()) {
                    if (interaction.deferred || interaction.replied) {
                        await interaction.editReply({ content: "❌ An unexpected error occurred while processing your request." });
                    } else {
                        await interaction.reply({ 
                            content: "❌ An unexpected error occurred while processing your request.", 
                            flags: [MessageFlags.Ephemeral] 
                        });
                    }
                }
            } catch (replyError) {
                console.error("Failed to send error reply:", replyError);
            }
        }
    });
}
