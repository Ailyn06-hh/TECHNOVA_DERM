import crypto from "crypto";

const BASE_URL = "http://localhost:3000";
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || process.env.SESSION_SECRET || "technova_derm_admin_secret_key_2026";

function buildAdminSessionCookie(adminData) {
  const dataStr = Buffer.from(JSON.stringify(adminData)).toString("base64url");
  const signature = crypto.createHmac("sha256", ADMIN_SESSION_SECRET).update(dataStr).digest("base64url");
  return `${dataStr}.${signature}`;
}

async function testFetch() {
  const cookieValue = buildAdminSessionCookie({
    id: 1,
    nombre: "Sofía",
    apellido: "Castro",
    correo: "admin@technovaderm.mx",
    rol: "admin",
    sucursales: [],
    loginEn: new Date().toISOString(),
  });
  const cookieHeader = `admin_sesion=${cookieValue}`;

  const res = await fetch(`${BASE_URL}/api/admin/dashboard`, {
    headers: { Cookie: cookieHeader },
  });

  console.log("Status:", res.status);
  console.log("Body:", await res.text());
}

testFetch();
