import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { languages, LanguageOption } from '../constants/languages';

type LanguagePickerProps = {
  onSelect?: (language: LanguageOption) => void;
};

export default function LanguagePicker({ onSelect }: LanguagePickerProps) {
  return (
    <FlatList
      data={languages}
      keyExtractor={(item) => item.code}
      numColumns={2}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.container}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => onSelect?.(item)}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        >
          <Text style={styles.nativeLabel}>{item.nativeLabel}</Text>
          <Text style={styles.label}>{item.label}</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  row: {
    gap: 12,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  pressed: {
    opacity: 0.8,
  },
  nativeLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E1E1E',
  },
  label: {
    marginTop: 4,
    fontSize: 12,
    color: '#757575',
  },
});
