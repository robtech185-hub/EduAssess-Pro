/* =====================================================================
   EduAssess Pro — الطبقة المشتركة (شاشة التحميل + الباقات + رسائل الترحيب)
   تُحمَّل في <head> بدون defer حتى تظهر شاشة التحميل فورًا.
   ===================================================================== */
(function () {
  "use strict";

  /* ------------------------- أدوات التخزين الآمن ------------------------- */
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  };

  /* ------------------------------ الباقات ------------------------------ */
  // الأسعار: دولار لخارج مصر — جنيه لداخل مصر
  var PLANS = [
    { m: 1, name: "شهر واحد",   usd: 3,  egp: 50  },
    { m: 2, name: "شهران",      usd: 5,  egp: 95  },
    { m: 3, name: "ثلاثة شهور", usd: 11, egp: 140 }
  ];

  function isEgyptAuto() {
    try {
      var tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || "");
      if (tz === "Africa/Cairo") return true;
    } catch (e) {}
    var l = (navigator.language || "").toLowerCase();
    return l === "ar-eg";
  }
  function getRegion() { var s = store.get("eduassess_region"); return s === "eg" || s === "world" ? s : (isEgyptAuto() ? "eg" : "world"); }
  function setRegion(r) { store.set("eduassess_region", r); }

  function price(plan, eg) { return eg ? { n: plan.egp, cur: "ج.م", txt: plan.egp + " ج.م" } : { n: plan.usd, cur: "$", txt: "$" + plan.usd }; }
  // أقل سعر شهري = الباقة «الأوفر»
  function bestPlan(eg) {
    var best = PLANS[0];
    PLANS.forEach(function (p) { if ((eg ? p.egp : p.usd) / p.m < (eg ? best.egp : best.usd) / best.m) best = p; });
    return best;
  }
  function perMonth(plan, eg) { var v = (eg ? plan.egp : plan.usd) / plan.m; v = Math.round(v * 100) / 100; return (eg ? "" : "$") + String(v).replace(/\.0+$/, "") + (eg ? " ج.م" : "") + " / شهر"; }
  // التوفير مقارنةً بسعر الشهر الواحد × المدة (يُعرض فقط إذا كان موجبًا)
  function saving(plan, eg) { var base = PLANS[0]; var s = (eg ? base.egp : base.usd) * plan.m - (eg ? plan.egp : plan.usd); return s > 0 ? s : 0; }

  /* --------------------------- رسائل الترحيب --------------------------- */
  var WELCOME = {
    0: {
      icon: "🎁", a: "#0A6B5C", b: "#13B59B", badge: "تجربة مجانية — ٣ أيام",
      title: "أهلًا بك في عائلة EduAssess Pro",
      text: "حسابك جاهز الآن! أمامك ٣ أيام كاملة لتجرّب كل شيء بلا قيود: أنشئ اختبارك الأول، شارك رمزه مع طلابك، وشاهد النتائج تتحدّث عنك.",
      perks: ["أنشئ اختبار MCQ في دقائق", "تصحيح تلقائي ونتائج فورية", "تابع كل طالب ومدة حلّه"],
      quote: "بداية التميّز دائمًا خطوة صغيرة وشجاعة — وأنت خطوتها الآن."
    },
    1: {
      icon: "🌱", a: "#0A2260", b: "#1F63E0", badge: "باقة الشهر الواحد",
      title: "أهلًا بك في باقة الشهر الواحد!",
      text: "بداية موفّقة ومباركة. شهر كامل لتكتشف كيف يصبح التقييم أسهل وأسرع وأجمل: اختبارات ذكية، نتائج لحظية، وطلاب أكثر حماسًا.",
      perks: ["اختبارات وطلاب بلا حدود طوال الشهر", "إحصائيات وترتيب الأوائل لحظة بلحظة", "شهادات تقدير لتحفيز المتفوقين"],
      quote: "رحلة الألف اختبار تبدأ باختبار واحد — وقد بدأتها اليوم."
    },
    2: {
      icon: "🚀", a: "#3A1C8C", b: "#2F6BFF", badge: "باقة الشهرين",
      title: "مرحبًا بك في باقة الشهرين!",
      text: "قرار حكيم! شهران كاملان يمنحانك الوقت لبناء عادة تقييم منتظمة وملاحظة الأثر الحقيقي على مستوى طلابك أسبوعًا بعد أسبوع.",
      perks: ["وقت كافٍ لقياس تطوّر طلابك", "مجموعات وتنبيهات اختبارات منظّمة", "رسوم بيانية لقراءة مستوى كل اختبار"],
      quote: "الاستمرار هو السرّ؛ والنجاح ثمرة عادة صغيرة تتكرر كل يوم."
    },
    3: {
      icon: "👑", a: "#7A4A00", b: "#F0A500", badge: "باقة الثلاثة شهور",
      title: "أهلًا بك في نخبة المعلمين!",
      text: "التزام الكبار يصنع الفرق. ثلاثة شهور من التميّز المتواصل: متابعة دقيقة، نتائج واضحة، وتكريم مستمر لمن يستحق — فصل دراسي كامل بثقة وراحة بال.",
      perks: ["فصل دراسي كامل بلا انقطاع", "تقارير أداء تكشف نقاط القوة والضعف", "حضور احترافي يليق بمعلّم متميّز"],
      quote: "العظماء لا ينتظرون الفرصة — بل يصنعون المنصّة التي تتسع لأحلامهم."
    }
  };

  function studentWelcome(teacher) {
    return {
      icon: "🎓", a: "#0A2260", b: "#13B59B", badge: "اشتراك جديد",
      title: "مرحبًا بك في رحلتك مع " + (teacher || "معلمك") + "!",
      text: "أحسنت الاختيار! ستصلك الآن مواعيد اختبارات هذا المعلم أولًا بأول. استعدّ، ذاكر بذكاء، وثق بقدراتك — فكل اختبار فرصة جديدة لتتقدّم.",
      perks: ["تنبيهات بمواعيد الاختبارات", "نتيجتك فور انتهاء الاختبار", "تابع تقدّمك وإحصائياتك باستمرار"],
      quote: "الطالب المجتهد لا يخاف الاختبار؛ لأنه يعرف أن الاجتهاد لا يخذل صاحبه."
    };
  }

  /* ----------------------------- نافذة الترحيب ----------------------------- */
  function confetti() {
    if (window.matchMedia && matchMedia("(prefers-reduced-motion:reduce)").matches) return;
    var box = document.createElement("div"); box.className = "wl-conf";
    var cols = ["#FFB400", "#13B59B", "#4C8DFF", "#FF6B8B", "#FFD15C", "#7C5CFF"];
    for (var i = 0; i < 46; i++) {
      var p = document.createElement("i");
      p.style.left = Math.random() * 100 + "%";
      p.style.background = cols[i % cols.length];
      p.style.setProperty("--dx", (Math.random() * 160 - 80) + "px");
      p.style.setProperty("--rot", (360 + Math.random() * 720) + "deg");
      p.style.animationDuration = (2.2 + Math.random() * 2.2) + "s";
      p.style.animationDelay = (Math.random() * .7) + "s";
      p.style.width = (6 + Math.random() * 7) + "px";
      p.style.height = (9 + Math.random() * 9) + "px";
      box.appendChild(p);
    }
    document.body.appendChild(box);
    setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 5200);
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  // data: كائن من WELCOME — opts: { name, actions:[{label,href,cls,target}] , onClose }
  function showWelcome(data, opts) {
    opts = opts || {};
    var ov = document.createElement("div"); ov.className = "wl-ov"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true");
    var title = data.title;
    if (opts.name) title = title.replace("!", "") + "، " + opts.name + "!";
    var acts = (opts.actions || []).map(function (a) {
      return a.href
        ? '<a class="wl-btn ' + (a.cls || "s") + '" href="' + esc(a.href) + '"' + (a.target ? ' target="' + a.target + '" rel="noopener"' : "") + ">" + esc(a.label) + "</a>"
        : '<button type="button" class="wl-btn ' + (a.cls || "s") + '" data-close>' + esc(a.label) + "</button>";
    }).join("");
    ov.innerHTML =
      '<div class="wl-card" style="--wl-a:' + data.a + ";--wl-b:" + data.b + '">' +
      '<button class="wl-x" type="button" aria-label="إغلاق" data-close>✕</button>' +
      '<div class="wl-hero"><div class="wl-emoji">' + data.icon + '</div><div class="wl-badge">' + esc(data.badge) + "</div><h2>" + esc(title) + "</h2></div>" +
      '<div class="wl-body"><p>' + esc(data.text) + "</p><ul class=\"wl-perks\">" +
      data.perks.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") +
      '</ul><div class="wl-quote">' + esc(data.quote) + '</div><div class="wl-act">' + acts + '<button type="button" class="wl-btn s" data-close>' + (opts.closeLabel || "ابدأ الآن") + "</button></div></div></div>";
    function close() { document.removeEventListener("keydown", onKey); if (ov.parentNode) ov.parentNode.removeChild(ov); if (opts.onClose) opts.onClose(); }
    function onKey(e) { if (e.key === "Escape") close(); }
    ov.addEventListener("click", function (e) { if (e.target === ov || (e.target.closest && e.target.closest("[data-close]"))) close(); });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(ov);
    confetti();
    return { close: close };
  }

  /* ------------------------------ شاشة التحميل ------------------------------ */
  var scriptEl = document.currentScript;
  var MIN = scriptEl && +scriptEl.getAttribute("data-min") || 1200;
  var base = (scriptEl && scriptEl.src) ? scriptEl.src.replace(/[^\/]*$/, "") : "assets/";
  var started = Date.now();

  function buildLoader() {
    var el = document.createElement("div");
    el.id = "edu-loader"; el.setAttribute("role", "status"); el.setAttribute("aria-live", "polite"); el.setAttribute("aria-label", "جارٍ التحميل");
    var letters = "EduAssess".split("").map(function (c, i) { return '<span style="animation-delay:' + (0.25 + i * 0.06) + 's">' + c + "</span>"; }).join("");
    letters += '<span class="g" style="animation-delay:.85s">&nbsp;Pro</span>';
    el.innerHTML =
      '<div class="ld-wrap">' +
      '<div class="ld-stage"><div class="ld-ring r1"><i></i></div><div class="ld-ring r2"><i></i></div><div class="ld-ring r3"><i></i></div>' +
      '<div class="ld-badge"><img src="' + base + 'logo-sm.png" alt="شعار EduAssess Pro" width="92" height="98"></div></div>' +
      '<div class="ld-name">' + letters + "</div>" +
      '<div class="ld-sub" id="ld-sub">نجهّز لك تجربة تعليمية مميزة…</div>' +
      '<div class="ld-bar"><b id="ld-fill"></b></div><div class="ld-pct" id="ld-pct">0%</div></div>';
    return el;
  }

  var loader = buildLoader();
  (document.body || document.documentElement).appendChild(loader);
  document.documentElement.classList.add("ld-on");
  // قفل التمرير حتى ينتهي التحميل
  var lockStyle = document.createElement("style"); lockStyle.textContent = "html.ld-on,html.ld-on body{overflow:hidden!important}"; document.head.appendChild(lockStyle);

  var msgs = ["نجهّز لك تجربة تعليمية مميزة…", "التعلّم رحلة… وأنت على الطريق الصحيح", "كل اختبار خطوة نحو التفوّق", "لحظات ونبدأ ✨"];
  var mi = 0, pct = 0, done = false;
  var tick = setInterval(function () {
    if (done) return;
    pct = Math.min(92, pct + (pct < 60 ? 6 : 2));
    paint();
  }, 130);
  var mt = setInterval(function () {
    var s = document.getElementById("ld-sub"); if (!s) return;
    mi = (mi + 1) % msgs.length; s.style.opacity = 0;
    setTimeout(function () { s.textContent = msgs[mi]; s.style.opacity = 1; }, 300);
  }, 1500);
  function paint() {
    var f = document.getElementById("ld-fill"), p = document.getElementById("ld-pct");
    if (f) f.style.width = pct + "%"; if (p) p.textContent = Math.round(pct) + "%";
  }
  function finish() {
    if (done) return; done = true;
    clearInterval(tick); clearInterval(mt);
    pct = 100; paint();
    setTimeout(function () {
      loader.classList.add("out");
      document.documentElement.classList.remove("ld-on");
      document.documentElement.classList.add("ld-done");
      setTimeout(function () { if (loader.parentNode) loader.parentNode.removeChild(loader); if (lockStyle.parentNode) lockStyle.parentNode.removeChild(lockStyle); }, 1000);
      try { window.dispatchEvent(new Event("edu:ready")); } catch (e) {}
    }, 320);
  }
  function onLoad() {
    var wait = Math.max(0, MIN - (Date.now() - started));
    setTimeout(finish, wait);
  }
  if (document.readyState === "complete") onLoad(); else window.addEventListener("load", onLoad);
  setTimeout(finish, 6500); // صمّام أمان: لا تعلق الشاشة أبدًا

  /* ------------------------------- واجهة عامة ------------------------------- */
  window.EDU = {
    WA: "201012645837",
    PLANS: PLANS, WELCOME: WELCOME,
    store: store, esc: esc,
    getRegion: getRegion, setRegion: setRegion,
    price: price, bestPlan: bestPlan, perMonth: perMonth, saving: saving,
    isEgyptName: function (s) { return /مصر|egypt|^eg$/i.test(String(s || "").trim()); },
    showWelcome: showWelcome, studentWelcome: studentWelcome, confetti: confetti
  };
})();
