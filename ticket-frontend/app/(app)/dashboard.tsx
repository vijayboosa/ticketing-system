import React, { useMemo } from "react";
import { Link, router } from "expo-router";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
} from "react-native";
import { useAuth } from "../../src/context/AuthContext";
import { useTickets } from "../../src/context/TicketContext";

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const { tickets, myTickets, updateStatus, loading, refreshTickets } =
    useTickets();

  const isAdmin = user?.role === "admin";

  const dataSource = (isAdmin ? tickets : myTickets) || [];

  const groups = useMemo(() => {
    return {
      pending: dataSource.filter((t) => t.status === "PENDING"),
      inProgress: dataSource.filter((t) => t.status === "IN_PROGRESS"),
      completed: dataSource.filter((t) => t.status === "COMPLETED"),
    };
  }, [dataSource]);

  const renderSection = (
    title: string,
    items: typeof dataSource,
    color: string
  ) => {
    if (!items || items.length === 0) return null;

    return (
      <View style={styles.sectionContainer}>
        <View style={[styles.sectionHeader, { borderLeftColor: color }]}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <View style={[styles.badge, { backgroundColor: color }]}>
            <Text style={styles.badgeText}>{items.length}</Text>
          </View>
        </View>

        {items.map((item) => (
          <TicketCard
            key={item.id}
            item={item}
            isAdmin={isAdmin}
            onUpdateStatus={updateStatus}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* --- Header --- */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>
            Hello, {user?.email?.split("@")[0]}
          </Text>
          <Text style={styles.roleText}>
            {isAdmin ? "Administrator" : "Team Member"}
          </Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* --- Action Bar --- */}
      <View style={styles.actionBar}>
        <Link href="/(app)/calendar" asChild>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📅 View Calendar</Text>
          </TouchableOpacity>
        </Link>

        {isAdmin && (
          <TouchableOpacity
            style={[styles.actionButton, styles.createButton]}
            onPress={() => router.push("/(app)/tickets/create")}
          >
            <Text style={[styles.actionButtonText, { color: "white" }]}>
              + New Ticket
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* --- Content --- */}
      {loading && dataSource.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refreshTickets} />
          }
        >
          {dataSource.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No tickets found.</Text>
            </View>
          ) : (
            <>
              {renderSection("Pending", groups.pending, "#FFC107")}
              {renderSection("In Progress", groups.inProgress, "#3498DB")}
              {renderSection("Completed", groups.completed, "#2ECC71")}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function TicketCard({ item, isAdmin, onUpdateStatus }: any) {
  return (
    <View style={styles.card}>
      <Link
        href={{ pathname: "/(app)/tickets/[id]", params: { id: item.id } }}
        asChild
      >
        <TouchableOpacity>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardDate}>
            Due: {new Date(item.deadline).toLocaleDateString()}
          </Text>
        </TouchableOpacity>
      </Link>

      {!isAdmin && item.status !== "COMPLETED" && (
        <View style={styles.cardActions}>
          {item.status === "PENDING" && (
            <TouchableOpacity
              style={[styles.statusBtn, { backgroundColor: "#3498DB" }]}
              onPress={() => onUpdateStatus(item.id, "IN_PROGRESS")}
            >
              <Text style={styles.statusBtnText}>Start Work</Text>
            </TouchableOpacity>
          )}

          {item.status === "IN_PROGRESS" && (
            <TouchableOpacity
              style={[styles.statusBtn, { backgroundColor: "#2ECC71" }]}
              onPress={() => onUpdateStatus(item.id, "COMPLETED")}
            >
              <Text style={styles.statusBtnText}>Mark Done</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: "white",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2D3436",
  },
  roleText: {
    fontSize: 14,
    color: "#636E72",
    marginTop: 2,
    textTransform: "capitalize",
  },
  logoutButton: {
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  logoutText: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
  },
  actionBar: {
    flexDirection: "row",
    padding: 16,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: "white",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  createButton: {
    backgroundColor: "#2D3436",
    borderColor: "#2D3436",
  },
  actionButtonText: {
    fontWeight: "600",
    color: "#2D3436",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingLeft: 10,
    borderLeftWidth: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2D3436",
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  card: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2D3436",
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 13,
    color: "#636E72",
  },
  cardActions: {
    flexDirection: "row",
    marginTop: 12,
    gap: 8,
  },
  statusBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  statusBtnText: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    marginTop: 50,
  },
  emptyText: {
    color: "#B2BEC3",
    fontSize: 16,
  },
});
