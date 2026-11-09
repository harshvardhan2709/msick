import { Stack } from 'expo-router';

export default function FeaturesLayout() {
    return (
        <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} initialRouteName="index">
            <Stack.Screen name="index" options={{ title: 'Features', headerShown: false }} />
            <Stack.Screen name="share-music" options={{ title: 'Share', headerShown: false }} />
            <Stack.Screen name="genre-classification" options={{ title: 'Genre', headerShown: false }} />
            <Stack.Screen name="ai-filter" options={{ title: 'Smart Filter', headerShown: false }} />
            <Stack.Screen name="ai-settings" options={{ title: 'AI Settings', headerShown: false }} />
        </Stack>
    );
}
