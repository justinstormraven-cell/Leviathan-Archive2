import { Router, type IRouter } from "express";
import {
  GetFsListResponse,
  GetFsReadResponse,
  WriteFsFileBody,
  WriteFsFileResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { listDirectory, readFile, writeFile } from "../lib/fs-explorer";
import { db, auditLogsTable } from "@workspace/db";

const router: IRouter = Router();

function errStatus(err: unknown): number {
  const code = (err as { code?: string })?.code;
  if (code === "ENOENT") return 404;
  if (code === "EACCES" || code === "EPERM") return 403;
  if (code === "ENOTDIR" || code === "ENOTFILE" || code === "EISDIR") return 400;
  return 500;
}

router.get("/fs/list", requireAuth, async (req, res): Promise<void> => {
  try {
    const listing = await listDirectory(
      typeof req.query.path === "string" ? req.query.path : undefined,
    );
    res.json(GetFsListResponse.parse(listing));
  } catch (err) {
    res.status(errStatus(err)).json({ error: (err as Error).message });
  }
});

router.get("/fs/read", requireAuth, async (req, res): Promise<void> => {
  const target = typeof req.query.path === "string" ? req.query.path : "";
  if (!target) {
    res.status(400).json({ error: "path query parameter is required" });
    return;
  }
  try {
    const file = await readFile(target);
    res.json(GetFsReadResponse.parse(file));
  } catch (err) {
    res.status(errStatus(err)).json({ error: (err as Error).message });
  }
});

router.post("/fs/write", requireAuth, async (req, res): Promise<void> => {
  const body = WriteFsFileBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const operator = (req as typeof req & { operator?: string }).operator ?? "operator";
  try {
    const result = await writeFile(body.data.path, body.data.content);
    await db.insert(auditLogsTable).values({
      eventType: "FILE_WRITE",
      severity: "WARN",
      message: `Operator ${operator} wrote ${result.bytes} bytes to a file`,
    });
    res.json(WriteFsFileResponse.parse({ ok: true, ...result }));
  } catch (err) {
    res.status(errStatus(err)).json({ error: (err as Error).message });
  }
});

export default router;
