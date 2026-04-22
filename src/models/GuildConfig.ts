import { Schema, model } from 'mongoose';

// This defines the configuration for each Discord server (guild)
const guildConfigSchema = new Schema({
    guildId: { type: String, required: true, unique: true },
    clockInChannelId: { type: String },
    clockOutChannelId: { type: String },
    breakChannelId: { type: String },
    reportsChannelId: { type: String },
    dashboardChannelId: { type: String },
    dashboardMessageId: { type: String },
    lateAlertsChannelId: { type: String }
});

export const GuildConfig = model('GuildConfig', guildConfigSchema);
