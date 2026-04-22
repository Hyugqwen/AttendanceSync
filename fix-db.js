"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const Attendance_1 = require("./src/models/Attendance");
require("dotenv/config");
async function fix() {
    try {
        await mongoose_1.default.connect(process.env.MONGO_URI);
        const sessions = await Attendance_1.Attendance.find({});
        for (const session of sessions) {
            let changed = false;
            session.breaks.forEach((b) => {
                if (!b.type) {
                    b.set('type', 'OTHER');
                    changed = true;
                }
            });
            if (changed) {
                session.markModified('breaks');
                await session.save();
                console.log(`Fixed session for ${session.userId}`);
            }
        }
        console.log("Database patch complete.");
    }
    catch (err) {
        console.error(err);
    }
    finally {
        process.exit(0);
    }
}
fix();
//# sourceMappingURL=fix-db.js.map