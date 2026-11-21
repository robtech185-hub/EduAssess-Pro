/* EduAssess Pro — عميل الإشعارات (Web Push)
   الاستخدام: EduPush.attach(sbClient) بعد تسجيل الدخول، EduPush.detach() قبل الخروج،
   EduPush.mountSettings(element) لعرض زر التفعيل/الإيقاف. */
(function () {
  "use strict";

  /* ضع هنا المفتاح العام VAPID (الناتج من: npx web-push generate-vapid-keys) */
  var VAPID_PUBLIC = "BDc_WB07YMDjxAC6wLDobxtpNKSDqqO1zYdI-YyY4yZ4H3WI2_1LXB_LSgwpSRoDY9ZO_7AnCeRVc1Y-dfFqDtk";

  var SW_URL = "sw.js", DISMISS_KEY = "eduassess_push_dismiss", OFF_KEY = "eduassess_push_off", DAY = 864e5;
  var sb = null, mounts = [], regP = null;

  function supported() { return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window; }
  function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); }
  function standalone() { try { return matchMedia("(display-mode: standalone)").matches || navigator.standalone === true; } catch (e) { return false; } }
  function isNativeApp() { try { return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); } catch (e) { return false; } }
  function configured() { return !!VAPID_PUBLIC && VAPID_PUBLIC.indexOf("PUT_") !== 0; }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function u8(b64) {
    var p = "=".repeat((4 - b64.length % 4) % 4), s = (b64 + p).replace(/-/g, "+").replace(/_/g, "/"), r = atob(s), a = new Uint8Array(r.length);
    for (var i = 0; i < r.length; i++) a[i] = r.charCodeAt(i);
    return a;
  }

  async function getState() {
    if (isNativeApp()) return "local";
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
    if (isNativeApp()) { render(); return; }
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


  /* ---------------- تفضيلات الإشعارات (لكل دور أنواعه الخاصة) ---------------- */
  var KINDS = {
    student: [
      ["exam_new", "clipboard", "اختبار جديد من معلمك", "حين يرسل لك المعلم اختبارًا برمز الدخول وموعده"],
      ["exam_start", "clock", "موعد بدء الاختبار", "قبل البدء بساعة، وبعشر دقائق، وعند البدء"],
      ["exam_end", "timer", "اقتراب انتهاء وقت الدخول", "تنبيه قبل إغلاق باب الدخول للاختبار"],
      ["video", "video", "فيديو حل جديد", "عندما يرفع معلمك فيديو حل اختبار أنهيته"],
      ["league", "trophy", "دوري الأبطال", "اقتراب بدء الدوري وتحديثات الترتيب"],
      ["teacher_new", "userplus", "انضمام معلم جديد", "عندما ينضم معلم جديد للتطبيق"],
      ["teacher_spec", "cap", "تخصص جديد لمعلميك", "عندما ينشئ معلم اشتركت معه تخصصه ونبذته"],
      ["message", "chat", "رسائل المعلمين", "عند وصول رسالة جديدة من معلمك"]
    ],
    teacher: [
      ["sub_new", "userplus", "مشترك جديد", "عندما يشترك طالب معك"],
      ["exam_enter", "eye", "طالب دخل اختبارًا", "فور دخول طالب لاختبارك لتتابع من يختبر الآن"],
      ["exam_done", "check", "طالب أنهى اختبارًا", "عند تسليم طالب لاختبارك مع درجته"],
      ["exam_reminder", "clock", "تذكير باختباراتك", "قبل موعد بدء اختبار أنشأته"],
      ["message", "chat", "رسائل الطلاب", "عند وصول رسالة جديدة من طالب"],
      ["league", "trophy", "دوري الأبطال", "تحديثات الدوريات التي أنشأتها"],
      ["trial_end", "hourglass", "انتهاء التجربة المجانية", "قبل انتهاء الأيام المجانية"],
      ["sub_end", "calendar", "قرب انتهاء الاشتراك", "قبل انتهاء اشتراكك بأيام"]
    ]
  };
  function pkey(role) { return "eduassess_np_" + role; }
  function getPrefs(role) { try { return JSON.parse(lsGet(pkey(role)) || "{}") || {}; } catch (e) { return {}; } }
  function pref(kind, role) { role = role || curRole(); return getPrefs(role)[kind] !== false; }
  function curRole() { return lsGet("edu_role") === "teacher" || /teacher\.html/i.test(location.pathname) ? "teacher" : "student"; }
  var saveT = null;
  function setPref(role, kind, on) {
    var p = getPrefs(role); p[kind] = !!on; lsSet(pkey(role), JSON.stringify(p));
    syncPrefs(role, p);
  }
  /* يُحفظ في الجهاز (يطبّقه عامل الإشعارات) وفي بيانات الحساب ليقرأها الخادم عند الإرسال */
  function syncPrefs(role, p) {
    try {
      navigator.serviceWorker && navigator.serviceWorker.ready.then(function (r) { r.active && r.active.postMessage({ type: "edu-prefs", prefs: p }); });
    } catch (e) {}
    clearTimeout(saveT);
    saveT = setTimeout(function () {
      try { if (sb && sb.auth && sb.auth.updateUser) { var d = {}; d["notif_prefs_" + role] = p; sb.auth.updateUser({ data: d }); } } catch (e) {}
    }, 900);
  }

  /* ---------------- تجربة الإشعارات ---------------- */
  var steps = [], testing = false;
  function setStep(i, label, st) { steps[i] = { l: label, s: st }; render(); }
  async function test() {
    if (testing) return;
    testing = true; steps = []; render();
    var ui = window.EduUI;
    try {
      if (isNativeApp()) {
        if (typeof window.testNotif === "function") await window.testNotif();
        return;
      }
      setStep(0, "دعم الجهاز للإشعارات", "run");
      if (!supported()) { setStep(0, isIOS() && !standalone() ? "على الآيفون: أضف التطبيق للشاشة الرئيسية أولًا" : "هذا المتصفح لا يدعم الإشعارات", "bad"); return; }
      setStep(0, "دعم الجهاز للإشعارات", "ok");
      setStep(1, "إذن الإشعارات", "run");
      var p = Notification.permission;
      if (p === "default") p = await Notification.requestPermission();
      if (p !== "granted") { setStep(1, p === "denied" ? "الإذن محظور — فعّله من إعدادات الموقع" : "لم يتم منح الإذن", "bad"); return; }
      lsSet(OFF_KEY, null);
      setStep(1, "إذن الإشعارات", "ok");
      setStep(2, "خدمة الخلفية", "run");
      var reg;
      try { reg = await register(); } catch (e) { setStep(2, "تعذّر تشغيل خدمة الخلفية", "bad"); return; }
      setStep(2, "خدمة الخلفية", "ok");
      setStep(3, "ربط الجهاز بحسابك", "run");
      var linked = false;
      if (configured()) { try { var sub = await subscribe(); linked = await save(sub); } catch (e) {} }
      setStep(3, linked ? "ربط الجهاز بحسابك" : "لم يُربط الجهاز بالخادم (ستعمل التجربة المحلية فقط)", linked ? "ok" : "bad");
      setStep(4, "عرض إشعار تجريبي", "run");
      await reg.showNotification("EduAssess Pro", {
        body: "✅ الإشعارات تعمل بنجاح على هذا الجهاز", icon: "assets/favicon.png", badge: "assets/badge.png",
        lang: "ar", dir: "rtl", tag: "edu-test", renotify: true, vibrate: [120, 60, 120], data: { url: "./" }
      });
      setStep(4, "عرض إشعار تجريبي — تحقّق من شريط الإشعارات", "ok");
      ui && ui.toast("أُرسل إشعار تجريبي، تحقّق من شريط الإشعارات", "ok", { title: "التجربة ناجحة", icon: "bell" });
    } catch (e) {
      console.warn("[EduPush] test:", e);
      ui && ui.toast("تعذّرت تجربة الإشعارات", "err");
    } finally { testing = false; render(); getState().then(function () { hideBanner(); }); }
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
      '<div class="ep-ic">' + ic("bell") + '</div><div class="ep-tx"><b>' + (ios ? "ثبّت التطبيق لتصلك الإشعارات" : "فعّل الإشعارات") + "</b><span>" +
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

  function ic(n) { return window.EduUI ? window.EduUI.ico(n) : ""; }
  function stepIcon(s) { return s === "ok" ? ic("check") : s === "bad" ? ic("x") : ""; }

  async function render() {
    if (!mounts.length || !configured()) return;
    css();
    var st = await getState();
    mounts.forEach(function (m) {
      var el = m.el, role = m.role;
      if (!el || !el.isConnected) return;
      var cls = st === "on" || st === "local" ? "on" : (st === "off" ? "" : "warn"), ttl, txt, act = "";
      if (st === "on") { ttl = "الإشعارات مفعّلة"; txt = "تصلك التنبيهات على هذا الجهاز حتى والتطبيق مغلق."; act = '<button type="button" class="np-btn off" data-a="off">إيقاف</button>'; }
      else if (st === "off") { ttl = "الإشعارات متوقفة"; txt = "فعّلها ليصلك كل جديد فورًا."; act = '<button type="button" class="np-btn gold" data-a="on">تفعيل</button>'; }
      else if (st === "local") { ttl = "تنبيهات التطبيق مفعّلة"; txt = "تصلك مواعيد الاختبارات قبل بدئها."; }
      else if (st === "denied") { ttl = "الإشعارات محظورة"; txt = "اسمح بها من إعدادات الموقع في المتصفح ثم أعد تحميل الصفحة."; }
      else if (st === "ios-install") { ttl = "ثبّت التطبيق أولًا"; txt = "اضغط «مشاركة» ثم «إضافة إلى الشاشة الرئيسية» وافتح التطبيق من هناك."; }
      else { ttl = "غير مدعومة"; txt = "هذا المتصفح لا يدعم الإشعارات."; }
      var prefs = getPrefs(role);
      var list = (KINDS[role] || []).map(function (k) {
        return '<label class="np-it"><span class="np-ti">' + ic(k[1]) + '</span><span class="np-t"><b>' + k[2] + "</b><small>" + k[3] + '</small></span>' +
          '<input type="checkbox" data-k="' + k[0] + '"' + (prefs[k[0]] === false ? "" : " checked") + '><span class="np-sw"></span></label>';
      }).join("");
      var stepsHtml = steps.map(function (s) { return '<li class="' + s.s + '"><i>' + stepIcon(s.s) + "</i><span>" + s.l + "</span></li>"; }).join("");
      el.innerHTML = '<div class="np"><div class="np-st ' + cls + '"><span class="np-ic">' + ic(cls === "warn" ? "alert" : "bell") + '</span><div class="np-tx"><b>' + ttl + "</b><span>" + txt + "</span></div>" + act + "</div>" +
        '<div class="np-test"><div class="np-test-h"><div><b>تجربة الإشعارات</b><small>تأكّد أن الإشعارات تصلك على هذا الجهاز الآن</small></div>' +
        '<button type="button" class="np-btn" data-a="test"' + (testing ? " disabled" : "") + ">" + ic("send") + (testing ? "جارٍ الفحص…" : "تجربة") + '</button></div><ul class="np-steps">' + stepsHtml + "</ul></div>" +
        '<div class="np-h">اختر الإشعارات التي تصلك</div><div class="np-list">' + list + '</div><div class="np-foot">تُحفظ اختياراتك تلقائيًا وتُطبَّق على كل أجهزتك.</div></div>';
      el.querySelectorAll("[data-a]").forEach(function (b) {
        b.onclick = function () {
          var a = b.dataset.a;
          if (a === "test") test(); else if (a === "on") enable(); else disable();
        };
      });
      el.querySelectorAll("input[data-k]").forEach(function (c) {
        c.onchange = function () {
          setPref(role, c.dataset.k, c.checked);
          if (window.EduUI) window.EduUI.toast(c.checked ? "ستصلك هذه الإشعارات" : "تم إيقاف هذا النوع", c.checked ? "ok" : "info", { icon: c.checked ? "bell" : "x" });
        };
      });
    });
  }

  function mountSettings(el, role) {
    if (!el) return;
    role = role || curRole();
    var ex = mounts.filter(function (m) { return m.el === el; })[0];
    if (ex) ex.role = role; else mounts.push({ el: el, role: role });
    render();
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", function (e) {
      var d = e.data || {};
      if (d.type === "edu-push") window.dispatchEvent(new Event("edu-push"));
      if (d.type === "edu-open" && typeof window.eduPushOpen === "function") window.eduPushOpen(d.url);
    });
  }

  window.EduPush = { test: test, pref: pref, attach: attach, detach: detach, enable: enable, disable: disable, state: getState, mountSettings: mountSettings };
})();
