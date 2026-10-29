import dotenv from "dotenv";
import app from "./app";
import { logger } from "./lib/logger";

// Load environment variables from project root .env file for local development
// In Vercel, environment variables are automatically available in process.env
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: "../../.env" });
}

const rawPort = process.env["PORT"];
const port = rawPort ? Number(rawPort) : 23608;

if (rawPort && (Number.isNaN(port) || port <= 0)) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
