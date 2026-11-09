import FontAwesome from "@expo/vector-icons/FontAwesome";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  getGroqApiKey,
  getGroqModel,
  GROQ_MODELS,
  removeGroqConfiguration,
  saveGroqConfiguration,
  testGroqConnection,
  type GroqModelId,
} from "../services/aiConfiguration";

export default function AISettingsScreen() {
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [selectedModel, setSelectedModel] = useState<GroqModelId>(GROQ_MODELS[0].id);
  const [hasSavedKey, setHasSavedKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([getGroqApiKey(), getGroqModel()])
      .then(([key, model]) => {
        if (!active) return;
        setHasSavedKey(!!key);
        setSelectedModel(model);
      })
      .catch(() => {
        if (active) {
          setMessage("Secure storage is unavailable on this device.");
          setMessageIsError(true);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const save = async () => {
    setBusy(true);
    setMessage("");
    try {
      await saveGroqConfiguration(apiKeyDraft, selectedModel);
      setApiKeyDraft("");
      setHasSavedKey(true);
      setMessage("Groq settings saved securely on this device.");
      setMessageIsError(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save Groq settings.");
      setMessageIsError(true);
    } finally {
      setBusy(false);
    }
  };

  const testConnection = async () => {
    setBusy(true);
    setMessage("");
    try {
      const key = apiKeyDraft.trim() || (await getGroqApiKey());
      if (!key) throw new Error("Enter an API key or save one first.");
      await testGroqConnection(key, selectedModel);
      setMessage("Connected to Groq. The selected model is available.");
      setMessageIsError(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Connection check failed.");
      setMessageIsError(true);
    } finally {
      setBusy(false);
    }
  };

  const clearKey = async () => {
    setBusy(true);
    setMessage("");
    try {
      await removeGroqConfiguration();
      setApiKeyDraft("");
      setSelectedModel(GROQ_MODELS[0].id);
      setHasSavedKey(false);
      setMessage("Saved Groq credentials removed from this device.");
      setMessageIsError(false);
    } catch {
      setMessage("Could not remove the saved Groq configuration.");
      setMessageIsError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a", paddingTop: 48, paddingHorizontal: 20 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(25, 4, 25, 0.85)", justifyContent: "center", alignItems: "center" }}
        >
          <FontAwesome name="arrow-left" size={16} color="#c084fc" />
        </TouchableOpacity>
        <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 20 }}>AI Settings</Text>
      </View>

      <View style={{ padding: 18, borderRadius: 18, backgroundColor: "rgba(25, 4, 25, 0.85)", borderWidth: 1, borderColor: "rgba(127, 25, 230, 0.25)" }}>
        <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 16, marginBottom: 6 }}>Groq API key</Text>
        <Text style={{ color: "rgba(255,255,255,0.58)", fontSize: 13, lineHeight: 19, marginBottom: 14 }}>
          The key is stored in this device&apos;s secure storage and sent only to Groq for AI requests. It is never included in app configuration.
        </Text>

        <TextInput
          accessibilityLabel="Groq API key"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setApiKeyDraft}
          placeholder={hasSavedKey ? "Key saved — enter a new key to replace it" : "Paste your Groq API key"}
          placeholderTextColor="rgba(255,255,255,0.35)"
          secureTextEntry
          value={apiKeyDraft}
          style={{ color: "#ffffff", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 10 }}
        />
        <Text style={{ color: hasSavedKey ? "#86efac" : "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 18 }}>
          {loading ? "Checking secure storage…" : hasSavedKey ? "A key is saved on this device." : "No key saved. AI classification can still use local filename matching."}
        </Text>

        <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 15, marginBottom: 10 }}>Groq model</Text>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 18 }}>
          {GROQ_MODELS.map((model) => {
            const selected = selectedModel === model.id;
            return (
              <TouchableOpacity
                key={model.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setSelectedModel(model.id)}
                style={{ flex: 1, padding: 11, borderRadius: 12, borderWidth: 1, borderColor: selected ? "#c084fc" : "rgba(255,255,255,0.14)", backgroundColor: selected ? "rgba(127,25,230,0.2)" : "transparent" }}
              >
                <Text style={{ color: selected ? "#e9d5ff" : "#ffffff", fontWeight: "600", textAlign: "center" }}>{model.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <ActionButton label="Save securely" onPress={save} disabled={busy || (!apiKeyDraft.trim() && !hasSavedKey)} />
          <ActionButton label="Test connection" onPress={testConnection} disabled={busy || loading} secondary />
        </View>
        {hasSavedKey && (
          <TouchableOpacity disabled={busy} onPress={clearKey} style={{ paddingVertical: 13, alignItems: "center" }}>
            <Text style={{ color: "#fca5a5", fontWeight: "600" }}>Remove saved key</Text>
          </TouchableOpacity>
        )}
        {busy && <ActivityIndicator color="#c084fc" style={{ marginTop: 12 }} />}
        {!!message && <Text accessibilityRole="alert" style={{ color: messageIsError ? "#fca5a5" : "#86efac", fontSize: 13, lineHeight: 19, marginTop: 12 }}>{message}</Text>}
      </View>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  disabled,
  secondary = false,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
  secondary?: boolean;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={{ flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center", backgroundColor: secondary ? "rgba(255,255,255,0.07)" : "rgba(127,25,230,0.35)", opacity: disabled ? 0.5 : 1 }}
    >
      <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 13 }}>{label}</Text>
    </TouchableOpacity>
  );
}
