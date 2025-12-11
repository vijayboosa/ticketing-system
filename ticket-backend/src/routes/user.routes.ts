import { Router, Request, Response } from "express";
import { authenticateJWT, requireRole } from "../middleware/auth";
import { query } from "../config/db";

const router = Router();

router.get(
  "/",
  authenticateJWT,
  requireRole("admin"),
  async (_req: Request, res: Response) => {
    try {
      const result = await query<{
        id: string;
        email: string;
        role: "admin" | "user";
      }>(
        `SELECT id, email, role
         FROM users
         ORDER BY email`
      );

      return res.json(result.rows);
    } catch (err) {
      console.error("Error fetching users", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

export default router;
