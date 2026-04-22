"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupMessageCreateEvent = setupMessageCreateEvent;
const discord_js_1 = require("discord.js");
const GuildConfig_1 = require("../models/GuildConfig");
const attendanceLogic_1 = require("../core/attendanceLogic");
function setupMessageCreateEvent(client) {
    client.on(discord_js_1.Events.MessageCreate, async (message) => {
        if (message.author.bot)
            return;
        if (!message.guildId)
            return;
        const content = message.content.trim().toLowerCase();
        const keywordMap = {
            'time in': 'in', 'timing in': 'in', 'clock in': 'in', 'clocking in': 'in', 'log in': 'in', 'logging in': 'in',
            'log off': 'out', 'logging off': 'out', 'clock out': 'out', 'clocking out': 'out', 'time out': 'out', 'timing out': 'out',
            'taking a break': 'break', 'on break': 'break', 'break': 'break',
            'continue': 'continue', 'continuing': 'continue', 'back from break': 'continue', 'back to work': 'continue'
        };
        const matchedPhrase = Object.keys(keywordMap).find(kw => content.includes(kw));
        if (!matchedPhrase)
            return;
        const action = keywordMap[matchedPhrase];
        const guildConfig = await GuildConfig_1.GuildConfig.findOne({ guildId: message.guildId });
        if (!guildConfig) {
            return message.reply("⚠️ An admin must configure the bot before attendance can be recorded.");
        }
        let requiredChannelId;
        if (action === 'in')
            requiredChannelId = guildConfig.clockInChannelId;
        else if (action === 'out')
            requiredChannelId = guildConfig.clockOutChannelId;
        else
            requiredChannelId = guildConfig.breakChannelId;
        if (!requiredChannelId) {
            return message.reply(`⚠️ This server hasn't configured a channel for this action yet.`);
        }
        if (message.channelId !== requiredChannelId) {
            return message.reply(`⚠️ Attendance must be recorded in <#${requiredChannelId}>.`);
        }
        let result;
        if (action === 'in')
            result = await (0, attendanceLogic_1.handleClockIn)(message.author.id, message.guildId);
        else if (action === 'out')
            result = await (0, attendanceLogic_1.handleClockOut)(message.author.id);
        else if (action === 'break')
            result = await (0, attendanceLogic_1.handleBreakStart)(message.author.id);
        else if (action === 'continue')
            result = await (0, attendanceLogic_1.handleBreakEnd)(message.author.id);
        if (result)
            await message.reply(result.message);
    });
}
//# sourceMappingURL=messageCreate.js.map