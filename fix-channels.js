"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const mongoose_1 = __importDefault(require("mongoose"));
require("dotenv/config");
const GuildConfig_1 = require("./src/models/GuildConfig");
const client = new discord_js_1.Client({ intents: [discord_js_1.GatewayIntentBits.Guilds] });
client.once('ready', async () => {
    console.log('Connected to Discord');
    try {
        await mongoose_1.default.connect(process.env.MONGO_URI);
        console.log('Connected to DB');
        for (const guild of client.guilds.cache.values()) {
            try {
                console.log(`Processing guild: ${guild.name}`);
                let config = await GuildConfig_1.GuildConfig.findOne({ guildId: guild.id });
                if (!config)
                    continue;
                if (!config.reportsChannelId) {
                    let category = guild.channels.cache.find(c => c.type === discord_js_1.ChannelType.GuildCategory && c.name === '📅 Attendance');
                    if (!category) {
                        console.log('No attendance category found for', guild.name);
                        continue;
                    }
                    let reportsChannel = guild.channels.cache.find(c => c.parentId === category?.id && c.name === 'reports');
                    if (!reportsChannel) {
                        reportsChannel = await guild.channels.create({
                            name: 'reports',
                            type: discord_js_1.ChannelType.GuildText,
                            parent: category.id
                        });
                        console.log('Created reports channel');
                    }
                    config.reportsChannelId = reportsChannel.id;
                    await config.save();
                    console.log('Saved to DB');
                }
                else {
                    console.log('Reports channel already configured.');
                }
            }
            catch (e) {
                console.error(e);
            }
        }
        console.log('Done!');
    }
    catch (err) {
        console.error(err);
    }
    process.exit(0);
});
client.login(process.env.DISCORD_TOKEN);
//# sourceMappingURL=fix-channels.js.map