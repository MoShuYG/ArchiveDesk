import { createApp } from "./app";
import { env } from "./config/env";
import { getDb } from "./api/utils/dbUtils";
import { scanJobService } from "./services/scanJobService";

async function bootstrap(): Promise<void> {
  getDb();
  const recoveredTaskCount = scanJobService.recoverInterruptedTasks();
  if (recoveredTaskCount > 0) {
    console.warn(`已结束 ${recoveredTaskCount} 个因服务重启而中断的扫描任务。`);
  }
  scanJobService.refreshWatchers();
  const app = createApp();
  app.listen(env.port, () => {
    console.log(`服务已启动，端口：${env.port}`);
  });
}

void bootstrap();
