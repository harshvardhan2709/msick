import { File, Paths } from "expo-file-system";
import * as FileSystemLegacy from "expo-file-system/legacy";
import * as Network from "expo-network";
import { Buffer } from "buffer";
import TcpSocket from "react-native-tcp-socket";
import type { FileMetadata, TransferProgress } from "../../../shared/types/transfer";

export type { FileMetadata, ServerInfo, TransferProgress } from "../../../shared/types/transfer";

const SERVER_PORT = 8888;

// Read 48KB binary slices at a time on sender -> base64 frame length is 64KB
// This ensures:
// 1. Zero heap spikes (never holds whole audio files in JS memory).
// 2. Base64 is strictly 4-byte aligned (no padding truncation issues).
// 3. Sender streams bounded chunks while receiver writes directly to disk via FileHandle.writeBytes.
const READ_CHUNK_SIZE = 48 * 1024;

// Get cache directory path
const getCacheDirectory = (): string => {
  const dir = FileSystemLegacy.cacheDirectory || FileSystemLegacy.documentDirectory || "";
  return dir.endsWith("/") ? dir : `${dir}/`;
};

// Get the local IP address of the device
export async function getLocalIPAddress(): Promise<string | null> {
  try {
    const ip = await Network.getIpAddressAsync();
    return ip;
  } catch (error) {
    console.error("Error getting IP address:", error);
    return null;
  }
}

// Create a TCP server for file sharing
export function createServer(
  onConnection: (clientSocket: any) => void,
  onError: (error: Error) => void,
): any {
  try {
    const server = TcpSocket.createServer((socket) => {
      console.log("Client connected to TCP server");
      onConnection(socket);
    });

    server.listen({ port: SERVER_PORT, host: "0.0.0.0" }, () => {
      console.log(`Server listening on port ${SERVER_PORT}`);
    });

    server.on("error", (error) => {
      console.error("Server error:", error);
      onError(error);
    });

    return server;
  } catch (error) {
    console.error("Error creating server:", error);
    onError(error as Error);
    return null;
  }
}

// Send file to connected client using bounded disk reads
export async function sendFile(
  socket: any,
  fileUri: string,
  onProgress?: (progress: TransferProgress) => void,
): Promise<void> {
  try {
    const fileInfo = await FileSystemLegacy.getInfoAsync(fileUri);

    if (!fileInfo.exists) {
      throw new Error("File does not exist");
    }

    const rawFileName = fileUri.split("/").pop() || "unknown";
    const fileName = decodeURIComponent(rawFileName);
    const fileSize = fileInfo.size || 0;

    // Send metadata header first
    const metadata: FileMetadata = {
      name: fileName,
      size: fileSize,
      type: "audio/mpeg",
    };

    socket.write(JSON.stringify(metadata) + "\n");

    // Wait for client acknowledgment
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Client did not acknowledge readiness")),
        7000,
      );

      socket.once("data", (data: any) => {
        clearTimeout(timeout);
        const response = (data?.toString?.() || "").trim();
        if (response === "READY") {
          resolve();
        } else {
          reject(new Error(`Invalid client handshake response: ${response}`));
        }
      });
    });

    let bytesSent = 0;

    // Read and stream file in bounded slices from disk
    while (bytesSent < fileSize) {
      const bytesToRead = Math.min(READ_CHUNK_SIZE, fileSize - bytesSent);

      const chunkBase64 = await FileSystemLegacy.readAsStringAsync(fileUri, {
        encoding: FileSystemLegacy.EncodingType.Base64,
        position: bytesSent,
        length: bytesToRead,
      });

      // Frame format: [length_in_ascii]\n[base64_payload]\n
      const frame = `${chunkBase64.length}\n${chunkBase64}\n`;
      socket.write(frame);

      bytesSent += bytesToRead;

      if (onProgress) {
        onProgress({
          bytesTransferred: bytesSent,
          totalBytes: fileSize,
          percentage: fileSize > 0 ? (bytesSent / fileSize) * 100 : 100,
        });
      }

      // Micro-pause to prevent saturating the socket backpressure buffer
      await new Promise((resolve) => setTimeout(resolve, 8));
    }

    // Send completion delimiter
    socket.write("0\nDONE\n");
    console.log(`[P2P] Sent file successfully: ${fileName} (${bytesSent} bytes)`);
  } catch (error) {
    console.error("[P2P] Error sending file:", error);
    throw error;
  }
}

// Connect to server as a client
export function connectToServer(
  ip: string,
  port: number,
  onConnect: () => void,
  onError: (error: Error) => void,
): any {
  try {
    const client = TcpSocket.createConnection({ port, host: ip }, () => {
      console.log("Connected to server");
      onConnect();
    });

    client.on("error", (error) => {
      console.error("Connection error:", error);
      onError(error);
    });

    return client;
  } catch (error) {
    console.error("Error connecting to server:", error);
    onError(error as Error);
    return null;
  }
}

// Receive file from server with incremental binary disk writes (bounded memory)
export async function receiveFile(
  socket: any,
  onProgress?: (progress: TransferProgress) => void,
  onMetadata?: (metadata: FileMetadata) => void,
): Promise<string> {
  const cacheDir = getCacheDirectory();
  if (!cacheDir) {
    throw new Error("Cache directory is not available on device");
  }

  const tempFileName = `transfer_${Date.now()}_temp.mp3`;
  const tempFile = new File(Paths.cache, tempFileName);

  // Initialize empty temp file and obtain native FileHandle for direct chunk writes
  try {
    if (tempFile.exists) {
      tempFile.delete();
    }
    tempFile.create({ overwrite: true });
  } catch (initErr) {
    console.warn("Could not create tempFile via Paths.cache; trying legacy fallback", initErr);
  }

  let fileHandle: any = null;
  try {
    fileHandle = tempFile.open();
  } catch (handleErr) {
    console.warn("Could not open FileHandle directly:", handleErr);
  }

  return new Promise((resolve, reject) => {
    let metadata: FileMetadata | null = null;
    let metadataReceived = false;
    let buffer = "";
    let binaryBytesWritten = 0;
    let targetFileUri: string | null = null;
    let isTerminated = false;

    const cleanup = () => {
      try {
        if (fileHandle) {
          fileHandle.close();
          fileHandle = null;
        }
        if (tempFile.exists) {
          tempFile.delete();
        }
      } catch {}
    };

    const fail = (err: Error) => {
      if (isTerminated) return;
      isTerminated = true;
      cleanup();
      reject(err);
    };

    socket.on("data", async (data: any) => {
      if (isTerminated) return;
      const text = data?.toString?.() || "";
      buffer += text;

      // 1. Process Metadata Header if not yet received
      if (!metadataReceived) {
        const newlineIdx = buffer.indexOf("\n");
        if (newlineIdx === -1) return; // Wait for full metadata line

        const metaLine = buffer.slice(0, newlineIdx).trim();
        buffer = buffer.slice(newlineIdx + 1);

        try {
          metadata = JSON.parse(metaLine);
          metadataReceived = true;
          if (onMetadata && metadata) {
            onMetadata(metadata);
          }
          // Acknowledge readiness
          socket.write("READY\n");
        } catch {
          fail(new Error("Invalid metadata format received"));
          return;
        }
      }

      // 2. Process chunked frames: [length]\n[base64_payload]\n
      while (buffer.length > 0) {
        const firstNewline = buffer.indexOf("\n");
        if (firstNewline === -1) break; // Incomplete length header

        const lengthStr = buffer.slice(0, firstNewline).trim();
        const expectedLength = parseInt(lengthStr, 10);

        if (isNaN(expectedLength)) {
          if (lengthStr === "END_OF_FILE" || lengthStr === "DONE") {
            buffer = buffer.slice(firstNewline + 1);
            break;
          }
          fail(new Error(`Corrupted frame header: ${lengthStr}`));
          return;
        }

        // Completion frame indicator: length === 0
        if (expectedLength === 0) {
          const secondNewline = buffer.indexOf("\n", firstNewline + 1);
          if (secondNewline === -1) break;
          buffer = buffer.slice(secondNewline + 1);

          // Finalize transfer
          try {
            if (fileHandle) {
              fileHandle.close();
              fileHandle = null;
            }

            const rawName = metadata?.name || `received_${Date.now()}.mp3`;
            const cleanName = rawName.replace(/[^a-zA-Z0-9._-]/g, "_");
            targetFileUri = cacheDir + cleanName;

            // Move temp file to final location using legacy API
            await FileSystemLegacy.moveAsync({
              from: tempFile.uri,
              to: targetFileUri,
            });

            isTerminated = true;
            console.log(`[P2P] Transfer complete: ${targetFileUri} (${binaryBytesWritten} bytes)`);
            resolve(targetFileUri);
            return;
          } catch (err) {
            fail(new Error(`Failed to finalize received file: ${(err as Error).message}`));
            return;
          }
        }

        // Standard chunk: verify if full base64 chunk is in buffer
        const payloadStart = firstNewline + 1;
        const requiredBufferSize = payloadStart + expectedLength;

        if (buffer.length < requiredBufferSize) {
          // Incomplete chunk; wait for next TCP data event
          break;
        }

        const chunkBase64 = buffer.slice(payloadStart, payloadStart + expectedLength);
        let nextStart = payloadStart + expectedLength;
        if (buffer[nextStart] === "\n") nextStart++;
        buffer = buffer.slice(nextStart);

        // Convert chunk from base64 to binary Uint8Array and write directly to disk via FileHandle
        try {
          const binaryBuffer = Buffer.from(chunkBase64, "base64");
          const uint8Array = new Uint8Array(
            binaryBuffer.buffer,
            binaryBuffer.byteOffset,
            binaryBuffer.byteLength,
          );

          if (fileHandle) {
            fileHandle.writeBytes(uint8Array);
          } else {
            // Fallback: write using legacy writeAsStringAsync if FileHandle was not initialized
            await FileSystemLegacy.writeAsStringAsync(tempFile.uri, chunkBase64, {
              encoding: FileSystemLegacy.EncodingType.Base64,
            });
          }

          binaryBytesWritten += uint8Array.byteLength;
          const totalExpected = metadata?.size || binaryBytesWritten;

          if (onProgress) {
            onProgress({
              bytesTransferred: Math.min(binaryBytesWritten, totalExpected),
              totalBytes: totalExpected,
              percentage: totalExpected > 0
                ? Math.min(100, (binaryBytesWritten / totalExpected) * 100)
                : 100,
            });
          }
        } catch (writeErr) {
          fail(new Error(`Failed writing binary chunk to disk: ${(writeErr as Error).message}`));
          return;
        }
      }
    });

    socket.on("error", (error: Error) => {
      fail(error);
    });

    socket.on("close", () => {
      if (!isTerminated) {
        if (!metadata || binaryBytesWritten === 0) {
          fail(new Error("Connection closed before file transfer could complete"));
        } else {
          try {
            if (fileHandle) {
              fileHandle.close();
              fileHandle = null;
            }
            const rawName = metadata?.name || `received_${Date.now()}.mp3`;
            const cleanName = rawName.replace(/[^a-zA-Z0-9._-]/g, "_");
            targetFileUri = cacheDir + cleanName;
            FileSystemLegacy.moveAsync({
              from: tempFile.uri,
              to: targetFileUri,
            })
              .then(() => {
                isTerminated = true;
                resolve(targetFileUri!);
              })
              .catch((err) => fail(err));
          } catch (err) {
            fail(err as Error);
          }
        }
      }
    });
  });
}

// Close server
export function closeServer(server: any): void {
  if (server) {
    try {
      server.close();
      console.log("Server closed");
    } catch (e) {
      console.warn("Error closing server", e);
    }
  }
}

// Disconnect client
export function disconnect(socket: any): void {
  if (socket) {
    try {
      socket.destroy();
      console.log("Disconnected from server");
    } catch (e) {
      console.warn("Error disconnecting socket", e);
    }
  }
}

export { SERVER_PORT };
