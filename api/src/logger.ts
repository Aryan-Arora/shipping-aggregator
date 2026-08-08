import pino from "pino";

// JSON logs in production (so they're ingestible by CloudWatch/whatever ships
// with the eventual deploy), pretty-printed in dev. Swapping in a real error
// tracker (Sentry etc.) later just means adding a pino transport here — call
// sites don't change.
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport:
    process.env.NODE_ENV === "production"
      ? undefined
      : { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } },
});
