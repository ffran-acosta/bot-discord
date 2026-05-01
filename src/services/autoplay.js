import { EmbedBuilder } from 'discord.js';
import { formatTime } from '../utils/formatTime.js';

export async function searchAndPlayRelatedSong(player, kazagumo, client, guild) {
    const contextTrack = player._autoplayContext || player.queue.current;

    if (!contextTrack) {
        console.warn(`   └─ ⚠️ No context track available for autoplay`);
        return false;
    }

    if (!player._autoplayHistory) {
        player._autoplayHistory = [];
    }

    console.log(`   └─ 🔄 Autoplay enabled, searching for related songs...`);
    console.log(`   └─ Using context: ${contextTrack.title}`);

    try {
        let searchQuery = contextTrack.title;

        const artistMatch = contextTrack.title.match(/^([^-|]+)/);
        if (artistMatch) {
            const artistName = artistMatch[1].trim();
            searchQuery = artistName;
            console.log(`   └─ Extracted artist: ${artistName}`);
        } else {
            searchQuery = `radio ${contextTrack.title}`;
        }

        console.log(`   └─ Searching: ${searchQuery}`);

        const result = await kazagumo.search(searchQuery, {
            requester: client.user
        });

        if (result.tracks && result.tracks.length > 0) {
            const relatedTracks = result.tracks.filter(track => {
                if (track.uri === contextTrack.uri ||
                    (player.queue.current && track.uri === player.queue.current.uri)) {
                    return false;
                }

                const trackTitleLower = track.title.toLowerCase();
                const contextTitleLower = contextTrack.title.toLowerCase();
                if (trackTitleLower === contextTitleLower) {
                    return false;
                }

                const nonMusicKeywords = [
                    'how to', 'tutorial', 'guide', 'tips', 'tricks',
                    'radio concierto', 'emisión en directo', 'live radio',
                    'internet radio', 'licensing', 'keyfob', 'volvo',
                    'things you didn\'t know', 'cassette - radio'
                ];
                const isNonMusic = nonMusicKeywords.some(keyword =>
                    trackTitleLower.includes(keyword)
                );
                if (isNonMusic) {
                    return false;
                }

                const inHistory = player._autoplayHistory.some(historyTrack => {
                    if (historyTrack.uri === track.uri) return true;
                    const historyTitleLower = historyTrack.title.toLowerCase();
                    const trackWords = trackTitleLower.split(/\s+/).filter(w => w.length > 3);
                    const historyWords = historyTitleLower.split(/\s+/).filter(w => w.length > 3);
                    const commonWords = trackWords.filter(w => historyWords.includes(w));
                    if (commonWords.length >= 2) return true;
                    return false;
                });

                return !inHistory;
            });

            if (relatedTracks.length > 0) {
                const relatedTrack = relatedTracks[0];
                console.log(`   └─ ✅ Found related song: ${relatedTrack.title}`);

                player._autoplayHistory.push(relatedTrack);
                if (player._autoplayHistory.length > 10) {
                    player._autoplayHistory.shift();
                }

                player._autoplayContext = relatedTrack;

                const wasQueueEmpty = player.queue.length === 0;

                await player.queue.add(relatedTrack);

                if (wasQueueEmpty && player.queue.current) {
                    await player.skip();
                    await new Promise(resolve => setTimeout(resolve, 300));
                }

                if (!player.playing) {
                    await player.play();
                    await new Promise(resolve => setTimeout(resolve, 300));
                }

                if (player.textId) {
                    const channel = guild.channels.cache.get(player.textId);
                    if (channel) {
                        const embed = new EmbedBuilder()
                            .setColor(0x5865F2)
                            .setTitle('🔄 Autoplay')
                            .setDescription(`**Playing related song:**\n[${relatedTrack.title}](${relatedTrack.uri})`)
                            .addFields(
                                { name: '⏱️ Duration', value: relatedTrack.length > 0 ? formatTime(relatedTrack.length) : 'Live', inline: true }
                            )
                            .setThumbnail(relatedTrack.thumbnail || null)
                            .setTimestamp();

                        try {
                            await channel.send({ embeds: [embed] });
                            console.log(`   └─ ✅ Autoplay: Playing ${relatedTrack.title}`);
                        } catch (error) {
                            console.error('Error sending autoplay notification:', error);
                        }
                    }
                }
                return true;
            } else {
                console.warn(`   └─ ⚠️ No different related songs found`);
                return false;
            }
        } else {
            console.warn(`   └─ ⚠️ No related songs found`);
            return false;
        }
    } catch (autoplayError) {
        console.error('Error in autoplay search:', autoplayError);
        return false;
    }
}
