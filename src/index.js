"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const mongoose_1 = __importDefault(require("mongoose"));
require("dotenv/config");
const commandRegister_1 = require("./commands/commandRegister");
const backgroundJobs_1 = require("./jobs/backgroundJobs");
const guildCreate_1 = require("./events/guildCreate");
const interactionCreate_1 = require("./events/interactionCreate");
const messageCreate_1 = require("./events/messageCreate");
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.MessageContent,
    ],
});
const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI)
            throw new Error('MONGO_URI is missing from .env file');
        await mongoose_1.default.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB Atlas');
    }
    catch (err) {
        console.error('❌ MongoDB Connection Error:', err);
    }
};
client.once('ready', async () => {
    console.log(`🚀 Ready! Logged in as ${client.user?.tag}`);
    await connectDB();
    await (0, commandRegister_1.registerCommands)();
    (0, backgroundJobs_1.startBackgroundJobs)(client);
});
// Bind Events
(0, guildCreate_1.setupGuildCreateEvent)(client);
(0, interactionCreate_1.setupInteractionCreateEvent)(client);
(0, messageCreate_1.setupMessageCreateEvent)(client);
client.login(process.env.DISCORD_TOKEN);
//# sourceMappingURL=index.js.map