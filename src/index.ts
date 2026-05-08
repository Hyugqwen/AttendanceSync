import { Client, GatewayIntentBits, Events } from 'discord.js';
import mongoose from 'mongoose';
import 'dotenv/config';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);
import { registerCommands } from './commands/commandRegister';
import { startBackgroundJobs } from './jobs/backgroundJobs';
import { setupGuildCreateEvent, setupGuildChannels } from './events/guildCreate';
import { setupInteractionCreateEvent } from './events/interactionCreate';
import { setupMessageCreateEvent } from './events/messageCreate';

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

client.once(Events.ClientReady, async () => {
    console.log(`🚀 Ready! Logged in as ${client.user?.tag}`);
    await connectDB();
    
    // Auto-setup channels and collect guild IDs for command registration
    console.log('🔍 Checking for missing channels in all guilds...');
    const guilds = await client.guilds.fetch();
    const guildIds: string[] = [];

    for (const [id, oauthGuild] of guilds) {
        guildIds.push(id);
        const guild = await oauthGuild.fetch();
        await setupGuildChannels(guild);
    }

    // Register commands both globally and per-guild for instant updates
    await registerCommands(guildIds);

    startBackgroundJobs(client);
});

// Bind Events
setupGuildCreateEvent(client);
setupInteractionCreateEvent(client);
setupMessageCreateEvent(client);

client.login(process.env.DISCORD_TOKEN);