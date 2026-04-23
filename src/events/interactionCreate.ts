import { Events, Client, AttachmentBuilder } from 'discord.js';
import { Attendance, IAttendance, IBreak } from '../models/Attendance';
import { GuildConfig, IGuildConfig } from '../models/GuildConfig';
import { handleClockIn, handleClockOut, handleBreakStart, handleBreakEnd } from '../core/attendanceLogic';

export function setupInteractionCreateEvent(client: Client) {
    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        const { commandName, user, guildId } = interaction;
        if (!guildId) return;

        if (commandName === 'report') {
            await interaction.deferReply({ ephemeral: true });
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

                let csvData = 'Username,Server Display Name,Date,Clock In Time,Clock Out Time,Total Time Rendered\n';
                let currentGuild;
                try { currentGuild = await client.guilds.fetch(guildId); } catch(e) {}

                for (const rec of records) {
                    if (!rec.userId || !rec.startTime) continue;
                    
                    const end = rec.endTime || new Date();
                    const gross = end.getTime() - rec.startTime.getTime();
                    let breaks = 0;
                    
                    if (rec.breaks && Array.isArray(rec.breaks)) {
                        rec.breaks.forEach((b: IBreak) => {
                            if (b.startTime) {
                                const bEnd = b.endTime || new Date();
                                breaks += bEnd.getTime() - b.startTime.getTime();
                            }
                        });
                    }
                    
                    const net = gross - breaks;
                    const netHours = (net / (1000 * 60 * 60)).toFixed(2);
                    
                    let username = rec.userId as string;
                    let displayName = 'Unknown';
                    try {
                        const discordUser = await client.users.fetch(username);
                        if (discordUser) username = discordUser.tag;
                        
                        if (currentGuild) {
                            const member = await currentGuild.members.fetch(rec.userId as string).catch(() => null);
                            if (member) displayName = member.displayName;
                            else if (discordUser) displayName = discordUser.username;
                        }
                    } catch(e) {}
                    
                    const dateStr = rec.startTime.toLocaleDateString();
                    const timeInStr = rec.startTime.toLocaleTimeString();
                    const timeOutStr = rec.endTime ? rec.endTime.toLocaleTimeString() : 'ACTIVE';
                    
                    csvData += `${username},${displayName},${dateStr},${timeInStr},${timeOutStr},${netHours}\n`;
                }

                const attachment = new AttachmentBuilder(Buffer.from(csvData), { name: `attendance-report-${timeframe}.csv` });
                return interaction.editReply({ content: `✅ Here is your **${timeframe}** attendance report:`, files: [attachment] });
            } catch (err) {
                console.error(err);
                return interaction.editReply("❌ Error generating report.");
            }
        }

        if (commandName === 'force-out') {
            const targetUser = interaction.options.getUser('user');
            if (!targetUser) return interaction.reply({ content: "⚠️ User not provided.", ephemeral: true });
            
            const result = await handleClockOut(targetUser.id);
            return interaction.reply({ content: result.message, ephemeral: !result.success });
        }

        if (commandName === 'adjust-time') {
            const targetUser = interaction.options.getUser('user');
            const action = interaction.options.getString('action');
            const timeStr = interaction.options.getString('time') || '';
            
            if (!targetUser || !action) return interaction.reply({ content: "⚠️ Missing parameters.", ephemeral: true });
            
            const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/i);
            if (!match) {
                return interaction.reply({ content: "⚠️ Invalid time format. Please use HH:MM AM/PM (e.g., 09:00 AM).", ephemeral: true });
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
                return interaction.reply({ content: `✅ Adjusted <@${targetUser.id}>'s Clock In time to **${adjustDate.toLocaleTimeString()}**.`, ephemeral: true });
            } else if (action === 'out') {
                if (!session) {
                    return interaction.reply({ content: "⚠️ Cannot set a Clock Out time because the user hasn't clocked in today.", ephemeral: true });
                }
                session.endTime = adjustDate;
                session.status = 'OUT';
                await session.save();
                return interaction.reply({ content: `✅ Adjusted <@${targetUser.id}>'s Clock Out time to **${adjustDate.toLocaleTimeString()}**.`, ephemeral: true });
            }
        }

        if (['in', 'out', 'break', 'continue'].includes(commandName)) {
            const guildConfig: IGuildConfig | null = await GuildConfig.findOne({ guildId });
            if (!guildConfig) {
                return interaction.reply({ content: "⚠️ An admin must use `/setchannel` before attendance can be recorded.", ephemeral: true });
            }

            let requiredChannelId;
            if (commandName === 'in') requiredChannelId = guildConfig.clockInChannelId;
            else if (commandName === 'out') requiredChannelId = guildConfig.clockOutChannelId;
            else requiredChannelId = guildConfig.breakChannelId;

            if (!requiredChannelId) {
                return interaction.reply({ content: `⚠️ This server hasn't configured a channel for this action yet. Ask an admin to use \`/setchannel\`.`, ephemeral: true });
            }

            if (interaction.channelId !== requiredChannelId) {
                return interaction.reply({ content: `⚠️ You must use this command in <#${requiredChannelId}>.`, ephemeral: true });
            }

            let result;
            if (commandName === 'in') result = await handleClockIn(user.id, guildId);
            else if (commandName === 'out') result = await handleClockOut(user.id);
            else if (commandName === 'break') result = await handleBreakStart(user.id);
            else if (commandName === 'continue') result = await handleBreakEnd(user.id);
            
            if (result) {
                await interaction.reply({ content: result.message, ephemeral: !result.success });
            }
        }
    });
}
