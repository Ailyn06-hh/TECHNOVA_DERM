"use client";

import React, { useState, useEffect } from "react";
import { Shield, CreditCard, Lock } from "lucide-react";
import { tokenizarTarjeta } from "@/lib/pagos/tokenizar";

export interface NewCardData {
  token: string;
  ultimos4: string;
  marca: string;
  titular: string;
  mesVencimiento: number;
  anioVencimiento: number;
  guardar: boolean;
  valida: boolean;
}

export interface NewCardFormProps {
  onChange: (cardData: NewCardData | null) => void;
}

export default function NewCardForm({ onChange }: NewCardFormProps) {
  const [numero, setNumero] = useState("");
  const [titular, setTitular] = useState("");
  const [mes, setMes] = useState("08");
  const [anio, setAnio] = useState("2028");
  const [cvv, setCvv] = useState("");
  const [guardar, setGuardar] = useState(true);

  // Formatear número de tarjeta con espacios cada 4 dígitos
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
    const parts = raw.match(/.{1,4}/g) || [];
    setNumero(parts.join(" "));
  };

  useEffect(() => {
    const rawNumber = numero.replace(/\s+/g, "");
    const isNumberValid = rawNumber.length >= 15;
    const isTitularValid = titular.trim().length >= 3;
    const isCvvValid = cvv.length >= 3;

    if (isNumberValid && isTitularValid && isCvvValid) {
      tokenizarTarjeta({
        numero: rawNumber,
        titular,
        mes: Number(mes),
        anio: Number(anio),
        cvv,
      }).then((tok) => {
        onChange({
          token: tok.token,
          ultimos4: tok.ultimos4,
          marca: tok.marca,
          titular: tok.titular,
          mesVencimiento: tok.mesVencimiento,
          anioVencimiento: tok.anioVencimiento,
          guardar,
          valida: true,
        });
      });
    } else {
      onChange(null);
    }
  }, [numero, titular, mes, anio, cvv, guardar, onChange]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 12 }, (_, i) => currentYear + i);
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));

  return (
    <div className="bg-[#FAF9F6] border border-slate-200/80 rounded-2xl p-4 sm:p-5 text-xs text-slate-700 space-y-3.5 mt-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
        <div className="flex items-center gap-1.5 text-slate-800 font-medium">
          <CreditCard className="w-4 h-4 text-[#6B1F4A]" />
          <span>Ingresa los datos de tu tarjeta</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-slate-400">
          <Lock className="w-3 h-3 text-emerald-600" />
          <span>Encriptado</span>
        </div>
      </div>

      {/* Número de Tarjeta */}
      <div>
        <label className="block text-[11px] font-medium text-slate-500 mb-1">
          Número de tarjeta
        </label>
        <input
          type="text"
          value={numero}
          onChange={handleNumberChange}
          placeholder="4242 4242 4242 4242"
          maxLength={19}
          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-[#6B1F4A] focus:ring-1 focus:ring-[#6B1F4A] outline-none text-xs font-mono tracking-wider transition"
        />
        <p className="text-[10px] text-slate-400 mt-1">
          En desarrollo usa terminación <strong>4242</strong> (aprobada), <strong>0002</strong> (rechazada) o <strong>9995</strong> (fondos insuficientes).
        </p>
      </div>

      {/* Titular */}
      <div>
        <label className="block text-[11px] font-medium text-slate-500 mb-1">
          Nombre del titular (como aparece en el plástico)
        </label>
        <input
          type="text"
          value={titular}
          onChange={(e) => setTitular(e.target.value)}
          placeholder="Ana López"
          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-[#6B1F4A] focus:ring-1 focus:ring-[#6B1F4A] outline-none text-xs transition"
        />
      </div>

      {/* Vencimiento y CVV */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-8 flex items-center gap-2">
          <div className="flex-1">
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Mes
            </label>
            <select
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-[#6B1F4A] outline-none text-xs"
            >
              {months.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Año
            </label>
            <select
              value={anio}
              onChange={(e) => setAnio(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-[#6B1F4A] outline-none text-xs"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="sm:col-span-4">
          <label className="block text-[11px] font-medium text-slate-500 mb-1">
            CVV
          </label>
          <input
            type="password"
            maxLength={4}
            value={cvv}
            onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))}
            placeholder="123"
            className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-[#6B1F4A] outline-none text-xs font-mono tracking-widest text-center"
          />
        </div>
      </div>

      {/* Casilla Guardar Tarjeta */}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
        <input
          type="checkbox"
          id="guardar_tarjeta_check"
          checked={guardar}
          onChange={(e) => setGuardar(e.target.checked)}
          className="w-4 h-4 text-[#6B1F4A] rounded border-slate-300 focus:ring-[#6B1F4A]"
        />
        <label htmlFor="guardar_tarjeta_check" className="text-xs text-slate-600 cursor-pointer">
          Guardar esta tarjeta para compras futuras de forma segura
        </label>
      </div>
    </div>
  );
}
