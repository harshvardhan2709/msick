/** Common local audio asset shape shared by playback, playlists, and favorites. */
export interface Song {
  id: string;
  filename: string;
  uri: string;
  duration?: number;
  title?: string;
  artist?: string;
  album?: string;
  artwork?: string;
  [key: string]: any;
}
