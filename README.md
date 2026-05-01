# 🎵 Discord Music Bot

Complete music bot for Discord using **Kazagumo**, **Shoukaku** and **Lavalink**.

## ✨ Features

- ✅ Music playback from YouTube
- ✅ Queue system with shuffle
- ✅ Full playback control (play, pause, resume, stop, skip, queue)
- ✅ Volume adjustment (0–100%)
- ✅ Queue visualization
- ✅ Autoplay — automatically plays related songs when the queue ends
- ✅ **Multi-node Lavalink failover** — connects to multiple public nodes simultaneously; if one goes down, playback continues seamlessly
- ✅ Modern slash commands

## 📋 Requirements

- **Node.js** 18.0.0 or higher
- **pnpm** 8.x or higher (enable with Node’s Corepack: `corepack enable && corepack prepare pnpm@latest --activate`)
- A **Discord bot** created
- A **Lavalink v4** server — the bot auto-discovers free public nodes, so no manual setup is needed

---

## 📥 Step 1: Clone/Download the Project

### Option A: With Git

```bash
git clone <your-repository>
cd Bot-Music-Discord
```

### Option B: Download ZIP

1. Download the project as ZIP
2. Extract the folder
3. Open a terminal in the extracted folder

---

## 🤖 Step 2: Create the Bot on Discord

### 2.1 Create the Application

1. Go to: https://discord.com/developers/applications
2. Click **"New Application"**
3. Give your bot a name (e.g., "My Music Bot")
4. Click **"Create"**

### 2.2 Configure the Bot

1. In the side menu, go to **"Bot"**
2. Click **"Add Bot"** and confirm
3. **Enable these options:**
   - ✅ **Message Content Intent** (if available)
   - ✅ **Server Members Intent** (if available)
   - ✅ **Presence Intent** (optional)

### 2.3 Get the Token

1. In the **"Token"** section, click **"Reset Token"** or **"Copy"**
2. **⚠️ IMPORTANT:** Save this token in a safe place (you'll need it later)
3. **NEVER** share this token publicly

### 2.4 Get the Application ID

1. Go to the **"General Information"** section
2. Copy the **Application ID** (you'll also need this later)

---

## ➕ Step 3: Add the Bot to the Server

### 3.1 Generate Invitation Link

1. In the side menu, go to **"OAuth2" → "URL Generator"**
2. In **"Scopes"**, select:
   - ✅ `bot`
   - ✅ `applications.commands`
3. In **"Bot Permissions"**, select:
   - ✅ **Connect** (connect to voice channels)
   - ✅ **Speak** (speak in voice channels)
   - ✅ **Use Voice Activity** (use voice activity)
   - ✅ **Send Messages** (send messages)
   - ✅ **Use Slash Commands** (use slash commands)
4. Copy the **generated URL** at the bottom of the page

### 3.2 Invite the Bot

1. Open the copied URL in your browser
2. Select the server where you want to add the bot
3. Click **"Authorize"**
4. Complete the CAPTCHA if it appears

### 3.3 Get the Server ID (Optional, but Recommended)

1. In Discord, enable **Developer Mode:**
   - Go to: **User Settings → Advanced → Developer Mode**
2. Right-click on your server → **"Copy ID"**
3. Save this ID (you'll use it for instant commands)

---

## 📦 Step 4: Install Dependencies

1. Open a terminal in the project folder
2. Run:

```bash
pnpm install
```

This will install all necessary dependencies.

---

## ⚙️ Step 5: Configure Environment Variables

### 5.1 Create the `.env` file

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

```env
# Discord bot token (REQUIRED)
DISCORD_TOKEN=your_token_here

# Bot Application ID (REQUIRED for deploying commands)
DISCORD_CLIENT_ID=your_application_id

# Primary Lavalink node (REQUIRED)
# The bot auto-discovers additional public nodes for redundancy.
LAVALINK_URL=lavalink-v4.triniumhost.com:443
LAVALINK_PASSWORD=free
LAVALINK_SECURE=true
```

### 5.2 Fill in the Values

- **`DISCORD_TOKEN`:** The token you copied in Step 2.3 (REQUIRED)
- **`DISCORD_CLIENT_ID`:** The Application ID you copied in Step 2.4 (REQUIRED for `pnpm run deploy`)
- **`LAVALINK_URL` / `LAVALINK_PASSWORD` / `LAVALINK_SECURE`:** Your primary Lavalink node. The bot will automatically connect to additional public nodes for redundancy — so even if the primary is down, music keeps playing.

---

## 🎵 Step 6: Configure Lavalink

The bot uses **automatic multi-node failover** — it connects to multiple Lavalink v4 servers at startup. You only need to configure one primary node in `.env`; the rest are discovered automatically from a public API.

### Automatic Node Discovery

On every startup the bot:
1. Fetches available Lavalink v4 SSL nodes from `lavalink-list.ajieblogs.eu.org`
2. Connects to all discovered nodes simultaneously
3. Uses the healthiest node for each request
4. If a node goes down mid-playback, Shoukaku moves the player to another node automatically

You will see something like this in the logs:

```
🔍 Fetching Lavalink nodes from public API...
📡 API returned 4 v4 SSL nodes
🎵 Lavalink nodes ready (5 total):
   1. lavalink-v4.triniumhost.com:443  [primary]
   2. lavalinkv4.serenetia.com:443  [lavalinkv4-serenetia-com-443]
   ...
✅ Lavalink primary: Connected!
✅ Lavalink lavalinkv4-serenetia-com-443: Connected!
```

### Using a Free Public Node (Default)

The `.env.example` already contains a working free node (`lavalink-v4.triniumhost.com`). You can use it as-is, or swap it for any other public Lavalink v4 node.

### Option: Local Lavalink (Advanced)

If you want to run your own Lavalink server:

1. **Download Lavalink:**
   - Go to: https://github.com/lavalink-devs/Lavalink/releases
   - Download `Lavalink.jar`

2. **Create `application.yml`:**
   ```yaml
   server:
     port: 2333
     address: 0.0.0.0

   lavalink:
     server:
       password: "youshallnotpass"
       sources:
         youtube: true
         soundcloud: true
   ```

3. **Run Lavalink:**
   ```bash
   java -jar Lavalink.jar
   ```

4. **Update `.env`:**
   ```env
   LAVALINK_URL=localhost:2333
   LAVALINK_PASSWORD=youshallnotpass
   LAVALINK_SECURE=false
   ```

---

## 🧪 Step 7: Test Locally

**⚠️ IMPORTANT:** Test that everything works locally before hosting on Wispbyte.

### 7.1 Verify Configuration

Run the verification script:

```bash
pnpm run setup
```

This script will verify:
- ✅ Node.js version
- ✅ Dependencies installed
- ✅ Environment variables configured
- ✅ Necessary files present

### 7.2 Register Commands

Register the slash commands on Discord:

```bash
pnpm run deploy
```

**Important Notes:** 
- You can run this command **locally** (before hosting) or **from Wispbyte console** (after hosting)
- If you specified `GUILD_ID` in `.env`, commands will appear **immediately** (1-2 minutes)
- If not, global commands can take **up to 1 hour** to appear
- The script will automatically fallback to global registration if server registration fails (e.g., missing permissions)

### 7.3 Start the Bot

```bash
pnpm start
```

Or for development with auto-reload:

```bash
pnpm run dev
```

### 7.4 Verify it Works

You should see in the console:

```
🔍 Fetching Lavalink nodes from public API...
📡 API returned X v4 SSL nodes
🎵 Lavalink nodes ready (X total):
   1. lavalink-v4.triniumhost.com:443  [primary]
   ...
🤖 Bot connected as YourBot#1234!
📊 Servers: X
✅ Lavalink primary: Connected!
✅ Client fully ready!
```

### 7.5 Test on Discord

1. **Join a voice channel** in your server
2. Type `/play` followed by a song name
3. The bot will automatically connect and start playing

**If everything works correctly, you're ready to host on Wispbyte!** ✅

---

## 🌐 Step 8: Host on Wispbyte

Once you've tested that everything works locally, you can host it on [Wispbyte](https://wispbyte.com/client).

### 8.1 Prerequisites

Make sure you have:
- ✅ Bot working locally
- ✅ Wispbyte account

**Note:** You can register commands either:
- **Before hosting:** Run `pnpm run deploy` locally
- **After hosting:** Run `pnpm run deploy` from Wispbyte's console (or `npm run deploy` if the host only ships npm)

### 8.2 Upload Project to Wispbyte

You have **2 options** to upload your bot:

#### Option A: Upload Complete Folder (Faster) ⚡

1. **Prepare the files:**
   - Compress your project into a ZIP
   - **Include:** All files EXCEPT `node_modules` (installs automatically)
   - **Include:** The `.env` file (required for Wispbyte)

2. **Upload to Wispbyte:**
   - Go to Wispbyte panel
   - Use **File Manager** or **Upload Files**
   - Upload the ZIP and extract it
   - Or upload files individually

3. **Advantages:**
   - ✅ Faster to get started
   - ✅ You don't need Git
   - ✅ Direct file control

4. **Disadvantages:**
   - ❌ To update, you must upload files manually
   - ❌ No version control

#### Option B: Connect with GitHub (Recommended for Production) 🔗

1. **Create a GitHub repository:**
   - Go to: https://github.com/new
   - Create a repository (public or private)
   - **DO NOT** initialize with README

2. **Upload your code to GitHub:**

   **If you have Git installed:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Discord Music Bot"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
   git push -u origin main
   ```
   
   **⚠️ IMPORTANT:** Verify that `.env` is in `.gitignore` before doing `git add .`
   
   **If you DON'T have Git:**
   - Use GitHub Desktop: https://desktop.github.com/
   - Or upload files manually from GitHub web

3. **Connect Wispbyte with GitHub:**
   - In Wispbyte, look for: **"Git"** or **"Repository"** or **"Source Control"**
   - Paste the URL: `https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git`
   - Branch: `main`
   - Enable **Auto Deploy** ✅

4. **Upload `.env` manually:**
   - The `.env` is NOT on GitHub (for security)
   - You must upload it manually to Wispbyte using File Manager

5. **Advantages:**
   - ✅ Version control
   - ✅ Auto-deploy when you do `git push`
   - ✅ Easy to update
   - ✅ Change history

6. **Disadvantages:**
   - ❌ Requires Git/GitHub
   - ❌ More complex initial setup

### 8.3 Configure Environment Variables

**Note:** Wispbyte doesn't have an Environment Variables section, so you must upload the `.env` file directly.

1. **Make sure your `.env` has all variables:**

```env
DISCORD_TOKEN=your_token_here
LAVALINK_URL=lavalinkv4.serenetia.com:443
LAVALINK_PASSWORD=your_password
LAVALINK_SECURE=true
# Optional - Client ID is obtained automatically if not provided
DISCORD_CLIENT_ID=your_application_id

# Optional - If not provided, commands will be registered globally
GUILD_ID=your_server_id
```

2. **Upload the `.env` along with other files** to Wispbyte

**⚠️ IMPORTANT:** 
- The `.env` is in `.gitignore` so it **does NOT upload to GitHub** (for security)
- But you **MUST upload it to Wispbyte** manually
- **NEVER** share your `.env` publicly

### 8.4 Service Configuration

In Wispbyte, configure:

- **Type:** Node.js
- **Node.js Version:** 18.x or higher (recommended 20.x)
- **Startup Command:** (Already configured, you don't need to change it)
- **Port:** Not necessary (the bot doesn't use HTTP port)
- **Auto-restart:** Enabled (recommended)

**💡 How does Wispbyte know what to execute?**

The **Startup Command** that comes by default in Wispbyte is already configured correctly:

```bash
if [[ -d .git ]] && [[ 0 == "1" ]]; then git pull; fi; 
if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; 
if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; 
if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; 
/usr/local/bin/node /home/container/index.js
```

Wispbyte’s default script uses **`npm install`**. That still works because dependencies are declared in `package.json` (without the exact versions from `pnpm-lock.yaml`). Locally, this project uses **pnpm** and commits `pnpm-lock.yaml`.

To use **pnpm** on the server (optional): replace the installation line with something like:

```bash
corepack enable && corepack prepare pnpm@10.4.1 --activate && cd /home/container && pnpm install --frozen-lockfile
```

(This requires Node 18+ with Corepack; adjust the panel’s startup/install command.)

This command:
1. Does `git pull` if there's a connected repository
2. Installs dependencies (default: `npm install` on Wispbyte; see optional pnpm snippet above)
3. Executes `node index.js` (equivalent to `pnpm start`)

**You don’t usually need to change it** unless you want lockfile-aligned installs via pnpm.

### 8.5 Install Dependencies

If dependencies did not install on boot, open Wispbyte’s console and run `pnpm install` (or `npm install` if pnpm isn't available).

### 8.6 Register Commands (If Not Done Locally)

**You can register commands in two ways:**

#### Option A: From Wispbyte Console (After Hosting) ✅

1. Go to Wispbyte panel
2. Open the **Console/Terminal** section
3. Run:
   ```bash
   pnpm run deploy
   ```

**This is especially useful if:**
- You didn't register commands locally
- You need to update commands after making changes
- You want to switch between server-specific and global commands

#### Option B: From Local Machine (Before Hosting)

Run `pnpm run deploy` locally before uploading to Wispbyte (see Step 7.2).

**Note:** Both methods work the same way. The script will automatically:
- Try to register on the server if `GUILD_ID` is provided
- Fallback to global registration if server registration fails
- Use the Client ID from `.env` or obtain it automatically from your token

### 8.7 Start the Bot

1. In the Wispbyte panel, click **Start**
2. Check the logs to verify everything is okay
3. You should see:
   ```
   🤖 Bot connected as YourBot#1234!
   ✅ Lavalink lavalink: Connected!
   ```

### 8.8 Verification

#### Expected Logs

If everything is okay, you should see in the logs:

```
🔍 Fetching Lavalink nodes from public API...
📡 API returned X v4 SSL nodes
🎵 Lavalink nodes ready (X total):
   1. lavalink-v4.triniumhost.com:443  [primary]
   ...
🤖 Bot connected as YourBot#1234!
📊 Servers: X
✅ Lavalink primary: Connected!
✅ Client fully ready!
```

#### If there are Errors

- **Token error:** Verify `DISCORD_TOKEN` in `.env`
- **Lavalink error:** Verify `LAVALINK_URL` and `LAVALINK_PASSWORD`
- **Dependencies error:** Run `pnpm install` in Wispbyte console (or `npm install` if pnpm isn't available)

### 8.8 Update the Bot

#### If you make code changes:

**If you use GitHub (Option B):**
1. Edit code locally
2. Test: `pnpm start`
3. Upload to GitHub:
   ```bash
   git add .
   git commit -m "Change description"
   git push
   ```
4. Wispbyte automatically detects, does `git pull` and restarts the bot

**If you uploaded complete folder (Option A):**
1. Edit code locally
2. Test: `pnpm start`
3. Upload modified files to Wispbyte manually
4. Restart the bot from the panel

#### If you change commands:

1. Run `pnpm run deploy` **locally** (not from Wispbyte)
2. Commands will update on Discord

### 8.9 Tips for Wispbyte

1. **Use Git:** It's easier to keep code updated
2. **Monitor logs:** Wispbyte has real-time logs
3. **Auto-restart:** Enable it so the bot restarts if it crashes
4. **Backups:** Save your `.env` in a safe place

---

## 🎮 Available Commands

| Command | Description |
|---------|-------------|
| `/play <song>` | Plays a song or adds it to the queue (name or URL) |
| `/skip` | Skips to the next song |
| `/pause` | Pauses playback |
| `/resume` | Resumes playback |
| `/stop` | Stops playback and clears the queue |
| `/queue` | Shows the current playback queue |
| `/shuffle` | Shuffles the songs in the queue |
| `/volume <0-100>` | Adjusts volume (0–100%) |
| `/autoplay <on/off>` | Automatically plays related songs when the queue ends |

## 📖 Usage Guide

### 1. Using the Bot on Discord

1. **Join a voice channel** in your server
2. Type `/play` followed by a song name
3. The bot will automatically connect and start playing

### 2. Usage Examples

```
/play never gonna give you up
/play https://www.youtube.com/watch?v=dQw4w9WgXcQ
/play bohemian rhapsody
/volume level: 50
/shuffle
/queue
/skip
```

---

## 🛠️ Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm start` | Starts the bot |
| `pnpm run dev` | Starts the bot with auto-reload |
| `pnpm run deploy` | Registers slash commands on Discord |
| `pnpm run setup` | Verifies initial configuration |

---

## 📁 Project Structure

```
Discord-Music-Bot/
├── commands/          # Bot slash commands
│   ├── play.js
│   ├── skip.js
│   ├── pause.js
│   ├── resume.js
│   ├── stop.js
│   ├── queue.js
│   ├── shuffle.js
│   ├── volume.js
│   └── autoplay.js
├── index.js           # Main bot file (multi-node Lavalink + event handlers)
├── deploy-commands.js # Script to register slash commands on Discord
├── setup.js           # Initial configuration verification script
├── package.json       # Dependencies and scripts
├── pnpm-lock.yaml    # Locked dependency versions (pnpm)
├── .env.example       # Environment variables template
├── .env               # Your config (create from .env.example, never commit)
└── README.md          # This documentation
```

---

## 🆘 Troubleshooting

### Bot doesn't connect to Discord

- ✅ Verify that `DISCORD_TOKEN` is correct in `.env`
- ✅ Verify that the bot has the correct intents enabled
- ✅ Verify that the bot is invited to the server

### Doesn't connect to Lavalink

- ✅ Verify that `LAVALINK_URL` and `LAVALINK_PASSWORD` are correct in `.env`
- ✅ If using port 443, make sure `LAVALINK_SECURE=true`
- ✅ The bot auto-connects to multiple public nodes — if the primary is down, others will be used automatically
- ✅ Check the startup logs: you should see multiple "✅ Lavalink X: Connected!" lines

### Commands don't appear

- ✅ Run `pnpm run deploy` to register commands
- ✅ Wait 1-2 minutes (server commands) or up to 1 hour (global commands)
- ✅ Refresh Discord completely (close and reopen)
- ✅ Verify that the bot has permissions on the server

### Bot doesn't play music

- ✅ Verify that Lavalink is connected (should see "✅ Lavalink lavalink: Connected!")
- ✅ Make sure you're in a voice channel before using `/play`
- ✅ Verify that the bot has permissions to connect to the channel

---

## 📝 Important Notes

- The bot needs permissions to connect to voice channels
- Global commands can take up to 1 hour to appear
- Use `GUILD_ID` in `.env` for instant commands
- Port 443 requires `LAVALINK_SECURE=true`
- The `.env` should NOT be uploaded to GitHub (it's in `.gitignore`)
- The `.env` MUST be uploaded to Wispbyte manually

---

## 🔐 Bot Permissions

When inviting the bot, make sure to give it these permissions:
- ✅ **Connect** (connect to voice channels)
- ✅ **Speak** (speak in voice channels)
- ✅ **Use Voice Activity** (use voice activity)
- ✅ **Send Messages** (send messages)
- ✅ **Use Slash Commands** (use slash commands)

---

## 🙏 Credits

- [Kazagumo](https://github.com/Takiyo0/Kazagumo) - Wrapper for Shoukaku
- [Shoukaku](https://github.com/shipgirlproject/Shoukaku) - Lavalink client
- [Lavalink](https://github.com/lavalink-devs/Lavalink) - Audio server
- [Discord.js](https://discord.js.org/) - Discord library

---

**Enjoy your music bot! 🎵**

**Thiago Brucezzi**