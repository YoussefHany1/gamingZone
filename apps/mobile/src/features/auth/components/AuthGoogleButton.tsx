import React, { memo } from "react";
import { GoogleIcon } from "@/src/components/icons/BrandIcons";
import AuthBrandButton from "./AuthBrandButton";
import type { AuthButtonProps } from "./types";

// Fixed Google brand gradient — intentionally identical in both themes,
// so the text/icon colors must not follow the palette either.
const GRADIENT_COLORS = ["#10574b", "#3174f1", "#e92d18", "#c38d0c"] as const;

/** Google sign-in button rendered on the brand gradient. */
const AuthGoogleButton: React.FC<AuthButtonProps> = (props) => (
  <AuthBrandButton
    {...props}
    gradientColors={GRADIENT_COLORS}
    icon={<GoogleIcon size={28} />}
  />
);

export default memo(AuthGoogleButton);
