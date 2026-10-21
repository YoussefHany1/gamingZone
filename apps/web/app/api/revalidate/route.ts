import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

/**
 * On-demand revalidation endpoint for the external content workflows (the RSS
 * ingest pipeline and anything else that publishes fresh content), hosted on
 * Cloud Run. There is revalidate-path machinery nowhere else in the app reusing
 * this module, and no Vercel cron; this endpoint is the only caller surface.
 *
 * Contract (POST, header `x-revalidate-secret` = env REVALIDATE_SECRET):
 *   { "paths": ["/en/", "/ar/news/esports", ...],
 *     "tags":  ["news:feed:esports", "news:sources:hardware", ...] }
 * Both fields are optional, but at least one must be non-empty. Paths are best
 * for full-page freshness (the workflow revalidates the home pages here, as it
 * historically did); tags are the precision tool — see the tag list below for
 * what each ingest step should invalidate.
 *
 * Tag-safe allowance — the regex below mirrors exactly the tags minted by the
 * fetchers: "news", "games", "events" plus colon-scoped variants they mint
 * (news:articles:<cat>:<lang>, news:feed:<cat>, news:sources:<cat>,
 * news:source:<name>, news:article:<id>, news:weekly-summary,
 * games:details:<id>, events, and any steam:* keys added later). Broadening the
 * namespace would let the worker invalidate cache entries it does not own, so
 * unknown tags are rejected rather than ignored.
 */
const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET || "";

// Everything under these prefixes is used by the fetchers; see module docs.
const TAG_PATTERN =
  /^(?:news|games|events|steam)(?::[a-zA-Z0-9._-]+)*$/;

// Localized routes plus the sitemap. Paths are validated before revalidatePath
// on the same grounds as tags: it purges CDN entries, so arbitrary strings
// would give the caller power to purge anything.
const PATH_PATTERN = /^(\/(?:en|ar)(?:\/[^\s]*)?|\/sitemap\.xml)$/;

type RevalidateBody = {
  paths?: unknown;
  tags?: unknown;
};

function pickStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export async function POST(request: Request) {
  if (!REVALIDATE_SECRET) {
    console.error(
      "[/api/revalidate] REVALIDATE_SECRET is not configured — refusing all calls",
    );
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const supplied =
    request.headers.get("x-revalidate-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (supplied !== REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as RevalidateBody | null;
  const rawPaths = pickStrings(body?.paths);
  const rawTags = pickStrings(body?.tags);

  if (rawPaths.length === 0 && rawTags.length === 0) {
    return NextResponse.json(
      { error: "At least one of paths or tags is required" },
      { status: 400 },
    );
  }

  const paths = [...new Set(rawPaths)].filter((p) => PATH_PATTERN.test(p));
  const tags = [...new Set(rawTags)].filter((t) => TAG_PATTERN.test(t));
  const rejectedTags = rawTags.length - tags.length;
  const rejectedPaths = rawPaths.length - paths.length;

  for (const path of paths) revalidatePath(path);
  // "max": stale-while-revalidate with the widest served-stale window — the
  // next visitor always gets content immediately while the regeneration runs.
  for (const tag of tags) revalidateTag(tag, "max");

  return NextResponse.json({
    revalidated: { paths, tags },
    rejected: rejectedPaths || rejectedTags ? { paths: rejectedPaths, tags: rejectedTags } : undefined,
  });
}
