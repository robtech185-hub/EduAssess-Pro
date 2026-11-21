/* EduAssess Pro — اللغة (ar/en/fr) + شاشة البداية: اختيار اللغة ثم الدور (طالب/معلم) */
(function () {
  "use strict";
  var GATE = document.currentScript && document.currentScript.getAttribute("data-gate") === "1";
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  var LANGS = { ar: { n: "العربية", dir: "rtl" }, en: { n: "English", dir: "ltr" }, fr: { n: "Français", dir: "ltr" } };
  var lang = ls("edu_lang"); if (!LANGS[lang]) lang = null;

  /* القاموس: النص العربي ← [إنجليزي، فرنسي]. أضف هنا أي نص جديد ليُترجم تلقائيًا في كل الصفحات */
  var D = {
    "اختر لغتك": ["Choose your language", "Choisissez votre langue"],
    "من أنت؟": ["Who are you?", "Qui êtes-vous ?"],
    "اختر هويتك للمتابعة. لا يمكن عرض الهوية الأخرى بعد الاختيار.": ["Choose your role to continue. The other role will be hidden.", "Choisissez votre rôle pour continuer. L'autre rôle sera masqué."],
    "طالب": ["Student", "Élève"], "معلم": ["Teacher", "Enseignant"],
    "أريد أداء الاختبارات ومتابعة نتائجي": ["I want to take exams and follow my results", "Je passe des examens et je suis mes résultats"],
    "أريد إنشاء الاختبارات ومتابعة طلابي": ["I want to create exams and follow my students", "Je crée des examens et je suis mes élèves"],
    "بوابة الطالب": ["Student portal", "Espace élève"], "بوابة المعلم": ["Teacher portal", "Espace enseignant"],
    "رحلتك كطالب": ["Your journey as a student", "Votre parcours d'élève"], "رحلتك كمعلم": ["Your journey as a teacher", "Votre parcours d'enseignant"],
    "مرحبًا بعودتك": ["Welcome back", "Bon retour"],
    "تسجيل الخروج": ["Log out", "Déconnexion"], "تسجيل الخروج؟": ["Log out?", "Se déconnecter ?"], "البقاء": ["Stay", "Rester"],
    "إلغاء": ["Cancel", "Annuler"], "تأكيد": ["Confirm", "Confirmer"], "إغلاق": ["Close", "Fermer"], "تفعيل": ["Enable", "Activer"], "إيقاف": ["Turn off", "Désactiver"], "لاحقًا": ["Later", "Plus tard"],
    "فعّل الإشعارات": ["Enable notifications", "Activer les notifications"],
    "الإشعارات مفعّلة": ["Notifications are on", "Notifications activées"], "الإشعارات متوقفة": ["Notifications are off", "Notifications désactivées"],
    "تنبيهات التطبيق مفعّلة": ["App alerts are on", "Alertes de l'application activées"],
    "تجربة الإشعارات": ["Test notifications", "Tester les notifications"], "تجربة": ["Test", "Tester"],
    "اختر الإشعارات التي تصلك": ["Choose which notifications you get", "Choisissez vos notifications"],
    "تُحفظ اختياراتك تلقائيًا وتُطبَّق على كل أجهزتك.": ["Your choices are saved automatically.", "Vos choix sont enregistrés automatiquement."],
    "اختبار جديد من معلمك": ["New exam from your teacher", "Nouvel examen de votre enseignant"],
    "موعد بدء الاختبار": ["Exam start time", "Heure de début de l'examen"],
    "اقتراب انتهاء وقت الدخول": ["Entry closing soon", "Clôture de l'accès bientôt"],
    "فيديو حل جديد": ["New solution video", "Nouvelle vidéo de correction"],
    "دوري الأبطال": ["Champions League", "Ligue des champions"],
    "رسائل المعلمين": ["Teachers' messages", "Messages des enseignants"], "رسائل الطلاب": ["Students' messages", "Messages des élèves"],
    "مشترك جديد": ["New subscriber", "Nouvel abonné"], "طالب دخل اختبارًا": ["Student entered an exam", "Un élève est entré dans un examen"],
    "طالب أنهى اختبارًا": ["Student finished an exam", "Un élève a terminé un examen"],
    "تذكير باختباراتك": ["Your exam reminders", "Rappels de vos examens"],
    "انتهاء التجربة المجانية": ["Free trial ending", "Fin de l'essai gratuit"], "قرب انتهاء الاشتراك": ["Subscription ending soon", "Fin d'abonnement proche"],
    "مرحبًا": ["Welcome", "Bienvenue"]
  };
  /* سطور القاموس: «عربي|English|Français». المفتاح الذي يحوي {1} {2}… يُعامل كقالب (نص متغيّر الأجزاء) */
  var PAT = [];
  function addPat(k, en, fr) {
    var parts = k.split(/\{\d+\}/), src = "^" + parts.map(function (x) { return x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("(.+?)") + "$";
    try { PAT.push({ re: new RegExp(src), out: [en, fr], len: k.length }); } catch (e) {}
  }
  (window.EDU_DICT_TXT || "").split("\n").forEach(function (l) {
    var p = l.split("|").map(function (x) { return x.replace(/¦/g, "|"); }); if (p.length !== 3 || !p[0].trim()) return;
    var k = p[0].trim();
    if (/\{\d+\}/.test(k)) addPat(k, p[1].trim(), p[2].trim()); else D[k] = [p[1].trim(), p[2].trim()];
  });
  PAT.sort(function (a, b) { return b.len - a.len; });
  /* رسائل التنبيهات (تُستخدم في native.js و sw.js) — {n}=الاسم، {t}=المعلم */
  var M = {
    h1: ["📝 «{n}» starts in 1 hour{t}", "📝 « {n} » commence dans 1 heure{t}", "📝 يبدأ اختبار «{n}» بعد ساعة{t}"],
    m10: ["📝 «{n}» starts in 10 minutes{t}", "📝 « {n} » commence dans 10 minutes{t}", "📝 يبدأ اختبار «{n}» بعد ١٠ دقائق{t}"],
    now: ["🚀 «{n}» has started{t}", "🚀 « {n} » a commencé{t}", "🚀 بدأ الآن اختبار «{n}»{t}"],
    end: ["⏳ Entry to «{n}» closes in 30 minutes{t}", "⏳ L'accès à « {n} » ferme dans 30 minutes{t}", "⏳ يُغلق دخول اختبار «{n}» بعد 30 دقيقة{t}"],
    trial: ["⏳ Your free trial ends in {n} day(s)", "⏳ Votre essai gratuit se termine dans {n} jour(s)", "⏳ تنتهي تجربتك المجانية بعد {n} يوم"],
    sub: ["⏳ Your subscription ends in {n} day(s)", "⏳ Votre abonnement se termine dans {n} jour(s)", "⏳ ينتهي اشتراكك بعد {n} يوم"],
    ok: ["✅ Notifications work", "✅ Les notifications fonctionnent", "✅ التنبيهات تعمل بنجاح"],
    wait: ["A notification will arrive in 10 seconds. Close the app now.", "Une notification arrive dans 10 secondes. Fermez l'application.", "سيصلك تنبيه بعد 10 ثوانٍ، أغلق التطبيق الآن"]
  };
  function idx() { return lang === "en" ? 0 : lang === "fr" ? 1 : 2; }
  function t(s) { if (lang === "ar" || !lang || s == null) return s; return conv(String(s)); }
  function msg(k, v) { var s = M[k][idx()]; v = v || {}; return s.replace(/\{(\w+)\}/g, function (_, x) { return v[x] == null ? "" : v[x]; }); }

  /* التواريخ والأرقام: أي طلب بلغة عربية يُحوَّل للغة المختارة (اليوم، الشهر، الساعة…) */
  (function () {
    function L(a) { if (!lang || lang === "ar") return a; var m = { en: "en-GB", fr: "fr-FR" }[lang]; if (a == null || (typeof a === "string" && /^ar/i.test(a))) return m; if (Array.isArray(a) && /^ar/i.test(a[0] || "")) return m; return a; }
    ["toLocaleDateString", "toLocaleTimeString", "toLocaleString"].forEach(function (f) {
      var o = Date.prototype[f]; Date.prototype[f] = function (a, b) { return o.call(this, L(a), b); };
    });
    var N = Number.prototype.toLocaleString; Number.prototype.toLocaleString = function (a, b) { return N.call(this, L(a), b); };
    var DF = Intl.DateTimeFormat; Intl.DateTimeFormat = function (a, b) { return new DF(L(a), b); }; Intl.DateTimeFormat.prototype = DF.prototype; Intl.DateTimeFormat.supportedLocalesOf = DF.supportedLocalesOf;
    var DN = Intl.DisplayNames; if (DN) { Intl.DisplayNames = function (a, b) { return new DN(L(a), b); }; Intl.DisplayNames.prototype = DN.prototype; }
  })();
  /* ---------- ترجمة الصفحة: تطابق تام ثم استبدال العبارات داخل النص، وتحويل الأرقام العربية ---------- */
  var orig = new WeakMap(), ATTR = ["placeholder", "title", "aria-label", "alt"], RX = null, RXn = 0;
  var AL = "\u0600-\u06FF", DG = "٠١٢٣٤٥٦٧٨٩";
  function rx() {
    var k = Object.keys(D).filter(function (x) { return x.length >= 4; });
    if (RX && RXn === k.length) return RX; RXn = k.length;
    k.sort(function (a, b) { return b.length - a.length; });
    RX = new RegExp("(?<![" + AL + "])(" + k.map(function (x) { return x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("|") + ")(?![" + AL + "])", "g");
    return RX;
  }
  function fillPat(tpl, m) { return tpl.replace(/\{(\d+)\}/g, function (_, n) { var g = m[+n]; if (g == null) return ""; var e = D[g.trim()]; return e ? e[idx()] : g; }); }
  function pat(k) {
    for (var i = 0; i < PAT.length; i++) { var m = PAT[i].re.exec(k); if (m) return fillPat(PAT[i].out[idx()], m); }
    return null;
  }
  var DIG = function (x) { return x.replace(/[٠-٩]/g, function (d) { return DG.indexOf(d); }); };
  function conv(v) {
    var k = v.trim(), e = D[k], out = v;
    if (e) out = v.replace(k, function () { return e[idx()]; });
    else if (/[\u0621-\u064A]/.test(v)) {
      var p = pat(k);
      if (p != null) out = v.replace(k, function () { return p; });
      else {
        var rep = 0;
        out = v.replace(rx(), function (m) { if (!D[m]) return m; rep += m.length; return D[m][idx()]; });
        /* بقي عربي: إن كان أكثر مما تُرجم فهو نص كتبه مستخدم (سؤال/اسم) فنتركه كما هو بدل تشويهه */
        var left = (out.match(/[\u0621-\u064A]/g) || []).length;
        if (left && left > rep) return v;
      }
    }
    return DIG(out);
  }
  var CTX = { OPTION: { "خطأ": ["False", "Faux"] } };
  function trAttrs(node) {
    ATTR.forEach(function (a) { var x = node.getAttribute && node.getAttribute(a); if (x && /[\u0600-\u06FF]/.test(x)) { var n = conv(x); if (n !== x) node.setAttribute(a, n); } });
  }
  function tr(node) {
    if (!lang || lang === "ar" || !node) return;
    if (node.nodeType === 3) {
      var v = node.nodeValue; if (!v || !/[\u0600-\u06FF٠-٩]/.test(v)) return;
      var pn = node.parentNode, c = pn && CTX[pn.nodeName] && CTX[pn.nodeName][v.trim()];
      var n = c ? v.replace(v.trim(), c[idx()]) : conv(v);
      if (n !== v) { if (!orig.has(node)) orig.set(node, v); node.nodeValue = n; }
      return;
    }
    if (node.nodeType !== 1 || /^(SCRIPT|STYLE|TEXTAREA)$/.test(node.nodeName)) return;
    if (node.getAttribute && (node.getAttribute("translate") === "no" || node.classList.contains("notranslate"))) return;
    trAttrs(node);
    for (var ch = node.firstChild; ch; ch = ch.nextSibling) tr(ch);
  }
  /* نصوص لم تُترجم بعد (لتزويدي بها): EduI18N.missing() في وحدة التحكم */
  function missing() {
    var out = {}, w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), n;
    while ((n = w.nextNode())) { var v = n.nodeValue.trim(); if (/[\u0600-\u06FF]/.test(v) && n.parentNode.nodeName !== "SCRIPT" && n.parentNode.nodeName !== "STYLE") out[v] = 1; }
    return Object.keys(out);
  }
  function apply() {
    var h = document.documentElement;
    h.setAttribute("lang", lang || "ar"); h.setAttribute("dir", LANGS[lang || "ar"].dir);
    if (lang && lang !== "ar") {
      tr(document.body); document.title = conv(document.title || "");
      var q = 0, pend = [];
      new MutationObserver(function (ms) {
        ms.forEach(function (m) {
          if (m.type === "attributes") { pend.push({ attrs: m.target }); return; }
          pend.push(m.type === "characterData" ? m.target : null); m.addedNodes.forEach(function (x) { pend.push(x); });
        });
        if (!q) q = requestAnimationFrame(function () { q = 0; var l = pend; pend = []; l.forEach(function (x) { if (!x) return; if (x.attrs) trAttrs(x.attrs); else if (x.isConnected !== false) tr(x); }); });
      }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTR });
      /* عنوان الصفحة إن تغيّر لاحقًا */
      var ti = document.querySelector("title");
      if (ti) new MutationObserver(function () { var c = conv(document.title || ""); if (c !== document.title) document.title = c; }).observe(ti, { childList: true, characterData: true, subtree: true });
      /* alert / confirm / prompt نصوص نظام لا تظهر في الصفحة فنترجمها هنا */
      ["alert", "confirm", "prompt"].forEach(function (f) {
        var o = window[f]; if (typeof o !== "function" || o.__edu) return;
        window[f] = function (m, d) { return o.call(window, m == null ? m : conv(String(m)), d); }; window[f].__edu = 1;
      });
    }
  }
  function set(l) { if (LANGS[l]) { lang = l; ls("edu_lang", l); } }

  /* ---------- شاشة البداية ---------- */
  var IC = {
    cap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/><path d="M22 10v6"/></svg>',
    board: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="13" rx="2.5"/><path d="M8 21l4-5 4 5M7 8h6M7 11.5h10"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>'
  };
  function css() {
    var s = document.createElement("style");
    s.textContent = "html.edu-gate body>*:not(#edu-gate){visibility:hidden!important}html.edu-gate{overflow:hidden}" +
      "#edu-gate{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:calc(20px + env(safe-area-inset-top,0px)) 20px calc(20px + env(safe-area-inset-bottom,0px));overflow:auto;color:#fff;background:#040C24;font-family:'IBM Plex Sans Arabic','Readex Pro',system-ui,Tahoma,sans-serif}" +
      "#edu-gate::before,#edu-gate::after{content:'';position:absolute;border-radius:50%;filter:blur(70px);opacity:.55;pointer-events:none;animation:egf 12s ease-in-out infinite alternate}" +
      "#edu-gate::before{width:340px;height:340px;background:#1F63E0;top:-90px;inset-inline-end:-80px}#edu-gate::after{width:300px;height:300px;background:#FFB400;opacity:.22;bottom:-100px;inset-inline-start:-70px;animation-delay:-5s}" +
      "@keyframes egf{to{transform:translate(30px,40px) scale(1.15)}}" +
      "#edu-gate .grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);background-size:36px 36px;-webkit-mask-image:radial-gradient(70% 60% at 50% 40%,#000,transparent);mask-image:radial-gradient(70% 60% at 50% 40%,#000,transparent)}" +
      "#edu-gate .g{position:relative;width:min(430px,100%);text-align:center;animation:egi .55s cubic-bezier(.2,.8,.2,1) both}@keyframes egi{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}" +
      "#edu-gate .lg{width:84px;height:84px;margin:0 auto 18px;border-radius:24px;box-shadow:0 0 0 1px rgba(255,255,255,.18),0 18px 44px rgba(31,99,224,.55)}" +
      "#edu-gate .st{display:flex;justify-content:center;gap:8px;margin-bottom:18px}#edu-gate .st i{width:26px;height:5px;border-radius:5px;background:rgba(255,255,255,.2);transition:.3s}#edu-gate .st i.on{width:44px;background:linear-gradient(90deg,#FFD15C,#FFB400)}" +
      "#edu-gate h2{font-size:clamp(25px,6.5vw,31px);font-weight:700;line-height:1.4;margin:0 0 8px}#edu-gate p{margin:0 0 26px;color:#B7C5EC;font-size:15px;line-height:1.85}" +
      "#edu-gate .o{display:flex;align-items:center;gap:16px;width:100%;margin:0 0 13px;padding:16px 18px;border-radius:22px;border:1px solid rgba(255,255,255,.16);background:linear-gradient(145deg,rgba(255,255,255,.12),rgba(255,255,255,.04));backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);color:#fff;font:inherit;text-align:start;cursor:pointer;transition:transform .2s,border-color .25s,background .25s,box-shadow .25s;-webkit-tap-highlight-color:transparent;animation:egi .55s both}" +
      "#edu-gate .o:nth-of-type(2){animation-delay:.08s}#edu-gate .o:nth-of-type(3){animation-delay:.16s}" +
      "#edu-gate .o:hover,#edu-gate .o:focus-visible{transform:translateY(-3px);border-color:#FFD15C;box-shadow:0 14px 34px rgba(0,0,0,.35),0 0 0 3px rgba(255,209,92,.2);outline:0}#edu-gate .o:active{transform:scale(.98)}" +
      "#edu-gate .bd{flex:none;width:52px;height:52px;border-radius:16px;display:grid;place-items:center;font:700 17px 'Readex Pro',sans-serif;letter-spacing:.5px;color:#2B1D00;background:linear-gradient(135deg,#FFD15C,#FFB400);box-shadow:0 8px 20px rgba(255,180,0,.3)}" +
      "#edu-gate .bd svg{width:28px;height:28px}#edu-gate .o.t2 .bd{background:linear-gradient(135deg,#6AA6FF,#1F63E0);color:#fff;box-shadow:0 8px 20px rgba(31,99,224,.45)}" +
      "#edu-gate .tx{flex:1;min-width:0}#edu-gate .tx b{display:block;font-size:18px;font-weight:700;line-height:1.5}#edu-gate .tx small{display:block;font-size:13px;color:#B7C5EC;line-height:1.65;margin-top:1px}" +
      "#edu-gate .ch{flex:none;width:22px;height:22px;color:#FFD15C;opacity:.8}[dir=ltr] #edu-gate .ch{transform:scaleX(-1)}" +
      "#edu-gate .bk{display:inline-flex;align-items:center;gap:6px;margin-top:8px;padding:10px 18px;border:0;border-radius:12px;background:transparent;color:#B7C5EC;font:600 14px inherit;font-family:inherit;cursor:pointer}#edu-gate .bk svg{width:16px;height:16px}[dir=ltr] #edu-gate .bk svg{transform:scaleX(-1)}" +
      "#edu-gate .ft{margin-top:14px;font-size:12px;color:#7D8DB8}@media(prefers-reduced-motion:reduce){#edu-gate *,#edu-gate::before,#edu-gate::after{animation:none!important;transition:none!important}}";
    document.head.appendChild(s);
  }
  function screen(step, html) {
    var g = document.getElementById("edu-gate");
    if (!g) { g = document.createElement("div"); g.id = "edu-gate"; g.innerHTML = '<div class="grid"></div><div class="g"></div>'; document.body.appendChild(g); }
    g.querySelector(".g").innerHTML = '<img class="lg" src="assets/logo-sm.png" alt="EduAssess Pro"><div class="st"><i class="' + (step === 1 ? "on" : "") + '"></i><i class="' + (step === 2 ? "on" : "") + '"></i></div>' + html + '<div class="ft">EduAssess Pro</div>';
    return g;
  }
  function pickLang() {
    var codes = { ar: "ع", en: "EN", fr: "FR" }, subs = { ar: "المتابعة بالعربية", en: "Continue in English", fr: "Continuer en français" };
    var g = screen(1, '<h2>اختر لغتك<br><span style="font-size:.62em;font-weight:500;color:#B7C5EC">Choose your language · Choisissez votre langue</span></h2><p></p>' +
      Object.keys(LANGS).map(function (k, i) { return '<button type="button" class="o' + (i === 1 ? " t2" : "") + '" data-l="' + k + '" lang="' + k + '" dir="' + LANGS[k].dir + '"><span class="bd">' + codes[k] + '</span><span class="tx"><b>' + LANGS[k].n + "</b><small>" + subs[k] + '</small></span><span class="ch">' + IC.chev + "</span></button>"; }).join(""));
    g.querySelectorAll("[data-l]").forEach(function (b) { b.onclick = function () { set(b.dataset.l); document.documentElement.setAttribute("dir", LANGS[lang].dir); document.documentElement.setAttribute("lang", lang); pickRole(); }; });
  }
  function pickRole() {
    var g = screen(2, "<h2>" + t("من أنت؟") + "</h2><p>" + t("اختر هويتك للمتابعة. لا يمكن عرض الهوية الأخرى بعد الاختيار.") + "</p>" +
      '<button type="button" class="o" data-r="student"><span class="bd">' + IC.cap + '</span><span class="tx"><b>' + t("طالب") + "</b><small>" + t("أريد أداء الاختبارات ومتابعة نتائجي") + '</small></span><span class="ch">' + IC.chev + "</span></button>" +
      '<button type="button" class="o t2" data-r="teacher"><span class="bd">' + IC.board + '</span><span class="tx"><b>' + t("معلم") + "</b><small>" + t("أريد إنشاء الاختبارات ومتابعة طلابي") + '</small></span><span class="ch">' + IC.chev + "</span></button>" +
      '<button type="button" class="bk" id="eg-bk">' + IC.back + (lang === "en" ? "Change language" : lang === "fr" ? "Changer de langue" : "تغيير اللغة") + "</button>");
    g.querySelectorAll("[data-r]").forEach(function (b) { b.onclick = function () { ls("edu_role", b.dataset.r); g.style.transition = "opacity .25s"; g.style.opacity = "0"; setTimeout(function () { location.reload(); }, 220); }; });
    g.querySelector("#eg-bk").onclick = function () { lang = null; try { localStorage.removeItem("edu_lang"); } catch (e) {} document.documentElement.setAttribute("dir", "rtl"); pickLang(); };
  }
  function boot() {
    if (GATE && (!lang || (ls("edu_role") !== "student" && ls("edu_role") !== "teacher"))) {
      css(); document.documentElement.classList.add("edu-gate");
      if (!lang) pickLang(); else pickRole();
      return;
    }
    apply();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
  window.EduI18N = { countries: function (codes) { var dn; try { dn = new Intl.DisplayNames([lang || "ar"], { type: "region" }); } catch (e) {} return codes.map(function (c) { return [c, (dn && dn.of(c)) || c]; }).sort(function (a, b) { return a[1].localeCompare(b[1], lang || "ar"); }); }, t: t, msg: msg, set: set, lang: function () { return lang || "ar"; }, apply: apply, dict: D, patterns: PAT, missing: missing, tr: tr };
})();
