import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { query } from "../config/db";

const router = Router();

const JWT_SECRET: string = process.env.JWT_SECRET || "dev_secret";
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || "1h";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(4),
});

const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(4),
  role: z.enum(["admin", "user"]),
});

router.post("/register", async (req: Request, res: Response) => {
  try {
    const body = registerSchema.parse(req.body);

    const existing = await query<{ id: string }>(
      "SELECT id FROM users WHERE email = $1",
      [body.email]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hash = await bcrypt.hash(body.password, 10);

    const result = await query<{ id: string; email: string; role: string }>(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id, email, role`,
      [body.email, hash, body.role]
    );

    const user = result.rows[0];

    return res.status(201).json({
      id: user.id,
      email: user.email,
      role: user.role,
    });
  } catch (err: any) {
    console.error(err);
    if (err.name === "ZodError") {
      return res.status(400).json({ message: err.errors });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    console.log('hello');
    
    const body = loginSchema.parse(req.body);

    const result = await query<{
      id: string;
      email: string;
      role: "admin" | "user";
      password_hash: string;
    }>("SELECT * FROM users WHERE email = $1", [body.email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];

    const valid = await bcrypt.compare(body.password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      JWT_SECRET as string,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.json({
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err: any) {
    console.error(err);
    if (err.name === "ZodError") {
      return res.status(400).json({ message: err.errors });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
