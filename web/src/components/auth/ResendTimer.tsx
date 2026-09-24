"use client";

import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface ResendTimerProps {
  initialSeconds?: number;
  onResend: () => Promise<boolean>;
}

export default function ResendTimer({
  initialSeconds = 45,
  onResend,
}: ResendTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft]);

  const handleResendClick = async () => {
    if (secondsLeft > 0 || isResending) return;
    try {
      setIsResending(true);
      const success = await onResend();
      if (success) {
        setSecondsLeft(initialSeconds);
      }
    } finally {
      setIsResending(false);
    }
  };

  const formattedTime = `0:${secondsLeft < 10 ? `0${secondsLeft}` : secondsLeft}`;

  return (
    <div
      aria-live="polite"
      className="text-xs text-gray-500 font-light text-center min-h-[22px] flex items-center justify-center"
    >
      {secondsLeft > 0 ? (
        <span>
          ¿No te llegó? Puedes reenviar el código en{" "}
          <span className="font-medium text-gray-700">{formattedTime}</span>
        </span>
      ) : (
        <span className="flex items-center gap-1">
          <span>¿No te llegó?</span>
          <button
            type="button"
            onClick={handleResendClick}
            disabled={isResending}
            className="text-[#6B1F4A] hover:underline font-semibold ml-0.5 inline-flex items-center gap-1 transition focus:outline-none focus:underline"
          >
            {isResending ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-[#6B1F4A]" />
                <span>Reenviando...</span>
              </>
            ) : (
              <span>Reenviar código</span>
            )}
          </button>
        </span>
      )}
    </div>
  );
}
