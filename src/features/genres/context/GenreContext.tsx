import * as MediaLibrary from 'expo-media-library';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
    type GenreType,
    classifyAllSongs,
    loadGenreMap,
} from '../services/genreService';
import { getKV, setKV, removeKV, clearGenreMapDB } from '../../../services/database';


type GenreMap = Record<string, GenreType[]>;

type ClassificationStatus = 'idle' | 'loading_songs' | 'classifying' | 'done' | 'error';

type GenreContextType = {
    genreMap: GenreMap;
    status: ClassificationStatus;
    progress: number; // 0-100
    progressMessage: string;
    errorMessage: string;
    startClassification: () => Promise<void>;
    getGenre: (songId: string) => GenreType[];
    getSongsByGenre: (genre: GenreType) => string[]; // returns song IDs
    genreCounts: Record<GenreType, number>;
    hasClassified: boolean;
    resetClassification: () => Promise<void>;
};

export const GenreContext = createContext<GenreContextType>({
    genreMap: {},
    status: 'idle',
    progress: 0,
    progressMessage: '',
    errorMessage: '',
    startClassification: async () => { },
    getGenre: () => [],
    getSongsByGenre: () => [],
    genreCounts: {} as Record<GenreType, number>,
    hasClassified: false,
    resetClassification: async () => {},
});

const CLASSIFIED_FLAG_KEY = 'Msick-genre-classified';

export function GenreProvider({ children }: { children: React.ReactNode }) {
    const [genreMap, setGenreMap] = useState<GenreMap>({});
    const [status, setStatus] = useState<ClassificationStatus>('idle');
    const [progress, setProgress] = useState(0);
    const [progressMessage, setProgressMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [hasClassified, setHasClassified] = useState(false);


    // Load existing genre map on mount
    useEffect(() => {
        (async () => {
            const existing = await loadGenreMap();
            if (Object.keys(existing).length > 0) {
                setGenreMap(existing);
                setHasClassified(true);
            }
            const flag = await getKV(CLASSIFIED_FLAG_KEY);
            if (flag === 'true') {
                setHasClassified(true);
            }
        })();
    }, []);

    const getGenre = useCallback((songId: string): GenreType[] => {
        return genreMap[songId] || [];
    }, [genreMap]);

    const getSongsByGenre = useCallback((genre: GenreType): string[] => {
        return Object.entries(genreMap)
            .filter(([_, genres]) => genres.includes(genre))
            .map(([id]) => id);
    }, [genreMap]);

    const genreCounts = React.useMemo(() => {
        const counts = {} as Record<GenreType, number>;
        
        // Discover all unique genres and count them
        Object.values(genreMap).forEach(genres => {
            genres.forEach(genre => {
                if (!counts[genre]) counts[genre] = 0;
                counts[genre]++;
            });
        });
        
        return counts;
    }, [genreMap]);

    const resetClassification = useCallback(async () => {
        await clearGenreMapDB();
        await removeKV(CLASSIFIED_FLAG_KEY);
        setGenreMap({});
        setHasClassified(false);
        setStatus('idle');
        setProgress(0);
        setProgressMessage('');
        setErrorMessage('');
    }, []);

    const startClassification = useCallback(async () => {
        try {
            setStatus('loading_songs');
            setProgress(0);
            setProgressMessage('Requesting permissions...');
            setErrorMessage('');

            // Clear any stale flags, but KEEP existing DB data for now
            // so the user doesn't see an empty library if detection is cancelled/fails
            await removeKV(CLASSIFIED_FLAG_KEY);
            setHasClassified(false);

            // Request permissions
            const { status: permStatus } = await MediaLibrary.requestPermissionsAsync();
            if (permStatus !== 'granted') {
                setErrorMessage('Media library permission is required');
                setStatus('error');
                return;
            }

            setProgressMessage('Loading songs from device...');
            setProgress(5);

            // Load all audio files
            const media = await MediaLibrary.getAssetsAsync({
                mediaType: MediaLibrary.MediaType.audio,
                first: 500,
            });

            const songs = media.assets
                .filter(a => a.duration >= 35)
                .map(a => ({
                    id: a.id,
                    filename: a.filename,
                }));

            if (songs.length === 0) {
                setErrorMessage('No songs found on device');
                setStatus('error');
                return;
            }

            setProgress(10);
            setProgressMessage(`Found ${songs.length} songs. Starting AI analysis...`);
            setStatus('classifying');

            // Classify with progress
            // We pass 'true' for clearFirst so it replaces the whole DB atomically at the end
            let usedLocalFallback = false;
            const result = await classifyAllSongs(songs, (completed, total, batchDesc) => {
                if (batchDesc.startsWith('Local filename matching')) usedLocalFallback = true;
                const classifyProgress = 10 + (completed / total) * 85; // 10% to 95%
                setProgress(Math.round(classifyProgress));
                setProgressMessage(`Analyzing: ${completed}/${total} songs classified\n${batchDesc}`);
            }, true);

            setGenreMap(result);

            const activeGenreCount = new Set(Object.values(result).flat()).size;

            setProgress(100);
            setProgressMessage(
                usedLocalFallback
                    ? `Done! Classified ${songs.length} songs into ${activeGenreCount} genres using local filename matching.`
                    : `Done! Classified ${songs.length} songs into ${activeGenreCount} genres.`,
            );
            setStatus('done');
            setHasClassified(true);
            await setKV(CLASSIFIED_FLAG_KEY, 'true');

        } catch (error) {
            console.error('Classification error:', error);
            setErrorMessage(error instanceof Error ? error.message : 'Classification failed. No partial results were saved.');
            setStatus('error');
        }
    }, []);

    return (
        <GenreContext.Provider
            value={{
                genreMap,
                status,
                progress,
                progressMessage,
                errorMessage,
                startClassification,
                getGenre,
                getSongsByGenre,
                genreCounts,
                hasClassified,
                resetClassification,
            }}
        >
            {children}
        </GenreContext.Provider>
    );
}

export const useGenre = () => useContext(GenreContext);
