import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

// neon-serverless uses WebSockets under the hood; outside the edge runtime
// (i.e. the Node.js runtime our server actions/route handlers run in) it
// needs a `ws` polyfill. This driver is required (not neon-http) because
// the Auth.js Drizzle adapter's linkAccount step runs inside a transaction,
// which neon-http does not support.
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle({ client: pool, schema });
