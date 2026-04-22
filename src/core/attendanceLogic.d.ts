export declare function handleClockIn(userId: string, guildId: string): Promise<{
    success: boolean;
    message: string;
}>;
export declare function handleClockOut(userId: string): Promise<{
    success: boolean;
    message: string;
}>;
export declare function handleBreakStart(userId: string): Promise<{
    success: boolean;
    message: string;
}>;
export declare function handleBreakEnd(userId: string): Promise<{
    success: boolean;
    message: string;
}>;
//# sourceMappingURL=attendanceLogic.d.ts.map