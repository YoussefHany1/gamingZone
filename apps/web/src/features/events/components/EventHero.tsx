import Image from "next/image";
import Link from "@/components/Link";
import { ArrowLeft } from "lucide-react";
import { GamingEvent } from "@/types";

interface EventHeroProps {
  event: GamingEvent;
  status: "upcoming" | "live" | "ended";
}

export default function EventHero({ event, status }: EventHeroProps) {
  const logoUri = event.event_logo?.image_id
    ? `https://images.igdb.com/igdb/image/upload/t_screenshot_big/${event.event_logo.image_id}.webp`
    : null;

  return (
    <section className="relative w-full h-80 sm:h-96 md:h-[450px] flex items-end p-6 md:p-12 overflow-hidden">
      <div className="absolute inset-0 z-0">
        {logoUri ? (
          <Image src={logoUri} alt={event.name} fill className="object-cover" />
        ) : (
          <Image src="/assets/image-not-found.webp" alt="Not found" fill className="object-cover" />
        )}
        {/* Dark Gradients */}
        <div className="absolute inset-0 bg-linear-to-t from-dark-bg via-dark-bg/60 to-dark-bg/20"></div>
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col gap-4">
        <Link
          href="/"
          className="absolute -top-16 sm:-top-24 left-0 w-10 h-10 rounded-full bg-dark-bg/65 flex items-center justify-center hover:bg-light-blue transition-colors border border-white/10 backdrop-blur-sm"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </Link>

        <div className="flex gap-2 mb-2">
          {status === "live" && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-linear-to-r from-live-red to-red-400 text-xs font-bold text-white uppercase shadow-lg shadow-live-red/30">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              LIVE
            </span>
          )}
          {status === "upcoming" && (
            <span className="px-3 py-1.5 rounded-xl bg-secondary-blue/80 border border-light-blue/50 text-xs font-bold text-white uppercase backdrop-blur-md">
              Upcoming
            </span>
          )}
          {status === "ended" && (
            <span className="px-3 py-1.5 rounded-xl bg-gray-600/80 border border-gray-400/50 text-xs font-bold text-gray-300 uppercase backdrop-blur-md">
              Ended
            </span>
          )}
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white text-shadow-lg leading-tight">
          {event.name}
        </h1>
      </div>
    </section>
  );
}
