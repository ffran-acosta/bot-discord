export function isLikelySpotifyUrl(query) {
    const q = query.trim();
    return /^https?:\/\/(open\.)?spotify\.com\//i.test(q) || /spotify:(track|album|playlist|episode):/i.test(q);
}

export function hasYoutubeListParameter(query) {
    const q = query.trim();
    if (!/^https?:\/\//i.test(q)) return false;
    return /[?&]list=[^&\s#]+/i.test(q) || /youtube\.com\/playlist/i.test(q);
}
