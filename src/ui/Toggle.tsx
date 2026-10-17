import React, { useEffect, useRef } from "react";
import { Animated, Pressable } from "react-native";
import { C, isNight } from "./theme";
import { hTick } from "./haptics";

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  const a = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => { Animated.spring(a, { toValue: value ? 1 : 0, useNativeDriver: false, bounciness: 8 }).start(); }, [value, a]);
  return (
    <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: value }} hitSlop={8}
      onPress={() => { hTick(); onChange(!value); }}>
      <Animated.View style={{ width: 54, height: 32, borderRadius: 16, padding: 3, backgroundColor: a.interpolate({ inputRange: [0, 1], outputRange: [isNight() ? "#3A3070" : "#E7D5B6", isNight() ? "#3FC274" : C.green] }) }}>
        <Animated.View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: isNight() ? "#FFF1D6" : "#fff", transform: [{ translateX: a.interpolate({ inputRange: [0, 1], outputRange: [0, 22] }) }] }} />
      </Animated.View>
    </Pressable>
  );
}
