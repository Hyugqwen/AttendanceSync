"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupGuildCreateEvent = setupGuildCreateEvent;
const discord_js_1 = require("discord.js");
const GuildConfig_1 = require("../models/GuildConfig");
function setupGuildCreateEvent(client) {
    client.on(discord_js_1.Events.GuildCreate, async (guild) => {
        try {
            console.log(`Joined new guild: ${guild.name}`);
            let config = await GuildConfig_1.GuildConfig.findOne({ guildId: guild.id });
            if (config && config.clockInChannelId && config.clockOutChannelId && config.breakChannelId && config.reportsChannelId) {
                return;
            }
            const category = await guild.channels.create({
                name: '📅 Attendance',
                type: discord_js_1.ChannelType.GuildCategory
            });
            const clockInChannel = await guild.channels.create({
                name: 'clock-in',
                type: discord_js_1.ChannelType.GuildText,
                parent: category.id
            });
            const clockOutChannel = await guild.channels.create({
                name: 'clock-out',
                type: discord_js_1.ChannelType.GuildText,
                parent: category.id
            });
            const breaksChannel = await guild.channels.create({
                name: 'breaks',
                type: discord_js_1.ChannelType.GuildText,
                parent: category.id
            });
            const reportsChannel = await guild.channels.create({
                name: 'reports',
                type: discord_js_1.ChannelType.GuildText,
                parent: category.id
            });
            const dashboardChannel = await guild.channels.create({
                name: 'status-dashboard',
                type: discord_js_1.ChannelType.GuildText,
                parent: category.id
            });
            const lateAlertsChannel = await guild.channels.create({
                name: 'late-alerts',
                type: discord_js_1.ChannelType.GuildText,
                parent: category.id,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: [discord_js_1.PermissionFlagsBits.ViewChannel],
                    }
                ]
            });
            await GuildConfig_1.GuildConfig.findOneAndUpdate({ guildId: guild.id }, {
                clockInChannelId: clockInChannel.id,
                clockOutChannelId: clockOutChannel.id,
                breakChannelId: breaksChannel.id,
                reportsChannelId: reportsChannel.id,
                dashboardChannelId: dashboardChannel.id,
                lateAlertsChannelId: lateAlertsChannel.id
            }, { upsert: true, returnDocument: 'after' });
            console.log(`Channels automatically created for ${guild.name}`);
        }
        catch (err) {
            console.error(`Failed to auto-setup channels for ${guild.name}:`, err);
        }
    });
}
//# sourceMappingURL=guildCreate.js.map