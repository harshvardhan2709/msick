import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
    closeServer,
    connectToServer,
    createServer,
    disconnect,
    FileMetadata,
    getLocalIPAddress,
    receiveFile,
    sendFile,
    SERVER_PORT,
    ServerInfo,
    TransferProgress,
} from "../services/networkServer";

export type ShareMode = "idle" | "sender" | "receiver";

export interface ShareContextType {
    // Mode
    mode: ShareMode;
    setMode: (mode: ShareMode) => void;

    // Server (Sender)
    serverInfo: ServerInfo | null;
    isServerRunning: boolean;
    startServer: () => Promise<void>;
    stopServer: () => void;
    shareFile: (fileUri: string) => Promise<void>;

    // Client (Receiver)
    isConnected: boolean;
    connectToPeer: (ip: string, port: number) => void;
    disconnectFromPeer: () => void;

    // Transfer
    transferProgress: TransferProgress | null;
    transferError: string | null;
    fileMetadata: FileMetadata | null;
    receivedFileUri: string | null;

    // Reset
    reset: () => void;
}

export const ShareContext = createContext<ShareContextType>({
    mode: "idle",
    setMode: () => { },
    serverInfo: null,
    isServerRunning: false,
    startServer: async () => { },
    stopServer: () => { },
    shareFile: async () => { },
    isConnected: false,
    connectToPeer: () => { },
    disconnectFromPeer: () => { },
    transferProgress: null,
    transferError: null,
    fileMetadata: null,
    receivedFileUri: null,
    reset: () => { },
});

export function ShareProvider({ children }: { children: React.ReactNode }) {
    const [mode, setMode] = useState<ShareMode>("idle");
    const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
    const [isServerRunning, setIsServerRunning] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [transferProgress, setTransferProgress] =
        useState<TransferProgress | null>(null);
    const [transferError, setTransferError] = useState<string | null>(null);
    const [fileMetadata, setFileMetadata] = useState<FileMetadata | null>(null);
    const [receivedFileUri, setReceivedFileUri] = useState<string | null>(null);

    // Refs to hold server and socket instances across re-renders and unmounts
    const serverRef = React.useRef<any>(null);
    const clientSocketRef = React.useRef<any>(null);
    const currentClientSocketRef = React.useRef<any>(null);

    // Start server (Sender)
    const startServer = useCallback(async () => {
        try {
            setTransferError(null);

            // Close any existing server first (handles hot reload cases)
            if (serverRef.current) {
                console.log("Closing existing server before starting new one...");
                closeServer(serverRef.current);
                serverRef.current = null;
                await new Promise(resolve => setTimeout(resolve, 150));
            }

            // Get local IP
            const ip = await getLocalIPAddress();
            if (!ip) {
                throw new Error("Could not get local IP address");
            }

            // Create server
            const server = createServer(
                (socket) => {
                    console.log("Client connected to server");
                    currentClientSocketRef.current = socket;
                    setIsConnected(true);
                },
                (error) => {
                    console.error("Server error:", error);
                    if (error.message.includes("EADDRINUSE")) {
                        setTransferError("Port is already in use. Please retry in a moment.");
                    } else {
                        setTransferError(error.message);
                    }
                    setIsServerRunning(false);
                },
            );

            if (!server) {
                throw new Error("Failed to create server");
            }

            serverRef.current = server;
            setServerInfo({ ip, port: SERVER_PORT });
            setIsServerRunning(true);
            setMode("sender");
        } catch (error) {
            console.error("Error starting server:", error);
            setTransferError((error as Error).message);
        }
    }, []);

    // Stop server (Sender)
    const stopServer = useCallback(() => {
        if (serverRef.current) {
            closeServer(serverRef.current);
            serverRef.current = null;
        }
        if (currentClientSocketRef.current) {
            disconnect(currentClientSocketRef.current);
            currentClientSocketRef.current = null;
        }
        setServerInfo(null);
        setIsServerRunning(false);
        setIsConnected(false);
        setTransferProgress(null);
    }, []);

    // Share file (Sender)
    const shareFile = useCallback(
        async (fileUri: string) => {
            if (!currentClientSocketRef.current) {
                setTransferError("No client connected");
                return;
            }

            try {
                setTransferError(null);
                setTransferProgress({
                    bytesTransferred: 0,
                    totalBytes: 0,
                    percentage: 0,
                });

                await sendFile(currentClientSocketRef.current, fileUri, (progress) => {
                    setTransferProgress(progress);
                });

                // Transfer complete
                setTransferProgress({
                    bytesTransferred: 100,
                    totalBytes: 100,
                    percentage: 100,
                });
            } catch (error) {
                console.error("Error sharing file:", error);
                setTransferError((error as Error).message);
            }
        },
        [],
    );

    // Connect to peer (Receiver)
    const connectToPeer = useCallback((ip: string, port: number) => {
        try {
            setTransferError(null);
            setMode("receiver");

            const client = connectToServer(
                ip,
                port,
                async () => {
                    setIsConnected(true);
                    clientSocketRef.current = client;

                    // Start receiving file
                    try {
                        const fileUri = await receiveFile(
                            client,
                            (progress) => {
                                setTransferProgress(progress);
                            },
                            (metadata) => {
                                setFileMetadata(metadata);
                            },
                        );

                        setReceivedFileUri(fileUri);
                        setTransferProgress({
                            bytesTransferred: 100,
                            totalBytes: 100,
                            percentage: 100,
                        });
                    } catch (error) {
                        console.error("Error receiving file:", error);
                        setTransferError((error as Error).message);
                    }
                },
                (error) => {
                    setTransferError(error.message);
                    setIsConnected(false);
                },
            );

            if (!client) {
                throw new Error("Failed to connect to server");
            }
        } catch (error) {
            console.error("Error connecting to peer:", error);
            setTransferError((error as Error).message);
        }
    }, []);

    // Disconnect from peer (Receiver)
    const disconnectFromPeer = useCallback(() => {
        if (clientSocketRef.current) {
            disconnect(clientSocketRef.current);
            clientSocketRef.current = null;
        }
        setIsConnected(false);
        setTransferProgress(null);
    }, []);

    // Reset all state
    const reset = useCallback(() => {
        stopServer();
        disconnectFromPeer();
        setMode("idle");
        setTransferError(null);
        setFileMetadata(null);
        setReceivedFileUri(null);
        setTransferProgress(null);
    }, [stopServer, disconnectFromPeer]);

    // Cleanup on unmount only
    useEffect(() => {
        return () => {
            console.log("ShareProvider unmounting, cleaning up sockets...");
            if (serverRef.current) {
                closeServer(serverRef.current);
                serverRef.current = null;
            }
            if (currentClientSocketRef.current) {
                disconnect(currentClientSocketRef.current);
                currentClientSocketRef.current = null;
            }
            if (clientSocketRef.current) {
                disconnect(clientSocketRef.current);
                clientSocketRef.current = null;
            }
        };
    }, []);

    const contextValue = React.useMemo(
        () => ({
            mode,
            setMode,
            serverInfo,
            isServerRunning,
            startServer,
            stopServer,
            shareFile,
            isConnected,
            connectToPeer,
            disconnectFromPeer,
            transferProgress,
            transferError,
            fileMetadata,
            receivedFileUri,
            reset,
        }),
        [
            mode,
            serverInfo,
            isServerRunning,
            startServer,
            stopServer,
            shareFile,
            isConnected,
            connectToPeer,
            disconnectFromPeer,
            transferProgress,
            transferError,
            fileMetadata,
            receivedFileUri,
            reset,
        ],
    );

    return (
        <ShareContext.Provider value={contextValue}>
            {children}
        </ShareContext.Provider>
    );
}

export const useShare = () => useContext(ShareContext);
