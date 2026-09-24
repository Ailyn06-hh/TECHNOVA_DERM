import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";

export const dynamic = "force-dynamic";

function obtenerDatosPorPrefijo(cp: string) {
  const num = parseInt(cp, 10);
  if (isNaN(num)) return null;

  if (num >= 1000 && num <= 19999) return { municipio: "Ciudad de México", estado: "Ciudad de México", estado_abreviatura: "CDMX" };
  if (num >= 20000 && num <= 20999) return { municipio: "Aguascalientes", estado: "Aguascalientes", estado_abreviatura: "Ags." };
  if (num >= 21000 && num <= 22999) return { municipio: "Mexicali", estado: "Baja California", estado_abreviatura: "B.C." };
  if (num >= 23000 && num <= 23999) return { municipio: "La Paz", estado: "Baja California Sur", estado_abreviatura: "B.C.S." };
  if (num >= 24000 && num <= 24999) return { municipio: "Campeche", estado: "Campeche", estado_abreviatura: "Camp." };
  if (num >= 25000 && num <= 27999) return { municipio: "Saltillo", estado: "Coahuila", estado_abreviatura: "Coah." };
  if (num >= 28000 && num <= 28999) return { municipio: "Colima", estado: "Colima", estado_abreviatura: "Col." };
  if (num >= 29000 && num <= 30999) return { municipio: "Tuxtla Gutiérrez", estado: "Chiapas", estado_abreviatura: "Chis." };
  if (num >= 31000 && num <= 33999) return { municipio: "Chihuahua", estado: "Chihuahua", estado_abreviatura: "Chih." };
  if (num >= 34000 && num <= 35999) return { municipio: "Durango", estado: "Durango", estado_abreviatura: "Dgo." };
  if (num >= 36000 && num <= 38999) return { municipio: "León", estado: "Guanajuato", estado_abreviatura: "Gto." };
  if (num >= 39000 && num <= 41999) return { municipio: "Acapulco", estado: "Guerrero", estado_abreviatura: "Gro." };
  if (num >= 42000 && num <= 43999) return { municipio: "Pachuca", estado: "Hidalgo", estado_abreviatura: "Hgo." };
  if (num >= 44000 && num <= 49999) return { municipio: "Guadalajara", estado: "Jalisco", estado_abreviatura: "Jal." };
  if (num >= 50000 && num <= 57999) return { municipio: "Toluca", estado: "Estado de México", estado_abreviatura: "Méx." };
  if (num >= 58000 && num <= 61999) return { municipio: "Morelia", estado: "Michoacán", estado_abreviatura: "Mich." };
  if (num >= 62000 && num <= 62999) return { municipio: "Cuernavaca", estado: "Morelos", estado_abreviatura: "Mor." };
  if (num >= 63000 && num <= 63999) return { municipio: "Tepic", estado: "Nayarit", estado_abreviatura: "Nay." };
  if (num >= 64000 && num <= 67999) return { municipio: "Monterrey", estado: "Nuevo León", estado_abreviatura: "N.L." };
  if (num >= 68000 && num <= 71999) return { municipio: "Oaxaca", estado: "Oaxaca", estado_abreviatura: "Oax." };
  if (num >= 72000 && num <= 75999) return { municipio: "Puebla", estado: "Puebla", estado_abreviatura: "Pue." };
  if (num >= 76000 && num <= 76999) return { municipio: "Querétaro", estado: "Querétaro", estado_abreviatura: "Qro." };
  if (num >= 77000 && num <= 77999) return { municipio: "Cancún", estado: "Quintana Roo", estado_abreviatura: "Q. Roo" };
  if (num >= 78000 && num <= 79999) return { municipio: "San Luis Potosí", estado: "San Luis Potosí", estado_abreviatura: "S.L.P." };
  if (num >= 80000 && num <= 82999) return { municipio: "Culiacán", estado: "Sinaloa", estado_abreviatura: "Sin." };
  if (num >= 83000 && num <= 85999) return { municipio: "Hermosillo", estado: "Sonora", estado_abreviatura: "Son." };
  if (num >= 86000 && num <= 86999) return { municipio: "Villahermosa", estado: "Tabasco", estado_abreviatura: "Tab." };
  if (num >= 87000 && num <= 89999) return { municipio: "Ciudad Victoria", estado: "Tamaulipas", estado_abreviatura: "Tamps." };
  if (num >= 90000 && num <= 90999) return { municipio: "Tlaxcala", estado: "Tlaxcala", estado_abreviatura: "Tlax." };
  if (num >= 91000 && num <= 96999) return { municipio: "Veracruz", estado: "Veracruz", estado_abreviatura: "Ver." };
  if (num >= 97000 && num <= 97999) return { municipio: "Mérida", estado: "Yucatán", estado_abreviatura: "Yuc." };
  if (num >= 98000 && num <= 99999) return { municipio: "Zacatecas", estado: "Zacatecas", estado_abreviatura: "Zac." };

  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { cp: string } }
) {
  try {
    const cp = (params.cp || "").trim();

    if (!/^\d{5}$/.test(cp)) {
      return NextResponse.json(
        { encontrado: false, codigoPostal: cp, colonias: [], error: "Formato de código postal inválido (debe tener 5 dígitos)" },
        { status: 400 }
      );
    }

    const pool = getDbPool();
    const [rows]: any = await pool.execute(
      `SELECT colonia, municipio, estado, estado_abreviatura 
       FROM codigos_postales 
       WHERE codigo_postal = ? 
       ORDER BY colonia ASC`,
      [cp]
    );

    if (rows && rows.length > 0) {
      const colonias = rows.map((r: any) => r.colonia);
      const primerRegistro = rows[0];

      return NextResponse.json({
        encontrado: true,
        codigoPostal: cp,
        municipio: primerRegistro.municipio,
        ciudad: primerRegistro.municipio,
        estado: primerRegistro.estado,
        estadoAbreviatura: primerRegistro.estado_abreviatura,
        colonias,
      });
    }

    // Fallback inteligente por mapa de prefijos si no está en la BD parcial
    const fallback = obtenerDatosPorPrefijo(cp);
    if (fallback) {
      return NextResponse.json({
        encontrado: true,
        codigoPostal: cp,
        municipio: fallback.municipio,
        ciudad: fallback.municipio,
        estado: fallback.estado,
        estadoAbreviatura: fallback.estado_abreviatura,
        colonias: [],
        esEstimado: true,
      });
    }

    return NextResponse.json(
      { encontrado: false, codigoPostal: cp, colonias: [], error: "Código postal no encontrado" },
      { status: 404 }
    );
  } catch (error: any) {
    console.error("[GET /api/codigos-postales/[cp] Error]:", error);
    return NextResponse.json(
      { error: "Error al consultar código postal", details: error.message },
      { status: 500 }
    );
  }
}
