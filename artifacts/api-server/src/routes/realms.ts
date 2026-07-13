import { Router, type IRouter } from "express";
import fs from "fs";
import { db, realmsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GetRealmParams, GetRealmsResponse, GetRealmResponse } from "@workspace/api-zod";
import { getDiskUsagePercent, getProcessesUnderPath } from "../lib/system-metrics";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

type RealmRow = typeof realmsTable.$inferSelect;

/** Compute live disk usage, process count, and status for a realm, and persist it. */
async function enrichRealm(realm: RealmRow): Promise<RealmRow> {
  const exists = fs.existsSync(realm.mountPath);
  const disk = exists ? await getDiskUsagePercent(realm.mountPath) : null;
  const procs = exists ? getProcessesUnderPath(realm.mountPath) : 0;

  let status = "ONLINE";
  if (!exists) status = "OFFLINE";
  else if (disk !== null && disk >= 95) status = "CRITICAL";
  else if (disk !== null && disk >= 80) status = "DEGRADED";

  await db
    .update(realmsTable)
    .set({ diskUsagePercent: disk, activeProcesses: procs, status })
    .where(eq(realmsTable.id, realm.id));

  return { ...realm, diskUsagePercent: disk, activeProcesses: procs, status };
}

router.get("/realms", requireAuth, async (_req, res): Promise<void> => {
  const realms = await db.select().from(realmsTable).orderBy(realmsTable.id);
  const enriched = await Promise.all(realms.map(enrichRealm));
  res.json(GetRealmsResponse.parse(enriched));
});

router.get("/realms/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetRealmParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [realm] = await db
    .select()
    .from(realmsTable)
    .where(eq(realmsTable.id, params.data.id));

  if (!realm) {
    res.status(404).json({ error: "Realm not found" });
    return;
  }

  res.json(GetRealmResponse.parse(await enrichRealm(realm)));
});

export default router;
