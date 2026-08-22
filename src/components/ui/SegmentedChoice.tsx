import { View, Text, Pressable, StyleSheet } from "react-native";

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedChoiceProps<T extends string> {
  options: ChoiceOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  columns?: number;
}

/** Generic tap-to-select chip group for enum-valued fields. */
export function SegmentedChoice<T extends string>({
  options,
  value,
  onChange,
  columns = 2,
}: SegmentedChoiceProps<T>) {
  return (
    <View style={styles.wrap}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[
              styles.chip,
              { flexBasis: `${100 / columns - 2}%` },
              selected && styles.chipSelected,
            ]}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  chipSelected: { borderColor: "#1a7f37", backgroundColor: "#e8f5e9" },
  chipText: { fontSize: 14, color: "#333" },
  chipTextSelected: { color: "#1a7f37", fontWeight: "600" },
});
