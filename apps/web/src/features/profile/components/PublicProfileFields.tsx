import React from "react";
import { AtSign, Image as ImageIcon, Smile, Text } from "lucide-react";
import Image from "next/image";
import Link from "@/components/Link";
import {
  PROFILE_BIO_MAX_LENGTH,
  PROFILE_STATUS_MAX_LENGTH,
  type ProfilePrivacy,
} from "@gaming-zone/core";
import type { TranslateFn } from "@/i18n/translate";
import type { HandleSubmitError } from "../hooks/useProfile";

const INPUT_CLASSES =
  "w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30 transition-all duration-300";

const LABEL_CLASSES = "flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2";

export type PublicProfileFieldsProps = {
  t: TranslateFn;
  handle: string;
  claimedHandle: string;
  handleError: HandleSubmitError | null;
  claiming: boolean;
  onHandleChange: (value: string) => void;
  onClaimHandle: () => Promise<void> | void;
  bannerPreviewUrl: string | null;
  bannerInputRef: React.RefObject<HTMLInputElement | null>;
  onPickBanner: () => void;
  onBannerChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveBanner: () => void;
  bio: string;
  onBioChange: (value: string) => void;
  statusEmoji: string;
  onStatusEmojiChange: (value: string) => void;
  statusText: string;
  onStatusTextChange: (value: string) => void;
  privacy: ProfilePrivacy;
  onPrivacyChange: (patch: Partial<ProfilePrivacy>) => void;
  profileHref: string | null;
};

type PrivacyRowProps = {
  title: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

function PrivacyRow({ title, hint, checked, onChange }: PrivacyRowProps) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 rounded border-white/20 bg-white/5 accent-light-blue"
      />
      <span>
        <span className="block text-sm font-semibold text-white">{title}</span>
        <span className="block text-xs text-gray-400">{hint}</span>
      </span>
    </label>
  );
}

/**
 * Discord-style personalisation for `profiles/{uid}`.
 *
 * Kept separate from the account fields: these values are the public
 * projection only, and saving them must not touch the Auth profile or the
 * private `users/{uid}` document (the hook mirrors the shared fields).
 */
export function PublicProfileFields({
  t,
  handle,
  claimedHandle,
  handleError,
  claiming,
  onHandleChange,
  onClaimHandle,
  bannerPreviewUrl,
  bannerInputRef,
  onPickBanner,
  onBannerChange,
  onRemoveBanner,
  bio,
  onBioChange,
  statusEmoji,
  onStatusEmojiChange,
  statusText,
  onStatusTextChange,
  privacy,
  onPrivacyChange,
  profileHref,
}: PublicProfileFieldsProps) {
  const handleUnchanged = claimedHandle !== "" && handle.trim().toLowerCase() === claimedHandle;

  return (
    <section className="pt-8 mt-2 border-t border-white/10 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">
          {t("social.profile.publicProfile")}
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          {t("social.profile.publicProfileHint")}
        </p>
      </div>

      {/* Banner */}
      <div>
        <label className={LABEL_CLASSES}>
          <ImageIcon className="w-4 h-4 text-light-blue" />
          {t("social.profile.banner")}
        </label>
        <div className="relative w-full h-32 rounded-xl overflow-hidden border border-white/10 bg-white/5">
          {bannerPreviewUrl ? (
            <Image
              src={bannerPreviewUrl}
              alt={t("social.profile.banner")}
              fill
              sizes="(max-width: 768px) 100vw, 672px"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-linear-to-tr from-light-blue/20 to-secondary-blue/20 flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-white/30" />
            </div>
          )}
        </div>
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onBannerChange}
        />
        <div className="flex gap-3 mt-3">
          <button
            type="button"
            onClick={onPickBanner}
            className="px-4 py-2 rounded-xl border border-light-blue/40 bg-light-blue/10 text-light-blue text-sm font-semibold hover:bg-light-blue/20 transition-colors"
          >
            {t("social.profile.changeBanner")}
          </button>
          {bannerPreviewUrl && (
            <button
              type="button"
              onClick={onRemoveBanner}
              className="px-4 py-2 rounded-xl border border-white/10 text-gray-300 text-sm font-semibold hover:bg-white/5 transition-colors"
            >
              {t("social.profile.removeBanner")}
            </button>
          )}
        </div>
      </div>

      {/* Handle */}
      <div>
        <label className={LABEL_CLASSES} htmlFor="profile-handle">
          <AtSign className="w-4 h-4 text-light-blue" />
          {t("social.profile.handle")}
        </label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 start-4 flex items-center text-gray-400 font-semibold">
              @
            </span>
            <input
              id="profile-handle"
              type="text"
              value={handle}
              onChange={(event) => onHandleChange(event.target.value)}
              placeholder={t("social.profile.handlePlaceholder")}
              autoCapitalize="none"
              autoCorrect="off"
              maxLength={20}
              className={`${INPUT_CLASSES} ps-9`}
            />
          </div>
          <button
            type="button"
            onClick={() => void onClaimHandle()}
            disabled={claiming || handleUnchanged}
            className="px-5 py-3 rounded-xl bg-light-blue text-white text-sm font-bold shadow-lg shadow-light-blue/20 hover:opacity-90 active:scale-[0.98] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {claiming ? t("common.loading") : t("social.profile.handleClaim")}
          </button>
        </div>
        {handleError && (
          <p className="mt-2 text-sm text-red-300">
            {t(`social.profile.handleErrors.${handleError}`)}
          </p>
        )}
        {claimedHandle && (
          <p className="mt-2 text-sm text-gray-400">
            {t("social.profile.handle")}:{" "}
            <span className="text-light-blue">@{claimedHandle}</span>
          </p>
        )}
      </div>

      {/* Bio */}
      <div>
        <label className={LABEL_CLASSES} htmlFor="profile-bio">
          <Text className="w-4 h-4 text-light-blue" />
          {t("social.profile.bio")}
        </label>
        <textarea
          id="profile-bio"
          value={bio}
          onChange={(event) => onBioChange(event.target.value)}
          placeholder={t("social.profile.bioPlaceholder")}
          maxLength={PROFILE_BIO_MAX_LENGTH}
          rows={4}
          className={`${INPUT_CLASSES} resize-none`}
        />
        <p className="mt-1 text-xs text-gray-500 text-end">
          {bio.length}/{PROFILE_BIO_MAX_LENGTH}
        </p>
      </div>

      {/* Status */}
      <div>
        <label className={LABEL_CLASSES} htmlFor="profile-status">
          <Smile className="w-4 h-4 text-light-blue" />
          {t("social.profile.status")}
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={statusEmoji}
            onChange={(event) => onStatusEmojiChange(event.target.value)}
            maxLength={8}
            aria-label={t("social.profile.status")}
            placeholder="🎮"
            className={`${INPUT_CLASSES} w-20 text-center`}
          />
          <input
            id="profile-status"
            type="text"
            value={statusText}
            onChange={(event) => onStatusTextChange(event.target.value)}
            placeholder={t("social.profile.statusPlaceholder")}
            maxLength={PROFILE_STATUS_MAX_LENGTH}
            className={INPUT_CLASSES}
          />
        </div>
      </div>

      {/* Privacy */}
      <div className="space-y-4">
        <PrivacyRow
          title={t("social.profile.privacy.discoverable")}
          hint={t("social.profile.privacy.discoverableHint")}
          checked={privacy.discoverable}
          onChange={(checked) => onPrivacyChange({ discoverable: checked })}
        />
        <PrivacyRow
          title={t("social.profile.privacy.showLinks")}
          hint={t("social.profile.privacy.showLinksHint")}
          checked={privacy.showLinks}
          onChange={(checked) => onPrivacyChange({ showLinks: checked })}
        />
        <PrivacyRow
          title={t("social.profile.privacy.showStats")}
          hint={t("social.profile.privacy.showStatsHint")}
          checked={privacy.showStats}
          onChange={(checked) => onPrivacyChange({ showStats: checked })}
        />
      </div>

      {profileHref && (
        <Link
          href={profileHref}
          className="inline-flex items-center gap-2 text-sm font-semibold text-light-blue hover:underline"
        >
          <AtSign className="w-4 h-4" />
          {t("social.profile.viewPublicProfile")}
        </Link>
      )}
    </section>
  );
}

export default PublicProfileFields;
