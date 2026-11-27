/* =====================================================================
   Edu — المحفظة (جنيه مصري فقط)
   - الطالب والمعلم: إضافة رصيد فقط
   - الطلب يُرسَل عبر واتساب بعد اختيار المبلغ، ويُسجَّل في قاعدة البيانات.
   - إن لم تكن جداول Supabase منشورة بعد، تعمل المحفظة محليًا على الجهاز
     (وضع تجريبي) بدون أي خلل في باقي التطبيق.
   ===================================================================== */
(function () {
  "use strict";

  /* ------------------------------ أدوات ------------------------------ */
  var LS = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  function jget(k, d) { try { var v = JSON.parse(LS.get(k)); return v == null ? d : v; } catch (e) { return d; } }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function $(id) { return document.getElementById(id); }
  var NF = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
  function money(n) { return NF.format(Number(n) || 0); }
  function sb() { return window.sbClient || null; }
  function WA() { return (window.EDU && window.EDU.WA) || "201012645837"; }
  function toast(msg, type) {
    try { if (window.EduUI && EduUI.toast) return EduUI.toast(msg, type || "ok", { ms: 3200 }); } catch (e) {}
    alert(msg);
  }

  var S = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
  var IC = {
    wallet: S + '<path d="M20 7H5a2 2 0 0 1 0-4h13v4"/><path d="M3 5v14a2 2 0 0 0 2 2h15V7"/><path d="M17 14h.01"/></svg>',
    plus: S + '<path d="M12 5v14M5 12h14"/></svg>',
    minus: S + '<path d="M5 12h14"/></svg>',
    down: S + '<path d="M12 4v12"/><path d="M6 11l6 6 6-6"/><path d="M5 21h14"/></svg>',
    up: S + '<path d="M12 20V8"/><path d="M6 13l6-6 6 6"/><path d="M5 3h14"/></svg>',
    eye: S + '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    eyeoff: S + '<path d="M17.9 17.9A10.1 10.1 0 0 1 12 19c-6 0-10-7-10-7a18 18 0 0 1 4.1-4.9"/><path d="M9.9 5.2A9.7 9.7 0 0 1 12 5c6 0 10 7 10 7a18 18 0 0 1-2.2 3.1"/><path d="M3 3l18 18"/></svg>',
    chev: S + '<path d="M15 18l-6-6 6-6"/></svg>',
    info: S + '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5 2.5 1 3 .8 3.5.7.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.200.2-1.400-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.600 15L2 22l5.200-1.400A10 10 0 1 0 12 2z"/></svg>',
    check: S + '<path d="M20 6L9 17l-5-5"/></svg>',
    book: S + '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    cap: S + '<path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/></svg>',
    lock: S + '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    play: S + '<path d="M8 5l11 7-11 7z"/></svg>',
    clock: S + '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    cart: S + '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.600h9.700a2 2 0 0 0 2-1.600L23 6H6"/></svg>'
  };

  /* --------------------------- المستخدم الحالي --------------------------- */
  function role() { return document.getElementById("v-home") ? "student" : "teacher"; }
  async function me() {
    var id = "local", email = "";
    try {
      var c = sb(); if (c && c.auth) { var r = await c.auth.getSession(); var u = r && r.data && r.data.session && r.data.session.user; if (u) { id = u.id; email = u.email || ""; } }
    } catch (e) {}
    var nm = "";
    var el = $("hn") || $("user-name"); if (el) nm = (el.textContent || "").trim();
    return { id: id, email: email, name: nm && nm !== "—" ? nm : "مستخدم Edu", role: role() };
  }

  /* ----------------------- المخزن المحلي (احتياطي) ----------------------- */
  function lw(uid) { return jget("edu_w_" + uid, { bal: 0, tx: [] }); }
  function lwSave(uid, w) { LS.set("edu_w_" + uid, JSON.stringify(w)); }

  /* ------------------------------- البيانات ------------------------------- */
  var Data = {
    mode: "db",
    async balance() {
      var m = await me();
      var c = sb();
      if (c && m.id !== "local") {
        try {
          var r = await c.from("edu_wallets").select("balance").eq("user_id", m.id).maybeSingle();
          if (!r.error) { Data.mode = "db"; return Number(r.data && r.data.balance) || 0; }
        } catch (e) {}
      }
      Data.mode = "local";
      return Number(lw(m.id).bal) || 0;
    },
    async list() {
      var m = await me(), c = sb();
      if (c && m.id !== "local" && Data.mode === "db") {
        try {
          var q1 = c.from("edu_wallet_transactions").select("id,kind,amount,title,balance_after,created_at").eq("user_id", m.id).order("created_at", { ascending: false }).limit(60);
          var q2 = c.from("edu_wallet_requests").select("id,type,amount,status,created_at").eq("user_id", m.id).in("status", ["pending", "rejected"]).order("created_at", { ascending: false }).limit(20);
          var rr = await Promise.all([q1, q2]);
          if (!rr[1].error) {
            var rows = (rr[1].data || []).map(function (x) { return { id: x.id, kind: x.type, amount: x.amount, status: x.status, created_at: x.created_at, req: true }; });
            if (!rr[0].error) rows = rows.concat((rr[0].data || []).map(function (x) { return { id: x.id, kind: x.kind, amount: x.amount, title: x.title, status: "done", created_at: x.created_at, signed: true }; }));
            else { /* جدول المعاملات غير منشور بعد: اعرض الطلبات فقط */ }
            rows.sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
            return rows;
          }
        } catch (e) {}
        Data.mode = "local";
      }
      return lw(m.id).tx.map(function (x) { return { id: x.id, kind: x.type, amount: x.amount, status: x.status, created_at: x.created_at, req: true }; });
    },
    async request(type, amount) {
      var m = await me(), c = sb(), ref;
      if (c && m.id !== "local" && Data.mode === "db") {
        try {
          var r = await c.from("edu_wallet_requests").insert({ user_id: m.id, role: m.role, type: type, amount: amount, status: "pending", user_name: m.name }).select("id").single();
          if (!r.error && r.data) { return { ref: "EW-" + String(r.data.id).replace(/-/g, "").slice(0, 6).toUpperCase(), local: false }; }
        } catch (e) {}
        Data.mode = "local";
      }
      var w = lw(m.id); ref = "EW-" + Date.now().toString(36).slice(-6).toUpperCase();
      w.tx.unshift({ id: ref, type: type, amount: amount, status: "pending", created_at: new Date().toISOString() });
      lwSave(m.id, w); return { ref: ref, local: true };
    }
  };

  /* ------------------------------ النوافذ ------------------------------ */
  var openSheets = [];
  var XB = '<button type="button" class="ew-x" data-x aria-label="إغلاق">' + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg></button>';
  function onEsc(e) { if (e.key === "Escape" && openSheets.length) openSheets[openSheets.length - 1].close(); }
  function sheet(html, onMount) {
    var ov = document.createElement("div"); ov.className = "ew-ov";
    ov.innerHTML = '<div class="ew-sh" role="dialog" aria-modal="true">' + XB + '<div class="ew-grab"></div>' + html + "</div>";
    document.body.appendChild(ov);
    var closed = false;
    var api = {
      el: ov.querySelector(".ew-sh"),
      close: function () {
        if (closed) return; closed = true;
        ov.classList.remove("show"); setTimeout(function () { ov.remove(); }, 320);
        openSheets = openSheets.filter(function (x) { return x !== api; });
        if (!openSheets.length) { document.documentElement.style.overflow = ""; document.removeEventListener("keydown", onEsc); }
      },
      set: function (h) { api.el.innerHTML = XB + '<div class="ew-grab"></div>' + h; if (onMount) onMount(api); }
    };
    ov.addEventListener("click", function (e) { if (e.target === ov || (e.target.closest && e.target.closest("[data-x]"))) api.close(); });
    if (!openSheets.length) document.addEventListener("keydown", onEsc);
    openSheets.push(api); document.documentElement.style.overflow = "hidden";
    requestAnimationFrame(function () { requestAnimationFrame(function () { ov.classList.add("show"); }); });
    if (onMount) onMount(api);
    return api;
  }

  /* ----------------------------- تدفق الطلب ----------------------------- */
  var QUICK = [50, 100, 200, 500, 1000];
  var LIMITS = { topup: { min: 10, max: 50000 } };

  async function flow(type) {
    var m = await me(), amount = 0;
    var title = "إضافة رصيد";

    function stepAmount(api, err) {
      api.set(
        '<h3>' + title + '</h3><p class="sub">' + 'اختر المبلغ الذي تريد إضافته بالجنيه المصري' + '</p>' +
        '<div class="amt-big"><span>ج.م</span><input id="ew-amt" type="number" inputmode="decimal" min="0" placeholder="0" value="' + (amount || "") + '"></div>' +
        '<div class="chips">' + QUICK.map(function (q) { return '<button type="button" data-q="' + q + '"' + (q === amount ? ' class="on"' : '') + '>' + q + '</button>'; }).join("") + '</div>' +
        '<p class="ew-err" id="ew-err">' + esc(err || "") + '</p>' +
        '<button type="button" class="ew-btn" id="ew-next">متابعة ' + IC.chev + '</button>'
      );
      var inp = api.el.querySelector("#ew-amt");
      api.el.querySelectorAll("[data-q]").forEach(function (b) { b.onclick = function () { amount = Number(b.dataset.q); inp.value = amount; api.el.querySelectorAll("[data-q]").forEach(function (x) { x.classList.toggle("on", x === b); }); }; });
      inp.oninput = function () { amount = Number(inp.value) || 0; api.el.querySelectorAll("[data-q]").forEach(function (x) { x.classList.toggle("on", Number(x.dataset.q) === amount); }); };
      api.el.querySelector("#ew-next").onclick = function () {
        var L = LIMITS[type], v = Math.round((Number(inp.value) || 0) * 100) / 100;
        if (v < L.min) return stepAmount(api, "أقل مبلغ " + L.min + " ج.م");
        if (v > L.max) return stepAmount(api, "أقصى مبلغ للطلب الواحد " + money(L.max) + " ج.م");
        amount = v; stepConfirm(api);
      };
    }
    function stepConfirm(api) {
      api.set(
        '<h3>تأكيد الطلب</h3><p class="sub">راجع التفاصيل ثم أرسل الطلب عبر واتساب</p>' +
        '<div class="ew-sum"><div><span>العملية</span><b>' + title + '</b></div><div><span>المبلغ</span><b>' + money(amount) + ' ج.م</b></div><div><span>الحساب</span><b>' + esc(m.name) + '</b></div></div>' +
        '<div class="w-note">' + IC.info + '<span>' + 'سيُضاف المبلغ إلى رصيدك بعد استلام التحويل وتأكيده عبر واتساب.' + '</span></div>' +
        '<p class="ew-err" id="ew-err"></p>' +
        '<button type="button" class="ew-btn wa" id="ew-send">' + IC.wa + ' إرسال الطلب عبر واتساب</button>' +
        '<button type="button" class="ew-btn ghost" id="ew-back">تعديل المبلغ</button>'
      );
      api.el.querySelector("#ew-back").onclick = function () { stepAmount(api); };
      api.el.querySelector("#ew-send").onclick = async function (e) {
        var b = e.currentTarget; b.disabled = true;
        var res = await Data.request(type, amount);
        var msg = "مرحباً Edu 👋\nأرغب في " + "إضافة رصيد إلى" + " محفظتي\n" +
          "المبلغ: " + money(amount) + " جنيه مصري\nالاسم: " + m.name + "\nنوع الحساب: " + (m.role === "teacher" ? "معلم" : "طالب") + "\nرقم الطلب: " + res.ref;
        var url = "https://wa.me/" + WA() + "?text=" + encodeURIComponent(msg);
        stepDone(api, url, res.ref);
        try { window.open(url, "_blank", "noopener"); } catch (er) {}
        EduWallet.refresh();
      };
    }
    function stepDone(api, url, ref) {
      api.set(
        '<div style="text-align:center;padding:8px 0 4px"><div style="width:74px;height:74px;border-radius:50%;margin:0 auto 12px;display:grid;place-items:center;background:#E4F6EF;color:#0E9F7E"><span style="width:38px;height:38px;display:block">' + IC.check + '</span></div>' +
        '<h3>تم تسجيل طلبك</h3><p class="sub">رقم الطلب <b style="direction:ltr;unicode-bidi:isolate">' + esc(ref) + '</b> — أكمل الإرسال من واتساب ليتم تأكيده.</p></div>' +
        '<a class="ew-btn wa" style="text-decoration:none" target="_blank" rel="noopener" href="' + esc(url) + '">' + IC.wa + ' فتح واتساب</a>' +
        '<button type="button" class="ew-btn ghost" id="ew-ok">تم</button>'
      );
      api.el.querySelector("#ew-ok").onclick = api.close;
    }
    sheet("", function (api) { if (!api.el.dataset.init) { api.el.dataset.init = 1; stepAmount(api); } });
  }

  /* ------------------------ ضغط بطاقة المحفظة: إضافة رصيد ------------------------ */
  function options() { return flow("topup"); }

  /* ------------------------------ صفحة المحفظة ------------------------------ */
  var host = null, hostRole = "student", shown = 0;
  function countUp(el, to) {
    var from = shown, t0 = performance.now(), d = 700;
    if (from === to) { el.textContent = money(to); return; }
    (function f(t) { var p = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - p, 3); el.textContent = money(from + (to - from) * e); if (p < 1) requestAnimationFrame(f); else shown = to; })(t0);
  }
  var KINDS = {
    topup:           { n: "إضافة رصيد",       ic: "down" },
    withdraw:        { n: "سحب رصيد",         ic: "up" },
    course_purchase: { n: "شراء كورس",        ic: "cart" },
    course_sale:     { n: "أرباح كورس",       ic: "down" },
    subscription:    { n: "اشتراك في المنصة", ic: "cart" },
    adjust:          { n: "تسوية من الإدارة", ic: "info" },
    ad:              { n: "إعلان",            ic: "up" },
    refund:          { n: "استرداد",          ic: "down" },
    book_purchase:   { n: "شراء كتاب",        ic: "cart" },
    book_sale:       { n: "أرباح كتاب",       ic: "down" }
  };
  function txRow(x) {
    var k = KINDS[x.kind] || { n: x.title || "عملية", ic: "info" };
    var amt = Number(x.amount) || 0;
    var plus = x.signed ? amt >= 0 : (x.kind === "topup");
    var cls = plus ? "topup" : (x.kind === "withdraw" ? "withdraw" : "buy");
    var nm = x.title && x.signed && x.kind !== "topup" && x.kind !== "withdraw" ? x.title : k.n;
    var st = x.status || "done", stl = st === "pending" ? "قيد المراجعة" : st === "rejected" ? "مرفوض" : "مكتمل";
    var d = new Date(x.created_at).toLocaleDateString("ar-EG-u-nu-latn", { day: "numeric", month: "short", year: "numeric" });
    return '<div class="w-tx ' + cls + '"><i>' + IC[k.ic] + '</i><div class="t"><b>' + esc(nm) + '</b><small>' + d + '</small> <span class="w-st ' + st + '">' + stl + '</span></div><div class="a">' + (plus ? "+" : "−") + money(Math.abs(amt)) + ' ج.م</div></div>';
  }
  async function render() {
    if (!host) return;
    var m = await me(), bal = await Data.balance(), list = await Data.list();
    var hide = LS.get("edu_w_hide") === "1";
    var teacher = hostRole === "teacher";
    var tail = String(m.id).replace(/[^a-z0-9]/gi, "").slice(-4).toUpperCase() || "0000";
    host.innerHTML =
      '<div class="ew">' +
      '<div class="ew-head"><i>' + IC.wallet + '</i><div class="ew-grow"><h2>المحفظة</h2><p>' + (teacher ? 'أرباحك وطلبات الشحن' : 'اشحن رصيدك وتابع معاملاتك') + '</p></div></div>' +
      '<button type="button" class="wcard" id="ew-card" aria-label="خيارات المحفظة">' +
        '<div class="wc-top"><div class="wc-brand"><em>' + IC.cap + '</em>Edu Wallet</div><div class="wc-chip"></div></div>' +
        '<div class="wc-mid"><div class="wc-lbl">الرصيد الحالي <span class="wc-eye" id="ew-eye" role="button" tabindex="0">' + (hide ? IC.eyeoff : IC.eye) + '</span></div>' +
        '<div class="wc-bal"><span>EGP</span><b id="ew-bal">' + (hide ? "••••" : money(bal)) + '</b></div></div>' +
        '<div class="wc-bot"><div><div class="wc-name">' + esc(m.name) + '</div><div class="wc-id">•••• •••• •••• ' + tail + '</div></div>' + (teacher ? '' : '<span class="wc-tap">اضغط لإضافة رصيد ' + IC.chev + '</span>') + '</div>' +
      '</button>' +
      '<div class="w-acts">' +
        (teacher ? '' : '<button type="button" class="w-act add" data-t="topup"><i>' + IC.down + '</i><span><b>إضافة رصيد</b><small>عبر واتساب</small></span></button>') +
      '</div>' +
      (Data.mode === "local" ? '<div class="w-note">' + IC.info + '<span>الوضع التجريبي: المحفظة تعمل على هذا الجهاز فقط. لتفعيلها شغّل ملفات SQL (wallet-courses ثم wallet-real ثم admin-ads) من Supabase.</span></div>' : '') +
      '<div class="ew-card"><h3>سجل العمليات</h3>' + (list.length ? list.map(txRow).join("") : '<div class="ew-empty">' + IC.wallet + 'لا توجد عمليات بعد</div>') + '</div>' +
      '</div>';
    var b = $("ew-bal"); if (!hide) { shown = 0; countUp(b, bal); } 
    $("ew-card").onclick = function (e) { if (e.target.closest("#ew-eye")) return; if (hostRole !== "teacher") options(hostRole); };
    $("ew-eye").onclick = function (e) { e.stopPropagation(); LS.set("edu_w_hide", hide ? "0" : "1"); render(); };
    host.querySelectorAll(".w-act").forEach(function (a) { a.onclick = function () { flow(a.dataset.t); }; });
    chip(bal);
  }

  /* ------------------------------ شريحة الرصيد ------------------------------ */
  var chipEl = null;
  function chip(bal) {
    if (!chipEl) return;
    var hide = LS.get("edu_w_hide") === "1";
    chipEl.innerHTML = IC.wallet + "<bdi>" + (hide ? "••••" : money(bal)) + "</bdi> <small style=\"font-weight:700\">ج.م</small>";
  }
  async function refreshChip() { if (chipEl) { try { chip(await Data.balance()); } catch (e) {} } }

  window.EduCore = { esc: esc, money: money, sheet: sheet, toast: toast, IC: IC, me: me, jget: jget, LS: LS, lw: lw, lwSave: lwSave, Data: Data, sb: sb, role: role };
  window.EduWallet = {
    mount: function (el, r) { host = el; hostRole = r; return render(); },
    refresh: function () { if (host && host.offsetParent !== null) render(); else refreshChip(); },
    chip: function (el, onClick) { chipEl = el; el.classList.add("ew-chipbtn"); el.type = "button"; el.onclick = onClick; refreshChip(); },
    refreshChip: refreshChip,
    balance: function () { return Data.balance(); },
    topup: function () { return flow("topup"); }
  };
})();
