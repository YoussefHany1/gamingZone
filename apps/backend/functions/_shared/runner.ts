interface AppwriteRequest {
  body?: string;
}

interface AppwriteResponse {
  json: (body: unknown, statusCode?: number) => unknown;
}

export interface AppwriteContext {
  req: AppwriteRequest;
  res: AppwriteResponse;
  log: (...message: unknown[]) => void;
  error: (...message: unknown[]) => void;
}

export function createRunner(jobName: string, run: () => Promise<unknown>) {
  return async ({ res, log, error }: AppwriteContext) => {
    const startedAt = Date.now();
    log(`Running job '${jobName}'...`);

    try {
      const result = await run();
      log(`Job '${jobName}' finished in ${Date.now() - startedAt}ms.`);
      return res.json({ ok: true, job: jobName, result: result ?? null });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      error(`Job '${jobName}' failed: ${message}`);
      return res.json({ ok: false, job: jobName, error: message }, 500);
    }
  };
}