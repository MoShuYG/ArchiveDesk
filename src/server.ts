import { createApp } from "./app";
import { env } from "./config/env";
import { getDb } from "./api/utils/dbUtils";
import { scanJobService } from "./services/scanJobService";
import { systemOpenService } from "./services/systemOpenService";

async function bootstrap(): Promise<void> {
  getDb();
  scanJobService.refreshWatchers();
  const quickViewer = await systemOpenService.inspectQuickViewer();
  if (quickViewer.configured && quickViewer.available) {
    console.log(`[system-open] QuickViewer enabled: ${quickViewer.path}`);
  } else if (quickViewer.configured && !quickViewer.available) {
    console.warn(`[system-open] QUICKVIEWER_PATH is configured but unavailable: ${quickViewer.path}`);
  } else {
    console.log("[system-open] QUICKVIEWER_PATH not configured, image open will use system default.");
  }
  const app = createApp();
  app.listen(env.port, () => {
    console.log(`Server started on port ${env.port}`);
  });
}

void bootstrap();
