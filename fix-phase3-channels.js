const { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits } = require('discord.js');
const mongoose = require('mongoose');
require('dotenv/config');

const guildConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    clockInChannelId: { type: String },
    clockOutChannelId: { type: String },
    breakChannelId: { type: String },
    reportsChannelId: { type: String },
    dashboardChannelId: { type: String },
    dashboardMessageId: { type: String },
    lateAlertsChannelId: { type: String }
});

const GuildConfig = mongoose.model('GuildConfigPhase3', guildConfigSchema, 'guildconfigs');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
    console.log('Connected to Discord');
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        for (const guild of client.guilds.cache.values()) {
            try {
                console.log(`Processing guild: ${guild.name}`);
                let config = await GuildConfig.findOne({ guildId: guild.id });
                if (!config) continue;

                let category = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === '📅 Attendance');
                if (!category) {
                    console.log('No attendance category found for', guild.name);
                    continue;
                }

                // 1. Dashboard Channel
                if (!config.dashboardChannelId) {
                    let dashChannel = guild.channels.cache.find(c => c.parentId === category.id && c.name === 'status-dashboard');
                    if (!dashChannel) {
                        dashChannel = await guild.channels.create({
                            name: 'status-dashboard',
                            type: ChannelType.GuildText,
                            parent: category.id
                        });
                        console.log('Created dashboard channel');
                    }
                    config.dashboardChannelId = dashChannel.id;
                }

                // 2. Late Alerts Channel (Admin Only)
                if (!config.lateAlertsChannelId) {
                    let lateChannel = guild.channels.cache.find(c => c.parentId === category.id && c.name === 'late-alerts');
                    if (!lateChannel) {
                        lateChannel = await guild.channels.create({
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
                        console.log('Created late-alerts channel');
                    }
                    config.lateAlertsChannelId = lateChannel.id;
                }

                await config.save();
                console.log('Saved Phase 3 channels to DB');
            } catch (e) {
                console.error(e);
            }
        }
        console.log('Done Phase 3 setup!');
    } catch(err) {
        console.error(err);
    }
    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
