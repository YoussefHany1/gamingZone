"use client";

import { ChevronDown, Globe } from "lucide-react";
import Image from "next/image";
import { SourceDropdownProps } from "../types";
import { useSourceDropdown } from "../hooks/useSourceDropdown";

export default function SourceDropdown({
  sources,
  currentSource,
  currentCategory,
  activeLang,
}: SourceDropdownProps) {
  const { isOpen, setIsOpen, dropdownRef, selected, groups, handleSelect } =
    useSourceDropdown(sources, currentSource, currentCategory, activeLang);

  return (
    <div className="relative inline-block text-left z-30" ref={dropdownRef}>
      {/* Dropdown Button */}
      <button
        id="news-source-dropdown-toggle"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-3 px-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300 active:scale-95 shadow-md min-w-[200px]"
      >
        <div className="flex items-center gap-2">
          {selected?.image ? (
            <div className="relative w-5 h-5 rounded-full overflow-hidden shrink-0 bg-white/10">
              <Image
                src={selected.image}
                alt={selected.name}
                width={20}
                height={20}
                className="object-cover w-full h-full"
              />
            </div>
          ) : (
            <Globe className="w-4 h-4 text-light-blue" />
          )}
          <span className="capitalize">{selected?.name || currentSource}</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isOpen ? "rotate-180 text-light-blue" : ""}`}
        />
      </button>

      {/* Dropdown Menu Items */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-60 rounded-2xl overflow-hidden bg-primary-bg border border-white/10 shadow-2xl animate-fade-in z-50">
          <div className="py-1.5 max-h-64 overflow-y-auto scrollbar">
            <div className="px-3 py-1 text-[9px] font-black uppercase tracking-wider text-gray-400 border-b border-white/5 mb-1.5">
              {activeLang === "ar"
                ? "اختر مصدر الأخبار:"
                : "Select News Source:"}
            </div>

            {groups.map((group, groupIdx) => (
              <div key={groupIdx} className="space-y-1 mb-2">
                {/* Group Header */}
                <div className="px-3 py-1 text-[10px] font-extrabold text-light-blue bg-white/5 flex items-center justify-between">
                  <span>{group.title}</span>
                  <span className="text-[9px] text-gray-500 font-bold">
                    ({group.sources.length})
                  </span>
                </div>

                {/* Group Sources */}
                {group.sources.map((src) => {
                  const isActive = src.name === currentSource;
                  return (
                    <button
                      key={src.name}
                      id={`news-source-btn-${src.name.toLowerCase().replace(/\s+/g, "-")}`}
                      onClick={() => handleSelect(src.name)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                        isActive
                          ? "bg-light-blue/15 text-light-blue font-black"
                          : "text-gray-300 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {src.image ? (
                        <div className="relative w-5 h-5 rounded-full overflow-hidden shrink-0 bg-white/15">
                          <Image
                            src={src.image}
                            alt={src.name}
                            width={20}
                            height={20}
                            className="object-cover w-full h-full"
                          />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                          <span className="text-[8px] font-bold text-gray-400 uppercase">
                            {src.language}
                          </span>
                        </div>
                      )}
                      <span className="capitalize grow truncate">
                        {src.name}
                      </span>
                      {src.language && (
                        <span className="text-[8px] font-black uppercase bg-white/5 border border-white/5 px-1.5 py-0.5 rounded text-gray-400">
                          {src.language}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
