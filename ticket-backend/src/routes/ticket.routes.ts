import { Router, Request, Response } from "express";
import { z } from "zod";
import { query } from "../config/db";
import { authenticateJWT, requireRole } from "../middleware/auth";

const router = Router();

const statusEnum = z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]);

const createTicketSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  deadline: z.iso.datetime(),
  assignedUserIds: z.array(z.uuid()).min(1),
});

const updateTicketSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  deadline: z.string().datetime().optional(),
  assignedUserIds: z.array(z.string().uuid()).min(1).optional(),
});

const updateStatusSchema = z.object({
  status: statusEnum,
});

async function isUserAssigned(ticketId: string, userId: string): Promise<boolean> {
  const res = await query<{ user_id: string }>(
    "SELECT user_id FROM ticket_assignees WHERE ticket_id = $1 AND user_id = $2",
    [ticketId, userId]
  );
  return res.rows.length > 0;
}

router.post(
  "/",
  authenticateJWT,
  requireRole("admin"),
  async (req: Request, res: Response) => {
    try {
      const body = createTicketSchema.parse(req.body);
      const creatorId = req.user!.id;

      const ticketResult = await query<{
        id: string;
        title: string;
        description: string | null;
        deadline: string;
        status: string;
        created_by: string;
      }>(
        `INSERT INTO tickets (title, description, deadline, status, created_by)
         VALUES ($1, $2, $3, 'PENDING', $4)
         RETURNING id, title, description, deadline, status, created_by`,
        [body.title, body.description ?? null, body.deadline, creatorId]
      );

      const ticket = ticketResult.rows[0];

      for (const userId of body.assignedUserIds) {
        await query(
          "INSERT INTO ticket_assignees (ticket_id, user_id) VALUES ($1, $2)",
          [ticket.id, userId]
        );
      }

      return res.status(201).json({ ticketId: ticket.id });
    } catch (err: any) {
      console.error(err);
      if (err.name === "ZodError") {
        return res.status(400).json({ message: err.errors });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.get(
  "/",
  authenticateJWT,
  requireRole("admin"),
  async (_req: Request, res: Response) => {
    try {
      const result = await query<any>(
        `SELECT
           t.id,
           t.title,
           t.description,
           t.deadline,
           t.status,
           t.created_by,
           array_agg(ta.user_id) AS assignees
         FROM tickets t
         LEFT JOIN ticket_assignees ta ON ta.ticket_id = t.id
         GROUP BY t.id`
      );

      return res.json(result.rows);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.get(
  "/my",
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const result = await query<any>(
        `SELECT
           t.id,
           t.title,
           t.description,
           t.deadline,
           t.status,
           t.created_by
         FROM tickets t
         INNER JOIN ticket_assignees ta ON ta.ticket_id = t.id
         WHERE ta.user_id = $1`,
        [userId]
      );
      return res.json(result.rows);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.get(
  "/:id",
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = req.user!;

      const ticketResult = await query<any>(
        `SELECT
           t.id,
           t.title,
           t.description,
           t.deadline,
           t.status,
           t.created_by,
           array_agg(ta.user_id) AS assignees
         FROM tickets t
         LEFT JOIN ticket_assignees ta ON ta.ticket_id = t.id
         WHERE t.id = $1
         GROUP BY t.id`,
        [id]
      );

      if (ticketResult.rows.length === 0) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      const ticket = ticketResult.rows[0];

      if (user.role !== "admin") {
        const assigned = await isUserAssigned(id, user.id);
        if (!assigned) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }

      return res.json(ticket);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.patch(
  "/:id",
  authenticateJWT,
  requireRole("admin"),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const body = updateTicketSchema.parse(req.body);

      if (body.title || body.description || body.deadline) {
        await query(
          `UPDATE tickets
             SET title = COALESCE($1, title),
                 description = COALESCE($2, description),
                 deadline = COALESCE($3, deadline),
                 updated_at = NOW()
           WHERE id = $4`,
          [body.title ?? null, body.description ?? null, body.deadline ?? null, id]
        );
      }

      if (body.assignedUserIds) {
        await query("DELETE FROM ticket_assignees WHERE ticket_id = $1", [id]);
        for (const userId of body.assignedUserIds) {
          await query(
            "INSERT INTO ticket_assignees (ticket_id, user_id) VALUES ($1, $2)",
            [id, userId]
          );
        }
      }

      return res.json({ message: "Ticket updated" });
    } catch (err: any) {
      console.error(err);
      if (err.name === "ZodError") {
        return res.status(400).json({ message: err.errors });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.patch(
  "/:id/status",
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const body = updateStatusSchema.parse(req.body);
      const user = req.user!;

      const ticketRes = await query<{ status: TicketStatus }>(
        "SELECT status FROM tickets WHERE id = $1",
        [id]
      );
      if (ticketRes.rows.length === 0) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      const currentStatus = ticketRes.rows[0].status;

      if (currentStatus === "COMPLETED" && user.role !== "admin") {
        return res
          .status(403)
          .json({ message: "Completed tickets can only be updated by admin" });
      }

      if (user.role !== "admin") {
        const assigned = await isUserAssigned(id, user.id);
        if (!assigned) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }

      await query(
        `UPDATE tickets SET status = $1, updated_at = NOW() WHERE id = $2`,
        [body.status, id]
      );

      return res.json({ message: "Status updated" });
    } catch (err: any) {
      console.error(err);
      if (err.name === "ZodError") {
        return res.status(400).json({ message: err.errors });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);


export default router;
