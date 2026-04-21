import { Client, GatewayIntentBits, Events } from 'discord.js';
import mongoose from 'mongoose';
import 'dotenv/config';
import { Attendance } from './models/attendance'; // Ensure this file exists in src/models/

// Initialize the Discord Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Database Connection
const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is missing from .env file');
        }
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB Atlas');
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err);
    }
};

// Event: When the bot is online
client.once(Events.ClientReady, (c) => {
    console.log(`🚀 Ready! Logged in as ${c.user.tag}`);
    connectDB();
});

// Listen for Messages
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    const command = message.content.toLowerCase();

    // --- CLOCK IN COMMAND ---
    if (command === '!in') {
        try {
            const activeSession = await Attendance.findOne({ 
                userId: message.author.id, 
                status: 'IN' 
            });

            if (activeSession) {
                return message.reply("⚠️ You're already clocked in!");
            }

            // 2. Ensure we are in a server (guild)
            if (!message.guildId) {
                return message.reply("⚠️ You can only use this command inside a server!");
            }

            // 3. Create a new record
            await Attendance.create({
                userId: message.author.id,
                guildId: message.guildId, // TypeScript is happy now because of the check above
                startTime: new Date(),
                status: 'IN'
            });

            await message.reply(`✅ **Clocked IN** at ${new Date().toLocaleTimeString()}`);
        } catch (err) {
            console.error(err);
            await message.reply("❌ Error saving to database.");
        }
    }

    // --- CLOCK OUT COMMAND ---
    if (command === '!out') {
        try {
            const activeSession = await Attendance.findOne({ 
                userId: message.author.id, 
                status: 'IN' 
            });

            if (!activeSession) {
                return message.reply("⚠️ You aren't clocked in yet! Type `!in` first.");
            }

            activeSession.endTime = new Date();
            activeSession.status = 'OUT';
            await activeSession.save();

            await message.reply(`👋 **Clocked OUT** at ${new Date().toLocaleTimeString()}`);
        } catch (err) {
            console.error(err);
            await message.reply("❌ Error updating database.");
        }
    }
});

// Log in to Discord
client.login(process.env.DISCORD_TOKEN);