import React from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import axios from "axios";
import {
  ArrowLeft,
  Calendar,
  Flag,
  PlayCircle,
  Radio,
  Globe,
  MessageSquare,
  Camera,
  Tv,
  MonitorPlay,
  Users,
  Gamepad2,
} from "lucide-react";

import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import EventCountdown from "../../../components/events/EventCountdown";
import EventVideoCard from "../../../components/events/EventVideoCard";
import EventGameCard from "../../../components/events/EventGameCard";
import EventStreamButton from "../../../components/events/EventStreamButton";

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/api` : "http://localhost:3000/api");

interface GamingEvent {
  id: number;
  name: string;
  event_logo?: { image_id: string };
  start_time: number;
  end_time: number;
  live_stream_url?: string;
  description?: string;
  event_networks?: { network_type: number; url: string }[];
  videos?: { video_id: string; name: string }[];
  games?: { id: number; name: string; cover?: { image_id: string } }[];
}

const NETWORK_ICONS: Record<
  number,
  { icon: React.ReactNode; color: string; label: string }
> = {
  1: {
    icon: <MessageSquare className="w-5 h-5" />,
    color: "#1DA1F2",
    label: "X",
  },
  2: {
    icon: <Camera className="w-5 h-5" />,
    color: "#E1306C",
    label: "Instagram",
  },
  3: { icon: <Tv className="w-5 h-5" />, color: "#FF0000", label: "YouTube" },
  4: {
    icon: <MonitorPlay className="w-5 h-5" />,
    color: "#9146FF",
    label: "Twitch",
  },
  5: {
    icon: <Gamepad2 className="w-5 h-5" />,
    color: "#5865F2",
    label: "Discord",
  },
  6: {
    icon: <Users className="w-5 h-5" />,
    color: "#1877F2",
    label: "Facebook",
  },
  7: {
    icon: <Globe className="w-5 h-5" />,
    color: "#779bdd",
    label: "Website",
  },
};

function formatEventDate(timestamp: number) {
  if (!timestamp) return "";
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function fetchEventDetails(id: string): Promise<GamingEvent | null> {
  try {
    const response = await axios.get<GamingEvent[]>(`${SERVER_URL}/events`);
    if (Array.isArray(response.data)) {
      return response.data.find((e) => e.id.toString() === id) || null;
    }
    return null;
  } catch (error) {
    console.error("Error fetching event details:", error);
    return null;
  }
}

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const event = await fetchEventDetails(params.id);

  if (!event) {
    return { title: "تفاصيل الفعالية | Gaming Zone" };
  }

  const logoUri = event.event_logo?.image_id
    ? `https://images.igdb.com/igdb/image/upload/t_screenshot_big/${event.event_logo.image_id}.webp`
    : "https://images.igdb.com/igdb/image/upload/t_screenshot_med/sc8z2q.webp";

  return {
    title: `${event.name} | Gaming Zone`,
    description:
      event.description ||
      `تابع التغطية المباشرة والمواعيد وجدول فعاليات وألعاب ${event.name} على جيمنج زون.`,
    openGraph: {
      title: event.name,
      description:
        event.description || `تغطية ومواعيد فعالية الألعاب ${event.name}.`,
      images: [
        {
          url: "/assets/cover2.png",
          width: 1024,
          height: 500,
          alt: "Gaming Zone Banner",
        },
      ],
      siteName: "Gaming Zone",
      type: "video.other",
    },
  };
}

export default async function EventDetailsPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const event = await fetchEventDetails(params.id);

  if (!event) {
    notFound();
  }

  const now = Date.now() / 1000;
  let status: "upcoming" | "live" | "ended" = "ended";
  if (now < event.start_time) status = "upcoming";
  else if (now >= event.start_time && now <= event.end_time) status = "live";

  const logoUri = event.event_logo?.image_id
    ? `https://images.igdb.com/igdb/image/upload/t_screenshot_big/${event.event_logo.image_id}.webp`
    : null;

  return (
    <div className="min-h-screen flex flex-col text-white bg-primary relative">
      <Header />

      <main className="flex-grow w-full flex flex-col pb-16">
        {/* HERO SECTION */}
        <section className="relative w-full h-80 sm:h-96 md:h-[450px] flex items-end p-6 md:p-12 overflow-hidden">
          <div className="absolute inset-0 z-0">
            {logoUri ? (
              <Image
                src={logoUri}
                alt={event.name}
                fill
                className="object-cover"
              />
            ) : (
              <Image
                src="/assets/image-not-found.webp"
                alt="Not found"
                fill
                className="object-cover"
              />
            )}
            {/* Dark Gradients */}
            <div className="absolute inset-0 bg-gradient-to-t from-dark-bg via-dark-bg/60 to-dark-bg/20"></div>
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
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-live-red to-red-400 text-xs font-bold text-white uppercase shadow-lg shadow-live-red/30">
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

        {/* CONTENT SECTION */}
        <section className="w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-8 mt-8 space-y-12">
          {/* Dates Row */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4 shadow-md glass-panel">
              <Calendar className="w-6 h-6 text-gray-400" />
              <div>
                <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Starts
                </span>
                <span className="block text-sm font-medium text-white">
                  {formatEventDate(event.start_time)}
                </span>
              </div>
            </div>
            <div className="flex-1 flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4 shadow-md glass-panel">
              <Flag className="w-6 h-6 text-gray-400" />
              <div>
                <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Ends
                </span>
                <span className="block text-sm font-medium text-white">
                  {formatEventDate(event.end_time)}
                </span>
              </div>
            </div>
          </div>

          {/* Countdown */}
          {status === "upcoming" && (
            <div className="flex flex-col items-center sm:items-start">
              <h2 className="text-xl font-black text-white mb-2">Starts In</h2>
              <EventCountdown startTime={event.start_time} />
            </div>
          )}

          {/* Stream Button */}
          {event.live_stream_url && (
            <div>
              <EventStreamButton url={event.live_stream_url} status={status} />
            </div>
          )}

          {/* About */}
          {event.description && (
            <div>
              <h2 className="text-xl font-black text-white mb-4">About</h2>
              <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                {event.description}
              </p>
            </div>
          )}

          {/* Networks */}
          {event.event_networks && event.event_networks.length > 0 && (
            <div>
              <h2 className="text-xl font-black text-white mb-4">
                Links & Social
              </h2>
              <div className="flex flex-wrap gap-3">
                {event.event_networks.map((net, i) => {
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
                        { color: info.color },
                      )}
                      <span
                        className="text-sm font-semibold"
                        style={{ color: info.color }}
                      >
                        {info.label}
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Videos */}
          {event.videos && event.videos.length > 0 && (
            <div>
              <h2 className="text-xl font-black text-white mb-4">Videos</h2>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar">
                {event.videos.map((vid) => (
                  <EventVideoCard key={vid.video_id} video={vid} />
                ))}
              </div>
            </div>
          )}

          {/* Featured Games */}
          {event.games && event.games.length > 0 && (
            <div>
              <h2 className="text-xl font-black text-white mb-4">
                Featured Games
              </h2>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar">
                {event.games.map((g) => (
                  <EventGameCard key={g.id} game={g} />
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
