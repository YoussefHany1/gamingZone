"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLangStore } from "../store/useLangStore";
import { useAuthStore } from "../store/useAuthStore";
import { auth as firebaseAuth } from "../lib/firebase";
import { signOut, signInAnonymously } from "firebase/auth";
import Image from "next/image";
import {
  Gamepad2,
  Newspaper,
  Home,
  User,
  MessageSquare,
  Globe,
  LogOut,
  Menu,
  X,
  Bookmark,
} from "lucide-react";

export default function Header() {
  const pathname = usePathname();
  const { lang, setLang, t } = useLangStore();
  const user = useAuthStore((state) => state.user);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleLanguage = () => {
    setLang(lang === "en" ? "ar" : "en");
  };

  // Match mobile: sign out then sign back in as anonymous
  const handleSignOut = async () => {
    try {
      await signOut(firebaseAuth);
      await signInAnonymously(firebaseAuth);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const navLinks = [
    { href: "/", label: t("navigation.tabs.home"), icon: Home },
    { href: "/news", label: t("navigation.tabs.news"), icon: Newspaper },
    { href: "/games", label: t("navigation.tabs.games"), icon: Gamepad2 },
    ...(user && !user.isAnonymous
      ? [
          {
            href: "/lists",
            label: t("navigation.titles.myLists"),
            icon: Bookmark,
          },
        ]
      : []),
  ];

  return (
    <header className="sticky top-0 z-50 w-full glass-panel border-b border-white/10 backdrop-blur-md transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link
              id="nav-logo"
              href="/"
              className="flex items-center gap-2 group"
            >
              <div className="bg-gradient-to-tr from-light-blue to-secondary-blue rounded-xl shadow-md group-hover:scale-105 transition-transform duration-300">
                <Image
                  src="/assets/icon.webp"
                  alt="Logo"
                  width={50}
                  height={50}
                />
              </div>
              <span className="text-xl text-nowrap font-extrabold tracking-wider text-white font-outfit">
                Gaming Zone
              </span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  id={`nav-link-${link.href.replace("/", "") || "home"}`}
                  href={link.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? "text-light-blue bg-white/5 border border-white/10"
                      : "text-gray-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Action buttons (Desktop) */}
          <div className="hidden md:flex items-center gap-4">
            {/* Lang Toggler */}
            <button
              id="lang-toggle-desktop"
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 text-sm font-medium transition-all duration-300"
            >
              <Globe className="w-4 h-4" />
              <span>{lang === "en" ? "العربية" : "English"}</span>
            </button>

            {/* User Auth Info */}
            {user && !user.isAnonymous ? (
              <div className="flex items-center gap-4">
                <Link
                  id="nav-profile-desktop"
                  href="/profile"
                  className="flex items-center gap-2 group"
                >
                  {user.photoURL ? (
                    <Image
                      src={user.photoURL}
                      width={32}
                      height={32}
                      alt="Avatar"
                      className="w-8 h-8 rounded-full object-cover border border-light-blue/30 group-hover:border-light-blue/60 transition-colors"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-light-blue to-secondary-blue flex items-center justify-center font-bold text-white text-sm shadow-md">
                      {user.displayName
                        ? user.displayName[0].toUpperCase()
                        : "G"}
                    </div>
                  )}
                </Link>
                <button
                  id="logout-button-desktop"
                  onClick={handleSignOut}
                  className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-300"
                  title={t("settings.menu.signOut")}
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link
                id="login-button-desktop"
                href="/auth/login"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-secondary-blue to-light-blue text-sm font-semibold hover:opacity-90 active:scale-95 transition-all duration-300 shadow-md shadow-light-blue/20"
              >
                {t("auth.login.signInButton")}
              </Link>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex items-center gap-3 md:hidden">
            <button
              id="lang-toggle-mobile"
              onClick={toggleLanguage}
              className="p-2 rounded-lg border border-white/10 text-gray-300 hover:text-white"
            >
              <Globe className="w-5 h-5" />
            </button>
            <button
              id="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gray-400 hover:text-white focus:outline-none"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden glass-panel border-b border-white/10 px-4 pt-2 pb-4 space-y-2 animate-in fade-in slide-in-from-top duration-300">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                id={`nav-link-mobile-${link.href.replace("/", "") || "home"}`}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-base font-medium transition-all ${
                  isActive
                    ? "text-light-blue bg-white/5 border border-white/10"
                    : "text-gray-300 hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
          <div className="border-t border-white/10 pt-4 mt-2">
            {user && !user.isAnonymous ? (
              <div className="space-y-3">
                <Link
                  id="nav-profile-mobile"
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4"
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="Avatar"
                      className="w-10 h-10 rounded-full object-cover border border-light-blue/30"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-light-blue to-secondary-blue flex items-center justify-center font-bold text-white text-base">
                      {user.displayName
                        ? user.displayName[0].toUpperCase()
                        : "G"}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold">
                      {user.displayName || t("common.gamer")}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {user.email}
                    </p>
                  </div>
                </Link>
                <button
                  id="logout-button-mobile"
                  onClick={() => {
                    handleSignOut();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 text-base font-medium transition-all"
                >
                  <LogOut className="w-5 h-5" />
                  <span>{t("settings.menu.signOut")}</span>
                </button>
              </div>
            ) : (
              <Link
                id="login-button-mobile"
                href="/auth/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center py-3 rounded-xl bg-gradient-to-r from-secondary-blue to-light-blue font-semibold shadow-md shadow-light-blue/10"
              >
                {t("auth.login.signInButton")}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
