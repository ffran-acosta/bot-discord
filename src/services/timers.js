export const emptyChannelTimers = new Map();

export function scheduleDisconnect(player, kazagumo) {
    if (emptyChannelTimers.has(player.guildId)) return;
    setTimeout(async () => {
        try {
            const p = kazagumo.players.get(player.guildId);
            if (p && !p.playing && p.queue.length === 0) await p.destroy();
        } catch (err) {
            console.error('Error destroying inactive player:', err);
        }
    }, 3600000);
}

export function scheduleEmptyChannelDisconnect(guildId, kazagumo) {
    if (emptyChannelTimers.has(guildId)) return;
    console.log(`🔇 Voice channel empty in guild ${guildId}, disconnecting in 1 hour`);
    const timer = setTimeout(async () => {
        emptyChannelTimers.delete(guildId);
        const player = kazagumo.players.get(guildId);
        if (!player) return;
        try {
            player.queue.clear();
            await player.destroy();
            console.log(`🔇 Disconnected from empty channel in guild ${guildId} after 1 hour`);
        } catch (err) {
            console.error('Error disconnecting from empty channel:', err);
        }
    }, 3600000);
    emptyChannelTimers.set(guildId, timer);
}

export function cancelEmptyChannelDisconnect(guildId) {
    const timer = emptyChannelTimers.get(guildId);
    if (timer) {
        clearTimeout(timer);
        emptyChannelTimers.delete(guildId);
        console.log(`✅ Someone joined in guild ${guildId}, cancelled empty-channel timer`);
    }
}
