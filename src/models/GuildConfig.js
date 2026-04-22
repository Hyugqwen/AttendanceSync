"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuildConfig = void 0;
const mongoose_1 = require("mongoose");
// This defines the configuration for each Discord server (guild)
const guildConfigSchema = new mongoose_1.Schema({
    guildId: { type: String, required: true, unique: true },
    clockInChannelId: { type: String },
    clockOutChannelId: { type: String },
    breakChannelId: { type: String },
    reportsChannelId: { type: String },
    dashboardChannelId: { type: String },
    dashboardMessageId: { type: String },
    lateAlertsChannelId: { type: String }
});
exports.GuildConfig = (0, mongoose_1.model)('GuildConfig', guildConfigSchema);
//# sourceMappingURL=GuildConfig.js.map