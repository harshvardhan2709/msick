import FontAwesome from "@expo/vector-icons/FontAwesome";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import FileTransferProgress from "../components/FileTransferProgress";
import QRCodeDisplay from "../components/QRCodeDisplay";
import QRScanner from "../components/QRScanner";
import SongSelector from "../components/SongSelector";
import { useShare } from "../context/ShareContext";
import { saveReceivedFile } from "../services/fileUtils";

type TabMode = "send" | "receive";

export default function ShareScreen() {
    const {
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
    } = useShare();

    const [tabMode, setTabMode] = useState<TabMode>("send");
    const [showScanner, setShowScanner] = useState(false);
    const [showSongSelector, setShowSongSelector] = useState(false);
    const [selectedSong, setSelectedSong] = useState<any>(null);

    const handleStartServer = async () => {
        try {
            await startServer();
        } catch {
            Alert.alert("Error", "Failed to start server");
        }
    };

    const handleStopServer = () => {
        stopServer();
        setSelectedSong(null);
    };

    const handleSongSelect = async (song: any) => {
        setSelectedSong(song);
        setShowSongSelector(false);
        if (isConnected) {
            try {
                await shareFile(song.uri);
            } catch {
                Alert.alert("Error", "Failed to share file");
            }
        }
    };

    const handleQRScan = (ip: string, port: number) => {
        setShowScanner(false);
        connectToPeer(ip, port);
    };

    const handleSaveFile = async () => {
        if (!receivedFileUri) return;
        try {
            const fileName = fileMetadata?.name || `song_${Date.now()}.mp3`;
            const savedUri = await saveReceivedFile(receivedFileUri, fileName);
            if (savedUri) {
                Alert.alert("Success!", "Song saved to your music library", [
                    { text: "OK", onPress: () => reset() },
                ]);
            } else {
                Alert.alert("Error", "Failed to save file to music library");
            }
        } catch {
            Alert.alert("Error", "Failed to save file");
        }
    };

    const renderSendMode = () => {
        if (!isServerRunning) {
            return (
                <View className="flex-1 items-center justify-center p-6">
                    <View
                        style={{
                            width: 96,
                            height: 96,
                            borderRadius: 48,
                            backgroundColor: "rgba(127, 25, 230, 0.15)",
                            borderWidth: 1,
                            borderColor: "rgba(127, 25, 230, 0.3)",
                            justifyContent: "center",
                            alignItems: "center",
                            marginBottom: 24,

                        }}
                    >
                        <FontAwesome name="share-alt" size={40} color="#c084fc" />
                    </View>
                    <Text
                        style={{
                            fontSize: 24,
                            fontWeight: "700",
                            color: "#ffffff",
                            marginBottom: 8,
                        }}
                    >
                        Share Music
                    </Text>
                    <Text
                        style={{
                            color: "rgba(255, 255, 255, 0.4)",
                            textAlign: "center",
                            marginBottom: 32,
                            fontSize: 14,
                        }}
                    >
                        Start a server to share your music with nearby devices
                    </Text>
                    <TouchableOpacity
                        onPress={handleStartServer}
                        style={{
                            paddingHorizontal: 40,
                            paddingVertical: 16,
                            borderRadius: 28,
                            backgroundColor: "rgba(127, 25, 230, 0.25)",
                            borderWidth: 1,
                            borderColor: "rgba(127, 25, 230, 0.5)",
                        }}
                    >
                        <Text
                            style={{ color: "#c084fc", fontWeight: "700", fontSize: 16 }}
                        >
                            Start Server
                        </Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <ScrollView
                className="flex-1"
                contentContainerStyle={{
                    flexGrow: 1,
                    padding: 24,
                    paddingBottom: 100,
                }}
                showsVerticalScrollIndicator={true}
            >
                {serverInfo && (
                    <View className="mb-6">
                        <QRCodeDisplay serverInfo={serverInfo} />
                    </View>
                )}

                {/* Connection Status */}
                <View
                    style={{
                        padding: 16,
                        borderRadius: 16,
                        marginBottom: 24,
                        backgroundColor: isConnected
                            ? "rgba(34, 197, 94, 0.1)"
                            : "rgba(127, 25, 230, 0.1)",
                        borderWidth: 1,
                        borderColor: isConnected
                            ? "rgba(34, 197, 94, 0.25)"
                            : "rgba(127, 25, 230, 0.2)",
                    }}
                >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <View
                            style={{
                                width: 10,
                                height: 10,
                                borderRadius: 5,
                                marginRight: 12,
                                backgroundColor: isConnected ? "#22c55e" : "#555555",
                            }}
                        />
                        <Text
                            style={{
                                color: isConnected ? "#22c55e" : "rgba(255, 255, 255, 0.5)",
                                fontWeight: "600",
                            }}
                        >
                            {isConnected ? "Device Connected" : "Waiting for connection..."}
                        </Text>
                    </View>
                </View>

                {/* Song Selection */}
                {!selectedSong ? (
                    <TouchableOpacity
                        onPress={() => setShowSongSelector(true)}
                        style={{
                            paddingHorizontal: 24,
                            paddingVertical: 16,
                            borderRadius: 24,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            marginBottom: 24,
                            backgroundColor: "rgba(127, 25, 230, 0.2)",
                            borderWidth: 1,
                            borderColor: "rgba(127, 25, 230, 0.4)",
                        }}
                    >
                        <FontAwesome name="music" size={20} color="#c084fc" />
                        <Text
                            style={{
                                color: "#c084fc",
                                fontWeight: "700",
                                fontSize: 16,
                                marginLeft: 8,
                            }}
                        >
                            Select Song to Share
                        </Text>
                    </TouchableOpacity>
                ) : (
                    <View
                        style={{
                            padding: 16,
                            borderRadius: 16,
                            marginBottom: 24,
                            backgroundColor: "rgba(255, 255, 255, 0.03)",
                            borderWidth: 1,
                            borderColor: "rgba(127, 25, 230, 0.2)",
                        }}
                    >
                        <View
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginBottom: 8,
                            }}
                        >
                            <Text
                                style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.4)" }}
                            >
                                Selected Song:
                            </Text>
                            <TouchableOpacity onPress={() => setSelectedSong(null)}>
                                <FontAwesome
                                    name="times-circle"
                                    size={20}
                                    color="rgba(255, 255, 255, 0.3)"
                                />
                            </TouchableOpacity>
                        </View>
                        <Text
                            style={{ fontSize: 16, fontWeight: "700", color: "#ffffff" }}
                        >
                            {selectedSong.filename.replace(/\.[^/.]+$/, "")}
                        </Text>
                    </View>
                )}

                {/* Transfer Progress */}
                {transferProgress && transferProgress.percentage > 0 && (
                    <View className="mb-6">
                        <FileTransferProgress
                            progress={transferProgress}
                            fileName={selectedSong?.filename}
                        />
                    </View>
                )}

                {/* Error Message */}
                {transferError && (
                    <View
                        style={{
                            padding: 16,
                            borderRadius: 16,
                            marginBottom: 24,
                            backgroundColor: "rgba(239, 68, 68, 0.1)",
                            borderWidth: 1,
                            borderColor: "rgba(239, 68, 68, 0.2)",
                        }}
                    >
                        <Text
                            style={{
                                color: "#ef4444",
                                textAlign: "center",
                                fontWeight: "500",
                            }}
                        >
                            {transferError}
                        </Text>
                    </View>
                )}

                {/* Stop Server Button */}
                <TouchableOpacity
                    onPress={handleStopServer}
                    style={{
                        paddingHorizontal: 24,
                        paddingVertical: 16,
                        borderRadius: 24,
                        backgroundColor: "rgba(239, 68, 68, 0.15)",
                        borderWidth: 1,
                        borderColor: "rgba(239, 68, 68, 0.3)",
                    }}
                >
                    <Text
                        style={{
                            color: "#ef4444",
                            fontWeight: "700",
                            fontSize: 16,
                            textAlign: "center",
                        }}
                    >
                        Stop Server
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        );
    };

    const renderReceiveMode = () => {
        if (receivedFileUri) {
            return (
                <View className="flex-1 items-center justify-center p-6">
                    <View
                        style={{
                            width: 96,
                            height: 96,
                            borderRadius: 48,
                            backgroundColor: "rgba(34, 197, 94, 0.15)",
                            justifyContent: "center",
                            alignItems: "center",
                            marginBottom: 24,
                        }}
                    >
                        <FontAwesome name="check-circle" size={40} color="#22c55e" />
                    </View>
                    <Text
                        style={{
                            fontSize: 24,
                            fontWeight: "700",
                            color: "#ffffff",
                            marginBottom: 8,
                        }}
                    >
                        Download Complete!
                    </Text>
                    {fileMetadata && (
                        <Text
                            style={{
                                color: "rgba(255, 255, 255, 0.4)",
                                textAlign: "center",
                                marginBottom: 32,
                            }}
                        >
                            {fileMetadata.name}
                        </Text>
                    )}
                    <TouchableOpacity
                        onPress={handleSaveFile}
                        style={{
                            paddingHorizontal: 32,
                            paddingVertical: 16,
                            borderRadius: 24,
                            marginBottom: 12,
                            backgroundColor: "rgba(34, 197, 94, 0.2)",
                            borderWidth: 1,
                            borderColor: "rgba(34, 197, 94, 0.4)",
                        }}
                    >
                        <Text
                            style={{ color: "#22c55e", fontWeight: "700", fontSize: 16 }}
                        >
                            Save to Library
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={reset}
                        style={{
                            paddingHorizontal: 32,
                            paddingVertical: 16,
                            borderRadius: 24,
                            backgroundColor: "rgba(255, 255, 255, 0.05)",
                        }}
                    >
                        <Text
                            style={{
                                color: "rgba(255, 255, 255, 0.6)",
                                fontWeight: "600",
                            }}
                        >
                            Receive Another
                        </Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (!isConnected) {
            return (
                <View className="flex-1 items-center justify-center p-6">
                    <View
                        style={{
                            width: 96,
                            height: 96,
                            borderRadius: 48,
                            backgroundColor: "rgba(168, 85, 247, 0.15)",
                            borderWidth: 1,
                            borderColor: "rgba(168, 85, 247, 0.3)",
                            justifyContent: "center",
                            alignItems: "center",
                            marginBottom: 24,
                        }}
                    >
                        <FontAwesome name="qrcode" size={40} color="#a855f7" />
                    </View>
                    <Text
                        style={{
                            fontSize: 24,
                            fontWeight: "700",
                            color: "#ffffff",
                            marginBottom: 8,
                        }}
                    >
                        Receive Music
                    </Text>
                    <Text
                        style={{
                            color: "rgba(255, 255, 255, 0.4)",
                            textAlign: "center",
                            marginBottom: 32,
                            fontSize: 14,
                        }}
                    >
                        Scan the QR code shown on the sender&apos;s device
                    </Text>
                    <TouchableOpacity
                        onPress={() => setShowScanner(true)}
                        style={{
                            paddingHorizontal: 32,
                            paddingVertical: 16,
                            borderRadius: 24,
                            backgroundColor: "rgba(168, 85, 247, 0.2)",
                            borderWidth: 1,
                            borderColor: "rgba(168, 85, 247, 0.4)",
                        }}
                    >
                        <Text
                            style={{ color: "#a855f7", fontWeight: "700", fontSize: 16 }}
                        >
                            Scan QR Code
                        </Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <View className="flex-1 items-center justify-center p-6">
                {transferProgress && (
                    <View className="w-full mb-6">
                        <FileTransferProgress
                            progress={transferProgress}
                            fileName={fileMetadata?.name}
                        />
                    </View>
                )}

                <View
                    style={{
                        padding: 16,
                        borderRadius: 16,
                        marginBottom: 24,
                        backgroundColor: "rgba(34, 197, 94, 0.1)",
                        borderWidth: 1,
                        borderColor: "rgba(34, 197, 94, 0.25)",
                    }}
                >
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <View
                            style={{
                                width: 10,
                                height: 10,
                                borderRadius: 5,
                                backgroundColor: "#22c55e",
                                marginRight: 12,
                            }}
                        />
                        <Text
                            style={{ color: "#22c55e", fontWeight: "600" }}
                        >
                            Connected - Receiving file...
                        </Text>
                    </View>
                </View>

                {transferError && (
                    <View
                        style={{
                            padding: 16,
                            borderRadius: 16,
                            marginBottom: 24,
                            backgroundColor: "rgba(239, 68, 68, 0.1)",
                            borderWidth: 1,
                            borderColor: "rgba(239, 68, 68, 0.2)",
                        }}
                    >
                        <Text
                            style={{ color: "#ef4444", textAlign: "center" }}
                        >
                            {transferError}
                        </Text>
                    </View>
                )}

                <TouchableOpacity
                    onPress={() => {
                        disconnectFromPeer();
                        reset();
                    }}
                    style={{
                        paddingHorizontal: 32,
                        paddingVertical: 16,
                        borderRadius: 24,
                        backgroundColor: "rgba(239, 68, 68, 0.15)",
                        borderWidth: 1,
                        borderColor: "rgba(239, 68, 68, 0.3)",
                    }}
                >
                    <Text style={{ color: "#ef4444", fontWeight: "700" }}>Cancel</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View className="flex-1 bg-surface">
            {/* Header */}
            <View
                style={{
                    backgroundColor: "#0a0a0a",
                    paddingTop: 48,
                    paddingBottom: 16,
                    paddingHorizontal: 24,
                    borderBottomWidth: 1,
                    borderBottomColor: "rgba(127, 25, 230, 0.15)",
                }}
            >
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 16,
                    }}
                >
                    <TouchableOpacity onPress={() => router.back()}>
                        <FontAwesome name="arrow-left" size={22} color="#c084fc" />
                    </TouchableOpacity>
                    <Text
                        style={{ fontSize: 22, fontWeight: "700", color: "#ffffff" }}
                    >
                        Share Music
                    </Text>
                    <View style={{ width: 24 }} />
                </View>

                {/* Tab Switcher */}
                <View
                    style={{
                        flexDirection: "row",
                        backgroundColor: "rgba(255, 255, 255, 0.05)",
                        borderRadius: 24,
                        padding: 4,
                    }}
                >
                    <TouchableOpacity
                        onPress={() => {
                            setTabMode("send");
                            reset();
                        }}
                        style={{
                            flex: 1,
                            paddingVertical: 12,
                            borderRadius: 20,
                            backgroundColor:
                                tabMode === "send"
                                    ? "rgba(127, 25, 230, 0.3)"
                                    : "transparent",
                            borderWidth: tabMode === "send" ? 1 : 0,
                            borderColor: "rgba(127, 25, 230, 0.4)",
                        }}
                    >
                        <Text
                            style={{
                                textAlign: "center",
                                fontWeight: "600",
                                color:
                                    tabMode === "send"
                                        ? "#c084fc"
                                        : "rgba(255, 255, 255, 0.4)",
                            }}
                        >
                            Send
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => {
                            setTabMode("receive");
                            reset();
                        }}
                        style={{
                            flex: 1,
                            paddingVertical: 12,
                            borderRadius: 20,
                            backgroundColor:
                                tabMode === "receive"
                                    ? "rgba(168, 85, 247, 0.25)"
                                    : "transparent",
                            borderWidth: tabMode === "receive" ? 1 : 0,
                            borderColor: "rgba(168, 85, 247, 0.4)",
                        }}
                    >
                        <Text
                            style={{
                                textAlign: "center",
                                fontWeight: "600",
                                color:
                                    tabMode === "receive"
                                        ? "#a855f7"
                                        : "rgba(255, 255, 255, 0.4)",
                            }}
                        >
                            Receive
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Content */}
            {tabMode === "send" ? renderSendMode() : renderReceiveMode()}

            {/* QR Scanner Modal */}
            {showScanner && (
                <QRScanner
                    onScan={handleQRScan}
                    onClose={() => setShowScanner(false)}
                />
            )}

            {/* Song Selector Modal */}
            <SongSelector
                visible={showSongSelector}
                onClose={() => setShowSongSelector(false)}
                onSelect={handleSongSelect}
            />
        </View>
    );
}
