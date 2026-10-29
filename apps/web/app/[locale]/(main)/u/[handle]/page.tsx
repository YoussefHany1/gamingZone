import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { normalizeHandle } from "@gaming-zone/core";
import { createLocalizedMetadata } from "@/lib/metadata";
import { getPublicProfileByHandle } from "@/features/profile/services/server";
import PublicProfileCard from "@/features/profile/components/PublicProfileCard";
import { ProfileActions } from "@/features/social/components/ProfileActions";

/**
 * Public profile page.
 *
 * Handles live under `/u/{handle}` (see `profilePath` in core); the data is read
 * server-side from the `profiles` projection, never from the private
 * `users/{uid}` document. One minute of ISR keeps edits from appearing
 * instantly but avoids a function invocation on every share-link hit.
 */
export const revalidate = 60;

export async function generateMetadata(props: {
  params: Promise<{ handle: string; locale: string }>;
}): Promise<Metadata> {
  const { handle, locale } = await props.params;
  const normalized = normalizeHandle(handle);
  const profile = await getPublicProfileByHandle(normalized);

  const base = await createLocalizedMetadata({
    en: {
      title: "Player Profile | Gaming Zone",
      description:
        "See this player's profile, status and linked gaming accounts on Gaming Zone.",
    },
    ar: {
      title: "ملف اللاعب | Gaming Zone",
      description:
        "شاهد ملف هذا اللاعب وحالته وحساباته المرتبطة على جيمنج زون.",
    },
    path: `/u/${normalized}`,
  })({ params: Promise.resolve({ locale }) });

  if (!profile) {
    return { ...base, robots: { index: false, follow: false } };
  }

  const title = `${profile.displayName} (@${profile.handle}) | Gaming Zone`;
  const description =
    profile.bio ||
    (locale === "ar"
      ? `شاهد ملف ${profile.displayName} على جيمنج زون.`
      : `See ${profile.displayName}'s profile on Gaming Zone.`);

  return {
    ...base,
    title,
    description,
    openGraph: {
      ...base.openGraph,
      title,
      description,
      images: [
        {
          url: profile.bannerURL ?? profile.photoURL ?? "/assets/cover2.png",
          alt: profile.displayName,
        },
      ],
    },
  };
}

export default async function PublicProfilePage(props: {
  params: Promise<{ handle: string; locale: string }>;
}) {
  const { handle, locale } = await props.params;
  const profile = await getPublicProfileByHandle(handle);

  if (!profile) {
    notFound();
  }

  return (
    <>
      <PublicProfileCard profile={profile} locale={locale} />
      <div className="max-w-2xl mx-auto px-4 -mt-10 pb-10">
        <ProfileActions uid={profile.uid} />
      </div>
    </>
  );
}
