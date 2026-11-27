"use client";

import Image from "next/image";
import { Download, Smartphone, X } from "lucide-react";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useLangStore } from "@/store/useLangStore";

const STORAGE_KEY = "gaming_zone_hide_app_download_popup";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.yh.gamingzone&hl=en";

const subscribeToMount = () => () => {};
const getClientMounted = () => true;
const getServerMounted = () => false;

function isAndroidDevice() {
  if (typeof navigator === "undefined") return false;

  const navigatorWithUaData = navigator as Navigator & {
    userAgentData?: { platform?: string };
  };

  if (
    navigatorWithUaData.userAgentData?.platform?.toLowerCase() === "android"
  ) {
    return true;
  }

  return /android/i.test(navigator.userAgent);
}

function getInitialVisibility() {
  if (typeof window === "undefined") return false;

  try {
    return localStorage.getItem(STORAGE_KEY) !== "true";
  } catch {
    return true;
  }
}

function GooglePlayIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 283"
      className={className}
      aria-hidden="true"
    >
      <path fill="#ea4335" d="M119.553 134.916L1.06 259.061a32.14 32.14 0 0 0 47.062 19.071l133.327-75.934z" />
      <path fill="#fbbc04" d="M239.37 113.814L181.715 80.79l-64.898 56.95l65.162 64.28l57.216-32.67a31.345 31.345 0 0 0 0-55.537z" />
      <path fill="#4285f4" d="M1.06 23.487A30.6 30.6 0 0 0 0 31.61v219.327a32.3 32.3 0 0 0 1.06 8.124l122.555-120.966z" />
      <path fill="#34a853" d="m120.436 141.274l61.278-60.483L48.564 4.503A32.85 32.85 0 0 0 32.051 0C17.644-.028 4.978 9.534 1.06 23.399z" />
    </svg>
  );
}

export default function AppDownloadPopup() {
  const { t } = useLangStore();
  const isMounted = useSyncExternalStore(
    subscribeToMount,
    getClientMounted,
    getServerMounted,
  );
  const [isAndroid] = useState(isAndroidDevice);
  const [isVisible, setIsVisible] = useState(getInitialVisibility);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const closePopup = useCallback(() => setIsVisible(false), []);

  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePopup();
    };

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isVisible, closePopup]);

  const handleDontShowAgain = (checked: boolean) => {
    setDontShowAgain(checked);

    try {
      if (checked) {
        localStorage.setItem(STORAGE_KEY, "true");
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      return;
    }
  };

  if (!isMounted || !isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closePopup();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-download-popup-title"
        aria-describedby="app-download-popup-description"
        className="glass-panel relative max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-white/10 p-6 shadow-2xl animate-in zoom-in-95 fade-in duration-300"
      >
        <button
          type="button"
          onClick={closePopup}
          aria-label={t("common.close")}
          className="absolute end-4 top-4 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <Image
            src="/assets/icon.webp"
            alt="Gaming Zone"
            width={88}
            height={88}
            className="mb-4 rounded-2xl shadow-2xl"
          />

          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-light-blue/20 bg-light-blue/10 px-3 py-1 text-xs font-semibold text-light-blue">
            <Smartphone className="h-4 w-4" />
            {t("appAdvertisement.titleHighlight")}
          </span>

          <h2
            id="app-download-popup-title"
            className="text-2xl font-bold leading-tight text-white"
          >
            {t("appAdvertisement.titlePrefix")}{" "}
            <span className="text-light-blue">
              {t("appAdvertisement.titleHighlight")}
            </span>{" "}
            {t("appAdvertisement.titleSuffix")}
          </h2>

          <p
            id="app-download-popup-description"
            className="mt-3 text-sm leading-relaxed text-gray-300"
          >
            {t("appAdvertisement.description")}
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs">
            <Download className="h-3.5 w-3.5 text-light-blue" />
            <span className="font-bold text-white">10k+</span>
            <span className="text-gray-400">
              {t("appAdvertisement.downloadsLabel")}
            </span>
          </div>

          {isAndroid ? (
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-5 py-3 text-black transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] active:scale-100"
            >
              <GooglePlayIcon className="h-7 w-7 shrink-0" />
              <span
                className="flex flex-col items-start leading-none"
                dir="auto"
              >
                <span className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-700">
                  {t("appAdvertisement.getItOn")}
                </span>
                <span className="text-lg font-black">
                  {t("appAdvertisement.googlePlay")}
                </span>
              </span>
            </a>
          ) : (
            <div className="mt-6 flex w-full flex-col items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-white p-3 shadow-lg">
                <Image
                  src="/assets/app-qr.png"
                  alt={t("appAdvertisement.scanQrCode")}
                  width={176}
                  height={176}
                  unoptimized
                  priority
                  style={{ color: "inherit" }}
                  className="h-44 w-44 object-contain"
                />
              </div>
              <p className="text-xs leading-relaxed text-gray-400">
                {t("appAdvertisement.scanQrCode")}
              </p>
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-light-blue hover:underline"
              >
                {t("appAdvertisement.getItOnFooter")}
              </a>
            </div>
          )}

          <label className="mt-5 flex cursor-pointer items-center justify-center gap-2 text-xs text-gray-400 transition-colors hover:text-gray-300">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(event) => handleDontShowAgain(event.target.checked)}
              className="h-4 w-4 cursor-pointer accent-light-blue"
            />
            {t("appAdvertisement.dontShowAgain")}
          </label>
        </div>
      </div>
    </div>
  );
}
