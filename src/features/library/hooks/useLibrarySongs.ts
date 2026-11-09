import * as MediaLibrary from "expo-media-library";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Song } from "../../../shared/types/song";
import {
  getMetadataStats,
  preloadMetadataCache,
  startBackgroundMetadataScan,
} from "../../../services/metadata";

export type SongWithDuration = MediaLibrary.Asset & Song & {
  realDuration?: number;
};

// Fetch in pages of 150 items so the JS bridge is never frozen
const PAGE_SIZE = 150;
// Minimum track length to filter out notification tones / sound effects (30 seconds)
const MIN_DURATION_SECONDS = 30;

export function useLibrarySongs() {
  const [songs, setSongs] = useState<SongWithDuration[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [scanStats, setScanStats] = useState({ cached: 0, total: 0, isScanning: false });
  const [loadedCount, setLoadedCount] = useState(0);

  const isMountedRef = useRef(true);

  const loadSongs = useCallback(async () => {
    setLoading(true);
    setPermissionDenied(false);

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        if (isMountedRef.current) {
          setPermissionDenied(true);
          setLoading(false);
        }
        return;
      }

      // Preload already-cached ID3 tags from SQLite before scanning
      await preloadMetadataCache();

      const allAssetsMap = new Map<string, SongWithDuration>();
      let hasNextPage = true;
      let afterCursor: string | undefined = undefined;

      // Iterative pagination loop using endCursor & hasNextPage
      while (hasNextPage && isMountedRef.current) {
        const page: MediaLibrary.PagedInfo<MediaLibrary.Asset> = await MediaLibrary.getAssetsAsync({
          mediaType: MediaLibrary.MediaType.audio,
          first: PAGE_SIZE,
          after: afterCursor,
          sortBy: [[MediaLibrary.SortBy.modificationTime, false]],
        });

        for (const asset of page.assets) {
          // Filter out short notification chimes and voice memos under 30s
          if (asset.duration >= MIN_DURATION_SECONDS && !allAssetsMap.has(asset.id)) {
            allAssetsMap.set(asset.id, {
              ...asset,
              realDuration: asset.duration ? asset.duration * 1000 : undefined,
            });
          }
        }

        hasNextPage = page.hasNextPage;
        afterCursor = page.endCursor;

        // Progressively surface songs if the user has a large library (>500 tracks)
        if (allAssetsMap.size > 0 && isMountedRef.current) {
          const currentArray = Array.from(allAssetsMap.values());
          setSongs(currentArray);
          setLoadedCount(currentArray.length);
        }

        // Small yield to allow UI rendering between pages
        if (hasNextPage) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }

      if (isMountedRef.current) {
        const finalResults = Array.from(allAssetsMap.values());
        setSongs(finalResults);
        setLoadedCount(finalResults.length);
        setLoading(false);

        // Initiate background ID3 tag extraction for uncached songs
        startBackgroundMetadataScan(
          finalResults.map((asset) => ({ id: asset.id, uri: asset.uri })),
        ).catch(() => {});
      }
    } catch (error) {
      console.error("[Library] Failed to scan device audio:", error);
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    void loadSongs();
    return () => {
      isMountedRef.current = false;
    };
  }, [loadSongs]);

  // Periodic metadata scanning status update
  useEffect(() => {
    const timer = setInterval(() => {
      const stats = getMetadataStats();
      setScanStats(stats);
      if (!stats.isScanning && stats.cached >= stats.total && stats.total > 0) {
        clearInterval(timer);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return {
    songs,
    loading,
    permissionDenied,
    scanStats,
    loadedCount,
    reload: loadSongs,
  };
}

export default useLibrarySongs;
