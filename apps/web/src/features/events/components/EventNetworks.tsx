import React from "react";
import { Globe } from "lucide-react";
import { NETWORK_ICONS } from "../constants";

interface EventNetworksProps {
  networks?: { network_type: number; url: string }[];
}

export default function EventNetworks({ networks }: EventNetworksProps) {
  if (!networks || networks.length === 0) return null;

  return (
    <div>
      <h2 className="text-xl font-black text-white mb-4">Links & Social</h2>
      <div className="flex flex-wrap gap-3">
        {networks.map((net, i) => {
          const info = NETWORK_ICONS[net.network_type] || {
            icon: <Globe className="w-5 h-5" />,
            color: "#779bdd",
            label: "Link",
          };
          return (
            <a
              key={i}
              href={net.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all active:scale-95 hover:-translate-y-0.5 shadow-sm"
              style={{
                backgroundColor: "rgba(81, 105, 150, 0.15)",
                borderColor: `${info.color}60`,
              }}
            >
              {React.cloneElement(
                info.icon as React.ReactElement<{ color?: string }>,
                { color: info.color }
              )}
              <span className="text-sm font-semibold" style={{ color: info.color }}>
                {info.label}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
