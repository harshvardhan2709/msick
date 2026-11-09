import * as FileSystem from 'expo-file-system/legacy';
import * as mm from 'music-metadata-browser';
import { Buffer } from 'buffer';
import {
    clearMetadataCacheDB,
    getKV,
    loadMetadataCacheFromDB,
    saveMetadataToDB,
    setKV,
} from '../database';

export interface SongMetadata {
    title?: string;
    artist?: string;
    album?: string;
    artwork?: string; // file URI to cached artwork
}

// In-memory cache to avoid repeated DB lookups within the same session
const _memoryCache = new Map<string, SongMetadata | null>();
let _isScanning = false;
let _currentLibraryIds: string[] = [];

// Queue system to prevent overwhelming the bridge with heavy file reads
let _activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 1; // Reduced to 1 for better UI performance
const _requestQueue: (() => void)[] = [];
const _pendingIds = new Set<string>();
const _inFlightRequests = new Map<string, Promise<SongMetadata | null>>();

async function acquireLock(priority: boolean = false) {
    if (_activeRequests < MAX_CONCURRENT_REQUESTS) {
        _activeRequests++;
        return;
    }
    return new Promise<void>(resolve => {
        if (priority) _requestQueue.unshift(resolve);
        else _requestQueue.push(resolve);
    });
}

function releaseLock() {
    _activeRequests--;
    if (_requestQueue.length > 0) {
        _activeRequests++;
        const next = _requestQueue.shift();
        next?.();
    }
}

const CACHE_VERSION = 'v2'; // Increment this to force a cache reset
const CACHE_VER_KEY = '__msick_metadata_cache_ver__';

/**
 * Batch-preload all cached metadata from SQLite into memory.
 */
export async function preloadMetadataCache(): Promise<void> {
    try {
        // Check for version mismatch — force clear if logic changed
        const storedVer = await getKV(CACHE_VER_KEY);
        
        if (storedVer !== CACHE_VERSION) {
            console.log(`[Metadata] Cache version mismatch (${storedVer} vs ${CACHE_VERSION}). Clearing cache...`);
            await clearMetadataCacheDB();
            await setKV(CACHE_VER_KEY, CACHE_VERSION);
            // Do not return — allow the code below to proceed with 0 rows
        }
        const rows = await loadMetadataCacheFromDB();

        for (const row of rows) {
            // Skip old base64 artwork entries
            if (row.artwork && row.artwork.startsWith('data:image')) continue;

            _memoryCache.set(row.song_id, {
                title: row.title ?? undefined,
                artist: row.artist ?? undefined,
                album: row.album ?? undefined,
                artwork: row.artwork ?? undefined,
            });
        }
        console.log(`[Metadata] Preloaded ${_memoryCache.size} cached entries into memory`);
    } catch (e) {
        console.warn('[Metadata] Preload failed:', e);
    }
}

/**
 * Synchronous check for cached metadata.
 * Use this in UI components for instant rendering.
 */
export function getCachedMetadata(songId: string): SongMetadata | null {
    return _memoryCache.get(songId) || null;
}

/**
 * Get current scanning stats based on the provided list of song IDs
 */
export function getMetadataStats() {
    if (_currentLibraryIds.length === 0) {
        return { cached: 0, total: 0, isScanning: _isScanning };
    }

    let cachedCount = 0;
    for (const id of _currentLibraryIds) {
        if (_memoryCache.has(id)) {
            cachedCount++;
        }
    }

    return {
        cached: cachedCount,
        total: _currentLibraryIds.length,
        isScanning: _isScanning || _activeRequests > 0 || _requestQueue.length > 0
    };
}

export async function getSongMetadata(uri: string, songId: string, priority: boolean = true): Promise<SongMetadata | null> {
    // 1. Check in-memory cache first (instant)
    if (_memoryCache.has(songId)) {
        return _memoryCache.get(songId)!;
    }

    // Share an in-progress extraction so foreground UI can await background scans.
    const inFlight = _inFlightRequests.get(songId);
    if (inFlight) return inFlight;

    _pendingIds.add(songId);
    const request = (async (): Promise<SongMetadata | null> => {
        try {
            // Queue the request to avoid overwhelming native file reads.
            await acquireLock(priority);

            const readSize = 1024 * 1024;
            const base64 = await FileSystem.readAsStringAsync(uri, {
                encoding: 'base64',
                length: readSize,
                position: 0
            });

            const buffer = Buffer.from(base64, 'base64');
            const metadata = await mm.parseBuffer(buffer);

            console.log(`[Metadata] Parsing ${uri.split('/').pop()} - Format: ${metadata.format.container}`);

            const result: SongMetadata = {
                title: metadata.common.title,
                artist: metadata.common.artist,
                album: metadata.common.album,
            };

            if (metadata.common.picture && metadata.common.picture.length > 0) {
                const picture = metadata.common.picture[0];
                const base64Art = picture.data.toString('base64');

                let ext = 'jpg';
                if (picture.format === 'image/png') ext = 'png';
                else if (picture.format === 'image/gif') ext = 'gif';

                const cacheDir = FileSystem.cacheDirectory;
                if (!cacheDir) throw new Error('Cache directory not available');

                const baseUrl = cacheDir.endsWith('/') ? cacheDir : `${cacheDir}/`;
                const fileUri = `${baseUrl}art_${songId}.${ext}`;
                await FileSystem.writeAsStringAsync(fileUri, base64Art, { encoding: 'base64' });
                result.artwork = fileUri;
            }

            _memoryCache.set(songId, result);
            await saveMetadataToDB(songId, result.title, result.artist, result.album, result.artwork);
            return result;
        } catch {
            // Unsupported files should not prevent audio playback or UI rendering.
            _memoryCache.set(songId, null);
            return null;
        } finally {
            _pendingIds.delete(songId);
            releaseLock();
        }
    })();

    _inFlightRequests.set(songId, request);
    try {
        return await request;
    } finally {
        if (_inFlightRequests.get(songId) === request) {
            _inFlightRequests.delete(songId);
        }
    }
}

export async function clearMetadataCache(): Promise<void> {
    try {
        _memoryCache.clear();
        await clearMetadataCacheDB();
    } catch (e) {
        console.error('Failed to clear metadata cache', e);
    }
}
export async function startBackgroundMetadataScan(assets: { id: string, uri: string }[]) {
    _currentLibraryIds = assets.map(a => a.id);
    if (_isScanning) return;
    _isScanning = true;
    
    console.log(`[Metadata] Starting background scan for ${assets.length} songs...`);
    
    try {
        for (const asset of assets) {
            // Only process if not in memory AND not already in the queue
            if (!_memoryCache.has(asset.id) && !_pendingIds.has(asset.id)) {
                // Trigger extraction — the queue handles concurrency
                // Background scan uses priority=false
                getSongMetadata(asset.uri, asset.id, false).catch(() => {});
                
                // Every 5 songs, wait longer to let other UI tasks through
                if (assets.indexOf(asset) % 5 === 0) {
                    await new Promise(r => setTimeout(r, 200));
                }
            }
        }
    } catch (e) {
        console.warn('[Metadata] Background scan interrupted:', e);
    } finally {
        _isScanning = false;
        console.log('[Metadata] Background scan tasks queued.');
    }
}
