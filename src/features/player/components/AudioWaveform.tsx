import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";

interface AudioWaveformProps {
  isPlaying: boolean;
  barCount?: number;
  height?: number;
  color?: string;
}

const AudioBar = React.memo(({
  isPlaying,
  maxHeight,
  index,
  color,
}: {
  isPlaying: boolean;
  maxHeight: number;
  index: number;
  color: string;
}) => {
  const animatedHeight = useSharedValue(6);

  useEffect(() => {
    if (isPlaying) {
      // Harmonic baseline factors per frequency bin
      const baseFactors = [0.4, 0.7, 1.0, 0.85, 0.5, 0.9, 0.65, 0.35];
      const targetFactor = baseFactors[index % baseFactors.length];
      const duration = 280 + (index % 4) * 80;

      animatedHeight.value = withRepeat(
        withSequence(
          withTiming(Math.max(6, maxHeight * targetFactor), {
            duration,
            easing: Easing.inOut(Easing.quad),
          }),
          withTiming(Math.max(4, maxHeight * (targetFactor * 0.3)), {
            duration: duration * 0.85,
            easing: Easing.inOut(Easing.quad),
          }),
        ),
        -1,
        true,
      );
    } else {
      animatedHeight.value = withTiming(4, { duration: 250 });
    }
  }, [isPlaying, maxHeight, index, animatedHeight]);

  const style = useAnimatedStyle(() => ({
    height: animatedHeight.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: 3.5,
          marginHorizontal: 2,
          borderRadius: 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
});

AudioBar.displayName = "AudioBar";

export const AudioWaveform = React.memo(({
  isPlaying,
  barCount = 16,
  height = 36,
  color = "#c084fc",
}: AudioWaveformProps) => {
  const bars = Array.from({ length: barCount }, (_, i) => i);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        height,
        paddingHorizontal: 8,
      }}
    >
      {bars.map((idx) => (
        <AudioBar
          key={idx}
          index={idx}
          isPlaying={isPlaying}
          maxHeight={height}
          color={color}
        />
      ))}
    </View>
  );
});

AudioWaveform.displayName = "AudioWaveform";

export default AudioWaveform;

