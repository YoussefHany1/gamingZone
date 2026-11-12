import { Image, type ImageProps } from "expo-image";

/**
 * Neutral, dark-to-medium gray blurhash used as a fallback placeholder.
 * Chosen to avoid a bright flash in dark mode while remaining subtle in light mode.
 */
const DEFAULT_BLURHASH = "LGF5]+Yk^6#M@-5c,1J5@[or[Q6.";

export type AppImageProps = ImageProps;

export default function AppImage({
  placeholder,
  transition = 300,
  ...rest
}: AppImageProps) {
  return (
    <Image
      placeholder={placeholder ?? DEFAULT_BLURHASH}
      transition={transition}
      {...rest}
    />
  );
}
