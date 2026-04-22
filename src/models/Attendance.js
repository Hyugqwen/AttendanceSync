"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Attendance = void 0;
const mongoose_1 = require("mongoose");
const breakSchema = new mongoose_1.Schema({
    type: { type: String, enum: ['MORNING', 'LUNCH', 'AFTERNOON', 'OTHER'], required: true, default: 'OTHER' },
    startTime: { type: Date, required: true, default: Date.now },
    endTime: { type: Date },
    lastReminderSentAt: { type: Date }
});
// This defines exactly what each attendance record looks like
const attendanceSchema = new mongoose_1.Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    startTime: { type: Date, required: true, default: Date.now },
    endTime: { type: Date },
    // Status helps us track if they are currently working or finished
    status: { type: String, enum: ['IN', 'OUT', 'BREAK'], default: 'IN' },
    breaks: [breakSchema]
});
exports.Attendance = (0, mongoose_1.model)('Attendance', attendanceSchema);
//# sourceMappingURL=Attendance.js.map