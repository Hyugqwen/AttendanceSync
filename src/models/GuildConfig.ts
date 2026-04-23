import { Schema, model, Document } from 'mongoose';

export interface IGuildConfig extends Document {
    guildId: string;
    clockInChannelId?: string;
    clockOutChannelId?: string;
    breakChannelId?: string;
    reportsChannelId?: string;
    dashboardChannelId?: string;
    dashboardMessageId?: string;
    lateAlertsChannelId?: string;
}

const guildConfigSchema = new Schema<IGuildConfig>({
    guildId: { type: String, required: true, unique: true },
    clockInChannelId: { type: String },
    clockOutChannelId: { type: String },
    breakChannelId: { type: String },
    reportsChannelId: { type: String },
    dashboardChannelId: { type: String },
    dashboardMessageId: { type: String },
    lateAlertsChannelId: { type: String }
});

export const GuildConfig = model<IGuildConfig>('GuildConfig', guildConfigSchema);
