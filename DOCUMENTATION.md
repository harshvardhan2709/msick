# Msick - Technical Documentation

**Msick** is a high-performance, local-first music player application built with React Native and Expo. It bridges the gap between traditional local audio playback and modern AI-driven discovery using state-of-the-art LLMs and a robust native foundation.

---

## 1. Vision & Architecture

Msick is designed with a **"Local-First, AI-Enhanced"** philosophy. Unlike streaming services that rely on cloud-hosted metadata, Msick processes everything locally on the device while using AI as a semantic layer to understand the user's library.

### Key Architectural Pillars:
- **Native Performance:** Leverages Expo's native modules for file system access, audio playback, and database management.
- **Semantic Intelligence:** Integrates LLMs (via Groq API) to provide human-like filtering and automated organization.
- **Offline Resilience:** Core features (playback, metadata search, local classification) work entirely without an internet connection.
- **Premium Aesthetics:** A high-fidelity UI built with NativeWind and Reanimated for a fluid, modern experience.

---

## 2. Technology Stack

| Category | Technology | Role |
| :--- | :--- | :--- |
| **Framework** | Expo (React Native) | Core application framework |
| **Routing** | Expo Router | File-based navigation (Tabs + Stack) |
| **Database** | `expo-sqlite` | Relational storage for metadata and AI tags |
| **Styling** | NativeWind (TailwindCSS) | Utility-first styling with native performance |
| **Animations** | `react-native-reanimated` | 60fps UI transitions and micro-interactions |
| **Audio** | `expo-audio` | Low-latency audio playback and lifecycle control |
| **Metadata** | `music-metadata-browser` | Background ID3 tag and artwork extraction |
| **AI Engine** | Optional Groq API (GPT OSS) | AI-assisted classification and semantic search |
| **Networking** | `react-native-tcp-socket` | P2P file sharing via local TCP servers |

---

## 3. Directory Structure

```text
Msick/
├── app/                  # Expo Router (File-based routing)
│   ├── (tabs)/           # Main tab-based navigation
│   │   ├── features/     # AI Smart Filter, P2P Sharing, etc.
│   │   ├── index/        # Home screen (Song list)
│   │   └── library/      # Playlists and Genre-based views
│   └── _layout.tsx       # Root layout with Context providers
├── components/           # Reusable UI components
│   ├── MiniPlayer.tsx    # Persistent global player controls
│   ├── FullScreenPlayer.tsx # Expanded playback view with lyrics/queue
│   ├── SongImage.tsx     # Optimized artwork renderer with fallbacks
│   └── QRScanner.tsx     # P2P connection handler
├── context/              # Global state management
│   ├── AudioPlayerContext.tsx # Centralized playback logic
│   └── GenreContext.tsx  # Reactive AI genre storage
├── utils/                # Core business logic and services
│   ├── database.ts       # SQLite initialization and DAO methods
│   ├── genreService.ts   # AI classification and batching logic
│   ├── aiFilterService.ts # Semantic search implementation
│   └── metadataUtils.ts  # Background metadata extraction workers
└── assets/               # Static images, fonts, and icons
```

---

## 4. Feature Deep-Dive

### 4.1. Library Management & Metadata
Msick doesn't just list files; it builds a rich metadata index.
- **Extraction:** When the app starts, it scans for new files using `expo-media-library`.
- **Worker Pattern:** Metadata (Title, Artist, Album, Artwork) is extracted in the background using `music-metadata-browser`.
- **Artwork Caching:** Embedded artwork is extracted, saved to the device's `cacheDirectory`, and referenced by URI in the database to keep the DB size small.

### 4.2. The AI Intelligence Engine
The AI engine transforms a flat list of files into a smart library.

#### Genre Classification (`genreService.ts`)
- **System:** Can use Groq GPT OSS models for zero-shot musicology when the user configures a key.
- **Standardization:** Maps every song into a subset of 20 core genres (e.g., *Phonk, Bollywood, Lo-fi & Chill, EDM & Dance*).
- **Batching:** Processes songs in batches of 75 to optimize API token usage and latency.
- **Local Fallback:** A filename keyword classifier remains available without a saved key or network access.

#### AI Smart Filter (`aiFilterService.ts`)
- **Semantic Search:** Users can type queries like *"Show me some high-energy gym songs"* or *"Sad Bollywood vibes"*.
- **Vibe Mapping:** The LLM translates the "vibe" into a list of matching asset IDs, which are then instantly cross-referenced against the local SQLite database.

### 4.3. High-Performance Storage (SQLite)
Msick uses a relational SQLite database (`msick.db`) with **WAL (Write-Ahead Logging)** mode for concurrent operations.

| Table | Purpose | Key Indices |
| :--- | :--- | :--- |
| `metadata_cache` | Stores ID3 tags and local artwork URIs | `song_id` (PK) |
| `genre_map` | Many-to-many mapping of songs to AI genres | `idx_genre_map_genre` |
| `playlists` | User-defined collections | `id` (PK) |
| `playlist_songs` | Junction table for playlists and songs | `idx_playlist_songs_playlist` |
| `key_value_store` | System flags (e.g., "migration_complete") | `key` (PK) |

---

## 5. Playback & State Management

### Audio Lifecycle
The `AudioPlayerContext` manages the `expo-audio` instance globally.
- **Queue System:** Supports dynamic queue modification (shuffle, repeat, move next).
- **Interruption Handling:** Automatically pauses on phone calls or headphone disconnection.
- **Persistence:** Remembers the last played song and position across sessions.

### Context API
- **Reactive Updates:** When the AI finishes classifying a batch, the `GenreContext` updates, triggering a smooth UI refresh across the library and home screens.

---

## 6. Peer-to-Peer (P2P) Sharing
Msick includes a specialized module for high-speed file transfers without internet.
1. **Host:** Starts a TCP server via `react-native-tcp-socket` and generates a QR code.
2. **Receiver:** Scans the QR code to obtain the host's local IP and port.
3. **Transfer:** The file is streamed in chunked buffers to ensure stability even for large high-quality audio files.

---

## 7. UI/UX Design Philosophy

- **Vibrant Glassmorphism:** Uses semi-transparent layers and blurred backgrounds to create a premium, deep feel.
- **Dynamic Theming:** UI accents (borders, shadows, icons) adapt based on the current song's genre or artwork color palette.
- **Micro-Animations:** Every button press and transition is handled by Reanimated for a "physics-based" feel.

---

## 8. Development & Performance

### Environment Setup
AI is optional. Configure a Groq API key and model in **Features → AI Settings**. The key is stored on-device with Expo SecureStore. Never put private API keys in `EXPO_PUBLIC_` variables or source files. Local playback and filename classification do not require an API key.

### Building the App
Since Msick uses several native modules, it requires a Development Build:
```bash
# Install dependencies
npm install

# Run on Android
npx expo run:android

# Run on iOS
npx expo run:ios
```

### Performance Metrics
- **Indexing:** Handles libraries of 2000+ songs with ease thanks to SQLite indexing.
- **Memory Management:** Artwork is loaded lazily and cached on the file system to prevent RAM spikes.
- **UI Thread:** All heavy lifting (AI, DB writes, Metadata parsing) is offloaded to background threads/worklets.

---

## 9. Future Roadmap
- **Waveform Seekbar:** JSI-based real-time audio visualization.
- **Cloud Sync:** Optional encrypted backup of playlists and AI tags.
- **Local LLM:** Integrating `llama.rn` for 100% offline semantic filtering.
