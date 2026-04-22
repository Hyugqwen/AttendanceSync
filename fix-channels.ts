import { Client, GatewayIntentBits, ChannelType } from 'discord.js';
import mongoose from 'mongoose';
import 'dotenv/config';
import { GuildConfig } from './src/models/GuildConfig';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
    console.log('Connected to Discord');
    try {
        await mongoose.connect(process.env.MONGO_URI as string);
        console.log('Connected to DB');

        for (const guild of client.guilds.cache.values()) {
            try {
                console.log(`Processing guild: ${guild.name}`);
                let config = await GuildConfig.findOne({ guildId: guild.id });
                if (!config) continue;

                if (!config.reportsChannelId) {
                    let category = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === '📅 Attendance');
                    if (!category) {
                        console.log('No attendance category found for', guild.name);
                        continue;
                    }

                    let reportsChannel = guild.channels.cache.find(c => c.parentId === category?.id && c.name === 'reports');
                    
                    if (!reportsChannel) {
                        reportsChannel = await guild.channels.create({
                            name: 'reports',
                            type: ChannelType.GuildText,
                            parent: category.id
                        });
                        console.log('Created reports channel');
                    }

                    config.reportsChannelId = reportsChannel.id;
                    await config.save();
                    console.log('Saved to DB');
                } else {
                    console.log('Reports channel already configured.');
                }
            } catch (e) {
                console.error(e);
            }
        }
        console.log('Done!');
    } catch(err) {
        console.error(err);
    }
    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
