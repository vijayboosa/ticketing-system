// app/(app)/tickets/[id].tsx
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
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
import { TicketStatus, useTickets } from "../../../src/context/TicketContext";

type ApiUser = {
  id: string;
  email: string;
  role: "admin" | "user";
};

function formatDate(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTime(d: Date) {
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tickets, updateTicket, updateStatus, reload } = useTickets();
  const { user, accessToken } = useAuth();

  const isAdmin = user?.role === "admin";
  const ticket = tickets.find((t) => t.id === id);

  const [title, setTitle] = useState(ticket?.title ?? "");
  const [description, setDescription] = useState(ticket?.description ?? "");
  const [deadline, setDeadline] = useState<Date>(
    ticket ? new Date(ticket.deadline) : new Date()
  );
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>(
    ticket?.assigneeIds ?? []
  );

  const [availableUsers, setAvailableUsers] = useState<ApiUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Sync local state when ticket changes (for example after reload)
  useEffect(() => {
    if (ticket) {
      setTitle(ticket.title);
      setDescription(ticket.description ?? "");
      setDeadline(new Date(ticket.deadline));
      setAssignedUserIds(ticket.assigneeIds ?? []);
    }
  }, [ticket]);

  // Load users for admin
  useEffect(() => {
    const fetchUsers = async () => {
      if (!isAdmin || !accessToken) return;

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

  if (!ticket) {
    return (
      <View style={styles.center}>
        <Text>Ticket not found.</Text>
        <Button title="Back" onPress={() => router.back()} />
      </View>
    );
  }

  const toggleUser = (id: string) => {
    setAssignedUserIds((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
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

  const handleSave = async () => {
    if (!isAdmin) return;

    if (!title || !description || assignedUserIds.length === 0) {
      alert("Please fill all fields and assign at least one user.");
      return;
    }

    if (isNaN(deadline.getTime())) {
      alert("Invalid deadline");
      return;
    }

    try {
      setSaving(true);
      await updateTicket(ticket.id, {
        title,
        description,
        deadline: deadline.toISOString(),
        assignedUserIds,
      });
      await reload();
      alert("Ticket updated");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (status: TicketStatus) => {
    await updateStatus(ticket.id, status);
    await reload();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Ticket Details</Text>

      <Text style={styles.label}>ID</Text>
      <Text style={{ marginBottom: 8 }}>{ticket.id}</Text>

      <Text style={styles.label}>Current Status</Text>
      <Text style={{ marginBottom: 8 }}>{ticket.status}</Text>

      {isAdmin ? (
        <>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, { height: 100 }]}
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <Text style={styles.label}>Deadline</Text>
          <Text style={{ marginBottom: 8 }}>
            {formatDate(deadline)} {formatTime(deadline)}
          </Text>

          {Platform.OS !== "web" && (
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
              <Button
                title="Change Date"
                onPress={() => setShowDatePicker(true)}
              />
              <Button
                title="Change Time"
                onPress={() => setShowTimePicker(true)}
              />
            </View>
          )}

          {Platform.OS === "web" && (
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={formatDate(deadline)}
                onChangeText={(text) => {
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

          <Text style={styles.label}>Assigned Users</Text>

          {loadingUsers ? (
            <ActivityIndicator />
          ) : availableUsers.length === 0 ? (
            <Text style={{ fontSize: 12, color: "#666" }}>
              No users available to assign.
            </Text>
          ) : (
            availableUsers.map((u) => {
              const selected = assignedUserIds.includes(u.id);
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

          <View style={{ marginTop: 16 }}>
            <Button
              title={saving ? "Saving..." : "Save Changes"}
              onPress={handleSave}
              disabled={saving}
            />
          </View>

          <View style={{ marginTop: 16 }}>
            <Text style={styles.label}>Change Status</Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <Button title="Pending" onPress={() => changeStatus("PENDING")} />
              <Button
                title="In Progress"
                onPress={() => changeStatus("IN_PROGRESS")}
              />
              <Button
                title="Completed"
                onPress={() => changeStatus("COMPLETED")}
              />
            </View>
          </View>
        </>
      ) : (
        <>
          {/* user read-only */}
          <Text style={styles.label}>Title</Text>
          <Text style={{ marginBottom: 8 }}>{ticket.title}</Text>

          <Text style={styles.label}>Description</Text>
          <Text style={{ marginBottom: 8 }}>{ticket.description}</Text>

          <Text style={styles.label}>Deadline</Text>
          <Text style={{ marginBottom: 8 }}>
            {new Date(ticket.deadline).toLocaleString()}
          </Text>

          <View style={{ marginTop: 16 }}>
            <Button
              title="Back to Dashboard"
              onPress={() => router.push("/(app)/dashboard")}
            />
          </View>
        </>
      )}
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
