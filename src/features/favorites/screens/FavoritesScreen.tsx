import FontAwesome from "@expo/vector-icons/FontAwesome";
import { router } from "expo-router";
import React, { useCallback, useMemo } from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import LikeButton from "../components/LikeButton";
import { useAudioPlayer } from "../../player";
import { useFavorites } from "../hooks/useFavorites";

import SongImage from "../../../shared/components/SongImage";

const ITEM_HEIGHT = 68;

const FavoriteSongItem = React.memo(({ item, isCurrent }: { item: any, isCurrent: boolean }) => (
    <View
        style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 12,
            paddingHorizontal: 14,
            marginBottom: 6,
            borderRadius: 16,
            backgroundColor: isCurrent
                ? "rgba(127, 25, 230, 0.15)"
                : "rgba(255, 255, 255, 0.03)",
            borderWidth: isCurrent ? 1 : 0,
            borderColor: isCurrent
                ? "rgba(127, 25, 230, 0.4)"
                : "transparent",
        }}
    >
        {/* Album Art */}
        <View style={{ marginRight: 12 }}>
            <SongImage 
                uri={item.uri} 
                id={item.id} 
                isCurrent={isCurrent} 
                iconSize={18}
            />
        </View>

        <View style={{ flex: 1 }}>
            <Text
                numberOfLines={1}
                style={{
                    fontSize: 15,
                    fontWeight: isCurrent ? "700" : "500",
                    color: isCurrent ? "#c084fc" : "#ffffff",
                }}
            >
                {item.filename}
            </Text>
        </View>

        <LikeButton songId={item.id} song={item} />
    </View>
));

FavoriteSongItem.displayName = "FavoriteSongItem";

const EmptyFavorites = React.memo(() => (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", marginTop: 80 }}>
        <FontAwesome
            name="heart-o"
            size={40}
            color="rgba(239, 68, 68, 0.3)"
        />
        <Text
            style={{
                color: "rgba(255, 255, 255, 0.4)",
                fontSize: 16,
                marginTop: 12,
            }}
        >
            No liked songs yet
        </Text>
        <Text
            style={{
                color: "rgba(255, 255, 255, 0.25)",
                fontSize: 13,
                marginTop: 4,
            }}
        >
            Tap the heart icon on any song
        </Text>
    </View>
));

EmptyFavorites.displayName = "EmptyFavorites";

export default function FavoritesScreen() {
    const { likesMap } = useFavorites();
    const { play, currentSong } = useAudioPlayer();

    const liked = useMemo(() => Object.values(likesMap), [likesMap]);
    const currentSongId = currentSong?.id;

    const handlePlay = useCallback((item: any) => {
        play(item, liked);
    }, [play, liked]);

    const getItemLayout = useCallback((_: any, index: number) => ({
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * index,
        index,
    }), []);

    const keyExtractor = useCallback((item: any) => item.id, []);

    const renderItem = useCallback(({ item }: { item: any }) => (
        <TouchableOpacity
            onPress={() => handlePlay(item)}
            activeOpacity={0.7}
        >
            <FavoriteSongItem
                item={item}
                isCurrent={item.id === currentSongId}
            />
        </TouchableOpacity>
    ), [handlePlay, currentSongId]);

    return (
        <View className="flex-1 bg-surface pt-12">
            {/* Header */}
            <View className="px-5 mb-4">
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                    }}
                >
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: "rgba(25, 4, 25, 0.85)",
                            borderWidth: 1,
                            borderColor: "rgba(239, 68, 68, 0.25)",
                            justifyContent: "center",
                            alignItems: "center",
                        }}
                    >
                        <FontAwesome name="arrow-left" size={16} color="#ff4444" />
                    </TouchableOpacity>

                    <View
                        style={{
                            flex: 1,
                            flexDirection: "row",
                            alignItems: "center",
                            backgroundColor: "rgba(239, 68, 68, 0.1)",
                            borderWidth: 1,
                            borderColor: "rgba(239, 68, 68, 0.2)",
                            borderRadius: 24,
                            padding: 14,
                        }}
                    >
                        <FontAwesome
                            name="heart"
                            size={18}
                            color="#ff4444"
                            style={{ marginRight: 10 }}
                        />
                        <Text
                            style={{
                                fontSize: 18,
                                fontWeight: "700",
                                color: "#ffffff",
                            }}
                        >
                            Favorites
                        </Text>
                    </View>
                </View>
            </View>

            <FlatList
                data={liked}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                getItemLayout={getItemLayout}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 180 }}
                initialNumToRender={15}
                maxToRenderPerBatch={10}
                updateCellsBatchingPeriod={50}
                windowSize={5}
                removeClippedSubviews={true}
                ListEmptyComponent={EmptyFavorites}
            />
        </View>
    );
}
