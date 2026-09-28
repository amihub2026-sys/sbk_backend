import { assertEnv,env } from "./config/env.js";
import { connectDb } from "./config/db.js";
import { ensureMediaDir } from "./services/media.service.js";
import { createApp } from "./app.js";
assertEnv();await connectDb();await ensureMediaDir();const app=createApp();app.listen(env.port,()=>console.log(`SBK backend listening on http://localhost:${env.port}`));
