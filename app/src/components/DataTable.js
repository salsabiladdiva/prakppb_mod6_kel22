import { View, Text, StyleSheet } from "react-native";

export function DataTable({ columns, data, keyExtractor }) {
  if (!columns?.length) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        {columns.map((column) => (
          <Text key={column.key} style={[styles.cell, styles.headerCell]}>
            {column.title}
          </Text>
        ))}
      </View>
      {data?.length ? (
        data.map((item, index) => (
          <View key={keyExtractor ? keyExtractor(item, index) : index} style={styles.dataRow}>
            {columns.map((column) => (
              <Text key={column.key} style={styles.cell}>
                {column.render ? column.render(item[column.key], item) : item[column.key]}
              </Text>
            ))}
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>No data available.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: "#d0d0d0",
    borderRadius: 8,
    overflow: "hidden",
    marginVertical: 12,
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#f4f4f4",
  },
  dataRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  cell: {
    flex: 1,
    padding: 12,
    fontSize: 14,
  },
  headerCell: {
    fontWeight: "600",
    textTransform: "uppercase",
    fontSize: 13,
  },
  emptyText: {
    padding: 16,
    textAlign: "center",
    color: "#9b9b9b",
  },
});
