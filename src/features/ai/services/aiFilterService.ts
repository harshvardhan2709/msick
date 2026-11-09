import * as MediaLibrary from "expo-media-library";
import { getSongIdsByGenre } from "../../../services/database";
import {
  getGroqApiKey,
  getGroqModel,
  GROQ_API_URL,
  GroqRequestError,
  groqResponseError,
} from "./aiConfiguration";

// =========================================================================
// AI SMART FILTER — User-prompted song filtering via Groq AI
// =========================================================================

const GROQ_CHAT_COMPLETIONS_URL = `${GROQ_API_URL}/chat/completions`;

const CORE_20_GENRES = [
  "Pop", "Rock", "Hip-Hop", "Rap", "EDM & Dance", 
  "Lo-fi & Chill", "Phonk", "Bollywood", "Classical & Piano", "Jazz & Blues",
  "R&B & Soul", "Country", "Metal", "Reggae & Afrobeat", "Gaming & OST",
  "Acoustic & Folk", "Devotional", "Latin", "Retro Hits", "Kids & Nursery"
];

const BATCH_SIZE = 75;
const MAX_RETRIES = 4;
const BASE_RETRY_DELAY_MS = 5000;

type SongInput = {
  id: string;
  filename: string;
};

/**
 * Asks the AI which genres from our Core 20 list are relevant to the user's prompt.
 */
async function detectGenresFromPrompt(userPrompt: string, apiKey: string, model: string): Promise<string[]> {
  const messages = [
    {
      role: "system",
      content: `You are a music classifier. Based on the user's request, identify which of these 20 genres are relevant.
Genres: ${CORE_20_GENRES.join(", ")}.

Rules:
- Return ONLY a JSON object with a key "genres" containing an array: {"genres": ["Pop", "Rock"]}
- If no genres match, return an empty array: {"genres": []}
- Be inclusive — if a prompt like "sad hits" matches "Pop" and "Acoustic", include both.`,
    },
    {
      role: "user",
      content: `User Request: "${userPrompt}"`,
    },
  ];

  try {
    const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) throw await groqResponseError(response);
    const data = await response.json();
    let parsed: { genres?: unknown };
    try {
      parsed = JSON.parse(data?.choices?.[0]?.message?.content || "{}");
    } catch {
      throw new GroqRequestError("Groq returned an unreadable genre response. Try again.");
    }
    return Array.isArray(parsed.genres) ? parsed.genres : [];
  } catch (error) {
    if (error instanceof GroqRequestError) throw error;
    throw new Error("Could not reach Groq while identifying genres. Check your connection and try again.");
  }
}

/**
 * Sends a batch of songs + user prompt to the AI and returns matching song IDs.
 */
async function filterBatch(
  songs: SongInput[],
  userPrompt: string,
  apiKey: string,
  model: string,
  retryCount = 0,
): Promise<string[]> {
  const songList = songs.map((s) => `[${s.id}] ${s.filename}`).join("\n");

  const messages = [
    {
      role: "system",
      content: `You are a music recommendation assistant. The user will give you a request describing what kind of songs they want. You will be given a list of songs (with IDs and filenames). Your job is to pick the songs that best match the user's request based on the filename.

Core Genres to prioritize: ${CORE_20_GENRES.join(", ")}.

Rules:
- Return ONLY a JSON object with a single key "ids" containing an array of matching song IDs: {"ids": ["id1", "id2"]}
- If no songs match, return an empty array: {"ids": []}
- Be generous but relevant — if a song filename reasonably fits the request, include it.
- Judge based on song name, artist name, and any other info in the filename.
- Return raw JSON only, no explanation.`,
    },
    {
      role: "user",
      content: `Request: "${userPrompt}"\n\nSongs:\n${songList}`,
    },
  ];

  try {
    const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.3,
        max_completion_tokens: 2048,
        response_format: { type: "json_object" },
      }),
    });

    if (response.status === 429 && retryCount < MAX_RETRIES) {
      const retryDelay = BASE_RETRY_DELAY_MS * Math.pow(2, retryCount);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
      return filterBatch(songs, userPrompt, apiKey, model, retryCount + 1);
    }

    if (!response.ok) throw await groqResponseError(response);

    const data = await response.json();
    const textContent = data?.choices?.[0]?.message?.content || "";

    try {
      const parsed = JSON.parse(textContent);
      // Handle both {"results": [...]} and [...] formats
      const ids: any[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.results)
          ? parsed.results
          : Array.isArray(parsed.songs)
            ? parsed.songs
            : Array.isArray(parsed.ids)
              ? parsed.ids
              : [];

      // Validate — only keep IDs that exist in our song list
      const validIds = new Set(songs.map((s) => s.id));
      const matchedIds = ids.map(String).filter((id) => validIds.has(id));
      console.log(
        `Matched ${matchedIds.length} out of ${ids.length} IDs returned by AI`,
      );
      return matchedIds;
    } catch (e) {
      throw new GroqRequestError("Groq returned an unreadable song-match response. Try again.");
    }
  } catch (error) {
    if (error instanceof GroqRequestError) throw error;
    if (retryCount < MAX_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return filterBatch(songs, userPrompt, apiKey, model, retryCount + 1);
    }
    throw new Error("Could not reach Groq while matching songs. Check your connection and try again.");
  }
}

/**
 * Filters all songs using AI based on a user prompt.
 * Returns full MediaLibrary assets that matched.
 */
export async function aiSmartFilter(
  userPrompt: string,
  onProgress?: (message: string) => void,
): Promise<MediaLibrary.Asset[]> {
  let apiKey: string | null;
  let model: string;
  try {
    [apiKey, model] = await Promise.all([getGroqApiKey(), getGroqModel()]);
  } catch {
    throw new Error("Secure storage is unavailable. AI Smart Filter needs a saved Groq API key.");
  }
  if (!apiKey) {
    throw new Error("Save a Groq API key in Features → AI Settings to use AI Smart Filter.");
  }

  onProgress?.("Requesting permissions...");

  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Media library permission required");
  }

  onProgress?.("Loading songs from device...");

  const media = await MediaLibrary.getAssetsAsync({
    mediaType: MediaLibrary.MediaType.audio,
    first: 500,
  });

  const allSongs: SongInput[] = media.assets
    .filter((a) => a.duration >= 35)
    .map((a) => ({
      id: a.id,
      filename: a.filename,
    }));

  if (allSongs.length === 0) {
    throw new Error("No songs found on device");
  }

  const matchedIds: string[] = [];

  // --- STAGE 1: Detect Relevant Genres via AI ---
  onProgress?.("Identifying relevant categories...");
  const detectedGenres = await detectGenresFromPrompt(userPrompt, apiKey, model);

  let songsToScan: SongInput[] = [];

  if (detectedGenres.length > 0) {
    onProgress?.(`Filtering library for ${detectedGenres.join(", ")}...`);
    const indexedIds = new Set<string>();
    for (const genre of detectedGenres) {
      const ids = await getSongIdsByGenre(genre);
      ids.forEach(id => indexedIds.add(id));
    }
    
    // Only scan songs that match these genres
    const indexedSongs = allSongs.filter((song) => indexedIds.has(song.id));
    if (indexedSongs.length > 0) {
      songsToScan = indexedSongs;
    } else {
      // An empty genre index is expected before classification or after a library rescan.
      onProgress?.("No matching genre index yet; searching the full library...");
      songsToScan = allSongs;
    }
  } else {
    // Fallback: If no genre detected, we have to scan everything (or we can be strict)
    console.log("[AI Filter] No specific genre detected. Scanning full library as fallback.");
    songsToScan = allSongs;
  }

  if (songsToScan.length === 0) {
    onProgress?.("No songs found in matching categories.");
    return [];
  }

  // --- STAGE 2: Targeted AI Deep Scan ---
  // Split the pre-filtered songs into batches
  const batches: SongInput[][] = [];
  for (let i = 0; i < songsToScan.length; i += BATCH_SIZE) {
    batches.push(songsToScan.slice(i, i + BATCH_SIZE));
  }

  for (let i = 0; i < batches.length; i++) {
    onProgress?.(`Analyzing relevant songs (${i + 1}/${batches.length})...`);
    const batchResult = await filterBatch(batches[i], userPrompt, apiKey, model);
    matchedIds.push(...batchResult);

    if (i < batches.length - 1) {
      await new Promise((r) => setTimeout(r, 1500)); // Slightly faster buffer for small batches
    }
  }

  // Map matched IDs back to full assets
  const matchedSet = new Set(matchedIds);
  const matchedAssets = media.assets.filter((a) => matchedSet.has(a.id));

  onProgress?.(`Found ${matchedAssets.length} matching songs`);

  return matchedAssets;
}
