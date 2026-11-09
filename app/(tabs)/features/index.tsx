import FontAwesome from "@expo/vector-icons/FontAwesome";
import { router } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useGenre } from "../../../src/features/genres";

export default function FeaturesScreen() {
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const { startClassification, status, hasClassified } = useGenre();

    const handleGenrePress = () => {
        if (hasClassified) {
            // Already classified, go directly to results
            router.push("/features/genre-classification" as any);
        } else {
            // Show confirmation popup
            setShowConfirmModal(true);
        }
    };

    const handleConfirmClassification = async () => {
        setShowConfirmModal(false);
        // Navigate to genre screen first so the loading screen shows there
        router.push("/features/genre-classification" as any);
        // Small delay to ensure navigation completes
        await new Promise(resolve => setTimeout(resolve, 300));
        // Start the classification
        startClassification();
    };

    return (
        <View className="flex-1 bg-surface pt-12">
            {/* Header */}
            <View className="px-5 mb-6">
                <View
                    style={{
                        backgroundColor: "rgba(25, 4, 25, 0.85)",
                        borderWidth: 1,
                        borderColor: "rgba(127, 25, 230, 0.25)",
                        borderRadius: 24,
                        padding: 16,
                    }}
                >
                    <Text className="text-xl font-bold text-center text-neon-purple">
                        Features
                    </Text>
                </View>
            </View>

            <View className="flex-1 px-5">
                <TouchableOpacity
                    onPress={() => router.push("/features/ai-settings" as any)}
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 16,
                        padding: 20,
                        borderRadius: 20,
                        backgroundColor: "rgba(25, 4, 25, 0.85)",
                        borderWidth: 1,
                        borderColor: "rgba(127, 25, 230, 0.25)",
                        marginBottom: 12,
                    }}
                >
                    <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(127, 25, 230, 0.2)", justifyContent: "center", alignItems: "center" }}>
                        <FontAwesome name="key" size={20} color="#c084fc" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "700", fontSize: 16, color: "#ffffff" }}>AI Settings</Text>
                        <Text style={{ color: "rgba(255, 255, 255, 0.4)", fontSize: 13, marginTop: 2 }}>Configure Groq and your model</Text>
                    </View>
                    <FontAwesome name="chevron-right" size={14} color="rgba(255, 255, 255, 0.3)" />
                </TouchableOpacity>

                {/* Share Music Card */}
                <TouchableOpacity
                    onPress={() => router.push("/features/share-music")}
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 16,
                        padding: 20,
                        borderRadius: 20,
                        backgroundColor: "rgba(25, 4, 25, 0.85)",
                        borderWidth: 1,
                        borderColor: "rgba(127, 25, 230, 0.25)",
                        marginBottom: 12,
                    }}
                >
                    <View
                        style={{
                            width: 52,
                            height: 52,
                            borderRadius: 26,
                            backgroundColor: "rgba(127, 25, 230, 0.2)",
                            justifyContent: "center",
                            alignItems: "center",
                        }}
                    >
                        <FontAwesome name="share-alt" size={22} color="#c084fc" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text
                            style={{ fontWeight: "700", fontSize: 16, color: "#ffffff" }}
                        >
                            Share Music
                        </Text>
                        <Text
                            style={{
                                color: "rgba(255, 255, 255, 0.4)",
                                fontSize: 13,
                                marginTop: 2,
                            }}
                        >
                            Send & receive songs via Wi-Fi
                        </Text>
                    </View>
                    <FontAwesome
                        name="chevron-right"
                        size={14}
                        color="rgba(255, 255, 255, 0.3)"
                    />
                </TouchableOpacity>

                {/* AI Genre Detection Card */}
                <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                    <TouchableOpacity
                        onPress={handleGenrePress}
                        disabled={status === 'classifying' || status === 'loading_songs'}
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 16,
                            padding: 20,
                            borderRadius: 20,
                            backgroundColor: "rgba(25, 4, 25, 0.85)",
                            borderWidth: 1,
                            borderColor: hasClassified
                                ? "rgba(34, 197, 94, 0.25)"
                                : "rgba(249, 115, 22, 0.25)",
                            marginBottom: 12,
                            opacity: (status === 'classifying' || status === 'loading_songs') ? 0.5 : 1,
                        }}
                    >
                        <View
                            style={{
                                width: 52,
                                height: 52,
                                borderRadius: 26,
                                backgroundColor: hasClassified
                                    ? "rgba(34, 197, 94, 0.15)"
                                    : "rgba(249, 115, 22, 0.15)",
                                justifyContent: "center",
                                alignItems: "center",
                            }}
                        >
                            {(status === 'classifying' || status === 'loading_songs') ? (
                                <ActivityIndicator size="small" color="#f97316" />
                            ) : (
                                <FontAwesome
                                    name="magic"
                                    size={22}
                                    color={hasClassified ? "#22c55e" : "#f97316"}
                                />
                            )}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text
                                style={{ fontWeight: "700", fontSize: 16, color: "#ffffff" }}
                            >
                                AI Genre Detection
                            </Text>
                            <Text
                                style={{
                                    color: "rgba(255, 255, 255, 0.4)",
                                    fontSize: 13,
                                    marginTop: 2,
                                }}
                            >
                                {hasClassified
                                    ? "View genre results & playlists"
                                    : "Auto-classify & create playlists"}
                            </Text>
                        </View>
                        <FontAwesome
                            name="chevron-right"
                            size={14}
                            color="rgba(255, 255, 255, 0.3)"
                        />
                    </TouchableOpacity>
                </Animated.View>

                {/* Reset AI Classification */}
                {hasClassified && (
                    <Animated.View entering={FadeInDown.delay(200).duration(400)}>
                        <TouchableOpacity
                            onPress={() => {
                                setShowConfirmModal(true);
                            }}
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 10,
                                padding: 14,
                                borderRadius: 16,
                                backgroundColor: "rgba(127, 25, 230, 0.05)",
                                borderWidth: 1,
                                borderColor: "rgba(127, 25, 230, 0.2)",
                                marginBottom: 12,
                            }}
                        >
                            <FontAwesome name="magic" size={14} color="#c084fc" />
                            <Text
                                style={{
                                    fontWeight: "600",
                                    fontSize: 14,
                                    color: "#c084fc",
                                }}
                            >
                                Re-detect Genres
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* AI Smart Filter Card */}
                <Animated.View entering={FadeInDown.delay(150).duration(400)}>
                    <TouchableOpacity
                        onPress={() => router.push("/features/ai-filter" as any)}
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 16,
                            padding: 20,
                            borderRadius: 20,
                            backgroundColor: "rgba(25, 4, 25, 0.85)",
                            borderWidth: 1,
                            borderColor: "rgba(14, 165, 233, 0.25)",
                            marginBottom: 12,
                        }}
                    >
                        <View
                            style={{
                                width: 52,
                                height: 52,
                                borderRadius: 26,
                                backgroundColor: "rgba(14, 165, 233, 0.15)",
                                justifyContent: "center",
                                alignItems: "center",
                            }}
                        >
                            <FontAwesome name="search" size={22} color="#0ea5e9" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text
                                style={{ fontWeight: "700", fontSize: 16, color: "#ffffff" }}
                            >
                                AI Smart Filter
                            </Text>
                            <Text
                                style={{
                                    color: "rgba(255, 255, 255, 0.4)",
                                    fontSize: 13,
                                    marginTop: 2,
                                }}
                            >
                                Find songs with a custom prompt
                            </Text>
                        </View>
                        <FontAwesome
                            name="chevron-right"
                            size={14}
                            color="rgba(255, 255, 255, 0.3)"
                        />
                    </TouchableOpacity>
                </Animated.View>
                {/* Coming Soon Section */}
                <View
                    style={{
                        alignItems: "center",
                        marginTop: 40,
                        opacity: 0.5,
                    }}
                >
                    <FontAwesome
                        name="rocket"
                        size={32}
                        color="rgba(127, 25, 230, 0.4)"
                    />
                    <Text
                        style={{
                            color: "rgba(255, 255, 255, 0.35)",
                            fontSize: 16,
                            fontWeight: "600",
                            marginTop: 12,
                        }}
                    >
                        More Features Coming Soon
                    </Text>
                    <Text
                        style={{
                            color: "rgba(255, 255, 255, 0.2)",
                            fontSize: 13,
                            marginTop: 4,
                        }}
                    >
                        Stay tuned for updates
                    </Text>
                </View>
            </View>

            {/* Confirmation Modal */}
            <Modal
                visible={showConfirmModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowConfirmModal(false)}
            >
                <View
                    style={{
                        flex: 1,
                        backgroundColor: "rgba(0, 0, 0, 0.8)",
                        justifyContent: "center",
                        alignItems: "center",
                        paddingHorizontal: 28,
                    }}
                >
                    <View
                        style={{
                            width: "100%",
                            borderRadius: 24,
                            padding: 24,
                            backgroundColor: "#141414",
                            borderWidth: 1,
                            borderColor: "rgba(249, 115, 22, 0.3)",
                        }}
                    >
                        {/* Icon */}
                        <View style={{ alignItems: "center", marginBottom: 20 }}>
                            <View
                                style={{
                                    width: 64,
                                    height: 64,
                                    borderRadius: 32,
                                    backgroundColor: "rgba(249, 115, 22, 0.15)",
                                    borderWidth: 1,
                                    borderColor: "rgba(249, 115, 22, 0.3)",
                                    justifyContent: "center",
                                    alignItems: "center",
                                }}
                            >
                                <FontAwesome name="magic" size={28} color="#f97316" />
                            </View>
                        </View>

                        {/* Title */}
                        <Text
                            style={{
                                fontSize: 20,
                                fontWeight: "700",
                                marginBottom: 16,
                                color: "#ffffff",
                                textAlign: "center",
                            }}
                        >
                            AI Genre Detection
                        </Text>

                        {/* Description */}
                        <Text
                            style={{
                                color: "rgba(255, 255, 255, 0.6)",
                                fontSize: 14,
                                lineHeight: 22,
                                marginBottom: 8,
                                textAlign: "center",
                            }}
                        >
                            {hasClassified 
                                ? "This will re-analyze your library. Existing genre results will be replaced with fresh detections." 
                                : "This process will analyze all songs on your device using AI and automatically:"}
                        </Text>

                        {/* Steps */}
                        <View style={{ marginBottom: 20, gap: 10, paddingHorizontal: 8 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                                <View style={{
                                    width: 24, height: 24, borderRadius: 12,
                                    backgroundColor: "rgba(59, 130, 246, 0.2)",
                                    justifyContent: "center", alignItems: "center",
                                }}>
                                    <Text style={{ color: "#3b82f6", fontSize: 11, fontWeight: "700" }}>1</Text>
                                </View>
                                <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, flex: 1 }}>
                                    Scan all music files on your device
                                </Text>
                            </View>

                            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                                <View style={{
                                    width: 24, height: 24, borderRadius: 12,
                                    backgroundColor: "rgba(168, 85, 247, 0.2)",
                                    justifyContent: "center", alignItems: "center",
                                }}>
                                    <Text style={{ color: "#a855f7", fontSize: 11, fontWeight: "700" }}>2</Text>
                                </View>
                                <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, flex: 1 }}>
                                    Classify each song using Groq AI
                                </Text>
                            </View>

                            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                                <View style={{
                                    width: 24, height: 24, borderRadius: 12,
                                    backgroundColor: "rgba(34, 197, 94, 0.2)",
                                    justifyContent: "center", alignItems: "center",
                                }}>
                                    <Text style={{ color: "#22c55e", fontSize: 11, fontWeight: "700" }}>3</Text>
                                </View>
                                <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, flex: 1 }}>
                                    Browse songs organized by genre
                                </Text>
                            </View>
                        </View>


                        {/* Warning */}
                        <View style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 24,
                            paddingHorizontal: 4,
                        }}>
                            <FontAwesome name="clock-o" size={14} color="rgba(249, 115, 22, 0.6)" />
                            <Text style={{
                                color: "rgba(249, 115, 22, 0.6)",
                                fontSize: 12,
                                flex: 1,
                            }}>
                                This may take 1-3 minutes depending on your library size. Please keep the app open.
                            </Text>
                        </View>

                        {/* Buttons */}
                        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                            <TouchableOpacity
                                onPress={() => setShowConfirmModal(false)}
                                style={{
                                    flex: 1,
                                    paddingVertical: 14,
                                    borderRadius: 16,
                                    backgroundColor: "rgba(255,255,255,0.05)",
                                    alignItems: "center",
                                }}
                            >
                                <Text style={{ color: "rgba(255,255,255,0.5)", fontWeight: "600", fontSize: 15 }}>
                                    Cancel
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleConfirmClassification}
                                style={{
                                    flex: 1,
                                    paddingVertical: 14,
                                    borderRadius: 16,
                                    backgroundColor: "rgba(249, 115, 22, 0.2)",
                                    borderWidth: 1,
                                    borderColor: "rgba(249, 115, 22, 0.4)",
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 8,
                                }}
                            >
                                <FontAwesome name="magic" size={14} color="#f97316" />
                                <Text style={{ color: "#f97316", fontWeight: "700", fontSize: 15 }}>
                                    Start
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
