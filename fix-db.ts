import mongoose from 'mongoose';
import { Attendance } from './src/models/Attendance';
import 'dotenv/config';

async function fix() {
    try {
        await mongoose.connect(process.env.MONGO_URI as string);
        const sessions = await Attendance.find({});
        for (const session of sessions) {
            let changed = false;
            session.breaks.forEach((b: any) => {
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
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}
fix();
