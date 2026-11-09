import FontAwesome from "@expo/vector-icons/FontAwesome";
import SongImage from "../../../shared/components/SongImage";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import DraggableFlatList, {
    RenderItemParams,
    ScaleDecorator,
} from "react-native-draggable-flatlist";
import { LikeButton } from "../../favorites";
import { useAudioPlayer } from "../context/AudioPlayerContext";

export default function QueueScreen() {
    const router = useRouter();
    const {
        queue,
        currentIndex,
        currentSong,
        play,
        removeFromQueue,
        setQueueAtomic,
        clearUpNext,
    } = useAudioPlayer();

    const upNext = useMemo(
        () =>
            queue.slice(currentIndex + 1).map((item, idx) => ({
                ...item,
                _upNextIndex: idx,
                _actualIndex: currentIndex + 1 + idx,
            })),
        [queue, currentIndex],
    );

    const handleClearAll = () => {
        if (upNext.length === 0) return;
        Alert.alert("Clear Queue", "Remove all upcoming songs?", [
            { text: "Cancel", style: "cancel" },
            { text: "Clear", style: "destructive", onPress: clearUpNext },
        ]);
    };

    const handleRemove = useCallback((actualIndex: number) => {
        removeFromQueue(actualIndex);
    }, [removeFromQueue]);

    const handleDragEnd = useCallback(
        ({ data }: { data: any[] }) => {
            const beforeAndCurrent = queue.slice(0, currentIndex + 1);
            const newUpNext = data.map((item: any) => {
                const { _upNextIndex, _actualIndex, ...song } = item;
                return song;
            });
            const newQueue = [...beforeAndCurrent, ...newUpNext];
            setQueueAtomic(newQueue, currentIndex);
        },
        [queue, currentIndex, setQueueAtomic],
    );

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const renderItem = useCallback(
        ({ item, drag, isActive }: RenderItemParams<any>) => {
            return (
                <ScaleDecorator>
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            paddingVertical: 10,
                            paddingHorizontal: 20,
                            borderBottomWidth: 1,
                            borderBottomColor: "rgba(255, 255, 255, 0.03)",
                            backgroundColor: isActive
                                ? "rgba(127, 25, 230, 0.15)"
                                : "transparent",
                        }}
                    >
                        <View style={{ marginRight: 12 }}>
                            <SongImage 
                                uri={item.uri} 
                                id={item.id} 
                                iconSize={16}
                            />
                        </View>

                        {/* Song Info */}
                        <TouchableOpacity
                            style={{ flex: 1 }}
                            onPress={() => play(item)}
                        >
                            <Text
                                numberOfLines={1}
                                style={{
                                    fontSize: 14,
                                    fontWeight: "600",
                                    color: "#ffffff",
                                }}
                            >
                                {item.filename}
                            </Text>
                            <Text
                                style={{
                                    fontSize: 11,
                                    color: "rgba(255, 255, 255, 0.35)",
                                    marginTop: 2,
                                }}
                            >
                                {item.duration ? formatDuration(item.duration) : ""}
                            </Text>
                        </TouchableOpacity>

                        {/* Like */}
                        <LikeButton songId={item.id} song={item} />

                        {/* Remove */}
                        <TouchableOpacity
                            onPress={() => handleRemove(item._actualIndex)}
                            style={{ padding: 6, marginRight: 6 }}
                        >
                            <FontAwesome
                                name="times"
                                size={16}
                                color="rgba(255, 255, 255, 0.2)"
                            />
                        </TouchableOpacity>

                        {/* Drag Handle */}
                        <TouchableOpacity onLongPress={drag} delayLongPress={100}>
                            <View style={{ padding: 6 }}>
                                <FontAwesome
                                    name="bars"
                                    size={18}
                                    color="rgba(255, 255, 255, 0.3)"
                                />
                            </View>
                        </TouchableOpacity>
                    </View>
                </ScaleDecorator>
            );
        },
        [play, handleRemove],
    );

    return (
        <View className="flex-1 bg-surface pt-12">
            {/* Header */}
            <View className="px-5 mb-4">
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        backgroundColor: "rgba(25, 4, 25, 0.85)",
                        borderWidth: 1,
                        borderColor: "rgba(127, 25, 230, 0.25)",
                        borderRadius: 24,
                        padding: 16,
                    }}
                >
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={{ padding: 4 }}
                    >
                        <FontAwesome name="arrow-left" size={18} color="#c084fc" />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 20, fontWeight: "700", color: "#c084fc" }}>
                        Queue
                    </Text>
                    <View style={{ width: 26 }} />
                </View>
            </View>

            {/* Now Playing */}
            {currentSong && (
                <View className="px-5 mb-4">
                    <Text
                        style={{
                            fontSize: 11,
                            fontWeight: "700",
                            color: "#c084fc",
                            letterSpacing: 1.5,
                            textTransform: "uppercase",
                            marginBottom: 10,
                        }}
                    >
                        Now Playing
                    </Text>
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            padding: 14,
                            borderRadius: 20,
                            backgroundColor: "rgba(127, 25, 230, 0.1)",
                            borderWidth: 1,
                            borderColor: "rgba(127, 25, 230, 0.3)",
                        }}
                    >
                        <View style={{ marginRight: 14 }}>
                            <SongImage 
                                uri={currentSong.uri} 
                                id={currentSong.id} 
                                size={52}
                                iconSize={22}
                                isCurrent={true}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text
                                numberOfLines={1}
                                style={{ fontSize: 16, fontWeight: "700", color: "#ffffff" }}
                            >
                                {currentSong.filename}
                            </Text>
                            <Text
                                style={{
                                    fontSize: 12,
                                    color: "rgba(192, 132, 252, 0.7)",
                                    marginTop: 2,
                                }}
                            >
                                {currentSong.duration
                                    ? formatDuration(currentSong.duration)
                                    : ""}
                            </Text>
                        </View>
                        <FontAwesome name="volume-up" size={16} color="#c084fc" />
                    </View>
                </View>
            )}

            {/* Up Next Header */}
            <View
                style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingHorizontal: 20,
                    marginBottom: 8,
                }}
            >
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#ffffff" }}>
                    Up Next{" "}
                    <Text
                        style={{ color: "rgba(255, 255, 255, 0.3)", fontWeight: "400" }}
                    >
                        ({upNext.length})
                    </Text>
                </Text>
                {upNext.length > 0 && (
                    <TouchableOpacity onPress={handleClearAll}>
                        <Text
                            style={{ fontSize: 13, fontWeight: "700", color: "#c084fc" }}
                        >
                            Clear all
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Up Next List - Draggable */}
            {upNext.length === 0 ? (
                <View style={{ alignItems: "center", marginTop: 60 }}>
                    <FontAwesome
                        name="list-ul"
                        size={36}
                        color="rgba(127, 25, 230, 0.2)"
                    />
                    <Text
                        style={{
                            color: "rgba(255, 255, 255, 0.4)",
                            fontSize: 15,
                            marginTop: 12,
                        }}
                    >
                        No upcoming songs
                    </Text>
                    <Text
                        style={{
                            color: "rgba(255, 255, 255, 0.2)",
                            fontSize: 12,
                            marginTop: 4,
                        }}
                    >
                        Play music from Home to fill the queue
                    </Text>
                </View>
            ) : (
                <DraggableFlatList
                    data={upNext}
                    keyExtractor={(item: any, idx: number) => `${item.id}-${idx}`}
                    renderItem={renderItem}
                    onDragEnd={handleDragEnd}
                    containerStyle={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: 180 }}
                />
            )}
        </View>
    );
}
