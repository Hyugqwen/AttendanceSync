"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCommands = exports.commands = void 0;
const discord_js_1 = require("discord.js");
require("dotenv/config");
exports.commands = [
    new discord_js_1.SlashCommandBuilder()
        .setName('in')
        .setDescription('Clock in to start your attendance session'),
    new discord_js_1.SlashCommandBuilder()
        .setName('out')
        .setDescription('Clock out to end your attendance session'),
    new discord_js_1.SlashCommandBuilder()
        .setName('break')
        .setDescription('Go on a break'),
    new discord_js_1.SlashCommandBuilder()
        .setName('continue')
        .setDescription('Return from your break'),
    new discord_js_1.SlashCommandBuilder()
        .setName('report')
        .setDescription('Generate an attendance report (CSV)')
        .addStringOption(option => option.setName('timeframe')
        .setDescription('Which timeframe to generate a report for')
        .setRequired(true)
        .addChoices({ name: 'Daily', value: 'daily' }, { name: 'Weekly', value: 'weekly' }, { name: 'Monthly', value: 'monthly' }))
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageGuild),
    new discord_js_1.SlashCommandBuilder()
        .setName('force-out')
        .setDescription('Force a user to clock out')
        .addUserOption(option => option.setName('user')
        .setDescription('The user to clock out')
        .setRequired(true))
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageGuild),
    new discord_js_1.SlashCommandBuilder()
        .setName('adjust-time')
        .setDescription('Adjust a timestamp for a user today')
        .addUserOption(option => option.setName('user')
        .setDescription('The user to adjust')
        .setRequired(true))
        .addStringOption(option => option.setName('action')
        .setDescription('Which action to adjust')
        .setRequired(true)
        .addChoices({ name: 'Clock In', value: 'in' }, { name: 'Clock Out', value: 'out' }))
        .addStringOption(option => option.setName('time')
        .setDescription('Time (e.g. 09:00 AM)')
        .setRequired(true))
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.ManageGuild)
].map(command => command.toJSON());
const rest = new discord_js_1.REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
const registerCommands = async () => {
    try {
        console.log('Started refreshing application (/) commands.');
        if (!process.env.CLIENT_ID)
            throw new Error('CLIENT_ID is missing from .env file');
        await rest.put(discord_js_1.Routes.applicationCommands(process.env.CLIENT_ID), { body: exports.commands });
        console.log('Successfully reloaded application (/) commands.');
    }
    catch (error) {
        console.error('Error refreshing commands:', error);
    }
};
exports.registerCommands = registerCommands;
//# sourceMappingURL=commandRegister.js.map