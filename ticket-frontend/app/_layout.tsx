import { Stack } from "expo-router";
import { AuthProvider } from "../src/context/AuthContext";
import { TicketProvider } from "../src/context/TicketContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <TicketProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
          <Stack.Screen name="test" />
        </Stack>
      </TicketProvider>
    </AuthProvider>
  );
}
