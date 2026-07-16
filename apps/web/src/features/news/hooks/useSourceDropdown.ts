import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Source } from "../types";

export function useSourceDropdown(
  sources: Source[],
  currentSource: string,
  currentCategory: string,
  activeLang: string
) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selected = sources.find((s) => s.name === currentSource) || sources[0];

  const arabicSources = sources
    .filter((s) => s.language === "ar")
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));
  const englishSources = sources
    .filter((s) => s.language !== "ar")
    .sort((a, b) => a.name.localeCompare(b.name, "en"));

  const arGroup = {
    title: activeLang === "ar" ? "المصادر العربية" : "Arabic Sources",
    sources: arabicSources,
  };
  const enGroup = {
    title: activeLang === "ar" ? "المصادر الإنجليزية" : "English Sources",
    sources: englishSources,
  };

  const groups =
    activeLang === "ar"
      ? [arGroup, enGroup].filter((g) => g.sources.length > 0)
      : [enGroup, arGroup].filter((g) => g.sources.length > 0);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (sourceName: string) => {
    setIsOpen(false);
    const searchParams = new URLSearchParams(window.location.search);
    if (sourceName === "all") {
      searchParams.delete("source");
    } else {
      searchParams.set("source", sourceName);
    }
    searchParams.delete("page");

    searchParams.set("category", currentCategory);
    router.push(`${pathname}?${searchParams.toString()}`);
  };

  return {
    isOpen,
    setIsOpen,
    dropdownRef,
    selected,
    groups,
    handleSelect
  };
}
