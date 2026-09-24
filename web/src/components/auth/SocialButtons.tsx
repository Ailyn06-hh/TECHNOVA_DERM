"use client";

import React from "react";

export default function SocialButtons() {
  const handleSocialLogin = (provider: "google" | "apple") => {
    // TODO: Integrar llamada OAuth con proveedor (Google o Apple Sign-In)
    console.log(`[AUTH TODO] Iniciar sesión con ${provider}`);
  };

  return (
    <div className="w-full space-y-5">
      {/* Separador con línea y texto central */}
      <div className="relative flex items-center justify-center">
        <div className="w-full border-t border-gray-200" />
        <span className="absolute bg-[#F8F5F0] px-4 text-xs text-gray-500 font-light">
          o continúa con
        </span>
      </div>

      {/* Botones de Redes Sociales */}
      <div className="grid grid-cols-2 gap-3">
        {/* Google Button */}
        <button
          type="button"
          onClick={() => handleSocialLogin("google")}
          className="w-full py-2.5 px-4 rounded-full bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50/80 text-gray-800 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition shadow-sm focus:outline-none focus:ring-2 focus:ring-[#6B1F4A]/30"
          aria-label="Continuar con Google"
        >
          {/* Google G logo SVG */}
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              fill="#EA4335"
            />
          </svg>
          <span>Google</span>
        </button>

        {/* Apple Button */}
        <button
          type="button"
          onClick={() => handleSocialLogin("apple")}
          className="w-full py-2.5 px-4 rounded-full bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50/80 text-gray-800 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition shadow-sm focus:outline-none focus:ring-2 focus:ring-[#6B1F4A]/30"
          aria-label="Continuar con Apple"
        >
          {/* Apple Logo SVG */}
          <svg className="w-4 h-4 shrink-0 fill-current text-gray-900" viewBox="0 0 170 170" aria-hidden="true">
            <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.6-7.85-11.72-14.43-6.52-10.43-11.45-21.73-14.77-33.91-3.32-12.18-4.99-23.7-4.99-34.56 0-14.78 3.86-27.18 11.58-37.21 7.72-10.02 17.65-15.17 29.8-15.45 4.35 0 9.28 1.15 14.78 3.44 5.51 2.29 9.38 3.5 11.62 3.63 2.01-.13 6.02-1.39 12.03-3.78 6.01-2.39 11.13-3.41 15.38-3.07 15.53 1.05 27.56 6.94 36.08 17.67-13.88 8.4-20.68 19.8-20.4 34.2.28 11.26 4.62 20.88 13.02 28.84 8.4 7.96 18.25 12.38 29.56 13.26-2.58 7.84-5.91 16.22-10 25.13zM119.22 31.81c0-7.84 2.89-15.3 8.67-22.38 5.78-7.08 13-11.83 21.66-14.25-.13 1.25-.26 2.45-.4 3.6-1.07 7.7-4.14 14.86-9.21 21.48-5.07 6.62-11.39 10.96-18.96 13.02-.53-.47-1.12-.96-1.76-1.47z" />
          </svg>
          <span>Apple</span>
        </button>
      </div>
    </div>
  );
}
