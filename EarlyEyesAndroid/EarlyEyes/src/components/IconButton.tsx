import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type IconButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
};

export default function IconButton({
  label,
  onPress,
  variant = 'primary',
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' ? styles.primary : styles.secondary,
        pressed && styles.pressed,
      ]}
    >
      <View>
        <Text
          style={
            variant === 'primary' ? styles.primaryText : styles.secondaryText
          }
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: '#E53935',
  },
  secondary: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#DADADA',
  },
  pressed: {
    opacity: 0.85,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryText: {
    color: '#1E1E1E',
    fontSize: 16,
    fontWeight: '600',
  },
});
