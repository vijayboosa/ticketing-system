import { Link, router } from "expo-router";
import { ActivityIndicator, Button, FlatList, Text, View } from "react-native";
import { useAuth } from "../../src/context/AuthContext";
import { useTickets } from "../../src/context/TicketContext";

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const { tickets, myTickets, updateStatus, loading } = useTickets();

  const isAdmin = user?.role === "admin";
  const data = isAdmin ? tickets : myTickets;

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <Text style={{ fontSize: 18 }}>
          Hello, {user?.email} ({user?.role})
        </Text>
        <Button title="Logout" onPress={logout} />
      </View>

      <View style={{ marginBottom: 16 }}>
        <Link href="/(app)/calendar">
          <Text style={{ color: "blue" }}>Go to Calendar</Text>
        </Link>
      </View>

      {isAdmin && (
        <View style={{ marginBottom: 16 }}>
          <Button
            title="Create New Ticket"
            onPress={() => router.push("/(app)/tickets/create")}
          />
        </View>
      )}

      <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}>
        {isAdmin ? "All Tickets" : "My Tickets"}
      </Text>

      {loading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View
              style={{
                padding: 12,
                borderWidth: 1,
                borderColor: "#ddd",
                borderRadius: 8,
                marginBottom: 8,
              }}
            >
              <Link
                href={{
                  pathname: "/(app)/tickets/[id]",
                  params: { id: item.id },
                }}
              >
                <Text style={{ fontWeight: "600", fontSize: 16 }}>
                  {item.title}
                </Text>
              </Link>

              <Text>Status: {item.status}</Text>
              <Text>Deadline: {new Date(item.deadline).toLocaleString()}</Text>

              {!isAdmin && item.status !== "COMPLETED" && (
                <View style={{ flexDirection: "row", marginTop: 8, gap: 8 }}>
                  <Button
                    title="In Progress"
                    onPress={() => updateStatus(item.id, "IN_PROGRESS")}
                  />
                  <Button
                    title="Completed"
                    onPress={() => updateStatus(item.id, "COMPLETED")}
                  />
                </View>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}
