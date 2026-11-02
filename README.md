# 🎵 bot-discord

Music bot for Discord built with **discord.js 14**, **Kazagumo** + **Shoukaku** and **Lavalink v4**. User-facing messages are in Spanish.

## ✨ Features

- Plays from YouTube (search or URL), including playlists
- Queue with `playnext`, shuffle, seek and loop (track / queue)
- **Now-playing panel** with live progress bar and buttons (previous, pause/resume, skip, stop, radio mode, clear queue)
- **Radio mode (autoplay)**: keeps playing related songs when the queue runs out
- **Queue persistence**: queues are saved every minute and on shutdown, and restored after a restart
- **Lavalink node pool**: discovers public v4 nodes at startup, refreshes them hourly, reseeds when all nodes drop and removes flapping nodes
- HTTP healthcheck (`/ping`, `/health`)

## 📋 Requirements

- **Node.js** 20 or newer
- **pnpm** (`corepack enable`)
- A Discord application with a bot user
- A Lavalink v4 node (optional: public nodes are discovered automatically)

## 🤖 Discord setup

1. Create an application at https://discord.com/developers/applications and add a bot.
2. Copy the **bot token** (Bot → Reset Token). No privileged intents are needed.
3. Invite the bot with **OAuth2 → URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot permissions: **View Channels**, **Send Messages**, **Embed Links**, **Read Message History**, **Connect**, **Speak**
4. Optional: enable Developer Mode in Discord and copy your server ID for instant command registration.

## ⚙️ Configuration

```bash
pnpm install
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_TOKEN` | Yes | Bot token |
| `LAVALINK_URL` | No | Primary node as `host:port` (default `localhost:2333`) |
| `LAVALINK_PASSWORD` | No | Primary node password |
| `LAVALINK_SECURE` | No | `true` to force WSS (automatic on port 443) |
| `HEALTHCHECK_PORT` | No | Healthcheck HTTP port (default `3000`) |
| `LOG_LEVEL` | No | `error` \| `warn` \| `info` \| `debug` |
| `GUILD_ID` / `DISCORD_GUILD_ID` | No | Registers slash commands on that server instantly instead of globally |
| `DISCORD_CLIENT_ID` | No | Application ID; resolved from the token if missing |

Besides the primary node, the bot adds public Lavalink v4 SSL nodes from `lavalink-list.ajieblogs.eu.org` plus a few hardcoded fallbacks, so it works without running your own Lavalink. Public nodes are unstable; for reliable playback, point `LAVALINK_URL` to your own server.

## 🚀 Running locally

```bash
pnpm run setup    # checks Node version, dependencies and .env
pnpm run deploy   # registers slash commands (run again after adding or changing one)
pnpm dev          # starts with auto-reload (or `pnpm start`)
```

With `GUILD_ID` set, commands appear immediately; global registration can take up to an hour.

## 🎮 Commands

| Command | Description |
|---------|-------------|
| `/play <song>` | Plays a song or playlist, or adds it to the queue (name or URL) |
| `/playnext <song>` | Inserts a song right after the current one |
| `/skip` | Skips to the next song |
| `/pause` / `/resume` | Pauses / resumes playback |
| `/stop` | Stops playback, clears the queue and leaves the voice channel |
| `/seek <time>` | Jumps to a position (`90` or `1:30`) |
| `/loop <mode>` | Repeat mode: off, current track or whole queue |
| `/shuffle` | Shuffles the queue |
| `/clear` | Clears the queue (the current song keeps playing) |
| `/queue` | Shows the queue (10 per page) |
| `/nowplaying` | Posts the now-playing panel with controls in the current channel |
| `/volume <0-100>` | Sets the volume |
| `/autoplay <on/off>` | Toggles radio mode (related songs when the queue ends) |
| `/join` | Joins your voice channel |
| `/stats` | Uptime, servers, songs played, Lavalink nodes and memory |

## 🛠️ Scripts

| Script | Description |
|--------|-------------|
| `pnpm start` | Starts the bot |
| `pnpm dev` | Starts the bot with `node --watch` |
| `pnpm run deploy` | Registers slash commands |
| `pnpm run setup` | Verifies the local configuration |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc` with `checkJs` over the JSDoc types |
| `pnpm test` | Unit tests (`node:test`) |
| `pnpm format` / `pnpm format:check` | Prettier |

## 📁 Project structure

```
bot-discord/
├── commands/            # One slash command per file, loaded dynamically
├── src/
│   ├── config/          # Constants (timeouts in ms) and Lavalink node discovery
│   ├── events/          # Discord, Kazagumo and Shoukaku event handlers
│   ├── middleware/      # Guards (voice channel, player, same channel)
│   ├── services/        # Playback, autoplay, node pool, queue persistence, now-playing panel, healthcheck
│   ├── ui/              # Embeds, buttons and colors
│   └── utils/           # Logger, formatting, player helpers, command loader
├── test/                # Unit tests
├── data/                # Persisted queues (generated, git-ignored)
├── docs/                # Hosting runbook
├── index.js             # Entry point
├── deploy-commands.js   # Slash command registration
├── setup.js             # Configuration check
├── deploy.sh            # Deploys to the VM (git pull + pm2 restart)
└── deploy-commands.sh   # Registers slash commands from the VM
```

## ☁️ Deployment

The bot runs on an Oracle Cloud VM under **pm2**. From your machine:

```bash
./deploy.sh            # SSH to the VM, pull the branch and restart the pm2 process
./deploy-commands.sh   # Register slash commands from the VM
```

Both scripts accept `DEPLOY_HOST`, `DEPLOY_DIR` (and `DEPLOY_BRANCH` / `DEPLOY_PROCESS` for `deploy.sh`) to override the defaults. See [`docs/oracle-runbook.md`](docs/oracle-runbook.md) for pm2 setup, autostart and day-to-day operation.

## 🆘 Troubleshooting

- **Commands don't appear:** run `pnpm run deploy`; without `GUILD_ID`, wait up to an hour and restart Discord.
- **"No hay nodos de Lavalink disponibles":** public nodes are down; the pool reseeds automatically, try again in a moment or configure your own `LAVALINK_URL`.
- **The panel doesn't update:** the bot needs **Read Message History** and **Embed Links** in that channel.
- **Bot doesn't join the voice channel:** check **Connect** and **Speak** permissions for that channel.
- **Status check:** `GET /health` returns `ok`, `degraded` (no Lavalink node connected) or `down`, plus node counts.

## 🙏 Credits

- [Kazagumo](https://github.com/Takiyo0/Kazagumo) · [Shoukaku](https://github.com/shipgirlproject/Shoukaku) · [Lavalink](https://github.com/lavalink-devs/Lavalink) · [discord.js](https://discord.js.org/)

Released under the [MIT License](LICENSE).

**Franco Acosta**
