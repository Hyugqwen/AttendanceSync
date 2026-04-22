const mongoose = require('mongoose');
require('dotenv/config');

// Re-define schema loosely for patching
const attendanceSchema = new mongoose.Schema({
    userId: String,
    guildId: String,
    breaks: [new mongoose.Schema({ type: String }, { strict: false })]
}, { strict: false });

const Attendance = mongoose.model('AttendancePatch', attendanceSchema, 'attendances');

async function fix() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const sessions = await Attendance.find({});
        for (const session of sessions) {
            let changed = false;
            session.breaks.forEach(b => {
                if (!b.type) {
                    b.type = 'OTHER';
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
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}
fix();
