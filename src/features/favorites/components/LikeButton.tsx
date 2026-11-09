// components/LikeButton.tsx

import FontAwesome from "@expo/vector-icons/FontAwesome";
import React from "react";
import { TouchableOpacity } from "react-native";
import { useFavorites } from "../hooks/useFavorites";

type Props = {
    songId: string;
    song: any;
};

const LikeButton = React.memo(({ songId, song }: Props) => {
    const { isLiked, toggleLike } = useFavorites();
    const liked = isLiked(songId);

    const onPress = () => {
        console.log(
            "[LikeButton] pressed for",
            songId,
            song.filename,
            "liked?",
            liked,
        );
        toggleLike(song);
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                justifyContent: "center",
                alignItems: "center",
            }}
        >
            <FontAwesome
                name={liked ? "heart" : "heart-o"}
                size={18}
                color={liked ? "#ff4444" : "rgba(255, 255, 255, 0.25)"}
            />
        </TouchableOpacity>
    );
});

LikeButton.displayName = 'LikeButton';

export default LikeButton;
