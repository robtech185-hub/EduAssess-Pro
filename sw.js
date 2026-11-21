/* EduAssess Pro — Service Worker للإشعارات (Web Push) */
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener("push", function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data ? e.data.text() : "" }; }
  var title = d.title || "EduAssess Pro";
  var body = d.body || "";
  if (d.starts_at) {
    try {
      body += " • يبدأ " + new Date(d.starts_at).toLocaleString("ar-EG-u-nu-latn", {
        weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit"
      });
    } catch (_) {}
  }
  var opts = {
    body: body,
    icon: "assets/favicon.png",
    badge: "assets/badge.png",
    lang: "ar",
    dir: "rtl",
    tag: d.tag || undefined,
    renotify: !!d.tag,
    vibrate: [120, 60, 120],
    data: { url: d.url || "./" },
    actions: (d.actions || []).slice(0, 2)
  };
  e.waitUntil(Promise.all([
    self.registration.showNotification(title, opts),
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (cs) {
      cs.forEach(function (c) { c.postMessage({ type: "edu-push" }); });
    })
  ]));
});

self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  if (e.action === "dismiss") return;
  var target = new URL((e.notification.data && e.notification.data.url) || "./", self.registration.scope).href;
  var base = target.split("#")[0].split("?")[0];
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (cs) {
      for (var i = 0; i < cs.length; i++) {
        var c = cs[i];
        if (c.url.split("#")[0].split("?")[0] === base && "focus" in c) {
          c.postMessage({ type: "edu-open", url: target });
          return c.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
