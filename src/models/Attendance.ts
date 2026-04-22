import { Schema, model } from 'mongoose';

const breakSchema = new Schema({
    type: { type: String, enum: ['MORNING', 'LUNCH', 'AFTERNOON', 'OTHER'], required: true, default: 'OTHER' },
    startTime: { type: Date, required: true, default: Date.now },
    endTime: { type: Date },
    lastReminderSentAt: { type: Date }
});

// This defines exactly what each attendance record looks like
const attendanceSchema = new Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    startTime: { type: Date, required: true, default: Date.now },
    endTime: { type: Date },
    // Status helps us track if they are currently working or finished
    status: { type: String, enum: ['IN', 'OUT', 'BREAK'], default: 'IN' },
    breaks: [breakSchema]
});

export const Attendance = model('Attendance', attendanceSchema);