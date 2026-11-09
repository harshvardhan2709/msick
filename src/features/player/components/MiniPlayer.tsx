import { Image as ExpoImage } from "expo-image";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useAudioPlayer } from "../context/AudioPlayerContext";
import FullScreenPlayer from "./FullScreenPlayer";

export default function MiniPlayer() {
    const {
        currentSong,
        isPlaying,
        togglePlayPause,
    } = useAudioPlayer();
    const router = useRouter();
    const [showFullPlayer, setShowFullPlayer] = useState(false);

    if (!currentSong) return null;

    return (
        <>
            {/* Mini Player Bar */}
            <Animated.View
                entering={FadeInDown.springify()}
                exiting={FadeOutDown.springify()}
                className="absolute bottom-[75px] left-[10px] right-[10px] z-50"
            >
                <View
                    style={{
                        borderRadius: 24,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: "rgba(25, 4, 25, 0.92)",
                        borderWidth: 1,
                        borderColor: "rgba(127, 25, 230, 0.3)",
                    }}
                >
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => setShowFullPlayer(true)}
                        style={{ flex: 1, flexDirection: "row", alignItems: "center", minWidth: 0 }}
                    >
                        {/* Artwork */}
                        <View
                            style={{
                                width: 42,
                                height: 42,
                                borderRadius: 10,
                                backgroundColor: "rgba(127, 25, 230, 0.2)",
                                justifyContent: "center",
                                alignItems: "center",
                                overflow: "hidden",
                            }}
                        >
                            {currentSong.artwork ? (
                                <ExpoImage
                                    source={{ uri: currentSong.artwork }}
                                    style={{ width: "100%", height: "100%" }}
                                    contentFit="cover"
                                    transition={200}
                                />
                            ) : (
                                <FontAwesome name="music" size={18} color="#c084fc" />
                            )}
                        </View>

                        {/* Song Info */}
                        <View style={{ flex: 1, marginHorizontal: 12 }}>
                            <Text
                                numberOfLines={1}
                                style={{
                                    fontSize: 14,
                                    fontWeight: "600",
                                    color: "#ffffff",
                                }}
                            >
                                {currentSong.filename}
                            </Text>
                            <Text
                                style={{
                                    fontSize: 11,
                                    color: "rgba(192, 132, 252, 0.7)",
                                    marginTop: 2,
                                }}
                            >
                                {isPlaying ? "Playing" : "Paused"}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={togglePlayPause}
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: "rgba(127, 25, 230, 0.25)",
                            justifyContent: "center",
                            alignItems: "center",
                        }}
                    >
                        <FontAwesome
                            name={isPlaying ? "pause" : "play"}
                            size={16}
                            color="#c084fc"
                            style={{ marginLeft: isPlaying ? 0 : 2 }}
                        />
                    </TouchableOpacity>

                    {/* Queue Button */}
                    <TouchableOpacity
                        onPress={() => router.push("/current-queue" as any)}
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: "rgba(127, 25, 230, 0.25)",
                            justifyContent: "center",
                            alignItems: "center",
                            marginLeft: 8,
                        }}
                    >
                        <FontAwesome name="list-ul" size={16} color="#c084fc" />
                    </TouchableOpacity>
                </View>
            </Animated.View>

            {/* Full Screen Player Modal */}
            <FullScreenPlayer
                visible={showFullPlayer}
                onClose={() => setShowFullPlayer(false)}
            />
        </>
    );
}
