// app/library/_layout.tsx

import { Stack } from "expo-router";
import React from "react";

export default function LibraryStack() {
    return (
        <Stack
            screenOptions={{
                animation: "slide_from_right",
            }}
            initialRouteName="index"
        >
            <Stack.Screen
                name="index"
                options={{ title: "My Library", headerShown: false }}
            />
            <Stack.Screen name="liked-songs" options={{ title: "Favorites", headerShown: false }} />
            <Stack.Screen name="[id]" options={{ headerShown: false }} />
        </Stack>
    );
}
