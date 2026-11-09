import { AudioPlayer, setAudioModeAsync, useAudioPlayer as useExpoAudioPlayer } from 'expo-audio';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { Song } from '../../../shared/types/song';

export type RepeatMode = 'off' | 'all' | 'one';

export type PlayerContextType = {
    play: (song: Song, queue?: Song[]) => void;
    togglePlayPause: () => void;
    playNext: () => void;
    playPrevious: () => void;
    setRepeatMode: () => void;
    toggleShuffle: () => void;
    removeFromQueue: (index: number) => void;
    moveInQueue: (fromIndex: number, toIndex: number) => void;
    setQueueAtomic: (newQueue: Song[], newIndex?: number) => void;
    clearUpNext: () => void;
    isPlaying: boolean;
    currentSong: Song | null;
    queue: Song[];
    currentIndex: number;
    repeatMode: RepeatMode;
    shuffleMode: boolean;
    player: AudioPlayer | null;
};

export const AudioPlayerContext = createContext<PlayerContextType>({
    play: () => { },
    togglePlayPause: () => { },
    playNext: () => { },
    playPrevious: () => { },
    setRepeatMode: () => { },
    toggleShuffle: () => { },
    removeFromQueue: () => { },
    moveInQueue: () => { },
    setQueueAtomic: () => { },
    clearUpNext: () => { },
    isPlaying: false,
    currentSong: null,
    queue: [],
    currentIndex: -1,
    repeatMode: 'off',
    shuffleMode: false,
    player: null,
});

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
    const [currentSong, setCurrentSong] = useState<Song | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [queue, setQueue] = useState<Song[]>([]);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [repeatMode, setRepeatModeState] = useState<RepeatMode>('off');
    const [shuffleMode, setShuffleMode] = useState(false);
    const [originalQueue, setOriginalQueue] = useState<Song[]>([]);
    const [playbackRequestVersion, setPlaybackRequestVersion] = useState(0);
    const player = useExpoAudioPlayer(null);
    const playRequestId = useRef(0);
    const playbackSongRef = useRef<Song | null>(null);
    const mounted = useRef(true);
    const queueRef = useRef(queue);
    const currentIndexRef = useRef(currentIndex);
    queueRef.current = queue;
    currentIndexRef.current = currentIndex;

    const requestSong = useCallback((song: Song | null) => {
        playRequestId.current += 1;
        playbackSongRef.current = song;
        setPlaybackRequestVersion(version => version + 1);
        setCurrentSong(song);
    }, []);

    // Configure Audio Mode and manage lifecycle on Mount
    useEffect(() => {
        mounted.current = true;
        async function configureAudio() {
            try {
                await setAudioModeAsync({
                    playsInSilentMode: true,
                    shouldPlayInBackground: true,
                    interruptionMode: 'doNotMix',
                });
            } catch (e) {
                console.log('Error setting audio mode', e);
            }
        }
        void configureAudio();

        return () => {
            mounted.current = false;
            playRequestId.current += 1;
        };
    }, []);

    // Start playback immediately; metadata enrichment must never block audio.
    useEffect(() => {
        const song = playbackSongRef.current;
        const reqId = playRequestId.current;
        if (!song) return;
        try {
            const uri = typeof song.uri === 'string' ? song.uri.split('?')[0] : '';
            if (!uri) throw new Error('The selected track has no playable URI.');
            player.replace({ uri });
            player.play();
            try {
                player.setActiveForLockScreen(true, {
                    title: song.title || song.filename || 'Unknown Title',
                    artist: song.artist || 'Unknown Artist',
                    albumTitle: song.album || 'Unknown Album',
                    artworkUrl: typeof song.artwork === 'string' ? song.artwork : undefined,
                }, { showSeekBackward: true, showSeekForward: true });
            } catch (error) {
                console.warn('Unable to update lock-screen metadata', error);
            }
        } catch (error) {
            if (mounted.current && reqId === playRequestId.current) {
                setIsPlaying(false);
                console.warn('Unable to start audio playback', error);
            }
            return;
        }

        let cancelled = false;
        const enrichLockScreenMetadata = async () => {
            try {
                const { getSongMetadata } = await import('../../../services/metadata');
                const metadata = await getSongMetadata(song.uri, song.id);
                if (cancelled || !mounted.current || reqId !== playRequestId.current || !metadata) return;

                try {
                    player.setActiveForLockScreen(true, {
                        title: metadata.title || song.title || song.filename || 'Unknown Title',
                        artist: metadata.artist || song.artist || 'Unknown Artist',
                        albumTitle: metadata.album || song.album || 'Unknown Album',
                        artworkUrl: metadata.artwork,
                    }, { showSeekBackward: true, showSeekForward: true });
                } catch (lockScreenErr) {
                    // Safe guard: player may have transitioned to next track or unmounted
                    console.warn('Unable to enrich lock-screen metadata', lockScreenErr);
                }

                if (!song.artwork && metadata.artwork) {
                    setCurrentSong((previous: any) =>
                        previous?.id === song.id && reqId === playRequestId.current
                            ? { ...previous, ...metadata }
                            : previous,
                    );
                }
            } catch (error) {
                if (!cancelled && mounted.current && reqId === playRequestId.current) {
                    console.warn('Unable to load track metadata', error);
                }
            }
        };
        void enrichLockScreenMetadata();
        return () => { cancelled = true; };
    }, [playbackRequestVersion, player]);

    // Handle song completion based on repeat mode
    const handleSongCompletion = useCallback(() => {
        if (repeatMode === 'one') {
            player.seekTo(0);
            player.play();
        } else if (repeatMode === 'all') {
            if (queue.length === 0) return;
            const nextIndex = (currentIndex + 1) % queue.length;
            setCurrentIndex(nextIndex);
            requestSong(queue[nextIndex]);
        } else if (repeatMode === 'off') {
            if (currentIndex < queue.length - 1) {
                const nextIndex = currentIndex + 1;
                setCurrentIndex(nextIndex);
                requestSong(queue[nextIndex]);
            } else {
                setIsPlaying(false);
                player.pause();
                player.clearLockScreenControls();
            }
        }
    }, [repeatMode, queue, currentIndex, player, requestSong]);

    // Playback status update callback
    useEffect(() => {
        const subscription = player.addListener('playbackStatusUpdate', (status: any) => {
            if (status.isLoaded) {
                setIsPlaying(status.playing);
                if (status.didJustFinish && !status.loop) {
                    handleSongCompletion();
                }
            }
        });

        return () => subscription.remove();
    }, [player, handleSongCompletion]);

    // Shuffle array using Fisher-Yates algorithm
    const shuffleArray = (array: any[]) => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    };

    // Play new song or resume current
    const play = useCallback((song: Song, newQueue?: Song[]) => {
        if (!song) return;
        if (newQueue && newQueue.length > 0) {
            // New queue provided
            const nextQueue = [...newQueue];
            let songIndex = nextQueue.findIndex(s => s.id === song.id);
            if (songIndex < 0) {
                nextQueue.push(song);
                songIndex = nextQueue.length - 1;
            }
            setOriginalQueue(nextQueue);
            setQueue(nextQueue);
            queueRef.current = nextQueue;
            const nextIndex = songIndex;
            currentIndexRef.current = nextIndex;
            setCurrentIndex(nextIndex);
            requestSong(song);
        } else if (currentSong?.id === song.id) {
            // Same song, just resume
            player.play();
        } else {
            // Different song from current queue
            const songIndex = queue.findIndex(s => s.id === song.id);
            if (songIndex !== -1) {
                currentIndexRef.current = songIndex;
                setCurrentIndex(songIndex);
                requestSong(song);
            } else {
                // Song not in queue, play as single
                queueRef.current = [song];
                currentIndexRef.current = 0;
                setQueue([song]);
                setOriginalQueue([song]);
                setCurrentIndex(0);
                requestSong(song);
            }
        }
    }, [currentSong?.id, queue, player, requestSong]);

    // Toggle play/pause
    const togglePlayPause = useCallback(async () => {
        try {
            if (player.playing) {
                player.pause();
            } else {
                player.play();
            }
        } catch (error) {
            console.log('Error toggling playback', error);
        }
    }, [player]);

    // Play next song
    const playNext = React.useCallback(() => {
        const currentQueue = queueRef.current;
        const activeIndex = currentIndexRef.current;
        if (currentQueue.length === 0 || activeIndex < 0 || activeIndex >= currentQueue.length || !currentQueue[activeIndex]) return;

        let nextIndex: number;
        if (repeatMode === 'one') {
            // In repeat one mode, next goes to actual next song
            nextIndex = (activeIndex + 1) % currentQueue.length;
        } else {
            nextIndex = activeIndex + 1;
            if (nextIndex >= currentQueue.length) {
                if (repeatMode === 'all') {
                    nextIndex = 0; // Loop to beginning
                } else {
                    return; // Don't play if at end and not repeating
                }
            }
        }
        currentIndexRef.current = nextIndex;
        setCurrentIndex(nextIndex);
        requestSong(currentQueue[nextIndex]);
    }, [repeatMode, requestSong]);

    // Play previous song
    const playPrevious = React.useCallback(() => {
        const currentQueue = queueRef.current;
        const activeIndex = currentIndexRef.current;
        if (currentQueue.length === 0 || activeIndex < 0 || activeIndex >= currentQueue.length || !currentQueue[activeIndex]) return;

        // Always go to previous song (removed restart logic since we don't track position)
        let prevIndex: number;
        if (repeatMode === 'one') {
            // In repeat one mode, previous goes to actual previous song
            prevIndex = activeIndex - 1;
            if (prevIndex < 0) prevIndex = currentQueue.length - 1;
        } else {
            prevIndex = activeIndex - 1;
            if (prevIndex < 0) {
                if (repeatMode === 'all') {
                    prevIndex = currentQueue.length - 1; // Loop to end
                } else {
                    return; // Don't play if at beginning and not repeating
                }
            }
        }
        currentIndexRef.current = prevIndex;
        setCurrentIndex(prevIndex);
        requestSong(currentQueue[prevIndex]);
    }, [repeatMode, requestSong]);

    // Cycle through repeat modes
    const setRepeatMode = React.useCallback(() => {
        setRepeatModeState(prev => {
            if (prev === 'off') return 'all';
            if (prev === 'all') return 'one';
            return 'off';
        });
    }, []);

    // Toggle shuffle mode
    const toggleShuffle = React.useCallback(() => {
        if (!queue.length || !Number.isInteger(currentIndex) || currentIndex < 0 || currentIndex >= queue.length || !queue[currentIndex]) return;

        setShuffleMode(prev => {
            const newShuffleMode = !prev;

            if (newShuffleMode) {
                // Enable shuffle: shuffle the queue but keep current song in place
                const currentSongData = queue[currentIndex];
                const otherSongs = queue.filter((_, index) => index !== currentIndex);
                const shuffledOthers = shuffleArray(otherSongs);
                const newQueue = [currentSongData, ...shuffledOthers];
                queueRef.current = newQueue;
                currentIndexRef.current = 0;
                setQueue(newQueue);
                setCurrentIndex(0); // Current song is now at index 0
            } else {
                // Disable shuffle: restore original queue
                const currentSongData = currentSong;
                const originalIndex = originalQueue.findIndex(s => s.id === currentSongData?.id);
                const restoredIndex = originalIndex !== -1 ? originalIndex : 0;
                queueRef.current = originalQueue;
                currentIndexRef.current = restoredIndex;
                setQueue(originalQueue);
                setCurrentIndex(restoredIndex);
            }

            return newShuffleMode;
        });
    }, [queue, currentIndex, currentSong, originalQueue]);

    // Remove a song from the queue by index
    const removeFromQueue = useCallback((index: number) => {
        const previousQueue = queueRef.current;
        const activeIndex = currentIndexRef.current;
        if (!Number.isInteger(index) || index < 0 || index >= previousQueue.length || index === activeIndex) return;
        const nextQueue = previousQueue.filter((_, queueIndex) => queueIndex !== index);
        const nextIndex = index < activeIndex ? activeIndex - 1 : activeIndex;
        queueRef.current = nextQueue;
        currentIndexRef.current = nextIndex;
        setQueue(nextQueue);
        setCurrentIndex(nextIndex);
    }, []);

    // Move a song in the queue from one index to another
    const moveInQueue = useCallback((fromIndex: number, toIndex: number) => {
        const previousQueue = queueRef.current;
        const activeIndex = currentIndexRef.current;
        if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex) ||
            fromIndex < 0 || fromIndex >= previousQueue.length ||
            toIndex < 0 || toIndex >= previousQueue.length || fromIndex === toIndex) return;
        const nextQueue = [...previousQueue];
        const [moved] = nextQueue.splice(fromIndex, 1);
        nextQueue.splice(toIndex, 0, moved);
        let nextIndex = activeIndex;
        if (fromIndex === activeIndex) nextIndex = toIndex;
        else if (fromIndex < activeIndex && toIndex >= activeIndex) nextIndex--;
        else if (fromIndex > activeIndex && toIndex <= activeIndex) nextIndex++;
        queueRef.current = nextQueue;
        currentIndexRef.current = nextIndex;
        setQueue(nextQueue);
        setCurrentIndex(nextIndex);
    }, []);

    // Atomically set reordered queue without causing multiple dispatch cycles
    const setQueueAtomic = useCallback((newQueue: Song[], newIndex?: number) => {
        const safeQueue = Array.isArray(newQueue) ? [...newQueue] : [];
        let nextIndex = -1;
        if (safeQueue.length > 0) {
            const requestedIndex = typeof newIndex === 'number' ? newIndex : -1;
            if (Number.isInteger(requestedIndex) && requestedIndex >= 0 && requestedIndex < safeQueue.length) {
                nextIndex = requestedIndex;
            } else {
                const sameObjectIndex = safeQueue.findIndex(song => song === currentSong);
                const sameIdIndex = sameObjectIndex < 0 && currentSong
                    ? safeQueue.findIndex(song => song?.id === currentSong.id)
                    : sameObjectIndex;
                nextIndex = sameIdIndex >= 0 ? sameIdIndex : Math.min(Math.max(currentIndexRef.current, 0), safeQueue.length - 1);
            }
        }
        queueRef.current = safeQueue;
        currentIndexRef.current = nextIndex;
        setQueue(safeQueue);
        setCurrentIndex(nextIndex);
        const nextSong = nextIndex >= 0 ? safeQueue[nextIndex] : null;
        if (nextSong?.id !== currentSong?.id) requestSong(nextSong);
        else if (!nextSong && currentSong) {
            requestSong(null);
            setIsPlaying(false);
            player.pause();
            player.clearLockScreenControls();
        } else if (nextSong) {
            setCurrentSong(nextSong);
        }
    }, [currentSong, requestSong, player]);

    // Clear all songs after the current one
    const clearUpNext = useCallback(() => {
        const nextQueue = queueRef.current.slice(0, currentIndexRef.current + 1);
        queueRef.current = nextQueue;
        setQueue(nextQueue);
    }, []);

    const contextValue = React.useMemo(() => ({
        play,
        togglePlayPause,
        playNext,
        playPrevious,
        setRepeatMode,
        toggleShuffle,
        removeFromQueue,
        moveInQueue,
        setQueueAtomic,
        clearUpNext,
        isPlaying,
        currentSong,
        queue,
        currentIndex,
        repeatMode,
        shuffleMode,
        player,
    }), [
        play,
        togglePlayPause,
        playNext,
        playPrevious,
        setRepeatMode,
        toggleShuffle,
        removeFromQueue,
        moveInQueue,
        setQueueAtomic,
        clearUpNext,
        isPlaying,
        currentSong,
        currentIndex,
        repeatMode,
        shuffleMode,
        queue,
        player,
    ]);

    return (
        <AudioPlayerContext.Provider value={contextValue}>
            {children}
        </AudioPlayerContext.Provider>
    );
}

export const useAudioPlayerContext = () => useContext(AudioPlayerContext);
export const useAudioPlayer = useAudioPlayerContext;
