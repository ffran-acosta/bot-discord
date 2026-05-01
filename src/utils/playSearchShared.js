export const MAX_PLAYLIST_TRACKS = 200;

export function isLikelySpotifyUrl(query) {
    const q = query.trim();
    return /^https?:\/\/(open\.)?spotify\.com\//i.test(q) || /spotify:(track|album|playlist|episode):/i.test(q);
}

export function hasYoutubeListParameter(query) {
    const q = query.trim();
    if (!/^https?:\/\//i.test(q)) return false;
    return /[?&]list=[^&\s#]+/i.test(q) || /youtube\.com\/playlist/i.test(q);
}

export function formatTrackDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
