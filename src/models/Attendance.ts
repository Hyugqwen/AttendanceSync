import { Schema, model } from 'mongoose';

// This defines exactly what each attendance record looks like
const attendanceSchema = new Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    startTime: { type: Date, required: true, default: Date.now },
    endTime: { type: Date },
    // Status helps us track if they are currently working or finished
    status: { type: String, enum: ['IN', 'OUT'], default: 'IN' }
});

export const Attendance = model('Attendance', attendanceSchema);