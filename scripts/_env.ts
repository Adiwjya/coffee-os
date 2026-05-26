import { config } from "dotenv";

// Loaded as the first import in any script that needs env vars,
// before modules like `src/lib/env` evaluate.
config({ path: ".env.local" });
config({ path: ".env" });
