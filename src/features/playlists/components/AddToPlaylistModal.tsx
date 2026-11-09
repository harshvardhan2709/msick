import FontAwesome from "@expo/vector-icons/FontAwesome";
import React from "react";
import {
    FlatList,
    Modal,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import type { Song } from "../../../shared/types/song";
import { usePlaylists } from "../context/PlaylistsContext";

type AddToPlaylistModalProps = {
    visible: boolean;
    onClose: () => void;
    song: Song | null;
};

export default function AddToPlaylistModal({
    visible,
    onClose,
    song,
}: AddToPlaylistModalProps) {
    const { playlists, addSongToPlaylist } = usePlaylists();

    const handleSelectPlaylist = async (playlistId: string) => {
        if (song) {
            await addSongToPlaylist(playlistId, song);
            onClose();
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={{ flex: 1, justifyContent: "flex-end" }}>
                    <TouchableWithoutFeedback>
                        <View
                            style={{
                                backgroundColor: "#0a0a0a",
                                borderTopLeftRadius: 28,
                                borderTopRightRadius: 28,
                                borderWidth: 1,
                                borderColor: "rgba(127, 25, 230, 0.25)",
                                borderBottomWidth: 0,
                                padding: 20,
                                height: "50%",
                            }}
                        >
                            <View
                                style={{
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: 16,
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 20,
                                        fontWeight: "700",
                                        color: "#c084fc",
                                    }}
                                >
                                    Add to Playlist
                                </Text>
                                <TouchableOpacity onPress={onClose}>
                                    <FontAwesome
                                        name="times"
                                        size={22}
                                        color="rgba(255, 255, 255, 0.4)"
                                    />
                                </TouchableOpacity>
                            </View>

                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ color: "rgba(255, 255, 255, 0.4)" }}>
                                    Adding:{" "}
                                    <Text
                                        style={{ fontWeight: "600", color: "#ffffff" }}
                                    >
                                        {song?.filename}
                                    </Text>
                                </Text>
                            </View>

                            <FlatList
                                data={playlists}
                                keyExtractor={(item) => item.id}
                                ListEmptyComponent={
                                    <View style={{ alignItems: "center", paddingVertical: 40 }}>
                                        <Text style={{ color: "rgba(255, 255, 255, 0.4)" }}>
                                            No playlists found.
                                        </Text>
                                    </View>
                                }
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={{
                                            flexDirection: "row",
                                            alignItems: "center",
                                            paddingVertical: 14,
                                            borderBottomWidth: 1,
                                            borderBottomColor: "rgba(255, 255, 255, 0.05)",
                                        }}
                                        onPress={() => handleSelectPlaylist(item.id)}
                                    >
                                        <View
                                            style={{
                                                width: 44,
                                                height: 44,
                                                borderRadius: 10,
                                                backgroundColor: "rgba(127, 25, 230, 0.15)",
                                                justifyContent: "center",
                                                alignItems: "center",
                                                marginRight: 14,
                                            }}
                                        >
                                            <FontAwesome name="music" size={18} color="#c084fc" />
                                        </View>
                                        <View>
                                            <Text
                                                style={{
                                                    fontWeight: "600",
                                                    fontSize: 16,
                                                    color: "#ffffff",
                                                }}
                                            >
                                                {item.name}
                                            </Text>
                                            <Text
                                                style={{
                                                    color: "rgba(255, 255, 255, 0.4)",
                                                    fontSize: 13,
                                                    marginTop: 2,
                                                }}
                                            >
                                                {item.songs.length} songs
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}
