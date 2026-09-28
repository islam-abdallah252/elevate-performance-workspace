import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { ZodError } from "zod";
import { AppError } from "./errors.js";
import { apiRouter } from "./routes/api.js";
export function createApp() {
    const app = express();
    app.use(helmet());
    app.use(cors({ origin: "http://localhost:5173" }));
    app.use(morgan(process.env.NODE_ENV === "test" ? "tiny" : "dev"));
    app.use(express.json({ limit: "1mb" }));
    app.use("/api", apiRouter);
    app.use((_req, res) => res.status(404).json({ error: { code: "NOT_FOUND", message: "Route was not found" } }));
    app.use((error, _req, res, _next) => {
        if (error instanceof ZodError)
            return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Request validation failed", details: error.flatten() } });
        if (error instanceof AppError)
            return res.status(error.status).json({ error: { code: error.code, message: error.message, details: error.details } });
        console.error(error);
        return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unexpected server error" } });
    });
    return app;
}
