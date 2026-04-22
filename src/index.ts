import { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder } from 'discord.js';
import mongoose from 'mongoose';
import 'dotenv/config';
import { Attendance } from './models/Attendance'; // Ensure this file exists in src/models/

// Commands Definition
const commands = [
    new SlashCommandBuilder()
        .setName('in')
        .setDescription('Clock in to start your attendance session'),
    new SlashCommandBuilder()
        .setName('out')
        .setDescription('Clock out to end your attendance session'),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN as string);

const registerCommands = async () => {
    try {
        console.log('Started refreshing application (/) commands.');
        
        if (!process.env.CLIENT_ID) {
            throw new Error('CLIENT_ID is missing from .env file');
        }

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Error refreshing commands:', error);
    }
};

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
client.once(Events.ClientReady, async (c) => {
    console.log(`🚀 Ready! Logged in as ${c.user.tag}`);
    await connectDB();
    await registerCommands();
});

// Listen for Interactions
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    // --- CLOCK IN COMMAND ---
    if (commandName === 'in') {
        try {
            const activeSession = await Attendance.findOne({ 
                userId: interaction.user.id, 
                status: 'IN' 
            });

            if (activeSession) {
                return interaction.reply({ content: "⚠️ You're already clocked in!", ephemeral: true });
            }

            // 2. Ensure we are in a server (guild)
            if (!interaction.guildId) {
                return interaction.reply({ content: "⚠️ You can only use this command inside a server!", ephemeral: true });
            }

            // 3. Create a new record
            await Attendance.create({
                userId: interaction.user.id,
                guildId: interaction.guildId,
                startTime: new Date(),
                status: 'IN'
            });

            await interaction.reply(`✅ **Clocked IN** at ${new Date().toLocaleTimeString()}`);
        } catch (err) {
            console.error(err);
            await interaction.reply({ content: "❌ Error saving to database.", ephemeral: true });
        }
    }

    // --- CLOCK OUT COMMAND ---
    if (commandName === 'out') {
        try {
            const activeSession = await Attendance.findOne({ 
                userId: interaction.user.id, 
                status: 'IN' 
            });

            if (!activeSession) {
                return interaction.reply({ content: "⚠️ You aren't clocked in yet! Type `/in` first.", ephemeral: true });
            }

            activeSession.endTime = new Date();
            activeSession.status = 'OUT';
            await activeSession.save();

            await interaction.reply(`👋 **Clocked OUT** at ${new Date().toLocaleTimeString()}`);
        } catch (err) {
            console.error(err);
            await interaction.reply({ content: "❌ Error updating database.", ephemeral: true });
        }
    }
});

// Log in to Discord
client.login(process.env.DISCORD_TOKEN);