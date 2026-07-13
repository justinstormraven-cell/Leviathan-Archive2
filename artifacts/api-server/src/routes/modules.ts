import { Router, type IRouter } from "express";
import { db, modulesTable, realmsTable, auditLogsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  GetModuleParams,
  GetModulesResponse,
  GetModuleResponse,
  UpdateModuleParams,
  UpdateModuleBody,
  UpdateModuleResponse,
} from "@workspace/api-zod";
import { isAlive, startModuleProcess, stopModuleProcess } from "../lib/process-manager";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

const moduleSelection = {
  id: modulesTable.id,
  name: modulesTable.name,
  codename: modulesTable.codename,
  realmId: modulesTable.realmId,
  realmName: realmsTable.name,
  realmPath: realmsTable.mountPath,
  status: modulesTable.status,
  description: modulesTable.description,
  authLevel: modulesTable.authLevel,
  lastActivated: modulesTable.lastActivated,
  pid: modulesTable.pid,
  command: modulesTable.command,
};

type ModuleRow = {
  id: number;
  name: string;
  codename: string;
  realmId: number;
  realmName: string | null;
  realmPath: string | null;
  status: string;
  description: string;
  authLevel: string;
  lastActivated: Date | null;
  pid: number | null;
  command: string | null;
};

function serialize(m: ModuleRow, status: string, pid: number | null) {
  return {
    id: m.id,
    name: m.name,
    codename: m.codename,
    realmId: m.realmId,
    realmName: m.realmName ?? "",
    status,
    description: m.description,
    authLevel: m.authLevel,
    lastActivated: m.lastActivated ? m.lastActivated.toISOString() : null,
    pid: pid ?? null,
    command: m.command ?? null,
  };
}

/** Reconcile stored status against real process liveness. */
async function reconcile(m: ModuleRow): Promise<{ status: string; pid: number | null }> {
  let status = m.status;
  let pid = m.pid;
  if (status === "ACTIVE" && !isAlive(pid, m.codename)) {
    status = "INACTIVE";
    pid = null;
    await db.update(modulesTable).set({ status, pid }).where(eq(modulesTable.id, m.id));
  }
  return { status, pid };
}

function fetchModule(id: number) {
  return db
    .select(moduleSelection)
    .from(modulesTable)
    .leftJoin(realmsTable, eq(modulesTable.realmId, realmsTable.id))
    .where(eq(modulesTable.id, id));
}

router.get("/modules", requireAuth, async (_req, res): Promise<void> => {
  const rows = (await db
    .select(moduleSelection)
    .from(modulesTable)
    .leftJoin(realmsTable, eq(modulesTable.realmId, realmsTable.id))
    .orderBy(modulesTable.id)) as ModuleRow[];

  const result = await Promise.all(
    rows.map(async (m) => {
      const { status, pid } = await reconcile(m);
      return serialize(m, status, pid);
    }),
  );

  res.json(GetModulesResponse.parse(result));
});

router.get("/modules/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetModuleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [m] = (await fetchModule(params.data.id)) as ModuleRow[];
  if (!m) {
    res.status(404).json({ error: "Module not found" });
    return;
  }

  const { status, pid } = await reconcile(m);
  res.json(GetModuleResponse.parse(serialize(m, status, pid)));
});

router.patch("/modules/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateModuleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateModuleBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [m] = (await fetchModule(params.data.id)) as ModuleRow[];
  if (!m) {
    res.status(404).json({ error: "Module not found" });
    return;
  }

  const targetStatus = body.data.status === "ACTIVE" ? "ACTIVE" : "INACTIVE";
  let newPid: number | null = m.pid;
  let newStatus: string;

  if (targetStatus === "ACTIVE") {
    await stopModuleProcess(m.pid, m.codename);
    const command =
      m.command ||
      `while true; do echo "$(date -Iseconds) [${m.codename}] heartbeat pid=$$"; sleep 5; done`;
    const cwd = m.realmPath || process.cwd();
    newPid = startModuleProcess(m.codename, command, cwd);
    newStatus = "ACTIVE";
  } else {
    await stopModuleProcess(m.pid, m.codename);
    newPid = null;
    newStatus = "INACTIVE";
  }

  await db
    .update(modulesTable)
    .set({
      status: newStatus,
      pid: newPid,
      lastActivated: newStatus === "ACTIVE" ? new Date() : m.lastActivated,
    })
    .where(eq(modulesTable.id, m.id));

  await db.insert(auditLogsTable).values({
    eventType: "MODULE_STATUS_CHANGE",
    severity: "INFO",
    message:
      newStatus === "ACTIVE"
        ? `Module ${m.name} activated — live process spawned (PID ${newPid})`
        : `Module ${m.name} deactivated — process terminated`,
    realmId: m.realmId,
    moduleId: m.id,
  });

  const [refreshed] = (await fetchModule(m.id)) as ModuleRow[];
  res.json(
    UpdateModuleResponse.parse(serialize(refreshed, refreshed.status, refreshed.pid)),
  );
});

export default router;
