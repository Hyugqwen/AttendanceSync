import { IAttendance, IBreak } from '../models/Attendance';
import { Client } from 'discord.js';

export async function generateAttendanceCSV(records: IAttendance[], client: Client, guildId: string): Promise<string> {
    let csvData = 'Username,Server Display Name,Date,Clock In Time,Clock Out Time,Total Net Hours\n';
    
    let currentGuild;
    try { 
        currentGuild = await client.guilds.fetch(guildId); 
    } catch(e) {}

    for (const rec of records) {
        if (!rec.userId || !rec.startTime) continue;
        
        const end = rec.endTime || new Date();
        const gross = end.getTime() - rec.startTime.getTime();
        let breaks = 0;
        
        if (rec.breaks && Array.isArray(rec.breaks)) {
            rec.breaks.forEach((b: IBreak) => {
                if (b.startTime) {
                    const bEnd = b.endTime || new Date();
                    breaks += bEnd.getTime() - b.startTime.getTime();
                }
            });
        }
        
        const net = gross - breaks;
        const netHours = (net / (1000 * 60 * 60)).toFixed(2);
        
        let username = rec.userId as string;
        let displayName = 'Unknown';
        try {
            const discordUser = await client.users.fetch(username);
            if (discordUser) username = discordUser.tag;
            
            if (currentGuild) {
                const member = await currentGuild.members.fetch(rec.userId as string).catch(() => null);
                if (member) displayName = member.displayName;
                else if (discordUser) displayName = discordUser.username;
            }
        } catch(e) {}
        
        const dateStr = rec.startTime.toLocaleDateString();
        const timeInStr = rec.startTime.toLocaleTimeString();
        const timeOutStr = rec.endTime ? rec.endTime.toLocaleTimeString() : 'STILL IN';
        
        csvData += `${username},${displayName},${dateStr},${timeInStr},${timeOutStr},${netHours}\n`;
    }
    
    return csvData;
}
