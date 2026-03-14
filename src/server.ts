import { createApp } from "./app";
import { env } from "./config/env";
import { getDb } from "./api/utils/dbUtils";
import { scanJobService } from "./services/scanJobService";

async function bootstrap(): Promise<void> {
  getDb();
  scanJobService.refreshWatchers();
  const app = createApp();
  app.listen(env.port, () => {
    console.log(`Server started on port ${env.port}`);
  });
}

void bootstrap();
