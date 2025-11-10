import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import mqtt from "mqtt";
import { Buffer } from "buffer";
import { MQTT_BROKER_URL, MQTT_TOPIC } from "../services/config.js";

// Polyfill untuk Buffer jika belum ada di environment global (diperlukan oleh MQTT.js di React Native)
if (typeof global.Buffer === "undefined") {
  global.Buffer = Buffer;
}

const clientOptions = {
  reconnectPeriod: 5000,
  connectTimeout: 30_000,
  protocolVersion: 4,
};

export function useMqttSensor() {
  const [state, setState] = useState({
    temperature: null,
    timestamp: null,
    connectionState: "disconnected",
    error: null,
    history: [],
  });

  const clientRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    if (!MQTT_BROKER_URL || !MQTT_TOPIC) {
      setState((prev) => ({
        ...prev,
        error: "MQTT configuration missing. Update app.json",
      }));
      return;
    }

    // Buat client ID unik agar tidak bentrok dengan koneksi lain
    const clientId = `rn-monitor-${Math.random().toString(16).slice(2)}`;
    
    const client = mqtt.connect(MQTT_BROKER_URL, {
      ...clientOptions,
      clientId,
      clean: true,
    });
    clientRef.current = client;

    // Handle aplikasi saat berpindah ke background/foreground
    const handleAppStateChange = (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        // Paksa reconnect saat aplikasi kembali aktif
        if (client.connected === false) {
            client.reconnect();
        }
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);

    // Event Handlers MQTT
    client.on("connect", () => {
      setState((prev) => ({ ...prev, connectionState: "connected", error: null }));
      client.subscribe(MQTT_TOPIC, { qos: 0 }, (err) => {
        if (err) {
          console.error("Subscribe error:", err);
          setState((prev) => ({ ...prev, error: err.message }));
        }
      });
    });

    client.on("reconnect", () => {
      setState((prev) => ({ ...prev, connectionState: "reconnecting" }));
    });

    client.on("close", () => {
        setState((prev) => ({ ...prev, connectionState: "disconnected" }));
    });

    client.on("error", (error) => {
      console.error("MQTT Error:", error);
      setState((prev) => ({ ...prev, error: error.message, connectionState: "error" }));
    });

    client.on("message", (_topic, message) => {
      try {
        const payload = JSON.parse(message.toString());
        const newTimestamp = new Date().toISOString();

        setState((prev) => {
          // Ambil history lama, tambahkan data baru, lalu potong agar maksimal 10 item terakhir
          // slice(-10) akan mengambil 10 elemen terakhir dari array
          const newHistory = [...prev.history, payload.temperature].slice(-10);

          return {
            ...prev,
            temperature: payload.temperature ?? null,
            timestamp: payload.timestamp ?? newTimestamp,
            history: newHistory,
            error: null,
          };
        });
      } catch (error) {
        console.error("Failed to parse MQTT message:", error);
        setState((prev) => ({ ...prev, error: "Invalid data format received" }));
      }
    });

    // Cleanup saat unmount
    return () => {
      subscription.remove();
      if (client) {
        client.end(true); // true = force close
      }
    };
  }, []);

  return state;
}