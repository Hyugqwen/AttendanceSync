# 📝 AttendanceSync User Manual

Welcome to **AttendanceSync**! This bot is designed to make tracking work hours as simple as sending a message.

### 🔗 Quick Invite Link

To add the bot to your server, click here:
**[Invite AttendanceSync to your Server](https://discord.com/oauth2/authorize?client_id=1496060492773331004&permissions=8&integration_type=0&scope=bot+applications.commands)**

---

## ⚙️ Installation & Setup (For Developers)

If you are setting up the bot for the first time on a new server or VPS, follow these steps:

### 1. Prerequisites

- **Node.js:** v20 or higher.
- **MongoDB:** A connection string (Atlas or Local).
- **Discord Bot Token:** From the [Discord Developer Portal](https://discord.com/developers/applications).
- **Docker (Optional):** If you want to run the bot in a container.

### 2. Initial Setup

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/Hyugqwen/AttendanceSync
    cd AttendanceSync
    ```
2.  **Install Dependencies:**
    ```bash
    npm install
    ```
3.  **Configure Environment:** Create a `.env` file in the root folder and add:
    ```env
    DISCORD_TOKEN=your_bot_token
    CLIENT_ID=your_bot_client_id
    MONGO_URI=your_mongodb_connection_string
    ```

### 3. Running the Bot

- **Development Mode:** `npm run dev`
- **Production Build:**
  ```bash
  npm run build
  npm start
  ```
- **Using Docker (Recommended for VPS):**
  ```bash
  docker build -t attendance-bot .
  docker run -d --name attendance-bot attendance-bot
  ```

### 4. Discord Permissions

Ensure the bot has these permissions in your Discord server:

- Manage Channels (for auto-setup)
- Send Messages & Embed Links
- Read Message History
- Use Slash Commands

---

## 👥 For Regular Users (Team Members)

### 1. How to Log Your Time

You can track your attendance using either **Slash Commands** or by simply **typing in the chat**.

#### Using Slash Commands (Recommended)

- `/in`: Use this when you start your shift.
- `/out`: Use this when you finish your work for the day.
- `/break`: Use this when you’re going on a break (Lunch, Coffee, etc.).
- `/continue`: Use this when you are back from your break.

#### Using Keywords (Natural Chat)

You can also just type these phrases in the designated attendance channels:

- **To Clock In:** "Time in", "Clocking in", "Log in"
- **To Clock Out:** "Time out", "Log off", "Clocking out"
- **To Take a Break:** "Break", "On break", "Taking a break"
- **To Return:** "Back to work", "Continuing", "Back from break"

### 2. Designated Channels

Attendance is only recorded in specific channels created for the bot (usually in the **📅 Attendance** category). If you try to clock in elsewhere, the bot will gently remind you where to go.

---

## 🛡️ For Admins (Leads & HR)

### 1. Automatic Setup & Healing

- **On Join:** When the bot joins your server, it automatically creates a **📅 Attendance** category with all necessary channels.
- **On Startup:** If a channel is accidentally deleted, don't worry! Every time the bot restarts or logs in, it performs a "Health Check" and will automatically recreate any missing attendance channels.
- `#clock-in` / `#clock-out`: Where users log their daily start/end.
- `#breaks`: Where break activity is tracked.
- `#status-dashboard`: A real-time, auto-updating roster of who is currently working and for how long.
- `#reports`: Where summary digests and generated CSVs are sent.
- `#late-alerts`: Private alerts (Admin only) if someone hasn't clocked in by 10:00 AM.

### 2. Generating Reports

Use the `/report` command to get a detailed attendance summary.

- **Timeframes:** Daily, Weekly, or Monthly.
- **Format:** The bot will generate a **CSV file** that you can open in Excel or Google Sheets. It includes usernames, dates, exact clock-in/out times, and total net hours (excluding breaks).

### 3. Manual Adjustments & Testing

Sometimes people forget! Use these tools to keep your data accurate:

- `/adjust-time`: Manually set a user's Clock In or Clock Out time for today.
- `/force-out`: If someone forgetfully stayed clocked in overnight, use this to end their session.
- `/test-digest`: Force a sample daily digest to be sent immediately. Use this to test the reporting format or generate a summary mid-day.

### 4. Background Automation

- **Daily Digest (6:00 PM):** Every evening, the bot sends a summary to the reports channel listing everyone still clocked in, along with a **CSV file** of every member who logged time that day.
- **Break Reminders:** If a user stays on a break for too long (e.g., >15 mins for short breaks), the bot will ping them to resume work.

---

## 💡 Pro Tips

- **Check the Dashboard:** Always look at `#status-dashboard` for a bird's-eye view of your team’s current activity.
- **Stay in the Loop:** Keep the `#late-alerts` channel visible to ensure your team is starting on time.
- **Excel Integration:** Since reports are in CSV format, you can easily use them for payroll calculations!
