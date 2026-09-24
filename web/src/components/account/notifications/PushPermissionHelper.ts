// =============================================================================
// TECHNOVA-DERM: HELPER DE PERMISOS Y SUSCRIPCIÓN WEB PUSH
// src/components/account/notifications/PushPermissionHelper.ts
// =============================================================================

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function getPushPermissionState(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

/**
 * Solicita permiso de notificaciones al navegador, registra el Service Worker
 * y guarda la suscripción en el servidor de Technova-Derm.
 */
export async function solicitarPermisoYSuscribir(
  vapidPublicKey?: string
): Promise<{ success: boolean; error?: string }> {
  if (!isPushSupported()) {
    return { success: false, error: "Tu navegador no soporta notificaciones Web Push." };
  }

  const pubKey = vapidPublicKey || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!pubKey) {
    return { success: false, error: "La clave pública VAPID no está configurada." };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return {
        success: false,
        error: "Permiso de notificaciones denegado en el navegador.",
      };
    }

    // Registrar Service Worker
    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    // Obtener suscripción existente o crear una nueva
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const convertedVapidKey = urlBase64ToUint8Array(pubKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey as unknown as BufferSource,
      });
    }

    const subJson = subscription.toJSON();
    const endpoint = subJson.endpoint;
    const p256dh = subJson.keys?.p256dh;
    const auth = subJson.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      return { success: false, error: "No se pudieron obtener las credenciales de suscripción." };
    }

    // Enviar suscripción al servidor
    const res = await fetch("/api/cuenta/push/suscribir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint,
        keys: { p256dh, auth },
        navegador: navigator.userAgent.slice(0, 100),
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.error || "Error al registrar la suscripción en el servidor." };
    }

    return { success: true };
  } catch (err: any) {
    console.error("[solicitarPermisoYSuscribir Error]:", err);
    return { success: false, error: err.message || "Error al activar notificaciones Push." };
  }
}
