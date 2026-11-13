import { useEffect, useState } from "react";
import { Image, type ImageProps } from "expo-image";

/**
 * Neutral, dark-to-medium gray blurhash used as a fallback placeholder.
 * Chosen to avoid a bright flash in dark mode while remaining subtle in light mode.
 */
const DEFAULT_BLURHASH = "LGF5]+Yk^6#M@-5c,1J5@[or[Q6.";

type ImageSourceProp = ImageProps["source"];

/** Bundled fallback asset; resolved by Metro at build time. */
function getFallbackImage(): NonNullable<ImageSourceProp> {
  return require("@/assets/image-not-found.webp");
}

function isRemoteUri(uri: unknown): boolean {
  return typeof uri === "string" && /^(https?:)?\/\//i.test(uri);
}

/**
 * Remote sources get progressive-loading defaults; local assets
 * (`require(...)`, `file://`, `content://`, data URIs, native refs) load
 * instantly and should not flash a placeholder or fade in.
 */
function isRemoteSource(source: ImageSourceProp): boolean {
  if (source == null) return false;
  const first = Array.isArray(source) ? source[0] : source;
  if (typeof first === "string") return isRemoteUri(first);
  if (typeof first === "number") return false;
  if (first && typeof first === "object" && "uri" in first) {
    return isRemoteUri((first as { uri?: unknown }).uri);
  }
  return false;
}

export type AppImageProps = ImageProps;

export default function AppImage({
  placeholder,
  transition,
  source,
  onError,
  onLoad,
  ...rest
}: AppImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [source]);

  const isRemote = isRemoteSource(source);
  const resolvedSource = failed || source == null ? getFallbackImage() : source;

  return (
    <Image
      source={resolvedSource}
      {...(placeholder !== undefined
        ? { placeholder }
        : isRemote
          ? { placeholder: DEFAULT_BLURHASH }
          : {})}
      {...(transition !== undefined
        ? { transition }
        : isRemote
          ? { transition: 300 }
          : {})}
      onError={(event) => {
        setFailed(true);
        onError?.(event);
      }}
      onLoad={(event) => {
        onLoad?.(event);
      }}
      {...rest}
    />
  );
}
