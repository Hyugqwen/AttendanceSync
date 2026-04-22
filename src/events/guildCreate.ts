import { Events, ChannelType, PermissionFlagsBits, Client } from 'discord.js';
import { GuildConfig } from '../models/GuildConfig';

export function setupGuildCreateEvent(client: Client) {
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

            const dashboardChannel = await guild.channels.create({
                name: 'status-dashboard',
                type: ChannelType.GuildText,
                parent: category.id
            });

            const lateAlertsChannel = await guild.channels.create({
                name: 'late-alerts',
                type: ChannelType.GuildText,
                parent: category.id,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: [PermissionFlagsBits.ViewChannel],
                    }
                ]
            });

            await GuildConfig.findOneAndUpdate(
                { guildId: guild.id },
                { 
                    clockInChannelId: clockInChannel.id,
                    clockOutChannelId: clockOutChannel.id,
                    breakChannelId: breaksChannel.id,
                    reportsChannelId: reportsChannel.id,
                    dashboardChannelId: dashboardChannel.id,
                    lateAlertsChannelId: lateAlertsChannel.id
                },
                { upsert: true, returnDocument: 'after' }
            );

            console.log(`Channels automatically created for ${guild.name}`);
        } catch (err) {
            console.error(`Failed to auto-setup channels for ${guild.name}:`, err);
        }
    });
}
