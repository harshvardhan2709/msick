import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { usePlaylists } from "../context/PlaylistsContext";

export default function LibraryScreen() {
  const { playlists, createPlaylist } = usePlaylists();
  const router = useRouter();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");

  const handleCreate = async () => {
    if (!newPlaylistName.trim()) return;
    await createPlaylist(newPlaylistName);
    setNewPlaylistName("");
    setIsModalVisible(false);
  };

  return (
    <View className="flex-1 bg-surface pt-12">
      {/* Header */}
      <View className="px-5 mb-4">
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
            My Library
          </Text>
        </View>
      </View>

      {/* New Playlist Button */}
      <View className="px-5 mb-4">
        <TouchableOpacity
          onPress={() => setIsModalVisible(true)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingVertical: 14,
            borderRadius: 24,
            backgroundColor: "rgba(127, 25, 230, 0.2)",
            borderWidth: 1,
            borderColor: "rgba(127, 25, 230, 0.4)",
          }}
        >
          <FontAwesome name="plus" size={16} color="#c084fc" />
          <Text
            style={{ color: "#c084fc", fontWeight: "600", fontSize: 15 }}
          >
            New Playlist
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={playlists}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{
          justifyContent: "space-between",
          gap: 10,
          paddingHorizontal: 20,
        }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 180 }}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 16,
                padding: 16,
                borderRadius: 20,
                backgroundColor: "rgba(239, 68, 68, 0.08)",
                borderWidth: 1,
                borderColor: "rgba(239, 68, 68, 0.2)",
              }}
              onPress={() => router.push("/library/liked-songs")}
            >
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: "rgba(239, 68, 68, 0.15)",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <FontAwesome name="heart" size={24} color="#ff4444" />
              </View>
              <View>
                <Text
                  style={{
                    fontWeight: "700",
                    fontSize: 18,
                    color: "#ffffff",
                  }}
                >
                  Favorites
                </Text>
                <Text style={{ color: "rgba(255, 255, 255, 0.4)", fontSize: 13 }}>
                  Your liked songs
                </Text>
              </View>
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <FontAwesome
                  name="chevron-right"
                  size={14}
                  color="rgba(255, 255, 255, 0.3)"
                />
              </View>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <View className="w-full flex-1 justify-center items-center mt-20">
            <FontAwesome
              name="folder-open"
              size={40}
              color="rgba(127, 25, 230, 0.3)"
            />
            <Text
              style={{
                color: "rgba(255, 255, 255, 0.4)",
                fontSize: 16,
                marginTop: 12,
              }}
            >
              No playlists yet
            </Text>
            <Text
              style={{
                color: "rgba(255, 255, 255, 0.25)",
                fontSize: 13,
                marginTop: 4,
              }}
            >
              Create one to start your collection
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{
              width: "48%",
              aspectRatio: 1,
              borderRadius: 20,
              padding: 16,
              justifyContent: "space-between",
              marginBottom: 12,
              backgroundColor: "rgba(25, 4, 25, 0.85)",
              borderWidth: 1,
              borderColor: "rgba(127, 25, 230, 0.25)",
            }}
            onPress={() => router.push(`/library/${item.id}` as any)}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: "rgba(127, 25, 230, 0.2)",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <FontAwesome name="music" size={22} color="#c084fc" />
            </View>
            <View>
              <Text
                style={{
                  fontWeight: "700",
                  fontSize: 16,
                  color: "#ffffff",
                }}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <Text
                style={{
                  color: "rgba(255, 255, 255, 0.4)",
                  fontSize: 12,
                  marginTop: 2,
                }}
              >
                {item.songs.length} songs
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Create Playlist Modal */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "android" ? "padding" : "height"}
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 40,
          }}
        >
          <View
            style={{
              width: "100%",
              borderRadius: 24,
              padding: 24,
              backgroundColor: "#141414",
              borderWidth: 1,
              borderColor: "rgba(127, 25, 230, 0.3)",
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                marginBottom: 20,
                color: "#ffffff",
              }}
            >
              New Playlist
            </Text>
            <TextInput
              placeholder="Playlist Name"
              placeholderTextColor="rgba(255, 255, 255, 0.3)"
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              autoFocus
              style={{
                borderBottomWidth: 1,
                borderBottomColor: "rgba(127, 25, 230, 0.4)",
                padding: 8,
                fontSize: 16,
                marginBottom: 20,
                color: "#ffffff",
              }}
            />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                gap: 20,
              }}
            >
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Text
                  style={{
                    color: "rgba(255, 255, 255, 0.5)",
                    fontWeight: "600",
                    fontSize: 16,
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreate}>
                <Text
                  style={{
                    color: "#c084fc",
                    fontWeight: "700",
                    fontSize: 16,
                  }}
                >
                  Create
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
