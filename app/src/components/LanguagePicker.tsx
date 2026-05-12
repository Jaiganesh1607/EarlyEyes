import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { languages, LanguageOption } from '../constants/languages';

type LanguagePickerProps = {
  onSelect?: (language: LanguageOption) => void;
  selectedCode?: string;
};

export default function LanguagePicker({
  onSelect,
  selectedCode,
}: LanguagePickerProps) {
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
          style={({ pressed }) => [
            styles.card,
            item.code === selectedCode && styles.cardSelected,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.iconWrap}>
            <View
              style={[
                styles.bubble,
                item.code === selectedCode && styles.bubbleSelected,
              ]}
            >
              <View
                style={[
                  styles.bubbleTail,
                  item.code === selectedCode && styles.bubbleTailSelected,
                ]}
              />
            </View>
            {item.code === selectedCode ? (
              <View style={styles.selectedDot} />
            ) : null}
          </View>
          <Text
            style={[
              styles.nativeLabel,
              item.code === selectedCode && styles.nativeLabelSelected,
            ]}
          >
            {item.nativeLabel}
          </Text>
          <Text
            style={[
              styles.label,
              item.code === selectedCode && styles.labelSelected,
            ]}
          >
            {item.label}
          </Text>
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
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    gap: 6,
  },
  cardSelected: {
    backgroundColor: '#1D74C9',
    borderColor: '#1D74C9',
  },
  pressed: {
    opacity: 0.8,
  },
  iconWrap: {
    width: 40,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    width: 24,
    height: 18,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#1D74C9',
    backgroundColor: 'transparent',
  },
  bubbleSelected: {
    borderColor: '#FFFFFF',
  },
  bubbleTail: {
    position: 'absolute',
    bottom: -4,
    left: 5,
    width: 8,
    height: 8,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#1D74C9',
    backgroundColor: 'transparent',
    transform: [{ rotate: '45deg' }],
  },
  bubbleTailSelected: {
    borderColor: '#FFFFFF',
  },
  selectedDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  nativeLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E1E1E',
  },
  nativeLabelSelected: {
    color: '#FFFFFF',
  },
  label: {
    marginTop: 4,
    fontSize: 12,
    color: '#757575',
  },
  labelSelected: {
    color: '#E6EEF8',
  },
});
