import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

/**
 * On-demand revalidation endpoint.
 *
 * Page segments carry long `revalidate` windows (6h news, 1h games, 30m home)
 * as a safety net. This endpoint is the real freshness mechanism: the content
 * workflows call it when they write data, so a new article or game shows up
 * immediately instead of after its window lapses.
 *
 * Deliberately driven by GitHub Actions rather than Vercel Cron — Hobby allows
 * only 2 cron jobs, once daily, whereas the workflows that produce the content
 * already run on their own schedules.
 *
 * Callers should only POST when content actually changed. trigger-rss.yml runs
 * every 5 minutes; pinging unconditionally would cost more invocations than it
 * saves.
 */

const LOCALES = ["en", "ar"] as const;

/**
 * ISR paths (real cached HTML) to regenerate per target.
 *
 * /[locale]/games and /[locale]/news are deliberately absent: both await
 * searchParams, so Next renders them dynamically and there is no cached HTML to
 * invalidate. For those routes the unstable_cache tags below are the only thing
 * that matters — the next request picks up fresh data.
 */
const TARGET_TAGS: Record<string, string[]> = {
  news: ["news"],
  games: ["games"],
  events: ["events"],
  home: [],
};

/** Home renders the news feed, event carousel and trailers, so every target hits it. */
const HOME_PATHS = LOCALES.map((l) => `/${l}`);

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return false;

  return (
    request.headers.get("authorization") === `Bearer ${secret}` ||
    request.nextUrl.searchParams.get("secret") === secret
  );
}

export async function POST(request: NextRequest) {
  // Fail closed: an unset secret must not turn this into an open endpoint that
  // anyone can use to force regeneration and burn function invocations.
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { revalidated: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  let body: { target?: string; paths?: string[]; tags?: string[] } = {};

  try {
    const raw = await request.text();
    if (raw.trim()) body = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { revalidated: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const tags = new Set<string>(body.tags ?? []);
  const paths = new Set<string>(body.paths ?? []);

  (TARGET_TAGS[body.target as string] ?? []).forEach((t) => tags.add(t));
  if (body.target) HOME_PATHS.forEach((p) => paths.add(p));

  if (body.target && !(body.target in TARGET_TAGS)) {
    return NextResponse.json(
      {
        revalidated: false,
        error: `Unknown target "${body.target}". Expected one of: ${Object.keys(TARGET_TAGS).join(", ")}`,
      },
      { status: 400 },
    );
  }

  const failures: string[] = [];

  tags.forEach((tag) => {
    try {
      // Next 16 requires a cache-life profile. `expire: 0` is the explicit
      // "expire now" form; omitting the argument is deprecated.
      revalidateTag(tag, { expire: 0 });
    } catch (error) {
      console.error(`[revalidate] tag "${tag}" failed:`, error);
      failures.push(`tag:${tag}`);
    }
  });

  paths.forEach((path) => {
    try {
      revalidatePath(path);
    } catch (error) {
      console.error(`[revalidate] path "${path}" failed:`, error);
      failures.push(`path:${path}`);
    }
  });

  if (body.target) {
    console.log(
      `[revalidate] target=${body.target} tags=${[...tags].join(",") || "none"} ` +
        `paths=${[...paths].join(",") || "none"}`,
    );
  }

  return NextResponse.json({
    revalidated: failures.length === 0,
    target: body.target ?? null,
    paths: [...paths],
    tags: [...tags],
    failures,
    at: new Date().toISOString(),
  });
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. POST with an Authorization: Bearer header." },
    { status: 405 },
  );
}
