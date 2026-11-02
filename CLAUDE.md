# bot-discord

Bot de música para Discord (JS ESM, discord.js 14, kazagumo + shoukaku, Lavalink v4). Mensajes al usuario en español rioplatense.

## Comandos (pnpm)
- `pnpm dev` (node --watch), `pnpm start`
- `pnpm deploy`: registrar slash commands tras crear o cambiar uno. Con GUILD_ID es instantáneo; global tarda hasta 1 h.
- Verificación: `pnpm lint`, `pnpm typecheck` (tsc con checkJs sobre JSDoc), `pnpm test` (node:test en `test/`), `pnpm format` / `pnpm format:check` (Prettier).
- Deploy: `./deploy.sh` (SSH a la VM Oracle → git pull → pm2 restart bot-discord); `./deploy-commands.sh`

## Estructura
- `commands/*.js`: `export default { data: SlashCommandBuilder, execute(interaction, kazagumo) }`, carga dinámica.
- `src/events`, `src/services` (lavalinkPool, playback, autoplay, queuePersistence, healthcheck), `src/middleware/guards.js`, `src/ui`, `src/utils/logger`, `src/config/constants.js`.

## Convenciones
- ESM: imports con extensión `.js`.
- Usar los guards (`requireVoiceChannel`, `requirePlayer`, `requireSameVoiceChannel`, `requirePlayerInVoice`) en vez de chequear a mano. Son async: `const ctx = await requirePlayerInVoice(interaction, kazagumo); if (!ctx) return;` (devuelve `{ player }`).
- Colores de embeds desde `src/ui/colors.js`; duraciones con `formatTrackDuration`.
- Para saltar un tema usar `skipTrack(player)` (no `player.skip()`), así el loop de tema no lo repite.
- Errores: `logger.error(msg, { guildId, error })`; para mensajes al usuario, `PlayerSetupError.userMessage`. Prefijo ❌.
- Tiempos y timeouts en `constants.js` (ms). No hardcodear.
- JSDoc para tipos. Conventional Commits.

## Gotchas
- Los nodos Lavalink públicos son inestables: Discord suele estar listo antes que los nodos (`LAVALINK_RESTORE_WAIT_MS`).
- Las funciones nuevas suelen venir de ../Discord-Music-Bot (upstream de terceros, monolítico): se portan a mano, sin merge.
- Nunca leer `.env`, `ssh/` ni `docs/*.local.md`.
