// =============================================================================
// TECHNOVA-DERM: SERVICE WORKER DE WEB PUSH
// public/sw.js
// =============================================================================

self.addEventListener("push", function (event) {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        titulo: "Technova-Derm",
        mensaje: event.data.text(),
      };
    }
  }

  const title = data.titulo || "Technova-Derm";
  const options = {
    body: data.mensaje || "Tienes una nueva actualización en Technova-Derm.",
    icon: data.icono || "/favicon.ico",
    badge: "/favicon.ico",
    data: {
      url: data.enlace || "/cuenta/notificaciones",
      timestamp: Date.now(),
    },
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/cuenta/notificaciones";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clientList) {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if ("focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
