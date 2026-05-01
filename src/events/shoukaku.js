export default function registerShoukakuEvents(shoukaku) {
    shoukaku.on('ready', (name) => {
        console.log(`✅ Lavalink ${name}: Connected!`);
    });

    shoukaku.on('error', (name, error) => {
        console.error(`❌ Lavalink ${name}: Error -`, error);
    });

    shoukaku.on('close', (name, code, reason) => {
        console.warn(`⚠️ Lavalink ${name}: Closed - Code: ${code}, Reason: ${reason || 'No reason'}`);
    });

    shoukaku.on('disconnect', (name, players, moved) => {
        console.warn(`⚠️ Lavalink ${name}: Disconnected - Players: ${players.length}, Moved: ${moved}`);
        if (players && players.length > 0) {
            players.forEach(player => {
                try {
                    if (player && !moved) {
                        player.destroy().catch(err => {
                            console.error(`Error destroying player ${player.guildId}:`, err);
                        });
                    }
                } catch (err) {
                    console.error('Error handling disconnected player:', err);
                }
            });
        }
    });

    shoukaku.on('debug', (name, info) => {
        if (typeof info === 'string' && (
            info.includes('Connection') ||
            info.includes('Player') ||
            info.includes('Error') ||
            info.includes('404') ||
            info.includes('disconnect') ||
            info.includes('Voice') ||
            info.includes('Session') ||
            info.includes('Server Update') ||
            info.includes('State Update')
        )) {
            console.log(`[DEBUG] ${name}:`, info);
        }
    });
}
