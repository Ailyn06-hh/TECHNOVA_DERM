"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export type OrderChannelId = "todos" | "web" | "app" | "whatsapp" | "tienda";

interface ChannelOption {
  id: OrderChannelId;
  label: string;
}

const CHANNELS: ChannelOption[] = [
  { id: "todos", label: "Todos los canales" },
  { id: "web", label: "Web" },
  { id: "app", label: "App" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "tienda", label: "Tienda física" },
];

interface ChannelMenuProps {
  selectedChannel: OrderChannelId;
  counts: Record<string, number>;
  onChange: (channel: OrderChannelId) => void;
}

export default function ChannelMenu({
  selectedChannel,
  counts,
  onChange,
}: ChannelMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentOption = CHANNELS.find((c) => c.id === selectedChannel) || CHANNELS[0];
  const buttonLabel =
    selectedChannel === "todos"
      ? "Canal: Todos"
      : `Canal: ${selectedChannel === "tienda" ? "Tienda" : currentOption.label}`;

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (channelId: OrderChannelId) => {
    onChange(channelId);
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        ref={buttonRef}
        type="button"
        id="canal-menu-button"
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center justify-between gap-2 px-4 py-2.5 bg-white rounded-full border border-slate-300 text-xs font-medium text-slate-800 hover:bg-slate-50 active:scale-[0.98] transition-all shadow-2xs cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-[#6B1F4A]"
      >
        <span>{buttonLabel}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="canal-menu-button"
          className="absolute right-0 mt-2 w-56 rounded-2xl bg-white shadow-lg border border-slate-200/80 py-1.5 z-30 focus:outline-hidden animate-in fade-in zoom-in-95 duration-100"
        >
          {CHANNELS.map((channel) => {
            const count = counts[channel.id] ?? 0;
            const isSelected = selectedChannel === channel.id;

            return (
              <button
                key={channel.id}
                role="menuitem"
                type="button"
                onClick={() => handleSelect(channel.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2 text-xs text-left transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-[#FAF3F6] text-[#6B1F4A] font-semibold"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="flex items-center gap-2">
                  {isSelected ? (
                    <Check className="w-3.5 h-3.5 text-[#6B1F4A]" />
                  ) : (
                    <span className="w-3.5 h-3.5" />
                  )}
                  {channel.label}
                </span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full ${
                    isSelected
                      ? "bg-[#F3E1E4] text-[#6B1F4A]"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
