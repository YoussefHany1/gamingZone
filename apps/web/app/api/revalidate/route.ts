import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

/**
 * On-demand revalidation endpoint.
 *
 * Page segments carry long `revalidate` windows as a safety net, not as the
 * freshness mechanism. This endpoint is the freshness mechanism: the content
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

/**
 * Convenience tag aliases so simple callers don't need to know the tag
 * namespace. These are deliberately the *broad* tags: they drop every cache
 * entry in that feature, which is correct but pays for the whole feature.
 *
 * Prefer passing fine-grained tags directly (`news:article:<id>`,
 * `games:<endpoint>`, `news:articles:<category>:<lang>`) when you know which
 * entries changed — a new esports article does not need to invalidate the
 * reviews feed.
 *
 * `home` was removed: it carried no tags and existed only to force both locale
 * home paths to regenerate. Pass those paths explicitly alongside the tags that
 * actually changed.
 */
const TARGET_TAGS: Record<string, string[]> = {
  news: ["news"],
  games: ["games"],
  events: ["events"],
};

/**
 * Header-only auth. This previously also accepted `?secret=`, which leaked
 * REVALIDATE_SECRET into function logs, CDN access logs and any outbound
 * Referer — a plaintext credential in a URL. Callers send it as a bearer token.
 */
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return false;

  return request.headers.get("authorization") === `Bearer ${secret}`;
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

  if (body.target && !(body.target in TARGET_TAGS)) {
    return NextResponse.json(
      {
        revalidated: false,
        error: `Unknown target "${body.target}". Expected one of: ${Object.keys(TARGET_TAGS).join(", ")}, or omit it and pass paths/tags directly`,
      },
      { status: 400 },
    );
  }

  const tags = new Set<string>(body.tags ?? []);
  const paths = new Set<string>(body.paths ?? []);

  (TARGET_TAGS[body.target as string] ?? []).forEach((t) => tags.add(t));

  // Paths are explicit and never inferred. This endpoint used to add /en and /ar
  // on any target, so a call meant to refresh one article also re-rendered both
  // home pages — which then re-read the news feed, the event carousel and the
  // trailer list. Each caller now names the paths its change actually affects.
  //
  // Both halves are required for immediate freshness: revalidateTag alone only
  // expires the data-cache entries, and a page whose ISR entry is still within
  // its window is served from cache without re-rendering.
  const invalidPaths = [...paths].filter((p) => !p.startsWith("/"));
  if (invalidPaths.length > 0) {
    return NextResponse.json(
      {
        revalidated: false,
        error: `Paths must start with "/". Invalid: ${invalidPaths.join(", ")}`,
      },
      { status: 400 },
    );
  }

  if (tags.size === 0 && paths.size === 0) {
    return NextResponse.json(
      {
        revalidated: false,
        error:
          "Nothing to do: supply paths, tags, or a target. A call that invalidates nothing just burns an invocation.",
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

  console.log(
    `[revalidate] target=${body.target ?? "none"} ` +
      `tags=${[...tags].join(",") || "none"} paths=${[...paths].join(",") || "none"}`,
  );

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
