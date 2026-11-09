import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SQLite from "expo-sqlite";

// =========================================================================
// Centralized SQLite Database — Replaces AsyncStorage
// =========================================================================

const DB_NAME = "msick.db";

let _db: SQLite.SQLiteDatabase | null = null;
let _dbInitPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Returns the singleton database instance, creating tables if needed.
 * Uses a promise lock to prevent concurrent initialization.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;

  // If initialization is already in progress, wait for it
  if (_dbInitPromise) return _dbInitPromise;

  _dbInitPromise = initDatabase();
  try {
    _db = await _dbInitPromise;
    return _db;
  } catch (e) {
    _dbInitPromise = null; // Allow retry on failure
    throw e;
  }
}

async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);

  // Enable WAL mode for better concurrent read/write performance
  await db.execAsync("PRAGMA journal_mode = WAL");
  // Enforce foreign key constraints across relational tables
  await db.execAsync("PRAGMA foreign_keys = ON");

  // Create tables one at a time to avoid multi-statement issues
  await db.execAsync(`
        CREATE TABLE IF NOT EXISTS metadata_cache (
            song_id TEXT PRIMARY KEY NOT NULL,
            title TEXT,
            artist TEXT,
            album TEXT,
            artwork TEXT
        )
    `);

  await db.execAsync(`
        CREATE TABLE IF NOT EXISTS genre_map (
            song_id TEXT NOT NULL,
            genre TEXT NOT NULL,
            PRIMARY KEY (song_id, genre)
        )
    `);

  await db.execAsync(`
        CREATE TABLE IF NOT EXISTS playlists (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            created_at INTEGER NOT NULL
        )
    `);

  await db.execAsync(`
        CREATE TABLE IF NOT EXISTS playlist_songs (
            playlist_id TEXT NOT NULL,
            song_id TEXT NOT NULL,
            filename TEXT NOT NULL,
            uri TEXT NOT NULL,
            duration REAL,
            extra_json TEXT,
            sort_order INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (playlist_id, song_id),
            FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
        )
    `);

  await db.execAsync(`
        CREATE TABLE IF NOT EXISTS key_value_store (
            key TEXT PRIMARY KEY NOT NULL,
            value TEXT
        )
    `);

  await db.execAsync(`
        CREATE TABLE IF NOT EXISTS favorites (
            song_id TEXT PRIMARY KEY NOT NULL,
            filename TEXT NOT NULL,
            uri TEXT NOT NULL,
            duration REAL,
            extra_json TEXT,
            created_at INTEGER NOT NULL
        )
    `);

  await db.execAsync(`
        CREATE TABLE IF NOT EXISTS listening_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            song_id TEXT NOT NULL,
            played_at INTEGER NOT NULL,
            playback_duration_sec REAL DEFAULT 0,
            completed INTEGER DEFAULT 0
        )
    `);

  // Create indices for fast lookups
  await db.execAsync(
    "CREATE INDEX IF NOT EXISTS idx_genre_map_genre ON genre_map(genre)",
  );
  await db.execAsync(
    "CREATE INDEX IF NOT EXISTS idx_playlist_songs_playlist ON playlist_songs(playlist_id)",
  );
  await db.execAsync(
    "CREATE INDEX IF NOT EXISTS idx_history_played_at ON listening_history(played_at DESC)",
  );
  await db.execAsync(
    "CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON favorites(created_at DESC)",
  );

  // Run one-time migration from AsyncStorage → SQLite
  await migrateFromAsyncStorage(db);

  return db;
}

// =========================================================================
// ONE-TIME MIGRATION from AsyncStorage → SQLite
// =========================================================================

const MIGRATION_FLAG = "__msick_sqlite_migrated__";

async function migrateFromAsyncStorage(
  db: SQLite.SQLiteDatabase,
): Promise<void> {
  try {
    // Check if we've already migrated
    const existing = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM key_value_store WHERE key = ?",
      [MIGRATION_FLAG],
    );
    if (existing?.value === "true") return;

    console.log("[DB Migration] Starting AsyncStorage → SQLite migration...");

    // 1. Migrate genre map
    try {
      const genreRaw = await AsyncStorage.getItem("Msick-genre-map");
      if (genreRaw) {
        const genreMap: Record<string, string> = JSON.parse(genreRaw);
        const entries = Object.entries(genreMap);
        if (entries.length > 0) {
          await db.withTransactionAsync(async () => {
            for (const [songId, genre] of entries) {
              // Migration from single-genre string to multi-genre storage
              await db.runAsync(
                "INSERT OR REPLACE INTO genre_map (song_id, genre) VALUES (?, ?)",
                [songId, genre],
              );
            }
          });
          console.log(
            `[DB Migration] Migrated ${entries.length} genre entries`,
          );
        }
      }
    } catch (e) {
      console.warn("[DB Migration] Genre map migration failed:", e);
    }

    // 2. Migrate classified flag
    try {
      const flag = await AsyncStorage.getItem("Msick-genre-classified");
      if (flag) {
        await db.runAsync(
          "INSERT OR REPLACE INTO key_value_store (key, value) VALUES (?, ?)",
          ["Msick-genre-classified", flag],
        );
      }
    } catch (e) {
      console.warn("[DB Migration] Classified flag migration failed:", e);
    }

    // 3. Migrate playlists
    try {
      const playlistsRaw = await AsyncStorage.getItem("Msick-playlists");
      if (playlistsRaw) {
        const playlists = JSON.parse(playlistsRaw) as Array<{
          id: string;
          name: string;
          songs: Array<{
            id: string;
            filename: string;
            uri: string;
            duration?: number;
            [key: string]: any;
          }>;
          createdAt: number;
        }>;

        await db.withTransactionAsync(async () => {
          for (const playlist of playlists) {
            await db.runAsync(
              "INSERT OR REPLACE INTO playlists (id, name, created_at) VALUES (?, ?, ?)",
              [playlist.id, playlist.name, playlist.createdAt],
            );

            for (let i = 0; i < playlist.songs.length; i++) {
              const song = playlist.songs[i];
              const { id, filename, uri, duration, ...extra } = song;
              await db.runAsync(
                "INSERT OR REPLACE INTO playlist_songs (playlist_id, song_id, filename, uri, duration, extra_json, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [
                  playlist.id,
                  id,
                  filename,
                  uri,
                  duration ?? null,
                  JSON.stringify(extra),
                  i,
                ],
              );
            }
          }
        });
        console.log(`[DB Migration] Migrated ${playlists.length} playlists`);
      }
    } catch (e) {
      console.warn("[DB Migration] Playlists migration failed:", e);
    }

    // 4. Migrate metadata cache entries
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const metadataKeys = allKeys.filter((k) =>
        k.startsWith("Msick-metadata-"),
      );

      if (metadataKeys.length > 0) {
        const pairs = await AsyncStorage.multiGet(metadataKeys);
        await db.withTransactionAsync(async () => {
          for (const [key, value] of pairs) {
            if (!value) continue;
            try {
              const songId = key.replace("Msick-metadata-", "");
              const meta = JSON.parse(value);
              await db.runAsync(
                "INSERT OR REPLACE INTO metadata_cache (song_id, title, artist, album, artwork) VALUES (?, ?, ?, ?, ?)",
                [
                  songId,
                  meta.title ?? null,
                  meta.artist ?? null,
                  meta.album ?? null,
                  meta.artwork ?? null,
                ],
              );
            } catch {
              // skip corrupted entries
            }
          }
        });
        console.log(
          `[DB Migration] Migrated ${metadataKeys.length} metadata cache entries`,
        );
      }
    } catch (e) {
      console.warn("[DB Migration] Metadata migration failed:", e);
    }

    // Mark migration as complete
    await db.runAsync(
      "INSERT OR REPLACE INTO key_value_store (key, value) VALUES (?, ?)",
      [MIGRATION_FLAG, "true"],
    );

    console.log(
      "[DB Migration] Migration complete! AsyncStorage data preserved as backup.",
    );
  } catch (error) {
    console.error("[DB Migration] Fatal migration error:", error);
    // Don't block app startup — migration can be retried next launch
  }
}

// =========================================================================
// METADATA CACHE OPERATIONS
// =========================================================================

export type MetadataCacheRow = {
  song_id: string;
  title: string | null;
  artist: string | null;
  album: string | null;
  artwork: string | null;
};

export async function getMetadataFromDB(
  songId: string,
): Promise<MetadataCacheRow | null> {
  const db = await getDatabase();
  return db.getFirstAsync<MetadataCacheRow>(
    "SELECT * FROM metadata_cache WHERE song_id = ?",
    [songId],
  );
}

export async function loadMetadataCacheFromDB(): Promise<MetadataCacheRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<MetadataCacheRow>("SELECT * FROM metadata_cache");
}

export async function saveMetadataToDB(
  songId: string,
  title?: string,
  artist?: string,
  album?: string,
  artwork?: string,
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "INSERT OR REPLACE INTO metadata_cache (song_id, title, artist, album, artwork) VALUES (?, ?, ?, ?, ?)",
    [songId, title ?? null, artist ?? null, album ?? null, artwork ?? null],
  );
}

export async function clearMetadataCacheDB(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM metadata_cache");
}

// =========================================================================
// GENRE MAP OPERATIONS
// =========================================================================

export async function loadGenreMapFromDB(): Promise<Record<string, string[]>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ song_id: string; genre: string }>(
    "SELECT song_id, genre FROM genre_map",
  );
  const map: Record<string, string[]> = {};
  for (const row of rows) {
    if (!map[row.song_id]) map[row.song_id] = [];
    map[row.song_id].push(row.genre);
  }
  return map;
}

export async function saveGenreMapToDB(
  genreMap: Record<string, string[]>,
  clearFirst: boolean = false,
): Promise<void> {
  const db = await getDatabase();
  const entries = Object.entries(genreMap);
  if (entries.length === 0 && !clearFirst) return;

  // Flatten the map for batch insertion: [song_id, genre] pairs
  const flattened: [string, string][] = [];
  for (const [songId, genres] of entries) {
    for (const genre of genres) {
      flattened.push([songId, genre]);
    }
  }

  // Batch insert — 50 rows per statement
  const CHUNK_SIZE = 50;
  await db.withTransactionAsync(async () => {
    if (clearFirst) {
      await db.runAsync("DELETE FROM genre_map");
    }

    if (flattened.length === 0) return;

    for (let i = 0; i < flattened.length; i += CHUNK_SIZE) {
      const chunk = flattened.slice(i, i + CHUNK_SIZE);
      const placeholders = chunk.map(() => "(?, ?)").join(", ");
      const params = chunk.flatMap(([songId, genre]) => [songId, genre]);
      await db.runAsync(
        `INSERT OR REPLACE INTO genre_map (song_id, genre) VALUES ${placeholders}`,
        params,
      );
    }
  });
}

export async function clearGenreMapDB(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM genre_map");
}

/**
 * Fast lookup for song IDs belonging to a specific genre.
 * Highly efficient thanks to SQLite indexing.
 */
export async function getSongIdsByGenre(genre: string): Promise<string[]> {
  const db = await getDatabase();
  try {
    const rows = await db.getAllAsync<{ song_id: string }>(
      "SELECT song_id FROM genre_map WHERE genre = ?",
      [genre],
    );
    return rows.map((r) => r.song_id);
  } catch (e) {
    console.error("[DB] Error fetching IDs by genre:", e);
    return [];
  }
}

// Alias for backwards compatibility
export const getSongsByGenreFromDB = getSongIdsByGenre;

// =========================================================================
// FAVORITES OPERATIONS (persistent likes in SQLite)
// =========================================================================

export type FavoriteRow = {
  song_id: string;
  filename: string;
  uri: string;
  duration: number | null;
  extra_json: string | null;
  created_at: number;
};

export async function loadFavoritesFromDB(): Promise<Record<string, any>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<FavoriteRow>(
    "SELECT * FROM favorites ORDER BY created_at DESC",
  );
  const map: Record<string, any> = {};
  for (const row of rows) {
    const song: any = {
      id: row.song_id,
      filename: row.filename,
      uri: row.uri,
      duration: row.duration ?? undefined,
    };
    if (row.extra_json) {
      try {
        Object.assign(song, JSON.parse(row.extra_json));
      } catch {}
    }
    map[row.song_id] = song;
  }
  return map;
}

export async function addFavoriteToDB(song: {
  id: string;
  filename: string;
  uri: string;
  duration?: number;
  [key: string]: any;
}): Promise<void> {
  const db = await getDatabase();
  const { id, filename, uri, duration, ...extra } = song;
  await db.runAsync(
    "INSERT OR REPLACE INTO favorites (song_id, filename, uri, duration, extra_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [
      id,
      filename,
      uri,
      duration ?? null,
      JSON.stringify(extra),
      Date.now(),
    ],
  );
}

export async function removeFavoriteFromDB(songId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM favorites WHERE song_id = ?", [songId]);
}

export async function isFavoriteInDB(songId: string): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ song_id: string }>(
    "SELECT song_id FROM favorites WHERE song_id = ?",
    [songId],
  );
  return !!row;
}

// =========================================================================
// LISTENING HISTORY OPERATIONS
// =========================================================================

export async function recordHistoryInDB(
  songId: string,
  playbackDurationSec: number = 0,
  completed: boolean = false,
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "INSERT INTO listening_history (song_id, played_at, playback_duration_sec, completed) VALUES (?, ?, ?, ?)",
    [songId, Date.now(), playbackDurationSec, completed ? 1 : 0],
  );
}

export async function getRecentHistoryFromDB(
  limit: number = 50,
): Promise<Array<{ song_id: string; played_at: number }>> {
  const db = await getDatabase();
  return db.getAllAsync<{ song_id: string; played_at: number }>(
    "SELECT song_id, played_at FROM listening_history ORDER BY played_at DESC LIMIT ?",
    [limit],
  );
}

// =========================================================================
// KEY-VALUE STORE OPERATIONS (replaces simple AsyncStorage flags)
// =========================================================================

export async function getKV(key: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM key_value_store WHERE key = ?",
    [key],
  );
  return row?.value ?? null;
}

export async function setKV(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "INSERT OR REPLACE INTO key_value_store (key, value) VALUES (?, ?)",
    [key, value],
  );
}

export async function removeKV(key: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM key_value_store WHERE key = ?", [key]);
}

// =========================================================================
// PLAYLIST OPERATIONS (proper relational tables)
// =========================================================================

export type PlaylistRow = {
  id: string;
  name: string;
  created_at: number;
};

export type PlaylistSongRow = {
  song_id: string;
  filename: string;
  uri: string;
  duration: number | null;
  extra_json: string | null;
  sort_order: number;
};

export async function loadPlaylistsFromDB(): Promise<
  Array<{
    id: string;
    name: string;
    createdAt: number;
    songs: Array<{
      id: string;
      filename: string;
      uri: string;
      duration?: number;
      [key: string]: any;
    }>;
  }>
> {
  const db = await getDatabase();

  // 1. Fetch all playlists
  const playlists = await db.getAllAsync<PlaylistRow>(
    "SELECT * FROM playlists ORDER BY created_at ASC",
  );
  if (playlists.length === 0) return [];

  // 2. Fetch ALL songs for ALL playlists in one go
  const allSongs = await db.getAllAsync<PlaylistSongRow & { playlist_id: string }>(
    "SELECT * FROM playlist_songs ORDER BY sort_order ASC",
  );

  // 3. Group songs by playlist_id
  const songsByPlaylist: Record<string, any[]> = {};
  for (const s of allSongs) {
    if (!songsByPlaylist[s.playlist_id]) songsByPlaylist[s.playlist_id] = [];

    const base: any = {
      id: s.song_id,
      filename: s.filename,
      uri: s.uri,
    };
    if (s.duration != null) base.duration = s.duration;
    if (s.extra_json) {
      try {
        Object.assign(base, JSON.parse(s.extra_json));
      } catch {}
    }
    songsByPlaylist[s.playlist_id].push(base);
  }

  // 4. Assemble final result
  return playlists.map((pl) => ({
    id: pl.id,
    name: pl.name,
    createdAt: pl.created_at,
    songs: songsByPlaylist[pl.id] || [],
  }));
}

export async function createPlaylistInDB(
  id: string,
  name: string,
  createdAt: number,
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "INSERT INTO playlists (id, name, created_at) VALUES (?, ?, ?)",
    [id, name, createdAt],
  );
}

export async function deletePlaylistFromDB(playlistId: string): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM playlist_songs WHERE playlist_id = ?", [
      playlistId,
    ]);
    await db.runAsync("DELETE FROM playlists WHERE id = ?", [playlistId]);
  });
}

export async function renamePlaylistInDB(
  playlistId: string,
  newName: string,
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("UPDATE playlists SET name = ? WHERE id = ?", [
    newName,
    playlistId,
  ]);
}

export async function addSongToPlaylistInDB(
  playlistId: string,
  song: {
    id: string;
    filename: string;
    uri: string;
    duration?: number;
    [key: string]: any;
  },
): Promise<boolean> {
  const db = await getDatabase();

  // Check for duplicate
  const existing = await db.getFirstAsync<{ song_id: string }>(
    "SELECT song_id FROM playlist_songs WHERE playlist_id = ? AND song_id = ?",
    [playlistId, song.id],
  );
  if (existing) return false; // already exists

  // Get next sort order
  const maxRow = await db.getFirstAsync<{ max_order: number | null }>(
    "SELECT MAX(sort_order) as max_order FROM playlist_songs WHERE playlist_id = ?",
    [playlistId],
  );
  const nextOrder = (maxRow?.max_order ?? -1) + 1;

  const { id, filename, uri, duration, ...extra } = song;
  await db.runAsync(
    "INSERT INTO playlist_songs (playlist_id, song_id, filename, uri, duration, extra_json, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      playlistId,
      id,
      filename,
      uri,
      duration ?? null,
      JSON.stringify(extra),
      nextOrder,
    ],
  );
  return true;
}

export async function removeSongFromPlaylistInDB(
  playlistId: string,
  songId: string,
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?",
    [playlistId, songId],
  );
}
