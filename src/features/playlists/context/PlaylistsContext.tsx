import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    loadPlaylistsFromDB,
    createPlaylistInDB,
    deletePlaylistFromDB,
    renamePlaylistInDB,
    addSongToPlaylistInDB,
    removeSongFromPlaylistInDB,
} from '../../../services/database';
import type { Song } from '../../../shared/types/song';

export type { Song } from '../../../shared/types/song';

export type Playlist = {
    id: string;
    name: string;
    songs: Song[];
    createdAt: number;
};

type PlaylistsContextType = {
    playlists: Playlist[];
    createPlaylist: (name: string) => Promise<void>;
    deletePlaylist: (playlistId: string) => Promise<void>;
    renamePlaylist: (playlistId: string, newName: string) => Promise<void>;
    addSongToPlaylist: (playlistId: string, song: Song) => Promise<void>;
    removeSongFromPlaylist: (playlistId: string, songId: string) => Promise<void>;
};

export const PlaylistsContext = createContext<PlaylistsContextType>({
    playlists: [],
    createPlaylist: async () => { },
    deletePlaylist: async () => { },
    renamePlaylist: async () => { },
    addSongToPlaylist: async () => { },
    removeSongFromPlaylist: async () => { },
});

export function PlaylistsProvider({ children }: { children: React.ReactNode }) {
    const [playlists, setPlaylists] = useState<Playlist[]>([]);

    useEffect(() => {
        loadPlaylists();
    }, []);

    const loadPlaylists = async () => {
        try {
            const stored = await loadPlaylistsFromDB();
            setPlaylists(stored);
        } catch (e) {
            console.error('Failed to load playlists', e);
        }
    };

    const createPlaylist = async (name: string) => {
        const id = Date.now().toString();
        const createdAt = Date.now();
        try {
            await createPlaylistInDB(id, name, createdAt);
            const newPlaylist: Playlist = { id, name, songs: [], createdAt };
            setPlaylists(prev => [...prev, newPlaylist]);
        } catch (e) {
            console.error('Failed to create playlist', e);
        }
    };

    const deletePlaylist = async (playlistId: string) => {
        try {
            await deletePlaylistFromDB(playlistId);
            setPlaylists(prev => prev.filter(p => p.id !== playlistId));
        } catch (e) {
            console.error('Failed to delete playlist', e);
        }
    };

    const renamePlaylist = async (playlistId: string, newName: string) => {
        try {
            await renamePlaylistInDB(playlistId, newName);
            setPlaylists(prev =>
                prev.map(p => p.id === playlistId ? { ...p, name: newName } : p)
            );
        } catch (e) {
            console.error('Failed to rename playlist', e);
        }
    };

    const addSongToPlaylist = async (playlistId: string, song: Song) => {
        try {
            const added = await addSongToPlaylistInDB(playlistId, song);
            if (!added) return; // duplicate, skip state update

            setPlaylists(prev =>
                prev.map(p => {
                    if (p.id === playlistId) {
                        return { ...p, songs: [...p.songs, song] };
                    }
                    return p;
                })
            );
        } catch (e) {
            console.error('Failed to add song to playlist', e);
        }
    };

    const removeSongFromPlaylist = async (playlistId: string, songId: string) => {
        try {
            await removeSongFromPlaylistInDB(playlistId, songId);
            setPlaylists(prev =>
                prev.map(p => {
                    if (p.id === playlistId) {
                        return { ...p, songs: p.songs.filter(s => s.id !== songId) };
                    }
                    return p;
                })
            );
        } catch (e) {
            console.error('Failed to remove song from playlist', e);
        }
    };

    return (
        <PlaylistsContext.Provider
            value={{
                playlists,
                createPlaylist,
                deletePlaylist,
                renamePlaylist,
                addSongToPlaylist,
                removeSongFromPlaylist,
            }}
        >
            {children}
        </PlaylistsContext.Provider>
    );
}

export const usePlaylists = () => useContext(PlaylistsContext);
export default PlaylistsProvider;
