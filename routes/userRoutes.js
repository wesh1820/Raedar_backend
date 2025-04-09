import React, { useState } from "react";
import {
  View,
  TextInput,
  Button,
  Text,
  StyleSheet,
  Image,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export function SignUpScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        "https://raedar-backend.onrender.com/api/users",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, action: "register" }),
        }
      );

      const text = await response.text(); // Get raw response text
      console.log("API Response Text:", text); // Log the raw response text
      console.log("Response Status:", response.status); // Log status code

      // Check if the response is successful
      if (!response.ok) {
        console.error("Error: ", text); // Log detailed error message
        if (response.status === 500) {
          throw new Error(
            "Server-side error occurred. Please try again later."
          );
        } else {
          throw new Error(
            `Registration failed with status: ${response.status}`
          );
        }
      }

      // Check if the response is JSON and contains the token
      if (response.headers.get("content-type")?.includes("application/json")) {
        const data = JSON.parse(text); // Try parsing as JSON
        console.log("Parsed Response Data:", data);

        if (data.token) {
          // Successfully signed up, store the token
          await AsyncStorage.setItem("userToken", data.token);
          Alert.alert("Success", "Account created successfully!");
          navigation.navigate("Main"); // Navigate to the main screen after successful sign-up
        } else {
          throw new Error("Missing token in the response.");
        }
      } else {
        throw new Error("Received non-JSON response.");
      }
    } catch (error) {
      console.error("Error:", error); // Log the error for debugging
      Alert.alert("Registration failed", error.message); // Show user-friendly error message
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/RaedarLogo.png")}
        style={styles.image}
      />
      <Text style={styles.header}>Sign Up</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button
        title={loading ? "Please wait..." : "Sign Up"}
        onPress={handleSignUp}
        disabled={loading}
      />
      <Text
        style={styles.loginText}
        onPress={() => navigation.navigate("Login")} // Navigate to Login screen
      >
        Already have an account? Log in
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f0f0f0",
  },
  image: {
    width: 300,
    height: 66,
    marginBottom: 60,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    height: 50,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 5,
    paddingLeft: 10,
    marginBottom: 15,
  },
  loginText: {
    marginTop: 15,
    color: "#007BFF",
  },
});

export default SignUpScreen;
