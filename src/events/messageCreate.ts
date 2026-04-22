import { Events, Client } from 'discord.js';
import { GuildConfig } from '../models/GuildConfig';
import { handleClockIn, handleClockOut, handleBreakStart, handleBreakEnd } from '../core/attendanceLogic';

export function setupMessageCreateEvent(client: Client) {
    client.on(Events.MessageCreate, async (message) => {
        if (message.author.bot) return;
        if (!message.guildId) return;

        const content = message.content.trim().toLowerCase();
        
        const keywordMap: { [key: string]: string } = {
            'time in': 'in', 'timing in': 'in', 'clock in': 'in', 'clocking in': 'in', 'log in': 'in', 'logging in': 'in',
            'log off': 'out', 'logging off': 'out', 'clock out': 'out', 'clocking out': 'out', 'time out': 'out', 'timing out': 'out',
            'taking a break': 'break', 'on break': 'break', 'break': 'break', 
            'continue': 'continue', 'continuing': 'continue', 'back from break': 'continue', 'back to work': 'continue'
        };

        const matchedPhrase = Object.keys(keywordMap).find(kw => content.includes(kw));
        if (!matchedPhrase) return;

        const action = keywordMap[matchedPhrase];

        const guildConfig = await GuildConfig.findOne({ guildId: message.guildId });
        if (!guildConfig) {
            return message.reply("⚠️ An admin must configure the bot before attendance can be recorded.");
        }

        let requiredChannelId;
        if (action === 'in') requiredChannelId = guildConfig.clockInChannelId;
        else if (action === 'out') requiredChannelId = guildConfig.clockOutChannelId;
        else requiredChannelId = guildConfig.breakChannelId;

        if (!requiredChannelId) {
            return message.reply(`⚠️ This server hasn't configured a channel for this action yet.`);
        }

        if (message.channelId !== requiredChannelId) {
            return message.reply(`⚠️ Attendance must be recorded in <#${requiredChannelId}>.`);
        }

        let result;
        if (action === 'in') result = await handleClockIn(message.author.id, message.guildId);
        else if (action === 'out') result = await handleClockOut(message.author.id);
        else if (action === 'break') result = await handleBreakStart(message.author.id);
        else if (action === 'continue') result = await handleBreakEnd(message.author.id);

        if (result) await message.reply(result.message);
    });
}
