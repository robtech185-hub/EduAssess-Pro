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
  function t(s) { if (lang === "ar" || !lang) return s; var e = D[(s || "").trim()]; return e ? e[idx()] : s; }
  function msg(k, v) { var s = M[k][idx()]; v = v || {}; return s.replace(/\{(\w+)\}/g, function (_, x) { return v[x] == null ? "" : v[x]; }); }

  /* ترجمة الصفحة: نصوص + placeholder/title/aria-label، مع حفظ الأصل العربي */
  var orig = new WeakMap(), ATTR = ["placeholder", "title", "aria-label", "alt"];
  function tr(node) {
    if (!lang || lang === "ar" || !node) return;
    if (node.nodeType === 3) {
      var v = node.nodeValue, k = v && v.trim(), e = k && D[k];
      if (e) { if (!orig.has(node)) orig.set(node, v); node.nodeValue = v.replace(k, e[idx()]); }
      return;
    }
    if (node.nodeType !== 1 || /^(SCRIPT|STYLE)$/.test(node.nodeName)) return;
    ATTR.forEach(function (a) { var x = node.getAttribute(a), e = x && D[x.trim()]; if (e) node.setAttribute(a, e[idx()]); });
    for (var c = node.firstChild; c; c = c.nextSibling) tr(c);
  }
  function apply() {
    var h = document.documentElement;
    h.setAttribute("lang", lang || "ar"); h.setAttribute("dir", LANGS[lang || "ar"].dir);
    if (lang && lang !== "ar") {
      tr(document.body);
      new MutationObserver(function (ms) { ms.forEach(function (m) { if (m.type === "characterData") tr(m.target); else m.addedNodes.forEach(tr); }); })
        .observe(document.body, { childList: true, subtree: true, characterData: true });
    }
  }
  function set(l) { if (LANGS[l]) { lang = l; ls("edu_lang", l); } }

  /* ---------- شاشة البداية ---------- */
  function css() {
    var s = document.createElement("style");
    s.textContent = "html.edu-gate body>*:not(#edu-gate){visibility:hidden!important}#edu-gate{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:22px;background:#050F2B;background-image:radial-gradient(60% 50% at 80% 0,rgba(76,141,255,.3),transparent 70%);color:#fff;font-family:'IBM Plex Sans Arabic',Cairo,Tahoma,sans-serif}" +
      "#edu-gate .g{width:min(440px,100%);text-align:center}#edu-gate img{width:76px;margin:0 auto 14px;border-radius:20px}#edu-gate h2{font-size:24px;margin:0 0 8px}#edu-gate p{margin:0 0 22px;color:#B9C6EA;font-size:14.5px;line-height:1.8}" +
      "#edu-gate button{display:block;width:100%;margin:0 0 12px;padding:16px;border:0;border-radius:16px;font:700 17px inherit;font-family:inherit;cursor:pointer;color:#2B1D00;background:linear-gradient(135deg,#FFD15C,#FFB400)}#edu-gate button small{display:block;font-weight:500;font-size:12.5px;opacity:.8;margin-top:2px}#edu-gate button.b2{background:#fff;color:#0A2260}";
    document.head.appendChild(css.s = s);
  }
  function screen(html) {
    var g = document.getElementById("edu-gate");
    if (!g) { g = document.createElement("div"); g.id = "edu-gate"; document.body.appendChild(g); }
    g.innerHTML = '<div class="g"><img src="assets/logo-sm.png" alt="">' + html + "</div>"; return g;
  }
  function pickLang() {
    var g = screen("<h2>Choose your language · اختر لغتك · Choisissez votre langue</h2><p></p>" + Object.keys(LANGS).map(function (k) { return '<button data-l="' + k + '">' + LANGS[k].n + "</button>"; }).join(""));
    g.querySelectorAll("[data-l]").forEach(function (b) { b.onclick = function () { set(b.dataset.l); document.documentElement.setAttribute("dir", LANGS[lang].dir); document.documentElement.setAttribute("lang", lang); pickRole(); }; });
  }
  function pickRole() {
    function T(s) { return t(s); }
    var g = screen("<h2>" + T("من أنت؟") + "</h2><p>" + T("اختر هويتك للمتابعة. لا يمكن عرض الهوية الأخرى بعد الاختيار.") + "</p>" +
      '<button data-r="student">' + T("طالب") + "<small>" + T("أريد أداء الاختبارات ومتابعة نتائجي") + '</small></button><button class="b2" data-r="teacher">' + T("معلم") + "<small>" + T("أريد إنشاء الاختبارات ومتابعة طلابي") + "</small></button>");
    g.querySelectorAll("[data-r]").forEach(function (b) { b.onclick = function () { ls("edu_role", b.dataset.r); location.reload(); }; });
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
  window.EduI18N = { t: t, msg: msg, set: set, lang: function () { return lang || "ar"; }, apply: apply, dict: D };
})();
