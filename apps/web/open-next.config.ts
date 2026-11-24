import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";
import doShardedTagCache from "@opennextjs/cloudflare/overrides/tag-cache/do-sharded-tag-cache";

/**
 * Cloudflare runtime configuration for OpenNext.
 *
 * The app uses ISR (`revalidate` exports), `unstable_cache`, and on-demand
 * `revalidatePath`/`revalidateTag`, so the default in-memory "dummy" caches
 * are not enough. These overrides persist the cache in R2 and use Durable
 * Objects for revalidation queueing and tag invalidation.
 */
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  queue: doQueue,
  tagCache: doShardedTagCache({ baseShardSize: 12 }),
});
