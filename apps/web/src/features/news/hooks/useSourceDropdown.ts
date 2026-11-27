import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createTranslator } from "@/i18n/translate";
import { Source } from "../types";
import { groupSourcesByLanguage } from "../lib/sourceLanguages";

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

  const t = useMemo(() => createTranslator(activeLang), [activeLang]);
  const selected = useMemo(
    () => sources.find((s) => s.name === currentSource) || sources[0],
    [sources, currentSource],
  );
  const groups = useMemo(
    () => groupSourcesByLanguage(sources, activeLang, t),
    [sources, activeLang, t],
  );

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

  const handleSelect = useCallback(
    (sourceName: string) => {
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
    },
    [currentCategory, pathname, router],
  );

  return {
    isOpen,
    setIsOpen,
    dropdownRef,
    selected,
    groups,
    handleSelect
  };
}
