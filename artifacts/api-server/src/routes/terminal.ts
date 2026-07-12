import { Router, type IRouter } from "express";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { db, terminalHistoryTable, auditLogsTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import {
  ExecuteCommandBody,
  ExecuteCommandResponse,
  GetTerminalHistoryResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const execAsync = promisify(exec);
const router: IRouter = Router();

const SHELL_ROOT = "/home/runner/workspace";
const HOME = process.env.HOME || SHELL_ROOT;
const TIMEOUT_MS = 20000;

// Persistent working directory for the live shell session.
let currentCwd = SHELL_ROOT;

function expandHome(target: string): string {
  if (target === "~") return HOME;
  if (target.startsWith("~/")) return path.join(HOME, target.slice(2));
  return target;
}

async function runCommand(
  command: string,
): Promise<{ output: string; exitCode: number }> {
  // Handle `cd` in-process so the working directory persists across commands.
  if (command === "cd" || command.startsWith("cd ")) {
    const rawTarget = command === "cd" ? HOME : command.slice(3).trim();
    const resolved = path.resolve(currentCwd, expandHome(rawTarget));
    try {
      if (!fs.statSync(resolved).isDirectory()) {
        return { output: `cd: not a directory: ${rawTarget}`, exitCode: 1 };
      }
      currentCwd = resolved;
      return { output: "", exitCode: 0 };
    } catch {
      return { output: `cd: no such file or directory: ${rawTarget}`, exitCode: 1 };
    }
  }

  const cwd = fs.existsSync(currentCwd) ? currentCwd : SHELL_ROOT;
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout: TIMEOUT_MS,
      maxBuffer: 2 * 1024 * 1024,
      shell: "/bin/bash",
    });
    const combined = [stdout, stderr].filter(Boolean).join("");
    return { output: combined.replace(/\n$/, ""), exitCode: 0 };
  } catch (err) {
    const e = err as {
      stdout?: string;
      stderr?: string;
      message?: string;
      code?: number;
      killed?: boolean;
      signal?: string;
    };
    if (e.killed && e.signal === "SIGTERM") {
      return { output: `Command timed out after ${TIMEOUT_MS / 1000}s`, exitCode: 124 };
    }
    const combined = [e.stdout, e.stderr].filter(Boolean).join("");
    return {
      output: (combined || e.message || "command failed").replace(/\n$/, ""),
      exitCode: typeof e.code === "number" ? e.code : 1,
    };
  }
}

router.post("/terminal", requireAuth, async (req, res): Promise<void> => {
  const body = ExecuteCommandBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const command = body.data.command.trim();
  const operator = (req as typeof req & { operator?: string }).operator ?? "operator";

  if (command === "") {
    res.json(
      ExecuteCommandResponse.parse({
        id: 0,
        command,
        output: "",
        exitCode: 0,
        executedAt: new Date().toISOString(),
      }),
    );
    return;
  }

  const { output, exitCode } = await runCommand(command);

  const [entry] = await db
    .insert(terminalHistoryTable)
    .values({ command, output, exitCode })
    .returning();

  // Do not leak the command text into the audit feed (it is publicly
  // readable). The full command + output is kept only in the auth-gated
  // terminal history endpoint.
  await db.insert(auditLogsTable).values({
    eventType: "TERMINAL_COMMAND",
    severity: exitCode === 0 ? "INFO" : "WARN",
    message: `Operator ${operator} executed a shell command (exit ${exitCode})`,
  });

  res.json(
    ExecuteCommandResponse.parse({
      id: entry.id,
      command: entry.command,
      output: entry.output,
      exitCode: entry.exitCode,
      executedAt: entry.executedAt.toISOString(),
    }),
  );
});

router.get("/terminal/history", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(terminalHistoryTable)
    .orderBy(desc(terminalHistoryTable.executedAt))
    .limit(100);

  const mapped = rows
    .reverse()
    .map((r) => ({ ...r, executedAt: r.executedAt.toISOString() }));

  res.json(GetTerminalHistoryResponse.parse(mapped));
});

export default router;
