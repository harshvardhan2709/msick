import "../../utils/polyfills";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MiniPlayer } from "../../src/features/player";
import "../../global.css";

export default function MainLayout() {
  const insets = useSafeAreaInsets();
  const iconColor = "#c084fc";
  const inactiveColor = "#555555";

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />

      <Tabs
        screenOptions={{
          tabBarActiveTintColor: iconColor,
          tabBarInactiveTintColor: inactiveColor,

          tabBarStyle: {
            position: "absolute",
            backgroundColor: "transparent",
            borderTopWidth: 0,
            elevation: 0,
          },

          tabBarBackground: () => (
            <Animated.View
              entering={FadeInDown.springify()}
              style={{
                position: "absolute",
                bottom: -5 + insets.bottom,
                left: 10,
                right: 10,
              }}
            >
              <View
                style={{
                  height: 58,
                  borderRadius: 28,
                  paddingVertical: 12,
                  backgroundColor: "rgba(25, 4, 25, 0.85)",
                  borderWidth: 1,
                  borderColor: "rgba(127, 25, 230, 0.25)",
                }}
              />
            </Animated.View>
          ),

          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "700",
            letterSpacing: 0.5,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            headerShown: false,
            tabBarIcon: ({ color }) => (
              <FontAwesome name="home" size={20} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="library"
          options={{
            title: "My Library",
            headerShown: false,
            tabBarIcon: ({ color }) => (
              <FontAwesome name="music" size={20} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="features"
          options={{
            title: "Features",
            headerShown: false,
            tabBarIcon: ({ color }) => (
              <FontAwesome name="cog" size={20} color={color} />
            ),
          }}
        />
      </Tabs>

      <MiniPlayer />
    </GestureHandlerRootView>
  );
}
