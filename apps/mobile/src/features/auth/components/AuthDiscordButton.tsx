import React, { memo } from "react";
import { DiscordIcon } from "@/src/components/icons/BrandIcons";
import AuthBrandButton from "./AuthBrandButton";
import type { AuthButtonProps } from "./types";

// Fixed Discord brand gradient ("blurple") — intentionally identical in both
// themes, mirroring the Google button.
const GRADIENT_COLORS = ["#5865F2", "#4752C4"] as const;

/** Discord sign-in button rendered on the brand gradient. */
const AuthDiscordButton: React.FC<AuthButtonProps> = (props) => (
  <AuthBrandButton
    {...props}
    gradientColors={GRADIENT_COLORS}
    icon={<DiscordIcon size={28} fill="#ffffff" />}
  />
);

export default memo(AuthDiscordButton);
