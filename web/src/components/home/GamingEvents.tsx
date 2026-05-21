"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import axios from "axios";

import { useLangStore } from "../../store/useLangStore";
import { useCountdown } from "../../hooks/useCountdown";
import { Tv, Calendar, Flame, AlertCircle } from "lucide-react";

interface GamingEvent {
  id: number;
  name: string;
  event_logo?: { image_id: string };
  start_time: number;
  end_time: number;
  live_stream_url?: string;
  description?: string;
}

const EventCard = React.memo(function EventCard({ item }: { item: GamingEvent }) {
  const { lang, t } = useLangStore();
  const now = Date.now() / 1000;

  let status: "upcoming" | "live" | "ended" = "ended";
  if (now < item.start_time) status = "upcoming";
  else if (now >= item.start_time && now <= item.end_time) status = "live";

  const countdown = useCountdown(
    status === "upcoming" ? item.start_time : null,
  );

  const formatEventDate = (timestamp: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const imageSrc = item.event_logo
    ? `https://images.igdb.com/igdb/image/upload/t_screenshot_med/${item.event_logo.image_id}.webp`
    : "/image-not-found.webp"; // fallback or static banner

  return (
    <Link
      href={`/events/${item.id}`}
      className={`relative block flex-shrink-0 w-80 h-56 rounded-2xl overflow-hidden glass-panel border transition-all duration-300 group cursor-pointer ${
        status === "live"
          ? "border-live-red/50 shadow-lg shadow-live-red/10"
          : "border-white/10 hover:border-white/20"
      }`}
    >
      {/* Background Cover Image */}
      <Image
        src={imageSrc}
        alt={item.name}
        fill
        sizes="(max-width: 768px) 100vw, 320px"
        className="object-cover object-center z-0 opacity-40 hover:scale-105 transition-transform duration-700"
        unoptimized={!item.event_logo}
      />

      {/* Gradient Dark Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-dark-bg via-dark-bg/60 to-transparent z-10"></div>

      {/* Content */}
      <div className="absolute inset-0 z-20 p-5 flex flex-col justify-between">
        {/* Top Badges */}
        <div className="flex items-center justify-between">
          {status === "live" ? (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-live-red text-[10px] font-extrabold text-white uppercase tracking-wider animate-pulse shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
              {t("home.gamingEvents.live")}
            </span>
          ) : status === "upcoming" ? (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] font-bold text-gray-200">
              {t("home.gamingEvents.upcoming")}
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-gray-500/20 text-[10px] font-bold text-gray-400">
              Ended
            </span>
          )}
        </div>

        {/* Info */}
        <div className="space-y-3">
          <h3 className="text-base font-extrabold line-clamp-2 text-white text-shadow leading-snug">
            {item.name}
          </h3>

          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1 text-gray-400">
              <Calendar className="w-3.5 h-3.5 text-light-blue" />
              <span>{formatEventDate(item.start_time)}</span>
            </span>

            {/* Countdown widget */}
            {countdown && (
              <span className="bg-secondary-blue/30 border border-white/5 px-2 py-0.5 rounded text-[10px] font-mono text-light-blue">
                {countdown.days > 0 ? `${countdown.days}d ` : ""}
                {countdown.hours.toString().padStart(2, "0")}h:
                {countdown.minutes.toString().padStart(2, "0")}m
              </span>
            )}
          </div>

          {/* Action Stream button */}
          {status === "live" && item.live_stream_url && (
            <a
              href={item.live_stream_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 w-full py-2 bg-live-red hover:bg-live-red/90 text-xs font-bold text-white rounded-xl shadow-md transition-all active:scale-95"
            >
              <Tv className="w-4 h-4" />
              <span>{t("home.gamingEvents.watchNowButton")}</span>
            </a>
          )}
        </div>
      </div>
    </Link>
  );
})

const GamingEvents = React.memo(function GamingEvents() {
  const { t } = useLangStore();
  const [events, setEvents] = useState<GamingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const SERVER_URL =
          process.env.NEXT_PUBLIC_SERVER_URL || "/api";
        const response = await axios.get<GamingEvent[]>(`${SERVER_URL}/events`);
        if (Array.isArray(response.data)) {
          setEvents(response.data);
        }
      } catch (err) {
        console.error("Error fetching events:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  return (
    <section className="my-10">
      <div className="flex flex-col gap-1 mb-6 px-4 md:px-0">
        <h2 className="text-2xl font-black bg-gradient-to-r from-white to-light-blue bg-clip-text text-transparent flex items-center gap-2">
          <Flame className="w-6 h-6 text-live-red fill-live-red" />
          {t("home.gamingEvents.header")}
        </h2>
        <p className="text-sm text-gray-400">
          {t("home.gamingEvents.subtitle")}
        </p>
      </div>

      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar px-4 md:px-0">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="flex-shrink-0 w-80 h-56 rounded-2xl glass-panel animate-pulse bg-white/5"
            ></div>
          ))}
        </div>
      ) : error || events.length === 0 ? (
        <div className="glass-panel border border-white/5 rounded-2xl p-8 text-center text-gray-400 mx-4 md:mx-0 flex flex-col items-center gap-2">
          <AlertCircle className="w-10 h-10 text-gray-500" />
          <span>{t("home.gamingEvents.noEvents")}</span>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 px-4 md:px-0 scroll-smooth snap-x scrollbar">
          {events.map((event) => (
            <EventCard key={event.id} item={event} />
          ))}
        </div>
      )}
    </section>
  );
})

export default GamingEvents;
