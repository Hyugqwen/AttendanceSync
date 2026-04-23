import { Schema, model, Document } from 'mongoose';

export interface IBreak {
    type: 'MORNING' | 'LUNCH' | 'AFTERNOON' | 'OTHER';
    startTime: Date;
    endTime?: Date;
    lastReminderSentAt?: Date;
}

export interface IAttendance extends Document {
    userId: string;
    guildId: string;
    startTime: Date;
    endTime?: Date;
    status: 'IN' | 'OUT' | 'BREAK';
    breaks: IBreak[];
}

const breakSchema = new Schema<IBreak>({
    type: { type: String, enum: ['MORNING', 'LUNCH', 'AFTERNOON', 'OTHER'], required: true, default: 'OTHER' },
    startTime: { type: Date, required: true, default: Date.now },
    endTime: { type: Date },
    lastReminderSentAt: { type: Date }
});

const attendanceSchema = new Schema<IAttendance>({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    startTime: { type: Date, required: true, default: Date.now },
    endTime: { type: Date },
    status: { type: String, enum: ['IN', 'OUT', 'BREAK'], default: 'IN' },
    breaks: [breakSchema]
});

export const Attendance = model<IAttendance>('Attendance', attendanceSchema);