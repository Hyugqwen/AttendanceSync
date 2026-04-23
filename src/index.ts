import { Client, GatewayIntentBits, Events } from 'discord.js';
import mongoose from 'mongoose';
import 'dotenv/config';
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
    await registerCommands();
    
    // Auto-setup channels for any missing guilds
    console.log('🔍 Checking for missing channels in all guilds...');
    const guilds = await client.guilds.fetch();
    for (const [id, oauthGuild] of guilds) {
        const guild = await oauthGuild.fetch();
        await setupGuildChannels(guild);
    }

    startBackgroundJobs(client);
});

// Bind Events
setupGuildCreateEvent(client);
setupInteractionCreateEvent(client);
setupMessageCreateEvent(client);

client.login(process.env.DISCORD_TOKEN);