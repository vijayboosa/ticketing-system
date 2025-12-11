import * as Haptics from "expo-haptics";
import { Link } from "expo-router";
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Calendar, DateData } from "react-native-calendars";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useTickets } from "../../src/context/TicketContext";

const DROP_ZONE_HEIGHT = 120;
const DROP_THRESHOLD = 100;

function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateOnly(dateStr: string) {
  return formatLocalDate(new Date(dateStr));
}

type Ticket = {
  id: string;
  title: string;
  description?: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  deadline: string;
};

export default function CalendarScreen() {
  const { myTickets, updateStatus } = useTickets();
  const [selectedDate, setSelectedDate] = useState<string>(
    formatLocalDate(new Date())
  );
  const isDragging = useSharedValue(false);

  const ticketsByDate = useMemo(() => {
    const groups: Record<string, Ticket[]> = {};
    for (const t of myTickets) {
      const key = formatDateOnly(t.deadline);
      if (!groups[key]) groups[key] = [];
      groups[key].push(t as Ticket);
    }
    return groups;
  }, [myTickets]);

  const ticketsForSelected = ticketsByDate[selectedDate] ?? [];

  const sortedTickets = useMemo(() => {
    return [...ticketsForSelected].sort((a, b) => {
      if (a.status === "COMPLETED") return 1;
      if (b.status === "COMPLETED") return -1;
      return 0;
    });
  }, [ticketsForSelected]);

  // Calendar Marks
  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};
    Object.keys(ticketsByDate).forEach((date) => {
      const hasPending = ticketsByDate[date].some(
        (t) => t.status !== "COMPLETED"
      );
      marks[date] = {
        marked: true,
        dotColor: hasPending ? "#FF6B6B" : "#4ECDC4",
      };
    });
    marks[selectedDate] = {
      ...(marks[selectedDate] || {}),
      selected: true,
      selectedColor: "#4A90E2",
      selectedTextColor: "white",
    };
    return marks;
  }, [ticketsByDate, selectedDate]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.calendarContainer}>
        <Calendar
          onDayPress={(day: DateData) => {
            Haptics.selectionAsync();
            setSelectedDate(day.dateString);
          }}
          markedDates={markedDates}
          theme={{
            backgroundColor: "#ffffff",
            calendarBackground: "#ffffff",
            textSectionTitleColor: "#b6c1cd",
            selectedDayBackgroundColor: "#4A90E2",
            selectedDayTextColor: "#ffffff",
            todayTextColor: "#4A90E2",
            dayTextColor: "#2d4150",
            textDisabledColor: "#d9e1e8",
            dotColor: "#00adf5",
            selectedDotColor: "#ffffff",
            arrowColor: "#4A90E2",
            monthTextColor: "#2d4150",
            textDayFontWeight: "600",
            textMonthFontWeight: "bold",
            textDayHeaderFontWeight: "500",
            textDayFontSize: 16,
            textMonthFontSize: 16,
            textDayHeaderFontSize: 14,
          }}
        />
      </View>

      <View style={styles.taskListHeader}>
        <Text style={styles.dateTitle}>Tasks for {selectedDate}</Text>
        <Text style={styles.subTitle}>
          {ticketsForSelected.length} Ticket
          {ticketsForSelected.length !== 1 && "s"}
        </Text>
      </View>

      <View style={styles.listContainer}>
        {sortedTickets.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No deadlines for this day 🎉</Text>
          </View>
        ) : (
          sortedTickets.map((ticket) => (
            <DraggableTicket
              key={ticket.id}
              ticket={ticket}
              onComplete={() => updateStatus(ticket.id, "COMPLETED")}
              globalIsDragging={isDragging}
            />
          ))
        )}
      </View>

      <DropZone isActive={isDragging} />
    </GestureHandlerRootView>
  );
}

function DraggableTicket({
  ticket,
  onComplete,
  globalIsDragging,
}: {
  ticket: Ticket;
  onComplete: () => void;
  globalIsDragging: Animated.SharedValue<boolean>;
}) {
  const isCompleted = ticket.status === "COMPLETED";

  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  const context = useSharedValue({ y: 0, x: 0 });
  const isPressed = useSharedValue(false);

  const gesture = Gesture.Pan()
    .enabled(!isCompleted)
    .onStart(() => {
      context.value = { y: translateY.value, x: translateX.value };
      isPressed.value = true;
      scale.value = withSpring(1.05);
      globalIsDragging.value = true;
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    })
    .onUpdate((event) => {
      translateY.value = event.translationY + context.value.y;
      translateX.value = event.translationX + context.value.x;
    })
    .onEnd((event) => {
      // Logic: Did we drag down far enough?
      if (event.translationY > DROP_THRESHOLD) {
        runOnJS(Haptics.notificationAsync)(
          Haptics.NotificationFeedbackType.Success
        );
        runOnJS(onComplete)();
      }

      // Reset position (spring back)
      translateY.value = withSpring(0);
      translateX.value = withSpring(0);
      scale.value = withSpring(1);
      isPressed.value = false;
      globalIsDragging.value = false;
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { scale: scale.value },
    ],
    zIndex: isPressed.value ? 100 : 1,
    shadowOpacity: isPressed.value ? 0.3 : 0.1,
  }));

  const getStatusColor = (status: string) => {
    if (status === "COMPLETED") return styles.badgeSuccess;
    if (status === "IN_PROGRESS") return styles.badgeProgress;
    return styles.badgePending;
  };

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.cardContainer, animatedStyle]}>
        <Link href={`/(app)/tickets/${ticket.id}`} asChild>
          <TouchableOpacity disabled={isPressed.value}>
            <View style={styles.cardHeader}>
              <Text
                style={[styles.cardTitle, isCompleted && styles.completedText]}
              >
                {ticket.title}
              </Text>
              <View style={[styles.badge, getStatusColor(ticket.status)]}>
                <Text style={styles.badgeText}>
                  {ticket.status.replace("_", " ")}
                </Text>
              </View>
            </View>
            <Text numberOfLines={1} style={styles.cardDesc}>
              {ticket.description || "No description provided"}
            </Text>

            {!isCompleted && (
              <Text style={styles.dragHint}>Hold & Drag down to complete</Text>
            )}
          </TouchableOpacity>
        </Link>
      </Animated.View>
    </GestureDetector>
  );
}

function DropZone({ isActive }: { isActive: Animated.SharedValue<boolean> }) {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: withTiming(isActive.value ? 0 : DROP_ZONE_HEIGHT, {
            duration: 250,
          }),
        },
      ],
      opacity: withTiming(isActive.value ? 1 : 0),
    };
  });

  return (
    <Animated.View style={[styles.dropZone, animatedStyle]}>
      <Text style={styles.dropZoneText}>Release to Complete ✅</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  calendarContainer: {
    backgroundColor: "white",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 10,
  },
  taskListHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2D3436",
  },
  subTitle: {
    fontSize: 14,
    color: "#636E72",
    fontWeight: "500",
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  emptyState: {
    marginTop: 50,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#B2BEC3",
  },
  cardContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.02)",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2D3436",
    flex: 1,
    marginRight: 10,
  },
  completedText: {
    textDecorationLine: "line-through",
    color: "#B2BEC3",
  },
  cardDesc: {
    fontSize: 14,
    color: "#636E72",
    marginBottom: 8,
  },
  dragHint: {
    fontSize: 10,
    color: "#B2BEC3",
    fontWeight: "600",
    marginTop: 4,
    alignSelf: "flex-start",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgePending: { backgroundColor: "#FFEAA7" },
  badgeProgress: { backgroundColor: "#74b9ff" },
  badgeSuccess: { backgroundColor: "#55efc4" },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#2D3436",
  },
  dropZone: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: DROP_ZONE_HEIGHT,
    backgroundColor: "#55efc4",
    justifyContent: "center",
    alignItems: "center",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    zIndex: 99,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
    paddingBottom: 20,
  },
  dropZoneText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
