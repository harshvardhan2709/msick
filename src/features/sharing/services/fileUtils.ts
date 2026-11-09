import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";

export interface FileInfo {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
}

// Get file information
export async function getFileInfo(uri: string): Promise<FileInfo | null> {
  try {
    const file = new FileSystem.File(uri);
    const size = await file.size;

    if (!size) {
      return null;
    }

    const fileName = uri.split("/").pop() || "unknown";

    return {
      uri,
      name: fileName,
      size,
      mimeType: "audio/mpeg",
    };
  } catch (error) {
    console.error("Error getting file info:", error);
    return null;
  }
}

// Save received file to public directory (Music folder)
export async function saveReceivedFile(
  fileUri: string,
  fileName: string,
): Promise<string | null> {
  try {
    // Request permissions with granular audio permissions for Android 13+
    const { status } = await MediaLibrary.requestPermissionsAsync(true);

    if (status !== "granted") {
      throw new Error("Media library permission not granted");
    }

    // Try using MediaLibrary first
    try {
      const asset = await MediaLibrary.createAssetAsync(fileUri);

      // Get or create Music album
      const albums = await MediaLibrary.getAlbumsAsync();
      let musicAlbum = albums.find((album) => album.title === "Music");

      if (!musicAlbum) {
        musicAlbum = await MediaLibrary.createAlbumAsync("Music", asset, false);
      } else {
        await MediaLibrary.addAssetsToAlbumAsync([asset], musicAlbum, false);
      }

      console.log("File saved to Music library:", asset.uri);
      return asset.uri;
    } catch (mlError) {
      // If MediaLibrary fails (e.g., wrong collection), the file is already
      // in cache and playable. Just return the cache URI
      console.warn("MediaLibrary save failed, file remains in cache:", mlError);
      return fileUri;
    }
  } catch (error) {
    console.error("Error saving file to media library:", error);
    return null;
  }
}

// Request storage permissions
export async function requestStoragePermissions(): Promise<boolean> {
  try {
    // Pass true for writeOnly to request granular permissions on Android 13+
    const { status } = await MediaLibrary.requestPermissionsAsync(true);
    return status === "granted";
  } catch (error) {
    console.error("Error requesting storage permissions:", error);
    return false;
  }
}

// Format bytes to human-readable string
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

// Format transfer speed
export function formatSpeed(bytesPerSecond: number): string {
  return `${formatBytes(bytesPerSecond)}/s`;
}

// Estimate remaining time
export function estimateRemainingTime(
  bytesTransferred: number,
  totalBytes: number,
  elapsedSeconds: number,
): string {
  if (bytesTransferred === 0 || elapsedSeconds === 0) {
    return "Calculating...";
  }

  const bytesPerSecond = bytesTransferred / elapsedSeconds;
  const remainingBytes = totalBytes - bytesTransferred;
  const remainingSeconds = remainingBytes / bytesPerSecond;

  if (remainingSeconds < 60) {
    return `${Math.round(remainingSeconds)}s`;
  } else if (remainingSeconds < 3600) {
    return `${Math.round(remainingSeconds / 60)}m`;
  } else {
    return `${Math.round(remainingSeconds / 3600)}h`;
  }
}

// Delete temporary file
export async function deleteFile(uri: string): Promise<boolean> {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
    return true;
  } catch (error) {
    console.error("Error deleting file:", error);
    return false;
  }
}
