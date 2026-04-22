import { SlashCommandBuilder, PermissionFlagsBits, REST, Routes } from 'discord.js';
import 'dotenv/config';

export const commands = [
    new SlashCommandBuilder()
        .setName('in')
        .setDescription('Clock in to start your attendance session'),
    new SlashCommandBuilder()
        .setName('out')
        .setDescription('Clock out to end your attendance session'),
    new SlashCommandBuilder()
        .setName('break')
        .setDescription('Go on a break'),
    new SlashCommandBuilder()
        .setName('continue')
        .setDescription('Return from your break'),
    new SlashCommandBuilder()
        .setName('report')
        .setDescription('Generate an attendance report (CSV)')
        .addStringOption(option =>
            option.setName('timeframe')
                .setDescription('Which timeframe to generate a report for')
                .setRequired(true)
                .addChoices(
                    { name: 'Daily', value: 'daily' },
                    { name: 'Weekly', value: 'weekly' },
                    { name: 'Monthly', value: 'monthly' }
                ))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    new SlashCommandBuilder()
        .setName('force-out')
        .setDescription('Force a user to clock out')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to clock out')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    new SlashCommandBuilder()
        .setName('adjust-time')
        .setDescription('Adjust a timestamp for a user today')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to adjust')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Which action to adjust')
                .setRequired(true)
                .addChoices(
                    { name: 'Clock In', value: 'in' },
                    { name: 'Clock Out', value: 'out' }
                ))
        .addStringOption(option =>
            option.setName('time')
                .setDescription('Time (e.g. 09:00 AM)')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN as string);

export const registerCommands = async () => {
    try {
        console.log('Started refreshing application (/) commands.');
        if (!process.env.CLIENT_ID) throw new Error('CLIENT_ID is missing from .env file');
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Error refreshing commands:', error);
    }
};
