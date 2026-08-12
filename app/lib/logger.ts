import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
  transport: isDev
    ? {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "HH:MM:ss Z", ignore: "pid,hostname" },
      }
    : undefined,
  redact: {
    paths: [
      "*.password",
      "*.passwordHash",
      "*.token",
      "*.apiKey",
      "*.authorization",
      "*.cookie",
      "req.headers.authorization",
      "req.headers.cookie",
    ],
    censor: "[REDACTED]",
  },
  base: { service: "finance-app" },
});