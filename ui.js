/* EduAssess Pro — طبقة الواجهة المشتركة: رسائل منبثقة أنيقة + نوافذ تأكيد + أيقونات حديثة */
(function () {
  "use strict";
  var S = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
  var P = {
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
    send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>',
    trophy: '<path d="M8 21h8M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/><path d="M10 11v5M14 11v5"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    alert: '<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    chart: '<path d="M18 20V10M12 20V4M6 20v-6"/>',
    video: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M10 9.5v5l4.5-2.5z"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    clipboard: '<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14h6M12 11v6"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    sparkles: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    zap: '<path d="M13 2L3 14h8l-1 8 10-12h-8z"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
    userplus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    school: '<path d="M3 21h18M5 21V10l7-5 7 5v11"/><path d="M9 21v-6h6v6"/>',
    cap: '<path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>',
    chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>',
    hourglass: '<path d="M6 2h12M6 22h12"/><path d="M7 2c0 6 5 7 5 10s-5 4-5 10M17 2c0 6-5 7-5 10s5 4 5 10"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
    medal: '<circle cx="12" cy="15" r="6"/><path d="M8.5 3L12 9l3.5-6"/>',
    flame: '<path d="M12 22c4 0 7-3 7-7 0-3-2-5-3-7-1 2-2 3-3 3 0-3-1-6-4-9 0 5-4 7-4 12 0 4 3 8 7 8z"/>',
    phone: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>'
  };
  function ico(n) { return P[n] ? S + P[n] + "</svg>" : ""; }

  /* الأيقونات الملوّنة للنقاط والميداليات */
  var DOT = { "🔴": "#D6453D", "🟡": "#F2B01E", "🟢": "#0E9F7E" };
  var MED = { "🥇": "#E7B416", "🥈": "#98A2B8", "🥉": "#C27A3E" };
  var MAP = {
    "📚": "book", "💾": "save", "📣": "send", "🏆": "trophy", "🔔": "bell", "🗑": "trash", "✏": "edit", "✕": "x", "✖": "x",
    "✓": "check", "✔": "check", "✅": "check", "⚠": "alert", "📊": "chart", "📈": "chart", "🔒": "lock", "🎬": "video", "📝": "clipboard",
    "🎯": "target", "⚡": "zap", "👁": "eye", "✨": "sparkles", "🌟": "sparkles", "⚙": "settings", "🌍": "globe", "🖼": "image",
    "👩": "user", "🏫": "school", "🚀": "zap"
  };
  var RX = /(🔴|🟡|🟢|🥇|🥈|🥉|📚|💾|📣|🏆|🔔|🗑|✏|✕|✖|✓|✔|✅|⚠|📊|📈|🔒|🎬|📝|🎯|⚡|👁|✨|🌟|⚙|🌍|🖼|👩|🏫|🚀)️?/g;
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, OPTION: 1, SELECT: 1, TITLE: 1, INPUT: 1 };

  function html(ch) {
    if (DOT[ch]) return '<i class="eu-dot" style="background:' + DOT[ch] + '"></i>';
    if (MED[ch]) return '<span class="eu-ei eu-med" style="color:' + MED[ch] + '">' + ico("medal") + "</span>";
    return '<span class="eu-ei">' + ico(MAP[ch]) + "</span>";
  }
  function polishNode(t) {
    var p = t.parentNode;
    if (!p || SKIP[p.nodeName] || (p.closest && p.closest("[data-noemoji]"))) return;
    var v = t.nodeValue;
    if (!v || !RX.test(v)) { RX.lastIndex = 0; return; }
    RX.lastIndex = 0;
    var span = document.createElement("span");
    span.className = "eu-wrap";
    span.innerHTML = v.replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }).replace(RX, function (m, ch) { return html(ch); });
    p.replaceChild(span, t);
  }
  function polish(root) {
    if (!root) return;
    if (root.nodeType === 3) return polishNode(root);
    if (root.nodeType !== 1 || SKIP[root.nodeName]) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n, list = [];
    while ((n = w.nextNode())) if (n.nodeValue && /[^\x00- ]/.test(n.nodeValue)) list.push(n);
    list.forEach(polishNode);
  }

  /* ---------- الرسائل المنبثقة ---------- */
  var TYPES = { ok: "check", err: "x", warn: "alert", info: "info" };
  function box() {
    var b = document.getElementById("edu-toasts");
    if (!b) { b = document.createElement("div"); b.id = "edu-toasts"; b.setAttribute("aria-live", "polite"); document.body.appendChild(b); }
    return b;
  }
  function clean(m) { return String(m == null ? "" : m).replace(/^[\s✓✔✅⚠✕✖📣💾🔔]+/, "").trim(); }
  function toast(msg, type, o) {
    o = o || {};
    if (!type || type === "ok" || type === "show") type = /^[\s]*(⚠|✕|✖)|تعذر|خطأ|فشل|غير صحيح/.test(msg || "") ? "err" : "ok";
    if (!TYPES[type]) type = "info";
    var el = document.createElement("div");
    el.className = "eu-t " + type;
    el.setAttribute("role", type === "err" ? "alert" : "status");
    var ms = o.ms || (type === "err" ? 4600 : 3200);
    el.style.setProperty("--ms", ms + "ms");
    el.innerHTML = '<span class="eu-ti">' + ico(o.icon || TYPES[type]) + '</span><span class="eu-tx">' +
      (o.title ? "<b></b>" : "") + "<span></span></span>" + '<button type="button" class="eu-tc" aria-label="إغلاق">' + ico("x") + '</button><i class="eu-tp"></i>';
    if (o.title) el.querySelector("b").textContent = o.title;
    el.querySelector(".eu-tx>span").textContent = clean(msg);
    var b = box();
    while (b.children.length > 2) b.firstChild.remove();
    b.appendChild(el);
    var gone = function () { if (!el.parentNode) return; el.classList.add("out"); setTimeout(function () { el.remove(); }, 320); };
    el.querySelector(".eu-tc").onclick = function (e) { e.stopPropagation(); gone(); };
    if (typeof o.onClick === "function") { el.setAttribute("data-click", "1"); el.addEventListener("click", function () { try { o.onClick(); } catch (e) {} gone(); }); }
    var tm = setTimeout(gone, ms);
    el.onmouseenter = function () { clearTimeout(tm); };
    el.onmouseleave = function () { tm = setTimeout(gone, 1400); };
    return { close: gone };
  }

  /* ---------- نافذة التأكيد ---------- */
  function dialog(o) {
    return new Promise(function (res) {
      var ov = document.createElement("div");
      ov.className = "eu-ov";
      var kind = o.danger ? "danger" : (o.kind || "info");
      var paras = String(o.msg || "").split(/\n+/).filter(Boolean).map(function (x) { return "<p></p>"; }).join("");
      ov.innerHTML = '<div class="eu-dlg ' + kind + '" role="alertdialog" aria-modal="true"><div class="eu-di">' + ico(o.icon || (o.danger ? "trash" : kind === "ok" ? "check" : "info")) +
        '</div><h3></h3><div class="eu-dm">' + paras + '</div><div class="eu-da"><button type="button" class="eu-b ' + (o.danger ? "bad" : "go") + '" data-k="1"></button>' +
        (o.hideCancel ? "" : '<button type="button" class="eu-b ghost" data-k="0"></button>') + "</div></div>";
      ov.querySelector("h3").textContent = o.title || "تأكيد";
      String(o.msg || "").split(/\n+/).filter(Boolean).forEach(function (x, i) { ov.querySelectorAll(".eu-dm p")[i].textContent = x; });
      ov.querySelector('[data-k="1"]').textContent = o.ok || "تأكيد";
      var c = ov.querySelector('[data-k="0"]'); if (c) c.textContent = o.cancel || "إلغاء";
      document.body.appendChild(ov);
      requestAnimationFrame(function () { ov.classList.add("in"); });
      var prev = document.activeElement;
      function done(v) { document.removeEventListener("keydown", key); ov.classList.remove("in"); setTimeout(function () { ov.remove(); }, 220); try { prev && prev.focus && prev.focus(); } catch (e) {} res(v); }
      function key(e) { if (e.key === "Escape") done(false); }
      document.addEventListener("keydown", key);
      ov.onclick = function (e) { if (e.target === ov) done(false); };
      ov.querySelectorAll("[data-k]").forEach(function (b) { b.onclick = function () { done(b.dataset.k === "1"); }; });
      ov.querySelector('[data-k="1"]').focus();
    });
  }
  function confirmMsg(msg, o) { return dialog(Object.assign({ msg: msg }, o || {})); }

  /* ---------- قائمة خيارات سفلية (مثل واتساب) ---------- */
  function sheet(o) {
    return new Promise(function (res) {
      var ov = document.createElement("div");
      ov.className = "eu-ov eu-sh";
      var h = '<div class="eu-sheet" role="dialog" aria-modal="true"><i class="eu-grab"></i>' + (o.title ? '<div class="eu-st"></div>' : "");
      (o.actions || []).forEach(function (a, i) { h += '<button type="button" class="eu-sb' + (a.danger ? " bad" : "") + '" data-i="' + i + '"><span class="eu-sbi">' + ico(a.icon || "info") + '</span><span class="eu-sbt"></span></button>'; });
      h += '<button type="button" class="eu-sb cancel" data-i="-1"><span class="eu-sbt"></span></button></div>';
      ov.innerHTML = h;
      if (o.title) ov.querySelector(".eu-st").textContent = o.title;
      var bs = ov.querySelectorAll(".eu-sb");
      (o.actions || []).forEach(function (a, i) { bs[i].querySelector(".eu-sbt").textContent = a.label; });
      bs[bs.length - 1].querySelector(".eu-sbt").textContent = o.cancel || "إلغاء";
      document.body.appendChild(ov);
      requestAnimationFrame(function () { ov.classList.add("in"); });
      function done(v) { document.removeEventListener("keydown", key); ov.classList.remove("in"); setTimeout(function () { ov.remove(); }, 260); res(v); }
      function key(e) { if (e.key === "Escape") done(null); }
      document.addEventListener("keydown", key);
      ov.onclick = function (e) { if (e.target === ov) done(null); };
      ov.querySelectorAll(".eu-sb").forEach(function (b) { b.onclick = function () { var i = +b.getAttribute("data-i"); done(i < 0 ? null : o.actions[i].k); }; });
    });
  }

  /* ---------- رسائل المحادثة: فقاعة + قائمة حذف/نسخ (صفحتا الطالب والمعلم) ---------- */
  function escH(t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function bubble(m, mine, when) {
    var del = !!m.deleted_for_all;
    return '<div class="m-b ' + (mine ? "me" : "th") + (del ? " del" : "") + '" data-id="' + escH(m.id) + '">' +
      (del ? '<span class="m-x">تم حذف هذه الرسالة</span>' : escH(m.body)) +
      '<small><span>' + escH(when) + '</span><button type="button" class="m-dd" aria-label="خيارات الرسالة">\u22EE</button></small></div>';
  }
  function msgMenu(th, o) {
    if (!th || th._eum) return; th._eum = 1;
    var timer = null, last = 0;
    function open(b) {
      if (!b || Date.now() - last < 700) return; last = Date.now();
      var id = b.getAttribute("data-id"), m = o.find(id); if (!m) return;
      var acts = [];
      if (!m.deleted_for_all) acts.push({ k: "copy", label: "نسخ الرسالة", icon: "copy" });
      if (!m.deleted_for_all && o.mine(m)) acts.push({ k: "all", label: "حذف للجميع", icon: "trash", danger: true });
      acts.push({ k: "me", label: "حذف لدي", icon: "x" });
      sheet({ actions: acts }).then(async function (k) {
        if (!k) return;
        if (k === "copy") { try { await navigator.clipboard.writeText(m.body); toast("تم نسخ الرسالة", "ok"); } catch (e) { toast("تعذر النسخ", "warn"); } return; }
        var all = k === "all";
        var ok = await dialog({ danger: true, icon: "trash", title: all ? "حذف للجميع؟" : "حذف الرسالة لديك؟",
          msg: all ? "ستُحذف الرسالة لدى الطرفين ويظهر مكانها «تم حذف هذه الرسالة»." : "ستُحذف من حسابك فقط، وتبقى نسخة الطرف الآخر كما هي.", ok: "حذف", cancel: "إلغاء" });
        if (ok) o.del(id, k);
      });
    }
    th.addEventListener("click", function (e) { var d = e.target.closest && e.target.closest(".m-dd"); if (d) { e.preventDefault(); open(d.closest(".m-b")); } });
    th.addEventListener("contextmenu", function (e) { var b = e.target.closest && e.target.closest(".m-b[data-id]"); if (b) { e.preventDefault(); open(b); } });
    th.addEventListener("touchstart", function (e) { var b = e.target.closest && e.target.closest(".m-b[data-id]"); if (!b) return; clearTimeout(timer); timer = setTimeout(function () { open(b); }, 550); }, { passive: true });
    ["touchend", "touchmove", "touchcancel"].forEach(function (ev) { th.addEventListener(ev, function () { clearTimeout(timer); }, { passive: true }); });
  }

  /* تحويل أي alert قديم إلى رسالة أنيقة */
  window.alert = function (m) { toast(m, /تعذر|خطأ|فعّل/.test(m) ? "warn" : "info"); };

  window.EduUI = { toast: toast, dialog: dialog, confirm: confirmMsg, ico: ico, polish: polish, sheet: sheet, bubble: bubble, msgMenu: msgMenu };

  function start() {
    polish(document.body);
    var q = 0, pend = [];
    new MutationObserver(function (ms) {
      ms.forEach(function (m) {
        if (m.type === "characterData") pend.push(m.target);
        else m.addedNodes.forEach(function (n) { pend.push(n); });
      });
      if (!q) q = requestAnimationFrame(function () { q = 0; var l = pend; pend = []; l.forEach(function (n) { if (n.isConnected) polish(n); }); });
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
})();
