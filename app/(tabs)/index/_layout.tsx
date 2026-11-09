// app/index/_layout.tsx

import { Stack } from 'expo-router';
import React from "react";

export default function HomeStack() {
    return (
        <Stack screenOptions={{ animation: "slide_from_right" }} initialRouteName="index">
            <Stack.Screen name="index" options={{ title: "Home", headerShown: false }} />
            <Stack.Screen name="current-queue" options={{ title: "Queue", headerShown: false }} />
        </Stack>
    );
}
