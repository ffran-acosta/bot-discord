export function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Duración de una pista; los streams (length 0) se muestran como "En vivo".
 * @param {number} lengthMs
 */
export function formatTrackDuration(lengthMs) {
    return lengthMs > 0 ? formatTime(lengthMs) : 'En vivo';
}
