import { Image as ExpoImage } from "expo-image";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import Slider from "@react-native-community/slider";
import { useAudioPlayerStatus } from "expo-audio";
import { LinearGradient } from "expo-linear-gradient";
import React, { useRef, useState } from "react";
import { Dimensions, Modal, Text, TouchableOpacity, View } from "react-native";
import { useAudioPlayer as useAudioContext } from "../context/AudioPlayerContext";
import LikeButton from "../../favorites/components/LikeButton";
import AudioWaveform from "./AudioWaveform";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ART_SIZE = SCREEN_WIDTH - 64;

interface FullScreenPlayerProps {
    visible: boolean;
    onClose: () => void;
}

const FullScreenPlayer = React.memo(
    ({ visible, onClose }: FullScreenPlayerProps) => {
        const {
            currentSong,
            isPlaying,
            togglePlayPause,
            playNext,
            playPrevious,
            repeatMode,
            setRepeatMode,
            shuffleMode,
            toggleShuffle,
            player,
        } = useAudioContext();

        // expo-audio requires a real AudioPlayer here. Keep the status hook in a
        // child that is only mounted when the context has initialized a player.
        if (!player || !currentSong) return null;

        return (
            <FullScreenPlayerContent
                visible={visible}
                onClose={onClose}
                key={`${currentSong.id}:${currentSong.uri ?? ""}`}
                player={player}
                currentSong={currentSong}
                isPlaying={isPlaying}
                togglePlayPause={togglePlayPause}
                playNext={playNext}
                playPrevious={playPrevious}
                repeatMode={repeatMode}
                setRepeatMode={setRepeatMode}
                shuffleMode={shuffleMode}
                toggleShuffle={toggleShuffle}
            />
        );
    },
);

type FullScreenPlayerContentProps = FullScreenPlayerProps & {
    player: NonNullable<ReturnType<typeof useAudioContext>["player"]>;
    currentSong: NonNullable<ReturnType<typeof useAudioContext>["currentSong"]>;
    isPlaying: boolean;
    togglePlayPause: () => void;
    playNext: () => void;
    playPrevious: () => void;
    repeatMode: "off" | "all" | "one";
    setRepeatMode: () => void;
    shuffleMode: boolean;
    toggleShuffle: () => void;
};

const FullScreenPlayerContent = ({
    visible,
    onClose,
    player,
    currentSong,
    isPlaying,
    togglePlayPause,
    playNext,
    playPrevious,
    repeatMode,
    setRepeatMode,
    shuffleMode,
    toggleShuffle,
}: FullScreenPlayerContentProps) => {
        const status = useAudioPlayerStatus(player);
        const [slidingValue, setSlidingValue] = useState<number | null>(null);
        const isSliding = useRef(false);

        const rawDuration = status.duration * 1000;
        const duration = Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : 0;
        const rawPosition = status.currentTime * 1000;
        const playbackPosition = Number.isFinite(rawPosition) && rawPosition > 0 ? rawPosition : 0;
        const currentPosition = isSliding.current && slidingValue !== null
            ? slidingValue
            : Math.min(playbackPosition, duration || playbackPosition);
        const clampPosition = (value: number) =>
            Number.isFinite(value) ? Math.max(0, Math.min(value, duration)) : 0;
        const seekTo = (value: number) => {
            isSliding.current = false;
            if (duration > 0 && Number.isFinite(value)) {
                try {
                    player.seekTo(clampPosition(value) / 1000);
                } catch (error) {
                    console.warn("Unable to seek audio", error);
                }
            }
            setSlidingValue(null);
        };

        const formatTime = (millis: number) => {
            const totalSeconds = Math.floor(millis / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            return `${minutes}:${String(seconds).padStart(2, "0")}`;
        };

        return (
            <Modal
                visible={visible}
                animationType="slide"
                transparent={false}
                onRequestClose={onClose}
            >
                <LinearGradient
                    colors={["#191121", "#3a1050", "#191121"]}
                    locations={[0, 0.5, 1]}
                    style={{ flex: 1 }}
                >
                    {/* Header */}
                    <View
                        style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            paddingHorizontal: 24,
                            paddingTop: 52,
                            paddingBottom: 8,
                        }}
                    >
                        <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                            <FontAwesome name="chevron-down" size={22} color="rgba(255, 255, 255, 0.6)" />
                        </TouchableOpacity>
                        <View style={{ alignItems: "center" }}>
                            <Text
                                style={{
                                    fontSize: 10,
                                    letterSpacing: 2,
                                    textTransform: "uppercase",
                                    color: "#7f19e6",
                                    fontWeight: "700",
                                }}
                            >
                                Now Playing
                            </Text>
                        </View>
                        <View style={{ width: 30 }} />
                    </View>

                    {/* Album Art */}
                    <View
                        style={{
                            flex: 1,
                            justifyContent: "center",
                            alignItems: "center",
                            paddingHorizontal: 32,
                        }}
                    >
                        <View
                            style={{
                                width: ART_SIZE,
                                height: ART_SIZE,
                                borderRadius: 20,
                                backgroundColor: "rgba(255, 255, 255, 0.05)",
                                borderWidth: 1,
                                borderColor: "rgba(255, 255, 255, 0.1)",
                                justifyContent: "center",
                                alignItems: "center",
                                overflow: "hidden",
                            }}
                        >
                            {/* Inner glow + icon */}
                            <View
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    backgroundColor: "rgba(127, 25, 230, 0.08)",
                                    justifyContent: "center",
                                    alignItems: "center",
                                }}
                            >
                                {currentSong.artwork ? (
                                    <ExpoImage
                                        source={{ uri: currentSong.artwork }}
                                        style={{ width: "100%", height: "100%" }}
                                        contentFit="cover"
                                        transition={300}
                                    />
                                ) : (
                                    <FontAwesome name="music" size={80} color="rgba(127, 25, 230, 0.35)" />
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Track Info */}
                    <View style={{ paddingHorizontal: 32, marginTop: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        <View style={{ flex: 1, marginRight: 12 }}>
                            <Text
                                numberOfLines={1}
                                style={{
                                    fontSize: 22,
                                    fontWeight: "700",
                                    color: "#ffffff",
                                    letterSpacing: -0.5,
                                }}
                            >
                                {currentSong.filename}
                            </Text>
                            <Text
                                numberOfLines={1}
                                style={{
                                    fontSize: 15,
                                    color: "rgba(148, 163, 184, 1)",
                                    marginTop: 4,
                                    fontWeight: "500",
                                }}
                            >
                                {currentSong.artist || "Unknown Artist"}
                            </Text>
                        </View>
                        <LikeButton songId={currentSong.id} song={currentSong} />
                    </View>

                    {/* Playback-Synchronized Visualizer Waveform */}
                    <View style={{ paddingHorizontal: 32, marginTop: 12, alignItems: "center" }}>
                        <AudioWaveform isPlaying={isPlaying} barCount={20} height={28} color="#c084fc" />
                    </View>

                    {/* Controls Area */}
                    <View style={{ paddingHorizontal: 32, paddingTop: 28, paddingBottom: 40 }}>
                        {/* Progress Bar */}
                        <View style={{ marginBottom: 28 }}>
                            <Slider
                                style={{ width: "100%", height: 20 }}
                                minimumValue={0}
                                maximumValue={duration || 1}
                                value={currentPosition}
                                disabled={!status.isLoaded || duration <= 0}
                                onSlidingStart={() => {
                                    isSliding.current = true;
                                    setSlidingValue(currentPosition);
                                }}
                                onValueChange={(val) => setSlidingValue(clampPosition(val))}
                                onSlidingComplete={(value) => seekTo(value)}
                                minimumTrackTintColor="#7f19e6"
                                maximumTrackTintColor="rgba(255, 255, 255, 0.08)"
                                thumbTintColor="#7f19e6"
                            />
                            <View
                                style={{
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    paddingHorizontal: 4,
                                    marginTop: 4,
                                }}
                            >
                                <Text style={{ fontSize: 12, fontWeight: "500", color: "rgba(148, 163, 184, 1)" }}>
                                    {formatTime(currentPosition)}
                                </Text>
                                <Text style={{ fontSize: 12, fontWeight: "500", color: "rgba(148, 163, 184, 1)" }}>
                                    {formatTime(duration)}
                                </Text>
                            </View>
                        </View>

                        {/* Playback Buttons */}
                        <View
                            style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 32,
                            }}
                        >
                            {/* Shuffle */}
                            <TouchableOpacity onPress={toggleShuffle} style={{ padding: 8 }}>
                                <FontAwesome
                                    name="random"
                                    size={18}
                                    color={shuffleMode ? "#7f19e6" : "rgba(148, 163, 184, 1)"}
                                />
                            </TouchableOpacity>

                            {/* Main Controls */}
                            <View
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 28,
                                }}
                            >
                                {/* Previous */}
                                <TouchableOpacity onPress={playPrevious} style={{ padding: 4 }}>
                                    <FontAwesome name="step-backward" size={28} color="#ffffff" />
                                </TouchableOpacity>

                                {/* Play/Pause - Large Circle */}
                                <TouchableOpacity
                                    onPress={togglePlayPause}
                                    style={{
                                        width: 72,
                                        height: 72,
                                        borderRadius: 36,
                                        backgroundColor: "#7f19e6",
                                        justifyContent: "center",
                                        alignItems: "center",
                                    }}
                                >
                                    <FontAwesome
                                        name={isPlaying ? "pause" : "play"}
                                        size={28}
                                        color="#ffffff"
                                        style={{ marginLeft: isPlaying ? 0 : 4 }}
                                    />
                                </TouchableOpacity>

                                {/* Next */}
                                <TouchableOpacity onPress={playNext} style={{ padding: 4 }}>
                                    <FontAwesome name="step-forward" size={28} color="#ffffff" />
                                </TouchableOpacity>
                            </View>

                            {/* Repeat */}
                            <TouchableOpacity onPress={setRepeatMode} style={{ padding: 8 }}>
                                <View style={{ alignItems: "center", justifyContent: "center" }}>
                                    <FontAwesome
                                        name="repeat"
                                        size={18}
                                        color={repeatMode !== "off" ? "#7f19e6" : "rgba(148, 163, 184, 1)"}
                                    />
                                    {repeatMode === "one" && (
                                        <View
                                            style={{
                                                position: "absolute",
                                                bottom: -6,
                                                right: -6,
                                                width: 14,
                                                height: 14,
                                                borderRadius: 7,
                                                backgroundColor: "#7f19e6",
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                        >
                                            <Text
                                                style={{ fontSize: 8, fontWeight: "700", color: "#ffffff" }}
                                            >
                                                1
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                </LinearGradient>
            </Modal>
        );
};

FullScreenPlayer.displayName = "FullScreenPlayer";

export default FullScreenPlayer;
