/* EduAssess Pro — عميل الإشعارات (Web Push)
   الاستخدام: EduPush.attach(sbClient) بعد تسجيل الدخول، EduPush.detach() قبل الخروج،
   EduPush.mountSettings(element) لعرض زر التفعيل/الإيقاف. */
(function () {
  "use strict";

  /* ضع هنا المفتاح العام VAPID (الناتج من: npx web-push generate-vapid-keys) */
  var VAPID_PUBLIC = "BOzjgnNNFhbPL4HX8lvxvN6oMB78QckDsb1sFoSxWzL5ezSJXHwecl9KkyRRNkAtUG1fZb1fxjSEHz071s4cVGM";

  var SW_URL = "sw.js", DISMISS_KEY = "eduassess_push_dismiss", OFF_KEY = "eduassess_push_off", DAY = 864e5;
  var sb = null, mounts = [], regP = null;

  function supported() { return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window; }
  function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); }
  function standalone() { try { return matchMedia("(display-mode: standalone)").matches || navigator.standalone === true; } catch (e) { return false; } }
  function configured() { return !!VAPID_PUBLIC && VAPID_PUBLIC.indexOf("PUT_") !== 0; }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function u8(b64) {
    var p = "=".repeat((4 - b64.length % 4) % 4), s = (b64 + p).replace(/-/g, "+").replace(/_/g, "/"), r = atob(s), a = new Uint8Array(r.length);
    for (var i = 0; i < r.length; i++) a[i] = r.charCodeAt(i);
    return a;
  }

  async function getState() {
    if (!supported()) return isIOS() && !standalone() ? "ios-install" : "unsupported";
    if (Notification.permission === "denied") return "denied";
    if (Notification.permission === "granted" && !lsGet(OFF_KEY)) {
      try {
        var reg = await navigator.serviceWorker.getRegistration();
        var s = reg && await reg.pushManager.getSubscription();
        if (s) return "on";
      } catch (e) {}
    }
    return "off";
  }

  function register() {
    if (!regP) regP = navigator.serviceWorker.register(SW_URL).then(function () { return navigator.serviceWorker.ready; });
    return regP;
  }

  async function subscribe() {
    var reg = await register(), sub = await reg.pushManager.getSubscription();
    if (!sub) {
      try {
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: u8(VAPID_PUBLIC) });
      } catch (e) {
        var old = await reg.pushManager.getSubscription();
        if (old) await old.unsubscribe();
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: u8(VAPID_PUBLIC) });
      }
    }
    return sub;
  }

  async function save(sub) {
    if (!sb) return false;
    var j = sub.toJSON();
    if (!j.keys) return false;
    var r = await sb.rpc("save_push_subscription", {
      p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth,
      p_ua: (navigator.userAgent || "").slice(0, 200)
    });
    if (r.error) console.warn("[EduPush] save:", r.error.message);
    return !r.error;
  }

  async function enable() {
    if (!supported() || !configured()) return "unsupported";
    var p = Notification.permission;
    if (p === "default") p = await Notification.requestPermission();
    if (p !== "granted") { render(); return p; }
    lsSet(OFF_KEY, null);
    try { var sub = await subscribe(); await save(sub); } catch (e) { console.warn("[EduPush] subscribe:", e); }
    hideBanner(); render();
    return "granted";
  }

  async function disable() {
    lsSet(OFF_KEY, "1");
    try {
      var reg = await navigator.serviceWorker.getRegistration();
      var sub = reg && await reg.pushManager.getSubscription();
      if (sub) {
        if (sb) await sb.rpc("remove_push_subscription", { p_endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
    } catch (e) {}
    render();
  }

  /* عند تسجيل الخروج: فكّ ارتباط هذا الجهاز بالحساب الحالي */
  async function detach() {
    try {
      if (!supported() || !sb) return;
      var reg = await navigator.serviceWorker.getRegistration();
      var sub = reg && await reg.pushManager.getSubscription();
      if (sub) await sb.rpc("remove_push_subscription", { p_endpoint: sub.endpoint });
    } catch (e) {}
  }

  async function attach(client) {
    sb = client || sb;
    if (!configured()) { console.warn("[EduPush] لم يتم ضبط VAPID_PUBLIC داخل push.js"); return; }
    if (!supported()) { if (isIOS() && !standalone()) setTimeout(maybeBanner, 2500); render(); return; }
    try { await register(); } catch (e) { console.warn("[EduPush] sw:", e); return; }
    if (Notification.permission === "granted" && !lsGet(OFF_KEY)) {
      try { var sub = await subscribe(); await save(sub); } catch (e) {}
      render();
      return;
    }
    render();
    setTimeout(maybeBanner, 2500);
  }

  /* ---------------- واجهة ---------------- */
  function css() {
    if (document.getElementById("edu-push-css")) return;
    var s = document.createElement("style");
    s.id = "edu-push-css";
    s.textContent =
      "#edu-push-bn{position:fixed;z-index:150;inset-inline:12px;bottom:calc(16px + env(safe-area-inset-bottom,0px));max-width:470px;margin-inline:auto;display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:14px;border-radius:22px;color:#fff;background:linear-gradient(135deg,#12332B,#1E5446);border:1px solid rgba(228,200,120,.5);box-shadow:0 18px 50px rgba(0,0,0,.35);font-family:Cairo,Tahoma,sans-serif;direction:rtl;animation:epUp .45s cubic-bezier(.2,.8,.2,1) both}" +
      "@keyframes epUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}" +
      "@media(max-width:720px){#edu-push-bn{bottom:calc(104px + env(safe-area-inset-bottom,0px))}}" +
      "#edu-push-bn .ep-ic{width:44px;height:44px;border-radius:14px;background:linear-gradient(145deg,#E4C878,#C7A24A);display:grid;place-items:center;font-size:22px;flex:none}" +
      "#edu-push-bn .ep-tx{flex:1;min-width:170px;line-height:1.7}#edu-push-bn .ep-tx b{display:block;font-size:15px}#edu-push-bn .ep-tx span{font-size:12.5px;color:#D8CDA9}" +
      "#edu-push-bn .ep-ac{display:flex;gap:8px;margin-inline-start:auto}" +
      "#edu-push-bn button,.ep-btn{border:0;border-radius:12px;padding:9px 16px;font:700 13.5px Cairo,Tahoma,sans-serif;cursor:pointer}" +
      "#edu-push-bn .ep-go{background:linear-gradient(180deg,#E4C878,#C7A24A);color:#2b2007}#edu-push-bn .ep-no{background:rgba(255,255,255,.14);color:#fff}" +
      ".ep-row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;background:#F8F4E8;border-radius:16px;padding:12px 14px;margin:0 0 12px;font:600 13.5px/1.8 Cairo,Tahoma,sans-serif;color:#22261F}" +
      ".ep-row .ep-btn{background:#12332B;color:#fff}.ep-row .ep-btn.off{background:#fff;color:#9B3B2E;border:1.5px solid #E7B9AF}" +
      ".ep-row.warn{background:#FFF1C9;color:#8A5A00}";
    document.head.appendChild(s);
  }

  function recentlyDismissed() { var v = +lsGet(DISMISS_KEY); return v && Date.now() - v < 3 * DAY; }
  function hideBanner() { var b = document.getElementById("edu-push-bn"); if (b) b.remove(); }

  function showBanner(st) {
    if (document.getElementById("edu-push-bn")) return;
    css();
    var ios = st === "ios-install", d = document.createElement("div");
    d.id = "edu-push-bn";
    d.setAttribute("role", "dialog");
    d.innerHTML =
      '<div class="ep-ic">🔔</div><div class="ep-tx"><b>' + (ios ? "ثبّت التطبيق لتصلك الإشعارات" : "فعّل الإشعارات") + "</b><span>" +
      (ios ? "اضغط زر المشاركة ثم «إضافة إلى الشاشة الرئيسية» وافتح التطبيق من هناك."
           : "لتصلك الاختبارات الجديدة ومواعيدها وتنبيهات الاشتراك فورًا حتى لو كان التطبيق مغلقًا.") +
      '</span></div><div class="ep-ac">' + (ios ? "" : '<button class="ep-go" type="button">تفعيل</button>') + '<button class="ep-no" type="button">لاحقًا</button></div>';
    document.body.appendChild(d);
    var go = d.querySelector(".ep-go");
    if (go) go.onclick = function () { enable(); };
    d.querySelector(".ep-no").onclick = function () { lsSet(DISMISS_KEY, String(Date.now())); hideBanner(); };
  }

  async function maybeBanner() {
    if (typeof window.eduPushQuiet === "function" && window.eduPushQuiet()) return;
    var st = await getState();
    if (st === "ios-install" || (st === "off" && Notification.permission === "default" && !lsGet(OFF_KEY))) {
      if (!recentlyDismissed()) showBanner(st);
    }
  }

  async function render() {
    if (!mounts.length || !configured()) return;
    css();
    var st = await getState();
    mounts.forEach(function (el) {
      if (!el || !el.isConnected) return;
      var warn = st === "denied" || st === "ios-install" || st === "unsupported", txt, btn = "";
      if (st === "on") { txt = "🔔 الإشعارات مفعّلة على هذا الجهاز."; btn = '<button type="button" class="ep-btn off" data-a="off">إيقاف</button>'; }
      else if (st === "off") { txt = "فعّل الإشعارات ليصلك كل جديد فورًا."; btn = '<button type="button" class="ep-btn" data-a="on">تفعيل</button>'; }
      else if (st === "denied") txt = "الإشعارات محظورة من إعدادات المتصفح — اسمح بها من إعدادات الموقع ثم أعد تحميل الصفحة.";
      else if (st === "ios-install") txt = "على الآيفون: اضغط «مشاركة» ثم «إضافة إلى الشاشة الرئيسية» وافتح التطبيق من هناك لتفعيل الإشعارات.";
      else txt = "متصفحك لا يدعم الإشعارات.";
      el.innerHTML = '<div class="ep-row' + (warn ? " warn" : "") + '"><span>' + txt + "</span>" + btn + "</div>";
      var b = el.querySelector("[data-a]");
      if (b) b.onclick = function () { (b.dataset.a === "on" ? enable : disable)(); };
    });
  }

  function mountSettings(el) { if (el && mounts.indexOf(el) < 0) mounts.push(el); render(); }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", function (e) {
      var d = e.data || {};
      if (d.type === "edu-push") window.dispatchEvent(new Event("edu-push"));
      if (d.type === "edu-open" && typeof window.eduPushOpen === "function") window.eduPushOpen(d.url);
    });
  }

  window.EduPush = { attach: attach, detach: detach, enable: enable, disable: disable, state: getState, mountSettings: mountSettings };
})();
