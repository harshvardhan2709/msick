import React from "react";
import { AudioPlayerProvider } from "../features/player";
import { GenreProvider } from "../features/genres";
import { FavoritesProvider } from "../features/favorites";
import { PlaylistsProvider } from "../features/playlists";
import { ShareProvider } from "../features/sharing";

/** Composes the existing application providers without changing their scope. */
export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ShareProvider>
      <FavoritesProvider>
        <PlaylistsProvider>
          <AudioPlayerProvider>
            <GenreProvider>{children}</GenreProvider>
          </AudioPlayerProvider>
        </PlaylistsProvider>
      </FavoritesProvider>
    </ShareProvider>
  );
}
