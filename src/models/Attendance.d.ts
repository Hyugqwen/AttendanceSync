import { Schema } from 'mongoose';
export declare const Attendance: import("mongoose").Model<{
    guildId: string;
    startTime: NativeDate;
    userId: string;
    status: "IN" | "OUT" | "BREAK";
    breaks: import("mongoose").Types.DocumentArray<{
        type: "MORNING" | "LUNCH" | "AFTERNOON" | "OTHER";
        startTime: NativeDate;
        endTime?: NativeDate | null;
        lastReminderSentAt?: NativeDate | null;
    }, import("mongoose").Types.Subdocument<import("bson").ObjectId, unknown, {
        type: "MORNING" | "LUNCH" | "AFTERNOON" | "OTHER";
        startTime: NativeDate;
        endTime?: NativeDate | null;
        lastReminderSentAt?: NativeDate | null;
    }, {}, {}> & {
        type: "MORNING" | "LUNCH" | "AFTERNOON" | "OTHER";
        startTime: NativeDate;
        endTime?: NativeDate | null;
        lastReminderSentAt?: NativeDate | null;
    }>;
    endTime?: NativeDate | null;
}, {}, {}, {
    id: string;
}, import("mongoose").Document<unknown, {}, {
    guildId: string;
    startTime: NativeDate;
    userId: string;
    status: "IN" | "OUT" | "BREAK";
    breaks: import("mongoose").Types.DocumentArray<{
        type: "MORNING" | "LUNCH" | "AFTERNOON" | "OTHER";
        startTime: NativeDate;
        endTime?: NativeDate | null;
        lastReminderSentAt?: NativeDate | null;
    }, import("mongoose").Types.Subdocument<import("bson").ObjectId, unknown, {
        type: "MORNING" | "LUNCH" | "AFTERNOON" | "OTHER";
        startTime: NativeDate;
        endTime?: NativeDate | null;
        lastReminderSentAt?: NativeDate | null;
    }, {}, {}> & {
        type: "MORNING" | "LUNCH" | "AFTERNOON" | "OTHER";
        startTime: NativeDate;
        endTime?: NativeDate | null;
        lastReminderSentAt?: NativeDate | null;
    }>;
    endTime?: NativeDate | null;
}, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<{
    guildId: string;
    startTime: NativeDate;
    userId: string;
    status: "IN" | "OUT" | "BREAK";
    breaks: import("mongoose").Types.DocumentArray<{
        type: "MORNING" | "LUNCH" | "AFTERNOON" | "OTHER";
        startTime: NativeDate;
        endTime?: NativeDate | null;
        lastReminderSentAt?: NativeDate | null;
    }, import("mongoose").Types.Subdocument<import("bson").ObjectId, unknown, {
        type: "MORNING" | "LUNCH" | "AFTERNOON" | "OTHER";
        startTime: NativeDate;
        endTime?: NativeDate | null;
        lastReminderSentAt?: NativeDate | null;
    }, {}, {}> & {
        type: "MORNING" | "LUNCH" | "AFTERNOON" | "OTHER";
        startTime: NativeDate;
        endTime?: NativeDate | null;
        lastReminderSentAt?: NativeDate | null;
    }>;
    endTime?: NativeDate | null;
} & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, Schema<any, import("mongoose").Model<any, any, any, any, any, any, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, {
    guildId: string;
    startTime: NativeDate;
    userId: string;
    status: "IN" | "OUT" | "BREAK";
    breaks: import("mongoose").Types.DocumentArray<{
        type: "MORNING" | "LUNCH" | "AFTERNOON" | "OTHER";
        startTime: NativeDate;
        endTime?: NativeDate | null;
        lastReminderSentAt?: NativeDate | null;
    }, import("mongoose").Types.Subdocument<import("bson").ObjectId, unknown, {
        type: "MORNING" | "LUNCH" | "AFTERNOON" | "OTHER";
        startTime: NativeDate;
        endTime?: NativeDate | null;
        lastReminderSentAt?: NativeDate | null;
    }, {}, {}> & {
        type: "MORNING" | "LUNCH" | "AFTERNOON" | "OTHER";
        startTime: NativeDate;
        endTime?: NativeDate | null;
        lastReminderSentAt?: NativeDate | null;
    }>;
    endTime?: NativeDate | null;
}, import("mongoose").Document<unknown, {}, {
    guildId: string;
    startTime: NativeDate;
    userId: string;
    status: "IN" | "OUT" | "BREAK";
    breaks: import("mongoose").Types.DocumentArray<{
        type: "MORNING" | "LUNCH" | "AFTERNOON" | "OTHER";
        startTime: NativeDate;
        endTime?: NativeDate | null;
        lastReminderSentAt?: NativeDate | null;
    }, import("mongoose").Types.Subdocument<import("bson").ObjectId, unknown, {
        type: "MORNING" | "LUNCH" | "AFTERNOON" | "OTHER";
        startTime: NativeDate;
        endTime?: NativeDate | null;
        lastReminderSentAt?: NativeDate | null;
    }, {}, {}> & {
        type: "MORNING" | "LUNCH" | "AFTERNOON" | "OTHER";
        startTime: NativeDate;
        endTime?: NativeDate | null;
        lastReminderSentAt?: NativeDate | null;
    }>;
    endTime?: NativeDate | null;
}, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<{
    guildId: string;
    startTime: NativeDate;
    userId: string;
    status: "IN" | "OUT" | "BREAK";
    breaks: import("mongoose").Types.DocumentArray<{
        type: "MORNING" | "LUNCH" | "AFTERNOON" | "OTHER";
        startTime: NativeDate;
        endTime?: NativeDate | null;
        lastReminderSentAt?: NativeDate | null;
    }, import("mongoose").Types.Subdocument<import("bson").ObjectId, unknown, {
        type: "MORNING" | "LUNCH" | "AFTERNOON" | "OTHER";
        startTime: NativeDate;
        endTime?: NativeDate | null;
        lastReminderSentAt?: NativeDate | null;
    }, {}, {}> & {
        type: "MORNING" | "LUNCH" | "AFTERNOON" | "OTHER";
        startTime: NativeDate;
        endTime?: NativeDate | null;
        lastReminderSentAt?: NativeDate | null;
    }>;
    endTime?: NativeDate | null;
} & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, unknown, {
    guildId: string;
    startTime: NativeDate;
    userId: string;
    status: "IN" | "OUT" | "BREAK";
    breaks: import("mongoose").Types.DocumentArray<{
        type: "MORNING" | "LUNCH" | "AFTERNOON" | "OTHER";
        startTime: NativeDate;
        endTime?: NativeDate | null;
        lastReminderSentAt?: NativeDate | null;
    }, import("mongoose").Types.Subdocument<import("bson").ObjectId, unknown, {
        type: "MORNING" | "LUNCH" | "AFTERNOON" | "OTHER";
        startTime: NativeDate;
        endTime?: NativeDate | null;
        lastReminderSentAt?: NativeDate | null;
    }, {}, {}> & {
        type: "MORNING" | "LUNCH" | "AFTERNOON" | "OTHER";
        startTime: NativeDate;
        endTime?: NativeDate | null;
        lastReminderSentAt?: NativeDate | null;
    }>;
    endTime?: NativeDate | null;
} & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>, {
    guildId: string;
    startTime: NativeDate;
    userId: string;
    status: "IN" | "OUT" | "BREAK";
    breaks: import("mongoose").Types.DocumentArray<{
        type: "MORNING" | "LUNCH" | "AFTERNOON" | "OTHER";
        startTime: NativeDate;
        endTime?: NativeDate | null;
        lastReminderSentAt?: NativeDate | null;
    }, import("mongoose").Types.Subdocument<import("bson").ObjectId, unknown, {
        type: "MORNING" | "LUNCH" | "AFTERNOON" | "OTHER";
        startTime: NativeDate;
        endTime?: NativeDate | null;
        lastReminderSentAt?: NativeDate | null;
    }, {}, {}> & {
        type: "MORNING" | "LUNCH" | "AFTERNOON" | "OTHER";
        startTime: NativeDate;
        endTime?: NativeDate | null;
        lastReminderSentAt?: NativeDate | null;
    }>;
    endTime?: NativeDate | null;
} & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
//# sourceMappingURL=Attendance.d.ts.map