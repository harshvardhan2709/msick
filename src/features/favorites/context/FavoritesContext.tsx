import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    addFavoriteToDB,
    loadFavoritesFromDB,
    removeFavoriteFromDB,
} from '../../../services/database';
import type { Song } from '../../../shared/types/song';

type LikesContextType = {
    likesMap: Record<string, Song>;
    toggleLike: (song: Song) => void;
    isLiked: (id: string) => boolean;
    getAll: () => Song[];
    isLoading: boolean;
};

export const FavoritesContext = createContext<LikesContextType>({
    likesMap: {},
    toggleLike: () => { },
    isLiked: () => false,
    getAll: () => [],
    isLoading: true,
});

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
    const [likesMap, setLikesMap] = useState<Record<string, Song>>({});
    const [isLoading, setIsLoading] = useState(true);
    const likesRef = useRef(likesMap);
    const mountedRef = useRef(true);
    const persistenceQueueRef = useRef<Promise<void>>(Promise.resolve());
    const favoritesReadyRef = useRef<{ promise: Promise<void>; resolve: () => void } | null>(null);
    if (!favoritesReadyRef.current) {
        let resolveReady!: () => void;
        const promise = new Promise<void>((resolve) => {
            resolveReady = resolve;
        });
        favoritesReadyRef.current = { promise, resolve: resolveReady };
    }

    // Load persisted favorites from SQLite on mount
    useEffect(() => {
        let isMounted = true;
        mountedRef.current = true;
        (async () => {
            try {
                const stored = await loadFavoritesFromDB();
                if (isMounted) {
                    likesRef.current = stored;
                    setLikesMap(stored);
                }
            } catch (e) {
                console.error('[Likes] Failed to load favorites from SQLite:', e);
            } finally {
                favoritesReadyRef.current?.resolve();
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        })();
        return () => {
            isMounted = false;
            mountedRef.current = false;
        };
    }, []);

    const isLiked = useCallback(
        (id: string) => !!likesMap[id],
        [likesMap]
    );

    const toggleLike = useCallback((song: Song) => {
        if (!song || !song.id) {
            console.log('[Likes] toggleLike called with invalid song', song);
            return;
        }

        const songId = String(song.id);
        const toggle = async () => {
            await favoritesReadyRef.current?.promise;
            if (!mountedRef.current) return;

            const previous = likesRef.current;
            const wasLiked = !!previous[songId];
            const next = { ...previous };
            if (wasLiked) {
                delete next[songId];
            } else {
                next[songId] = { ...song, id: songId };
            }

            // Update immediately, then serialize persistence in the same tap order.
            likesRef.current = next;
            setLikesMap(next);
            try {
                if (wasLiked) {
                    await removeFavoriteFromDB(songId);
                } else {
                    await addFavoriteToDB(next[songId]);
                }
            } catch (error) {
                if (mountedRef.current && likesRef.current === next) {
                    likesRef.current = previous;
                    setLikesMap(previous);
                }
                console.error('[Likes] Failed to persist favorite change:', error);
            }
        };

        persistenceQueueRef.current = persistenceQueueRef.current
            .then(toggle)
            .catch((error) => {
                console.error('[Likes] Favorite update queue failed:', error);
            });
    }, []);

    const getAll = useCallback(() => Object.values(likesMap), [likesMap]);

    const value = useMemo(
        () => ({ likesMap, toggleLike, isLiked, getAll, isLoading }),
        [likesMap, toggleLike, isLiked, getAll, isLoading]
    );

    return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export const LikesContext = FavoritesContext;
export const LikesProvider = FavoritesProvider;
export default FavoritesProvider;
