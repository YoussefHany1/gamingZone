import { notFound } from "next/navigation";
import { Metadata } from "next";



import {
  EventCountdown,
  EventVideoCard,
  EventGameCard,
  EventStreamButton,
  EventHero,
  EventDates,
  EventNetworks,
  fetchEventDetails,
  getEventStatus,
} from "@/features/events";

export async function generateMetadata(props: {
  params: Promise<{ id: string; locale: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const { id, locale } = params;
  const event = await fetchEventDetails(id);

  if (!event) {
    return {
      title:
        locale === "en"
          ? "Event Details | Gaming Zone"
          : "تفاصيل الفعالية | Gaming Zone",
      icons: {
        icon: "/assets/icon.webp",
      },
    };
  }

  return {
    title: ` Gaming Zone | ${event.name}`,
    description:
      event.description ||
      (locale === "en"
        ? `Follow live coverage, schedule, and games of ${event.name} on Gaming Zone.`
        : `تابع التغطية المباشرة والمواعيد وجدول فعاليات وألعاب ${event.name} على جيمنج زون.`),
    icons: {
      icon: "/assets/icon.webp",
    },
    openGraph: {
      title: event.name,
      description:
        event.description ||
        (locale === "en"
          ? `Coverage and schedule of ${event.name} gaming event.`
          : `تغطية ومواعيد فعالية الألعاب ${event.name}.`),
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

import { getTranslations } from "@/i18n/server";

export default async function EventDetailsPage(props: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const params = await props.params;
  const { id, locale } = params;
  const event = await fetchEventDetails(id);

  if (!event) {
    notFound();
  }

  const status = getEventStatus(event.start_time, event.end_time);
  const t = getTranslations(locale);

  return (
    <div className="w-full flex flex-col text-white bg-primary relative">
      

      <main className="grow w-full flex flex-col pb-16">
        <EventHero event={event} status={status} />

        {/* CONTENT SECTION */}
        <section className="w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-8 mt-8 space-y-12">
          <EventDates startTime={event.start_time} endTime={event.end_time} />

          {/* Countdown */}
          {status === "upcoming" && (
            <div className="flex flex-col items-center sm:items-start">
              <h2 className="text-xl font-black text-white mb-2">
                {t("home.events.startsIn") || "Starts In"}
              </h2>
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
              <h2 className="text-xl font-black text-white mb-4">
                {t("games.details.about")}
              </h2>
              <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                {event.description}
              </p>
            </div>
          )}

          <EventNetworks networks={event.event_networks} />

          {/* Videos */}
          {event.videos && event.videos.length > 0 && (
            <div>
              <h2 className="text-xl font-black text-white mb-4">
                {t("games.details.videos")}
              </h2>
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
                {t("home.events.featuredGames") || "Featured Games"}
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

      
    </div>
  );
}
