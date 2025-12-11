import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { API_BASE_URL } from "../config/api";
import { useAuth } from "./AuthContext";

export type TicketStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";

export type Ticket = {
  id: string;
  title: string;
  description: string | null;
  deadline: string; // ISO
  status: TicketStatus;
  assigneeIds?: string[];
};

type CreateTicketInput = {
  title: string;
  description: string;
  deadline: string; // ISO
  assignedUserIds: string[];
};

type UpdateTicketInput = Partial<Omit<CreateTicketInput, "assignedUserIds">> & {
  assignedUserIds?: string[];
};

interface TicketContextValue {
  tickets: Ticket[];
  myTickets: Ticket[];
  loading: boolean;
  reload: () => Promise<void>;
  updateStatus: (id: string, status: TicketStatus) => Promise<void>;
  createTicket: (input: CreateTicketInput) => Promise<void>;
  updateTicket: (id: string, input: UpdateTicketInput) => Promise<void>;
}

const TicketContext = createContext<TicketContextValue | undefined>(undefined);

export function TicketProvider({ children }: { children: ReactNode }) {
  const { user, accessToken, isAuthenticated } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);

  const authHeaders = accessToken
    ? { Authorization: `Bearer ${accessToken}` }
    : {};

  const reload = async () => {
    if (!isAuthenticated || !user || !accessToken) {
      setTickets([]);
      return;
    }

    try {
      setLoading(true);
      const endpoint = user.role === "admin" ? "/tickets" : "/tickets/my";

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          ...authHeaders,
        },
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error("Failed to load tickets", res.status, txt);
        throw new Error("Failed to load tickets");
      }

      const data = (await res.json()) as any[];

      // Normalize shape to Ticket
      const mapped: Ticket[] = data.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description ?? null,
        deadline: t.deadline,
        status: t.status,
        assigneeIds: t.assignees ?? undefined,
      }));

      setTickets(mapped);
    } catch (err) {
      console.error(err);
      alert("Could not load tickets");
    } finally {
      setLoading(false);
    }
  };

  // Load whenever auth changes
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.role]);

  const createTicket = async (input: CreateTicketInput) => {
    if (!accessToken) return;

    try {
      const res = await fetch(`${API_BASE_URL}/tickets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error("Create ticket error:", res.status, txt);
        throw new Error("Failed to create ticket");
      }

      // we only get ticketId, so reload list
      await reload();
    } catch (err) {
      console.error(err);
      alert("Could not create ticket");
      throw err;
    }
  };

  const updateTicket = async (id: string, input: UpdateTicketInput) => {
    if (!accessToken) return;

    try {
      const res = await fetch(`${API_BASE_URL}/tickets/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error("Update ticket error:", res.status, txt);
        throw new Error("Failed to update ticket");
      }

      await reload();
    } catch (err) {
      console.error(err);
      alert("Could not update ticket");
      throw err;
    }
  };

  const updateStatus = async (id: string, status: TicketStatus) => {
    if (!accessToken) return;

    try {
      const res = await fetch(`${API_BASE_URL}/tickets/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error("Update status error:", res.status, txt);
        throw new Error("Failed to update status");
      }

      await reload();
    } catch (err) {
      console.error(err);
      alert("Could not update status");
      throw err;
    }
  };

  return (
    <TicketContext.Provider
      value={{
        tickets,
        myTickets: tickets, // for user we fetch only their tickets; for admin it's all
        loading,
        reload,
        updateStatus,
        createTicket,
        updateTicket,
      }}
    >
      {children}
    </TicketContext.Provider>
  );
}

export function useTickets() {
  const ctx = useContext(TicketContext);
  if (!ctx) throw new Error("useTickets must be used inside TicketProvider");
  return ctx;
}
