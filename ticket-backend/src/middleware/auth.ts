import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";



export function authenticateJWT(req: any, res: any, next: any) {
    const authHeader = req.header("Authorization");
    if (!authHeader) {
        return res.status(401).json({ message: "Access denied" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const payload = jwt.verify(token, JWT_SECRET) as {
            sub: string;
            role: string;
            email: string;
        }

        req.user = {
            id: payload.sub,
            email: payload.email,
            role: payload.role,
        };

        next();


    } catch (err) {
        console.log("JWt verification failed", err);
        return res.status(401).json({ message: "Invalid token" });
    }
}

export function requireRole(role: "admin" | "user") {
    return (req: any, res: any, next: any) => {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthenticated" });
        }
        if (req.user.role !== role) {
            return res.status(403).json({ message: "Forbidden" });
        }
        next();
    };
}