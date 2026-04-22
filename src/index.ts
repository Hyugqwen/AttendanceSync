import { Client, GatewayIntentBits, Events } from 'discord.js';
import mongoose from 'mongoose';
import 'dotenv/config';
import { registerCommands } from './commands/commandRegister';
import { startBackgroundJobs } from './jobs/backgroundJobs';
import { setupGuildCreateEvent } from './events/guildCreate';
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
    startBackgroundJobs(client);
});

// Bind Events
setupGuildCreateEvent(client);
setupInteractionCreateEvent(client);
setupMessageCreateEvent(client);

client.login(process.env.DISCORD_TOKEN);