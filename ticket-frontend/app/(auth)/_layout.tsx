import { useAuth } from "@/src/context/AuthContext";
import { Redirect, Stack } from "expo-router";

export default function AuthLayout() {
  const { isAuthenticated, loading } = useAuth();

  if (isAuthenticated) {
    return <Redirect href="/(app)/dashboard" />;
  }

  return (
    <Stack>
      <Stack.Screen
        name="login"
        options={{ title: "login", headerShown: false }}
      />
    </Stack>
  );
}
