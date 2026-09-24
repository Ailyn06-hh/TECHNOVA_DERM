"use client";

import React from "react";

interface PreferenceSwitchProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel: string;
  loading?: boolean;
}

export default function PreferenceSwitch({
  id,
  checked,
  onChange,
  disabled = false,
  ariaLabel,
  loading = false,
}: PreferenceSwitchProps) {
  const handleClick = () => {
    if (disabled || loading) return;
    onChange(!checked);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled || loading}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#6B1F4A] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${
        checked ? "bg-[#244233]" : "bg-[#E5DFD7]"
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}
