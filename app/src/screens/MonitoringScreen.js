import { useCallback, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Dimensions, // <--- TAMBAHAN
} from "react-native";
import { LineChart } from "react-native-chart-kit"; // <--- TAMBAHAN
import { useFocusEffect } from "@react-navigation/native";
import { useMqttSensor } from "../hooks/useMqttSensor.js";
import { Api } from "../services/api.js";
import { DataTable } from "../components/DataTable.js";
import { SafeAreaView } from "react-native-safe-area-context";

export function MonitoringScreen() {
  // Ambil 'history' dari hook
  const { temperature, timestamp, connectionState, error: mqttError, history } = useMqttSensor();
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState(null);

  const fetchReadings = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const data = await Api.getSensorReadings();
      setReadings(data ?? []);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchReadings();
    }, [fetchReadings])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchReadings();
    } finally {
      setRefreshing(false);
    }
  }, [fetchReadings]);

  // --- KONFIGURASI CHART ---
  const screenWidth = Dimensions.get("window").width;
  const chartConfig = {
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`, // Warna biru sesuai tema
    strokeWidth: 2,
    decimalPlaces: 1,
  };

  // Data dummy agar chart tidak error saat history masih kosong
  const chartData = {
    labels: [], // Bisa dikosongkan jika tidak butuh label X yang ramai
    datasets: [
      {
        data: history.length > 0 ? history : [0], // Gunakan [0] jika kosong
        color: (opacity = 1) => `rgba(255, 122, 89, ${opacity})`, // Warna oranye untuk garis
      },
    ],
  };
  // -------------------------

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Realtime Temperature</Text>
          <View style={styles.valueRow}>
            <Text style={styles.temperatureText}>
              {typeof temperature === "number" ? `${temperature.toFixed(2)}°C` : "--"}
            </Text>
          </View>
          <Text style={styles.metaText}>MQTT status: {connectionState}</Text>
          {timestamp && (
            <Text style={styles.metaText}>
              Last update: {new Date(timestamp).toLocaleString()}
            </Text>
          )}
          {mqttError && <Text style={styles.errorText}>MQTT error: {mqttError}</Text>}
        </View>

        {/* --- BAGIAN CHART BARU --- */}
        <View style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Live Trend (Last 10 readings)</Text>
          <LineChart
            data={chartData}
            width={screenWidth - 40} // Sesuaikan lebar dengan padding layar
            height={220}
            chartConfig={chartConfig}
            bezier // Membuat garis menjadi melengkung halus
            style={styles.chart}
            withDots={true}
            withInnerLines={false}
            withOuterLines={false}
          />
        </View>
        {/* ------------------------- */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Triggered Readings History</Text>
          {loading && <ActivityIndicator />}
        </View>
        {apiError && <Text style={styles.errorText}>Failed to load history: {apiError}</Text>}
        <DataTable
          columns={[
            {
              key: "recorded_at",
              title: "Timestamp",
              render: (value) => (value ? new Date(value).toLocaleString() : "--"),
            },
            {
              key: "temperature",
              title: "Temperature (°C)",
              render: (value) =>
                typeof value === "number" ? `${Number(value).toFixed(2)}` : "--",
            },
            {
              key: "threshold_value",
              title: "Threshold (°C)",
              render: (value) =>
                typeof value === "number" ? `${Number(value).toFixed(2)}` : "--",
            },
          ]}
          data={readings}
          keyExtractor={(item) => item.id}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fb",
    padding: 16,
  },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  // Style baru untuk kartu chart
  chartCard: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: "center",
    elevation: 1,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  temperatureText: {
    fontSize: 48,
    fontWeight: "700",
    color: "#ff7a59",
  },
  metaText: {
    marginTop: 8,
    color: "#555",
  },
  errorText: {
    marginTop: 8,
    color: "#c82333",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8, // Tambahan sedikit jarak
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8, // Agar judul chart tidak terlalu mepet
  },
});