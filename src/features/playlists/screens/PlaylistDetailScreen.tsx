import FontAwesome from "@expo/vector-icons/FontAwesome";
import SongImage from "../../../shared/components/SongImage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useAudioPlayer } from "../../player";
import { usePlaylists } from "../context/PlaylistsContext";

export default function PlaylistDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { playlists, renamePlaylist, deletePlaylist, removeSongFromPlaylist } =
        usePlaylists();
    const { play } = useAudioPlayer();

    const playlist = playlists.find((p) => p.id === id);
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState("");

    useEffect(() => {
        if (playlist) {
            setEditedName(playlist.name);
        }
    }, [playlist]);

    if (!playlist) {
        return (
            <View className="flex-1 justify-center items-center bg-surface px-6">
                <FontAwesome name="question-circle" size={40} color="rgba(127, 25, 230, 0.4)" />
                <Text style={{ color: "rgba(255, 255, 255, 0.7)", marginTop: 12, fontSize: 16, fontWeight: "600" }}>
                    Playlist not found
                </Text>
                <Text style={{ color: "rgba(255, 255, 255, 0.4)", marginTop: 4, fontSize: 13, textAlign: "center" }}>
                    This playlist may have been deleted or the link is invalid.
                </Text>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={{
                        marginTop: 20,
                        paddingHorizontal: 20,
                        paddingVertical: 10,
                        borderRadius: 20,
                        backgroundColor: "rgba(127, 25, 230, 0.25)",
                        borderWidth: 1,
                        borderColor: "rgba(127, 25, 230, 0.4)",
                    }}
                >
                    <Text style={{ color: "#c084fc", fontWeight: "600", fontSize: 14 }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleRename = async () => {
        if (editedName.trim() && editedName !== playlist.name) {
            await renamePlaylist(playlist.id, editedName);
        }
        setIsEditing(false);
    };

    const handleDelete = () => {
        Alert.alert(
            "Delete Playlist",
            "Are you sure you want to delete this playlist?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        await deletePlaylist(playlist.id);
                        router.back();
                    },
                },
            ],
        );
    };

    const handleRemoveSong = (songId: string) => {
        removeSongFromPlaylist(playlist.id, songId);
    };

    return (
        <View className="flex-1 bg-surface pt-14">
            {/* Header */}
            <View className="px-5 mb-5">
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
                    <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
                        <FontAwesome name="arrow-left" size={18} color="#c084fc" />
                    </TouchableOpacity>

                    {isEditing ? (
                        <TextInput
                            value={editedName}
                            onChangeText={setEditedName}
                            style={{
                                flex: 1,
                                marginHorizontal: 16,
                                fontSize: 18,
                                fontWeight: "700",
                                borderBottomWidth: 1,
                                borderBottomColor: "rgba(127, 25, 230, 0.4)",
                                color: "#ffffff",
                            }}
                            autoFocus
                            onBlur={handleRename}
                            onSubmitEditing={handleRename}
                        />
                    ) : (
                        <Text
                            style={{
                                fontSize: 20,
                                fontWeight: "700",
                                flex: 1,
                                marginHorizontal: 16,
                                textAlign: "center",
                                color: "#c084fc",
                            }}
                            numberOfLines={1}
                        >
                            {playlist.name}
                        </Text>
                    )}

                    <View style={{ flexDirection: "row", gap: 16 }}>
                        <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
                            <FontAwesome
                                name="pencil"
                                size={18}
                                color={isEditing ? "#7f19e6" : "#c084fc"}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleDelete}>
                            <FontAwesome name="trash" size={18} color="#ff4444" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <FlatList
                data={playlist.songs}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 180 }}
                initialNumToRender={15}
                maxToRenderPerBatch={10}
                updateCellsBatchingPeriod={50}
                windowSize={5}
                removeClippedSubviews={true}
                ListEmptyComponent={
                    <View className="flex-1 justify-center items-center mt-20">
                        <FontAwesome
                            name="music"
                            size={40}
                            color="rgba(127, 25, 230, 0.2)"
                        />
                        <Text
                            style={{
                                color: "rgba(255, 255, 255, 0.4)",
                                marginTop: 12,
                                fontSize: 15,
                            }}
                        >
                            No songs in this playlist
                        </Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            paddingVertical: 12,
                            paddingHorizontal: 14,
                            marginBottom: 6,
                            borderRadius: 16,
                            backgroundColor: "rgba(255, 255, 255, 0.03)",
                        }}
                    >
                        <TouchableOpacity
                            style={{ flex: 1, flexDirection: "row", alignItems: "center" }}
                            onPress={() => play(item, playlist.songs)}
                        >
                            <View style={{ marginRight: 12 }}>
                                <SongImage 
                                    uri={item.uri} 
                                    id={item.id} 
                                    iconSize={18}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text
                                    style={{
                                        fontSize: 15,
                                        fontWeight: "600",
                                        color: "#ffffff",
                                    }}
                                    numberOfLines={1}
                                >
                                    {item.filename}
                                </Text>
                                <Text
                                    style={{
                                        fontSize: 12,
                                        color: "rgba(255, 255, 255, 0.4)",
                                        marginTop: 2,
                                    }}
                                >
                                    {Math.floor(item.duration / 60)}:
                                    {String(Math.floor(item.duration % 60)).padStart(2, "0")}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => handleRemoveSong(item.id)}
                            style={{ padding: 8 }}
                        >
                            <FontAwesome name="minus-circle" size={20} color="#ff4444" />
                        </TouchableOpacity>
                    </View>
                )}
            />
        </View>
    );
}
