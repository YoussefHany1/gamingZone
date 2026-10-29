import React from "react";
import Image from "next/image";
import { CalendarDays, Gamepad2, Monitor, Users } from "lucide-react";
import {
  PROFILE_LINK_PLATFORMS,
  flagEmoji,
  profileLinkUrl,
  type ProfileLink,
  type ProfileLinkPlatform,
  type PublicProfile,
} from "@gaming-zone/core";
import { getTranslations } from "@/i18n/server";

const PLATFORM_LABEL_KEYS: Record<string, string> = {
  pc: "settings.profile.platforms.pc",
  playstation: "settings.profile.platforms.playstation",
  xbox: "settings.profile.platforms.xbox",
  nintendo: "settings.profile.platforms.nintendo",
  android: "settings.profile.platforms.android",
  ios: "settings.profile.platforms.ios",
};

const LINK_LABELS: Record<ProfileLinkPlatform, string> = {
  steam: "Steam",
  psn: "PlayStation",
  xbox: "Xbox",
  discord: "Discord",
};

function initials(name: string): string {
  const first = name.trim()[0];
  return first ? first.toUpperCase() : "G";
}

function memberSince(value: number | null, locale: string): string | null {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString(locale === "ar" ? "ar" : "en", {
      month: "long",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

function visibleLinks(profile: PublicProfile): ProfileLink[] {
  if (!profile.privacy.showLinks) return [];
  return PROFILE_LINK_PLATFORMS.map((platform) => profile.links[platform]).filter(
    (link): link is ProfileLink => Boolean(link?.visible),
  );
}

/**
 * The public `/u/[handle]` card.
 *
 * Server-rendered (no client hooks): a shared profile link should paint without
 * waiting for the auth store, and the document is already read server-side.
 * Optional sections are omitted rather than shown empty, so a freshly claimed
 * profile still looks finished.
 */
export default function PublicProfileCard({
  profile,
  locale,
}: {
  profile: PublicProfile;
  locale: string;
}) {
  const t = getTranslations(locale);
  const links = visibleLinks(profile);
  const joined = memberSince(profile.createdAt, locale);
  const flag = flagEmoji(profile.country);
  const platformLabel = PLATFORM_LABEL_KEYS[profile.platform]
    ? t(PLATFORM_LABEL_KEYS[profile.platform])
    : "";
  const showStats =
    profile.privacy.showStats && (profile.counts.friends > 0 || profile.counts.sessions > 0);

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl border border-white/10">
          {/* Banner */}
          <div className="relative h-40 sm:h-56 w-full bg-linear-to-tr from-light-blue/25 to-secondary-blue/25">
            {profile.bannerURL && (
              <Image
                src={profile.bannerURL}
                alt=""
                fill
                priority
                sizes="(max-width: 768px) 100vw, 672px"
                className="object-cover"
              />
            )}
          </div>

          <div className="px-6 sm:px-8 pb-8">
            {/* Identity */}
            <div className="-mt-14 sm:-mt-16 flex items-end gap-4">
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 rounded-full overflow-hidden border-4 border-primary-bg bg-dark-bg shadow-xl">
                {profile.photoURL ? (
                  <Image
                    src={profile.photoURL}
                    alt={profile.displayName}
                    fill
                    sizes="128px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-linear-to-tr from-light-blue to-secondary-blue flex items-center justify-center">
                    <span className="text-4xl font-bold text-white">
                      {initials(profile.displayName)}
                    </span>
                  </div>
                )}
              </div>

              <div className="pb-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-black text-white truncate">
                  {profile.displayName}
                </h1>
                <p className="text-light-blue font-semibold">@{profile.handle}</p>
              </div>
            </div>

            {/* Status */}
            {profile.status && (
              <div className="inline-flex items-center gap-2 mt-4 px-3 py-1.5 rounded-full bg-light-blue/15 border border-light-blue/25">
                {profile.status.emoji && <span>{profile.status.emoji}</span>}
                <span className="text-sm text-white">{profile.status.text}</span>
              </div>
            )}

            {/* Bio */}
            {profile.bio && (
              <p className="mt-4 text-gray-300 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                {profile.bio}
              </p>
            )}

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-5 text-sm text-gray-400">
              {platformLabel && (
                <span className="inline-flex items-center gap-1.5">
                  {profile.platform === "pc" ? (
                    <Monitor className="w-4 h-4 text-light-blue" />
                  ) : (
                    <Gamepad2 className="w-4 h-4 text-light-blue" />
                  )}
                  {platformLabel}
                </span>
              )}
              {joined && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-light-blue" />
                  {t("settings.profileShowcase.memberSince")} {joined}
                </span>
              )}
              {flag && (
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden>{flag}</span>
                  <span>{profile.country}</span>
                </span>
              )}
            </div>

            {/* Stats (Phase 2 fills the counters; hidden while both are zero) */}
            {showStats && (
              <div className="grid grid-cols-2 gap-3 mt-6">
                <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                  <div className="flex items-center gap-2 text-gray-400 text-xs">
                    <Users className="w-4 h-4 text-light-blue" />
                    {t("social.profile.stats.friends")}
                  </div>
                  <p className="text-xl font-bold text-white mt-1">{profile.counts.friends}</p>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                  <div className="flex items-center gap-2 text-gray-400 text-xs">
                    <Gamepad2 className="w-4 h-4 text-light-blue" />
                    {t("social.profile.stats.sessions")}
                  </div>
                  <p className="text-xl font-bold text-white mt-1">{profile.counts.sessions}</p>
                </div>
              </div>
            )}

            {/* Linked accounts */}
            {links.length > 0 && (
              <section className="mt-8">
                <h2 className="text-lg font-bold text-white mb-3">
                  {t("social.profile.linksTitle")}
                </h2>
                <ul className="rounded-xl bg-white/5 border border-white/10 divide-y divide-white/10">
                  {links.map((link) => {
                    const url = profileLinkUrl(link);
                    return (
                      <li
                        key={link.platform}
                        className="flex items-center justify-between gap-4 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-xs text-gray-400">{LINK_LABELS[link.platform]}</p>
                          <p className="text-sm font-semibold text-white truncate">
                            {link.identifier}
                          </p>
                        </div>
                        {url && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 text-sm font-semibold text-light-blue hover:underline"
                          >
                            {t("social.profile.openLink")}
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
