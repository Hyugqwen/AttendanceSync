import { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder, PermissionFlagsBits, ChannelType, AttachmentBuilder } from 'discord.js';
import mongoose from 'mongoose';
import 'dotenv/config';
import { Attendance } from './models/Attendance';
import { GuildConfig } from './models/GuildConfig';

function formatDuration(ms: number) {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

// Commands Definition
const commands = [
    new SlashCommandBuilder()
        .setName('in')
        .setDescription('Clock in to start your attendance session'),
    new SlashCommandBuilder()
        .setName('out')
        .setDescription('Clock out to end your attendance session'),
    new SlashCommandBuilder()
        .setName('break')
        .setDescription('Go on a break'),
    new SlashCommandBuilder()
        .setName('continue')
        .setDescription('Return from your break'),
    new SlashCommandBuilder()
        .setName('report')
        .setDescription('Generate an attendance report (CSV)')
        .addStringOption(option =>
            option.setName('timeframe')
                .setDescription('The timeframe for the report')
                .setRequired(true)
                .addChoices(
                    { name: 'Daily', value: 'daily' },
                    { name: 'Weekly', value: 'weekly' },
                    { name: 'Monthly', value: 'monthly' }
                ))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN as string);

const registerCommands = async () => {
    try {
        console.log('Started refreshing application (/) commands.');
        if (!process.env.CLIENT_ID) throw new Error('CLIENT_ID is missing from .env file');
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Error refreshing commands:', error);
    }
};

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) throw new Error('MONGO_URI is missing from .env file');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB Atlas');
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err);
    }
};

// --- CORE ATTENDANCE LOGIC ---

async function handleClockIn(userId: string, guildId: string): Promise<{ success: boolean, message: string }> {
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

async function handleClockOut(userId: string): Promise<{ success: boolean, message: string }> {
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
        activeSession.breaks.forEach((b: any) => {
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

async function handleBreakStart(userId: string): Promise<{ success: boolean, message: string }> {
    try {
        const activeSession = await Attendance.findOne({ userId, status: { $in: ['IN', 'BREAK'] } });
        if (!activeSession) return { success: false, message: "⚠️ You aren't clocked in yet!" };
        if (activeSession.status === 'BREAK') return { success: false, message: "⚠️ You're already on break!" };

        const now = new Date();
        const hour = now.getHours();
        let breakType = 'OTHER';
        if (hour >= 8 && hour < 12) breakType = 'MORNING';
        else if (hour >= 12 && hour < 13) breakType = 'LUNCH';
        else if (hour >= 13 && hour < 17) breakType = 'AFTERNOON';

        if (breakType !== 'OTHER') {
            const alreadyTook = activeSession.breaks.some((b: any) => b.type === breakType);
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

async function handleBreakEnd(userId: string): Promise<{ success: boolean, message: string }> {
    try {
        const activeSession = await Attendance.findOne({ userId, status: { $in: ['IN', 'BREAK'] } });
        if (!activeSession) return { success: false, message: "⚠️ You aren't clocked in yet!" };
        if (activeSession.status === 'IN') return { success: false, message: "⚠️ You aren't on break!" };

        const lastBreak = activeSession.breaks[activeSession.breaks.length - 1];
        if (lastBreak) {
            lastBreak.endTime = new Date();
        }
        
        activeSession.breaks.forEach((b: any) => {
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

client.once(Events.ClientReady, async (c) => {
    console.log(`🚀 Ready! Logged in as ${c.user.tag}`);
    await connectDB();
    await registerCommands();

    let lastDigestDate = -1;

    setInterval(async () => {
        try {
            const now = new Date();

            // --- DAILY DIGEST LOGIC ---
            if (now.getHours() === 18 && now.getMinutes() === 0 && lastDigestDate !== now.getDate()) {
                lastDigestDate = now.getDate();
                const activeSessions = await Attendance.find({ status: { $in: ['IN', 'BREAK'] } });
                
                const guildMap: { [key: string]: any[] } = {};
                for (const session of activeSessions) {
                    const gid = session.guildId as string;
                    if (gid) {
                        if (!guildMap[gid]) guildMap[gid] = [];
                        guildMap[gid]!.push(session);
                    }
                }

                for (const guildId of Object.keys(guildMap)) {
                    const guildConfig = await GuildConfig.findOne({ guildId });
                    if (guildConfig && guildConfig.reportsChannelId) {
                        try {
                            const channel = await client.channels.fetch(guildConfig.reportsChannelId) as any;
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
                        } catch(e) {
                            console.error("Error sending daily digest:", e);
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
                            session.breaks.forEach((b: any) => {
                                if (!b.type) b.type = 'OTHER';
                            });
                            await session.save();
                            
                            const guildConfig = await GuildConfig.findOne({ guildId: session.guildId });
                            if (guildConfig && guildConfig.breakChannelId) {
                                const channel = await client.channels.fetch(guildConfig.breakChannelId) as any;
                                if (channel) {
                                    channel.send(`⚠️ <@${session.userId}>, your break is over! Please use \`/continue\` to resume working.`);
                                }
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Reminder loop error:", err);
        }
    }, 60 * 1000); // Run every minute
});

client.on(Events.GuildCreate, async (guild) => {
    try {
        console.log(`Joined new guild: ${guild.name}`);
        
        let config = await GuildConfig.findOne({ guildId: guild.id });
        if (config && config.clockInChannelId && config.clockOutChannelId && config.breakChannelId && config.reportsChannelId) {
            return;
        }

        const category = await guild.channels.create({
            name: '📅 Attendance',
            type: ChannelType.GuildCategory
        });

        const clockInChannel = await guild.channels.create({
            name: 'clock-in',
            type: ChannelType.GuildText,
            parent: category.id
        });

        const clockOutChannel = await guild.channels.create({
            name: 'clock-out',
            type: ChannelType.GuildText,
            parent: category.id
        });

        const breaksChannel = await guild.channels.create({
            name: 'breaks',
            type: ChannelType.GuildText,
            parent: category.id
        });

        const reportsChannel = await guild.channels.create({
            name: 'reports',
            type: ChannelType.GuildText,
            parent: category.id
        });

        await GuildConfig.findOneAndUpdate(
            { guildId: guild.id },
            { 
                clockInChannelId: clockInChannel.id,
                clockOutChannelId: clockOutChannel.id,
                breakChannelId: breaksChannel.id,
                reportsChannelId: reportsChannel.id
            },
            { upsert: true, returnDocument: 'after' }
        );

        console.log(`Channels automatically created for ${guild.name}`);
    } catch (err) {
        console.error(`Failed to auto-setup channels for ${guild.name}:`, err);
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, user, guildId } = interaction;
    if (!guildId) return;

    if (commandName === 'report') {
        await interaction.deferReply({ flags: ['Ephemeral'] });
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

            const userStats: { [key: string]: { totalGross: number, totalBreak: number } } = {};

            for (const rec of records) {
                if (!rec.userId || !rec.startTime) continue;
                
                const end = rec.endTime || new Date();
                const gross = end.getTime() - rec.startTime.getTime();
                let breaks = 0;
                
                if (rec.breaks && Array.isArray(rec.breaks)) {
                    rec.breaks.forEach((b: any) => {
                        if (b.startTime) {
                            const bEnd = b.endTime || new Date();
                            breaks += bEnd.getTime() - b.startTime.getTime();
                        }
                    });
                }
                
                const uid = rec.userId as string;
                if (!userStats[uid]) userStats[uid] = { totalGross: 0, totalBreak: 0 };
                const stat = userStats[uid];
                if (stat) {
                    stat.totalGross += gross;
                    stat.totalBreak += breaks;
                }
            }

            let csvData = 'User ID,Username,Total Hours,Break Hours,Net Work Hours\n';
            for (const [uid, stats] of Object.entries(userStats)) {
                const net = stats.totalGross - stats.totalBreak;
                const netHours = (net / (1000 * 60 * 60)).toFixed(2);
                const breakHours = (stats.totalBreak / (1000 * 60 * 60)).toFixed(2);
                const grossHours = (stats.totalGross / (1000 * 60 * 60)).toFixed(2);
                
                let username = uid;
                try {
                    const discordUser = await client.users.fetch(uid);
                    if (discordUser) username = discordUser.tag;
                } catch(e) {}
                
                csvData += `${uid},${username},${grossHours},${breakHours},${netHours}\n`;
            }

            const attachment = new AttachmentBuilder(Buffer.from(csvData), { name: `attendance-report-${timeframe}.csv` });
            return interaction.editReply({ content: `✅ Here is your **${timeframe}** attendance report:`, files: [attachment] });
        } catch (err) {
            console.error(err);
            return interaction.editReply("❌ Error generating report.");
        }
    }

    if (['in', 'out', 'break', 'continue'].includes(commandName)) {
        const guildConfig = await GuildConfig.findOne({ guildId });
        if (!guildConfig) {
            return interaction.reply({ content: "⚠️ An admin must use `/setchannel` before attendance can be recorded.", flags: ['Ephemeral'] });
        }

        let requiredChannelId;
        if (commandName === 'in') requiredChannelId = guildConfig.clockInChannelId;
        else if (commandName === 'out') requiredChannelId = guildConfig.clockOutChannelId;
        else requiredChannelId = guildConfig.breakChannelId;

        if (!requiredChannelId) {
            return interaction.reply({ content: `⚠️ This server hasn't configured a channel for this action yet. Ask an admin to use \`/setchannel\`.`, flags: ['Ephemeral'] });
        }

        if (interaction.channelId !== requiredChannelId) {
            return interaction.reply({ content: `⚠️ You must use this command in <#${requiredChannelId}>.`, flags: ['Ephemeral'] });
        }

        let result;
        if (commandName === 'in') result = await handleClockIn(user.id, guildId);
        else if (commandName === 'out') result = await handleClockOut(user.id);
        else if (commandName === 'break') result = await handleBreakStart(user.id);
        else if (commandName === 'continue') result = await handleBreakEnd(user.id);
        
        if (result) {
            await interaction.reply({ content: result.message, flags: !result.success ? ['Ephemeral'] : undefined });
        }
    }
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    if (!message.guildId) return;

    const content = message.content.trim().toLowerCase();
    const validKeywords = ['time in', 'log off', 'break', 'continue'];
    if (!validKeywords.includes(content)) return;

    const guildConfig = await GuildConfig.findOne({ guildId: message.guildId });
    if (!guildConfig) {
        return message.reply("⚠️ An admin must use `/setchannel` before attendance can be recorded.");
    }

    let requiredChannelId;
    if (content === 'time in') requiredChannelId = guildConfig.clockInChannelId;
    else if (content === 'log off') requiredChannelId = guildConfig.clockOutChannelId;
    else requiredChannelId = guildConfig.breakChannelId;

    if (!requiredChannelId) {
        return message.reply(`⚠️ This server hasn't configured a channel for this action yet.`);
    }

    if (message.channelId !== requiredChannelId) {
        return message.reply(`⚠️ Attendance must be recorded in <#${requiredChannelId}>.`);
    }

    let result;
    if (content === 'time in') result = await handleClockIn(message.author.id, message.guildId);
    else if (content === 'log off') result = await handleClockOut(message.author.id);
    else if (content === 'break') result = await handleBreakStart(message.author.id);
    else if (content === 'continue') result = await handleBreakEnd(message.author.id);

    if (result) await message.reply(result.message);
});

client.login(process.env.DISCORD_TOKEN);