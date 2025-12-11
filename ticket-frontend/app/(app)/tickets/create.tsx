// app/(app)/tickets/create.tsx
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Button,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { API_BASE_URL } from "../../../src/config/api";
import { useAuth } from "../../../src/context/AuthContext";
import { useTickets } from "../../../src/context/TicketContext";

type ApiUser = {
  id: string;
  email: string;
  role: "admin" | "user";
};

function formatDate(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`; // YYYY-MM-DD in local time
}

function formatTime(d: Date) {
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`; // HH:MM in local time
}

export default function CreateTicketScreen() {
  const { user, accessToken } = useAuth();
  const { createTicket } = useTickets();

  const isAdmin = user?.role === "admin";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState<Date>(new Date());

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const [availableUsers, setAvailableUsers] = useState<ApiUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!accessToken || !isAdmin) return;

      try {
        setLoadingUsers(true);
        const res = await fetch(`${API_BASE_URL}/users`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!res.ok) {
          const txt = await res.text();
          console.error("Failed to load users", res.status, txt);
          throw new Error("Failed to load users");
        }

        const data = (await res.json()) as ApiUser[];
        const onlyUsers = data.filter((u) => u.role === "user");
        setAvailableUsers(onlyUsers);
      } catch (err) {
        console.error(err);
        alert("Could not load users to assign");
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [accessToken, isAdmin]);

  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <Text>You are not allowed to create tickets.</Text>
      </View>
    );
  }

  const toggleUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const onChangeDate = (event: DateTimePickerEvent, selected?: Date) => {
    setShowDatePicker(false);
    if (event.type !== "set" || !selected) return;

    setDeadline((prev) => {
      const d = new Date(prev);
      d.setFullYear(
        selected.getFullYear(),
        selected.getMonth(),
        selected.getDate()
      );
      return d;
    });
  };

  const onChangeTime = (event: DateTimePickerEvent, selected?: Date) => {
    setShowTimePicker(false);
    if (event.type !== "set" || !selected) return;

    setDeadline((prev) => {
      const d = new Date(prev);
      d.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      return d;
    });
  };

  const handleSubmit = async () => {
    if (!title || !description || selectedUserIds.length === 0) {
      alert("Please fill all fields and assign at least one user.");
      return;
    }

    if (isNaN(deadline.getTime())) {
      alert("Invalid deadline date/time");
      return;
    }

    try {
      setSubmitting(true);
      await createTicket({
        title,
        description,
        deadline: deadline.toISOString(),
        assignedUserIds: selectedUserIds,
      });
      router.replace("/(app)/dashboard");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create Ticket</Text>

      <TextInput
        style={styles.input}
        placeholder="Title"
        value={title}
        onChangeText={setTitle}
      />

      <TextInput
        style={[styles.input, { height: 100 }]}
        placeholder="Description"
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <Text style={styles.label}>Deadline</Text>

      {/* Display selected deadline */}
      <Text style={{ marginBottom: 8 }}>
        {formatDate(deadline)} {formatTime(deadline)}
      </Text>

      {/* Native pickers for Android/iOS */}
      {Platform.OS !== "web" && (
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
          <Button title="Pick Date" onPress={() => setShowDatePicker(true)} />
          <Button title="Pick Time" onPress={() => setShowTimePicker(true)} />
        </View>
      )}

      {/* Web fallback: allow manual quick edit if running on web */}
      {Platform.OS === "web" && (
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={formatDate(deadline)}
            onChangeText={(text) => {
              // simple parse; if invalid, ignore
              if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
                const [y, m, d] = text.split("-").map(Number);
                setDeadline((prev) => {
                  const copy = new Date(prev);
                  copy.setFullYear(y, (m ?? 1) - 1, d ?? 1);
                  return copy;
                });
              }
            }}
            placeholder="YYYY-MM-DD"
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={formatTime(deadline)}
            onChangeText={(text) => {
              if (/^\d{2}:\d{2}$/.test(text)) {
                const [hh, mm] = text.split(":").map(Number);
                setDeadline((prev) => {
                  const copy = new Date(prev);
                  copy.setHours(hh ?? 0, mm ?? 0, 0, 0);
                  return copy;
                });
              }
            }}
            placeholder="HH:MM"
          />
        </View>
      )}

      {showDatePicker && Platform.OS !== "web" && (
        <DateTimePicker
          value={deadline}
          mode="date"
          display="default"
          onChange={onChangeDate}
        />
      )}

      {showTimePicker && Platform.OS !== "web" && (
        <DateTimePicker
          value={deadline}
          mode="time"
          display="default"
          onChange={onChangeTime}
        />
      )}

      <Text style={styles.label}>Assign to Users</Text>

      {loadingUsers ? (
        <ActivityIndicator />
      ) : availableUsers.length === 0 ? (
        <Text style={{ fontSize: 12, color: "#666" }}>
          No users available. Make sure you created some in the backend.
        </Text>
      ) : (
        availableUsers.map((u) => {
          const selected = selectedUserIds.includes(u.id);
          return (
            <TouchableOpacity
              key={u.id}
              onPress={() => toggleUser(u.id)}
              style={[
                styles.userChip,
                selected && { backgroundColor: "#007bff" },
              ]}
            >
              <Text style={{ color: selected ? "white" : "#333" }}>
                {u.email} ({u.role})
              </Text>
            </TouchableOpacity>
          );
        })
      )}

      <View style={{ marginTop: 24 }}>
        <Button
          title={submitting ? "Creating..." : "Create Ticket"}
          onPress={handleSubmit}
          disabled={submitting}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { padding: 16 },
  title: { fontSize: 22, fontWeight: "600", marginBottom: 16 },
  label: { marginTop: 12, marginBottom: 4, fontWeight: "500" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  userChip: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    marginBottom: 6,
  },
});
