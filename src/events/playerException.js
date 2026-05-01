export default function registerPlayerExceptionEvent(kazagumo) {
    kazagumo.on('playerException', async (player, error) => {
        console.error(`Player error in guild ${player.guildId}:`, error);
        if (error.message) {
            console.error(`Error message: ${error.message}`);
        }
        const status = error.status || error.response?.status;
        if (status) {
            console.error(`Error status: ${status}`);
        }

        if (status >= 500 && status < 600) {
            console.error(`⚠️ Lavalink server error ${status} for guild ${player.guildId}. Server may be having issues.`);
        } else if (status === 404 || error.message?.includes('404')) {
            console.warn(`404 error detected, player may need to reconnect for guild ${player.guildId}`);
        }
    });
}
