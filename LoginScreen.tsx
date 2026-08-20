import { useState } from "react";
import {
  View, Text, TextInput, Pressable,
  StyleSheet, Alert, KeyboardAvoidingView, Platform
} from "react-native";

const USERS: Record<string, { password: string; displayName: string; inspectorID: string }> = {
  "parsons": { password: "1234", displayName: "Parsons Archer", inspectorID: "INS001" },
  "ahmed":   { password: "1234", displayName: "Saalaar Ahmed",    inspectorID: "INS000" },
};

type Props = {
  onLogin: (inspector: { name: string; id: string }) => void;
};

export default function LoginScreen({ onLogin }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  function handleLogin() {
    const user = USERS[username.toLowerCase().trim()];
    if (user && user.password === password) {
      onLogin({ name: user.displayName, id: user.inspectorID });
    } else {
      Alert.alert("Login Failed", "Invalid username or password.");
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Text style={styles.title}>Car Temp Logger</Text>
      <Text style={styles.subtitle}>Inspector Login</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#999"
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#999"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <Pressable style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Login</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff", padding: 32, gap: 8 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 4 },
  subtitle: { fontSize: 16, color: "#666", marginBottom: 24 },
  form: { width: "100%", gap: 12 },
  input: {
    borderWidth: 1.5, borderColor: "#ddd", borderRadius: 10,
    padding: 14, fontSize: 16, color: "#000",
  },
  button: { backgroundColor: "#007AFF", borderRadius: 10, padding: 16, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "700" },
});