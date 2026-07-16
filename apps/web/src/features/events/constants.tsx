import React from "react";
import { MessageSquare, Camera, Tv, MonitorPlay, Users, Globe, Gamepad2 } from "lucide-react";

export const NETWORK_ICONS: Record<
  number,
  { icon: React.ReactNode; color: string; label: string }
> = {
  1: { icon: <MessageSquare className="w-5 h-5" />, color: "#1DA1F2", label: "X" },
  2: { icon: <Camera className="w-5 h-5" />, color: "#E1306C", label: "Instagram" },
  3: { icon: <Tv className="w-5 h-5" />, color: "#FF0000", label: "YouTube" },
  4: { icon: <MonitorPlay className="w-5 h-5" />, color: "#9146FF", label: "Twitch" },
  5: { icon: <Gamepad2 className="w-5 h-5" />, color: "#5865F2", label: "Discord" },
  6: { icon: <Users className="w-5 h-5" />, color: "#1877F2", label: "Facebook" },
  7: { icon: <Globe className="w-5 h-5" />, color: "#779bdd", label: "Website" },
};
