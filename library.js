/* =====================================================================
   Edu — المكتبة الإلكترونية
   الخطوة 4: هيكل واجهة الطالب (الغلاف + التحميل + الحالات + تحميل البيانات).
   الخطوة 5: بطاقات الكتب.  الخطوة 6: صفحة تفاصيل مستقلة لكل كتاب (openDetail).
   الخطوة 7: محرك البحث (اسم الكتاب + التخصص + الناشر).
   الخطوة 16: شراء الكتب المدفوعة (buyFlow → edu_buy_book) وتمييز الكتب المشتراة.
   الخطوة 8: التصنيفات والفلاتر (مجاني/مدفوع + التخصصات) والترتيب. api.extraFilter ما زال متاحًا للتوسعة.
   يعتمد على wallet.js (EduCore) ويعمل بدون كسر الصفحة إن لم تُنشأ الجداول بعد.
   ===================================================================== */
(function () {
  "use strict";
  if (!window.EduCore) return;
  var C = EduCore, esc = C.esc;

  var ICON = {
    lib: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 5.5A2.5 2.5 0 0 1 4.5 3H11v16H4.5A2.5 2.5 0 0 0 2 21.5z"/><path d="M22 5.5A2.5 2.5 0 0 0 19.5 3H13v16h6.5a2.5 2.5 0 0 1 2.5 2.5z"/></svg>',
    warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>'
  };

  /* أغلفة بديلة جاهزة: cover_icon بصيغة «إيموجي|رقم التدرج» — يستخدمها المعلم والأدمن لاحقًا أيضًا */
  var GRADS = [
    "linear-gradient(145deg,#0A2260,#1F63E0)", "linear-gradient(145deg,#0E9F7E,#34D399)",
    "linear-gradient(145deg,#7C3AED,#C084FC)", "linear-gradient(145deg,#E8590C,#FFB400)",
    "linear-gradient(145deg,#BE185D,#FB7185)", "linear-gradient(145deg,#0F766E,#38BDF8)"
  ];
  var EMOJIS = ["📘", "📗", "📕", "📙", "📐", "🧪", "🧠", "🌍", "💻", "🎭", "🕌", "🔤"];
  function parseIcon(v) {
    var a = String(v || "").split("|"), e = a[0] || "📘", g = Number(a[1]);
    return { e: e, g: GRADS[g] ? g : 0 };
  }
  function safeUrl(u) { return /^https?:\/\//i.test(String(u || "")) ? String(u) : ""; }
  function priceNum(b) { return 0; }
  function priceText(b) { return priceNum(b) > 0 ? C.money(priceNum(b)) + " ج.م" : "مجاني"; }
  function isNew(b) { return b.published_at && (Date.now() - new Date(b.published_at).getTime()) < 7 * 864e5; }

  /* غلاف الكتاب (صورة إن وُجدت وإلا أيقونة على تدرج) */
  function coverHTML(b, cls) {
    var ic = parseIcon(b.cover_icon), url = safeUrl(b.cover_url);
    return '<div class="lb-cover ' + (cls || "") + '" style="background:' + GRADS[ic.g] + '">' +
      '<span class="lb-cover-ic" aria-hidden="true">' + esc(ic.e) + '</span>' +
      (url ? '<img src="' + esc(url) + '" alt="' + esc("غلاف " + (b.title || "")) + '" loading="lazy" decoding="async">' : "") + '</div>';
  }

  function catOf(b) {
    for (var i = 0; i < state.categories.length; i++) if (String(state.categories[i].id) === String(b.category_id)) return state.categories[i];
    return null;
  }

  /* بطاقة الكتاب */
  function bookCard(b, i) {
    var cat = catOf(b), free = true, pub = String(b.publisher || "").trim();
    return '<article class="lb-card" role="button" tabindex="0" data-id="' + esc(b.id) + '" style="animation-delay:' + Math.min(i, 10) * 45 + 'ms"' +
      ' aria-label="' + esc(b.title + " — " + priceText(b)) + '">' +
      '<div class="lb-cv-wrap">' + coverHTML(b) +
        (isNew(b) ? '<b class="lb-ribbon">جديد</b>' : "") +
        '<span class="lb-price ' + (free ? "free" : isOwned(b) ? "own" : "") + '">' + esc(!free && isOwned(b) ? "تم الشراء ✓" : priceText(b)) + '</span></div>' +
      '<div class="lb-info">' +
        (cat ? '<span class="lb-cat"><i aria-hidden="true">' + esc(cat.icon || "📘") + '</i>' + esc(cat.name) + '</span>' : '<span class="lb-cat none">&nbsp;</span>') +
        '<h3 class="lb-t">' + esc(b.title) + '</h3>' +
        '<p class="lb-pub">' + (pub ? '<span>الناشر</span> ' + esc(pub) : "&nbsp;") + '</p>' +
      '</div></article>';
  }

  /* حالة مشتركة تقرؤها الخطوات اللاحقة */
  var state = { books: [], categories: [], owned: {}, loaded: false, error: null, q: "", f: { price: "all", cat: "all" }, sort: "rel" };
  var host = null, seq = 0, detailOpen = false, detailSeq = 0, savedY = 0, lastCardId = null;

  function sb() { return window.sbClient || null; }

  /* هل الخطأ بسبب عدم إنشاء الجداول بعد؟ */
  function missingTables(err) {
    var m = String((err && (err.message || err.details)) || "").toLowerCase();
    return (err && (err.code === "42P01" || err.code === "PGRST205")) || m.indexOf("does not exist") >= 0 || m.indexOf("schema cache") >= 0;
  }

  /* الكتب التي اشتراها الطالب (الخطوة 16). أي فشل هنا لا يعطّل المكتبة: يُعامل الطالب كأنه لم يشترِ شيئًا */
  async function loadOwned() {
    var out = {};
    try {
      var c = sb(), u = await C.me();
      if (!c || !u || !u.id || u.id === "local") return out;
      var r = await c.from("edu_book_purchases").select("book_id").eq("student_id", u.id).eq("status", "paid").limit(2000);
      if (!r.error) (r.data || []).forEach(function (x) { if (x.book_id != null) out[String(x.book_id)] = true; });
    } catch (e) {}
    return out;
  }
  function isOwned(b) { return !!(b && state.owned && state.owned[String(b.id)]); }

  async function load() {
    var c = sb();
    if (!c) throw { message: "لم يتم ضبط الاتصال بقاعدة البيانات" };
    var q1 = c.from("edu_books")
      .select("id,teacher_id,title,description,category_id,publisher,price,cover_url,cover_icon,sales_count,published_at")
      .eq("status", "approved").order("published_at", { ascending: false }).limit(500);
    var q2 = c.from("edu_book_categories").select("id,name,icon,sort_order").eq("active", true).order("sort_order");
    var r = await Promise.all([q1, q2, loadOwned()]);
    if (r[0].error) throw r[0].error;
    if (r[1].error) throw r[1].error;
    state.books = (r[0].data || []).map(function(b){ b.price = 0; return b; });
    state.categories = r[1].data || [];
    state.owned = r[2] || {};
    state.loaded = true; state.error = null;
  }

  function hero(stats) {
    return '<div class="lb-hero"><div class="lb-hero-in"><div class="lb-hero-ic">' + ICON.lib + '</div>' +
      '<div><h2>المكتبة</h2><p>كتب ومراجع من معلميك، اقرأها داخل التطبيق في أي وقت</p></div></div>' +
      '<div class="lb-stats" id="lb-stats">' + (stats || "") + '</div></div>';
  }
  function stat(n, label) { return '<span class="lb-stat"><b>' + esc(String(n)) + '</b>' + esc(label) + '</span>'; }

  function stateBox(cls, icon, h, p, btn) {
    return '<div class="lb-state ' + cls + '"><div class="lb-state-ic">' + icon + '</div><h3>' + h + '</h3><p>' + p + '</p>' + (btn || "") + '</div>';
  }
  function skeletons() {
    var s = ""; for (var i = 0; i < 6; i++) s += '<div class="lb-skel"></div>';
    return '<div class="lb-skels" aria-busy="true" aria-label="جارٍ التحميل">' + s + '</div>';
  }

  /* رسم قائمة الكتب. الخطوات 7 و8 تمرّر إليها قائمة مفلترة عبر list */
  function paint(list) {
    var body = host.querySelector("#lb-body"); if (!body) return;
    var books = list || state.books;
    if (!state.books.length) {
      body.innerHTML = stateBox("", ICON.lib, "لا توجد كتب منشورة بعد",
        "ستظهر هنا الكتب فور موافقة الإدارة عليها. عُد قريبًا لتجد جديد المعلمين.");
    } else if (!books.length) {
      body.innerHTML = stateBox("", ICON.lib, "لا توجد نتائج", "جرّب كلمات أخرى أو غيّر التصنيف.");
    } else {
      body.innerHTML = '<div class="lb-grid" id="lb-grid">' + books.map(bookCard).join("") + '</div>';
      var grid = body.querySelector("#lb-grid");
      /* الصورة التي تفشل تُخفى فيظهر الغلاف البديل خلفها */
      grid.addEventListener("error", function (e) { if (e.target && e.target.tagName === "IMG") e.target.remove(); }, true);
      var open = function (el) { var id = el && el.dataset.id; if (id && typeof api.onOpen === "function") api.onOpen(id, state.books); };
      grid.addEventListener("click", function (e) { var c = e.target.closest(".lb-card"); if (c) open(c); });
      grid.addEventListener("keydown", function (e) { if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("lb-card")) { e.preventDefault(); open(e.target); } });
    }
    if (typeof api.onPaint === "function") api.onPaint(host, state);
  }


  /* ===================== محرك البحث (الخطوة 7) ===================== */
  /* توحيد النص العربي: حذف التشكيل والتطويل، توحيد الألف والياء والتاء المربوطة، الأرقام الهندية → لاتينية */
  function norm(v) {
    return String(v == null ? "" : v).toLowerCase()
      .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, "")
      .replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627").replace(/\u0649/g, "\u064A").replace(/\u0629/g, "\u0647")
      .replace(/[\u0660-\u0669]/g, function (d) { return String(d.charCodeAt(0) - 0x660); })
      .replace(/[\u06F0-\u06F9]/g, function (d) { return String(d.charCodeAt(0) - 0x6F0); })
      .replace(/\s+/g, " ").trim();
  }
  /* ملخص قابل للبحث لكل كتاب يُحسب مرة واحدة */
  function hay(b) {
    if (!b._hay) {
      var cat = catOf(b);
      b._hay = { t: norm(b.title), c: norm(cat ? cat.name : ""), p: norm(b.publisher) };
    }
    return b._hay;
  }
  /* الكلمات تُطابق بالاحتواء (AND بين الكلمات). الترتيب: العنوان ثم التخصص ثم الناشر، ثم الأحدث */
  function searchBooks(list, q) {
    var terms = norm(q).split(" ").filter(Boolean);
    if (!terms.length) return list;
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var h = hay(list[i]), score = 0, ok = true;
      for (var j = 0; j < terms.length && ok; j++) {
        var t = terms[j];
        if (h.t.indexOf(t) >= 0) score += h.t.indexOf(t) === 0 ? 4 : 3;
        else if (h.c.indexOf(t) >= 0) score += 2;
        else if (h.p.indexOf(t) >= 0) score += 1;
        else ok = false;
      }
      if (ok) out.push({ b: list[i], s: score, i: i });
    }
    out.sort(function (a, b) { return b.s - a.s || a.i - b.i; });
    return out.map(function (x) { return x.b; });
  }
  /* القائمة الظاهرة = كل الكتب → البحث → (فلاتر الخطوة 8 عبر api.extraFilter) */
  function filtersActive() { return state.f.price !== "all" || state.f.cat !== "all" || state.sort !== "rel"; }
  function resetAll(focus) {
    state.q = ""; state.f = { price: "all", cat: "all" }; state.sort = "rel";
    var inp = host && host.querySelector("#lb-q"); if (inp) inp.value = "";
    var x = host && host.querySelector("#lb-qx"); if (x) x.hidden = true;
    paintResults();
    if (focus && inp) try { inp.focus({ preventScroll: true }); } catch (e) {}
  }

  /* ===================== التصنيفات والفلاتر والترتيب (الخطوة 8) ===================== */
  function filterBooks(list, skipPrice, skipCat) {
    return list.filter(function (b) {
      if (!skipPrice && state.f.price === "free" && priceNum(b) > 0) return false;
      if (!skipPrice && state.f.price === "paid" && priceNum(b) <= 0) return false;
      if (!skipCat && state.f.cat !== "all" && String(b.category_id) !== String(state.f.cat)) return false;
      return true;
    });
  }
  function catOrder(b) {
    var c = catOf(b); if (!c) return 9999;
    var n = Number(c.sort_order); return isNaN(n) ? 9998 : n;
  }
  /* rel = الترتيب القادم من البحث (أو الأحدث عند عدم البحث) ولا يُعاد ترتيبه */
  function sortBooks(list) {
    if (state.sort === "rel" || list.length < 2) return list;
    var cmp = {
      "new": function (a, b) { return (new Date(b.published_at || 0)) - (new Date(a.published_at || 0)); },
      "sales": function (a, b) { return (Number(b.sales_count) || 0) - (Number(a.sales_count) || 0); },
      "pl": function (a, b) { return priceNum(a) - priceNum(b); },
      "ph": function (a, b) { return priceNum(b) - priceNum(a); },
      "az": function (a, b) { return String(a.title || "").localeCompare(String(b.title || ""), "ar"); },
      "cat": function (a, b) { return catOrder(a) - catOrder(b) || String(a.title || "").localeCompare(String(b.title || ""), "ar"); }
    }[state.sort];
    if (!cmp) return list;
    return list.map(function (b, i) { return { b: b, i: i }; })
      .sort(function (x, y) { return cmp(x.b, y.b) || x.i - y.i; })
      .map(function (x) { return x.b; });
  }
  var SORTS = [["rel", "الأنسب"], ["new", "الأحدث"], ["sales", "الأكثر مبيعًا"], ["pl", "السعر: الأقل أولًا"], ["ph", "السعر: الأعلى أولًا"], ["az", "الاسم (أ - ي)"], ["cat", "حسب التخصص"]];

  function renderFilters() {
    var box = host && host.querySelector("#lb-filters"); if (!box) return;
    if (!state.books.length) { box.innerHTML = ""; box.hidden = true; return; }
    box.hidden = false;
    var searched = searchBooks(state.books, state.q);
    var pc = { all: 0, free: 0, paid: 0 }, cc = {}, tot = {}, i;
    var forPrice = filterBooks(searched, true, false), forCat = filterBooks(searched, false, true);
    for (i = 0; i < forPrice.length; i++) { pc.all++; if (priceNum(forPrice[i]) > 0) pc.paid++; else pc.free++; }
    for (i = 0; i < forCat.length; i++) { var k = String(forCat[i].category_id); cc[k] = (cc[k] || 0) + 1; }
    for (i = 0; i < state.books.length; i++) { var k2 = String(state.books[i].category_id); tot[k2] = (tot[k2] || 0) + 1; }
    var seg = [["all", "كل الكتب"], ["free", "مجانية"]].map(function (p) {
      var on = state.f.price === p[0];
      return '<button type="button" class="lb-seg-b' + (on ? " on" : "") + '" data-price="' + p[0] + '" aria-pressed="' + on + '">' + p[1] + '<em>' + pc[p[0]] + '</em></button>';
    }).join("");
    var opts = SORTS.map(function (o) { return '<option value="' + o[0] + '"' + (state.sort === o[0] ? " selected" : "") + '>' + o[1] + '</option>'; }).join("");
    var chips = "";
    var cats = state.categories.filter(function (c) { return tot[String(c.id)]; });
    if (cats.length) {
      chips = '<div class="lb-chips" id="lb-chips" role="group" aria-label="التخصصات"><button type="button" class="lb-chip' + (state.f.cat === "all" ? " on" : "") + '" data-cat="all" aria-pressed="' + (state.f.cat === "all") + '">الكل</button>' +
        cats.map(function (c) {
          var on = String(state.f.cat) === String(c.id), n = cc[String(c.id)] || 0;
          return '<button type="button" class="lb-chip' + (on ? " on" : "") + (n ? "" : " zero") + '" data-cat="' + esc(c.id) + '" aria-pressed="' + on + '"><i aria-hidden="true">' + esc(c.icon || "📘") + '</i>' + esc(c.name) + '<em>' + n + '</em></button>';
        }).join("") + '</div>';
    }
    var old = box.querySelector("#lb-chips"), sl = old ? old.scrollLeft : 0;
    var act = document.activeElement, key = act && box.contains(act) ? (act.dataset.price ? "price:" + act.dataset.price : act.dataset.cat != null ? "cat:" + act.dataset.cat : act.id === "lb-sort" ? "sort" : "") : "";
    box.innerHTML = '<div class="lb-fl"><div class="lb-seg" role="group" aria-label="نوع الكتاب">' + seg + '</div>' +
      '<label class="lb-sort"><span>الترتيب</span><select id="lb-sort" aria-label="ترتيب الكتب">' + opts + '</select></label></div>' + chips;
    var nc = box.querySelector("#lb-chips"); if (nc) nc.scrollLeft = sl;
    if (key) {
      var t = key === "sort" ? box.querySelector("#lb-sort") : box.querySelector(key.indexOf("price:") === 0 ? '[data-price="' + key.slice(6) + '"]' : '[data-cat="' + key.slice(4).replace(/"/g, "") + '"]');
      if (t) try { t.focus({ preventScroll: true }); } catch (e) {}
    }
  }

  /* القائمة الظاهرة = كل الكتب → البحث → الفلاتر → الترتيب → (توسعة api.extraFilter) */
  function visibleBooks() {
    var list = sortBooks(filterBooks(searchBooks(state.books, state.q)));
    if (typeof api.extraFilter === "function") list = api.extraFilter(list, state) || list;
    return list;
  }
  function paintResults() {
    var list = visibleBooks();
    paint(list);
    renderFilters();
    var q = state.q.trim(), narrowed = !!q || state.f.price !== "all" || state.f.cat !== "all";
    var cnt = host && host.querySelector("#lb-count");
    if (cnt) cnt.textContent = narrowed && list.length ? "عدد النتائج: " + list.length : "";
    var rs = host && host.querySelector("#lb-reset"); if (rs) rs.hidden = !(q || filtersActive());
    if (!list.length && state.books.length && narrowed) {
      var box = host.querySelector("#lb-body .lb-state");
      if (box) {
        box.querySelector("p").textContent = q
          ? "لا توجد كتب تطابق «" + q + "» بالفلاتر الحالية. جرّب كلمات أخرى أو خفّف الفلاتر."
          : "لا توجد كتب تطابق الفلاتر المحددة. جرّب تخصصًا آخر أو اعرض الكل.";
        var btn = document.createElement("button"); btn.type = "button"; btn.className = "ew-btn gold sm"; btn.textContent = "إعادة الضبط";
        btn.onclick = function () { resetAll(false); };
        box.appendChild(btn);
      }
    }
  }
  function setQuery(v, focus) {
    state.q = String(v || "");
    var inp = host && host.querySelector("#lb-q");
    if (inp) { if (inp.value !== state.q) inp.value = state.q; if (focus) try { inp.focus({ preventScroll: true }); } catch (e) {} }
    var x = host && host.querySelector("#lb-qx"); if (x) x.hidden = !state.q;
    paintResults();
  }
  function buildTools() {
    var body = host.querySelector("#lb-body"); if (!body || host.querySelector("#lb-tools")) return;
    var d = document.createElement("div"); d.className = "lb-tools"; d.id = "lb-tools";
    d.innerHTML = '<form class="lb-search" role="search" onsubmit="return false"><span class="lb-search-ic" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg></span>' +
      '<input id="lb-q" type="search" inputmode="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="80" ' +
      'placeholder="ابحث باسم الكتاب أو التخصص أو الناشر" aria-label="ابحث في المكتبة">' +
      '<button type="button" class="lb-search-x" id="lb-qx" aria-label="مسح البحث" hidden>' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button></form>' +
      '<div class="lb-filters" id="lb-filters" hidden></div>' +
      '<div class="lb-meta"><p class="lb-count" id="lb-count" aria-live="polite"></p><button type="button" class="lb-reset" id="lb-reset" hidden>إعادة الضبط</button></div>';
    body.parentNode.insertBefore(d, body);
    var inp = d.querySelector("#lb-q"), tm = null;
    inp.value = state.q; d.querySelector("#lb-qx").hidden = !state.q;
    inp.addEventListener("input", function () {
      var x = d.querySelector("#lb-qx"); x.hidden = !inp.value;
      clearTimeout(tm); tm = setTimeout(function () { state.q = inp.value; paintResults(); }, 140);
    });
    inp.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); clearTimeout(tm); state.q = inp.value; paintResults(); inp.blur(); }
      else if (e.key === "Escape" && inp.value) { e.preventDefault(); clearTimeout(tm); setQuery("", false); }
    });
    d.querySelector("#lb-qx").onclick = function () { clearTimeout(tm); setQuery("", true); };
    d.querySelector("#lb-reset").onclick = function () { clearTimeout(tm); resetAll(false); };
    var fb = d.querySelector("#lb-filters");
    fb.addEventListener("click", function (e) {
      var p = e.target.closest("[data-price]"), c = e.target.closest("[data-cat]");
      if (p) { state.f.price = p.dataset.price; paintResults(); }
      else if (c) { state.f.cat = c.dataset.cat; paintResults(); }
    });
    fb.addEventListener("change", function (e) { if (e.target.id === "lb-sort") { state.sort = e.target.value; paintResults(); } });
  }

  /* ===================== صفحة تفاصيل الكتاب (الخطوة 6) ===================== */
  var ICD = {
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
    tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><path d="M7.5 7.5h.01"/></svg>',
    pub: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21h18M5 21V7l7-4 7 4v14"/><path d="M9 21v-6h6v6M9 10h.01M15 10h.01"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>',
    cash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="6" width="20" height="12" rx="3"/><circle cx="12" cy="12" r="2.6"/></svg>',
    group: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/></svg>',
    read: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 5.5A2.5 2.5 0 0 1 4.5 3H11v16H4.5A2.5 2.5 0 0 0 2 21.5z"/><path d="M22 5.5A2.5 2.5 0 0 0 19.5 3H13v16h6.5a2.5 2.5 0 0 1 2.5 2.5z"/></svg>',
    cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>'
  };

  function dateText(v) {
    if (!v) return "";
    var d = new Date(v); if (isNaN(d.getTime())) return "";
    try { return d.toLocaleDateString("ar-EG-u-nu-latn", { year: "numeric", month: "long", day: "numeric" }); }
    catch (e) { return d.toISOString().slice(0, 10); }
  }
  function infoCell(icon, label, val) {
    return '<div class="lb-ic"><i>' + icon + '</i><span>' + esc(label) + '</span><b>' + val + '</b></div>';
  }
  function findBook(id) {
    for (var i = 0; i < state.books.length; i++) if (String(state.books[i].id) === String(id)) return state.books[i];
    return null;
  }

  /* اسم المعلم: يُجلب بهدوء، وإن لم تسمح الصلاحيات يبقى النص البديل */
  async function teacherName(tid) {
    var c = sb(); if (!c || !tid) return "";
    try {
      var r = await c.from("teachers").select("full_name").eq("id", tid).maybeSingle();
      if (!r.error && r.data && r.data.full_name) return String(r.data.full_name);
    } catch (e) {}
    return "";
  }

  function detailHTML(b, tname) {
    var cat = catOf(b), free = true, pub = String(b.publisher || "").trim(), desc = String(b.description || "").trim();
    var sales = Number(b.sales_count) || 0, owned = !free && isOwned(b);
    var cells = infoCell(ICD.tag, "التخصص", cat ? esc((cat.icon ? cat.icon + " " : "") + cat.name) : "غير محدد") +
      infoCell(ICD.pub, "الناشر", pub ? esc(pub) : "غير محدد") +
      infoCell(ICD.cash, "السعر", free ? '<em class="ok">مجاني</em>' : esc(priceText(b))) +
      infoCell(ICD.user, "المعلم", tname ? esc(tname) : "معلم المنصة") +
      (b.published_at ? infoCell(ICD.cal, "تاريخ النشر", esc(dateText(b.published_at))) : "") +
      (sales > 0 ? infoCell(ICD.group, free ? "عدد القرّاء" : "عدد المشترين", esc(String(sales)) + " طالب") : "");
    var related = state.books.filter(function (x) { return String(x.id) !== String(b.id) && b.category_id && String(x.category_id) === String(b.category_id); }).slice(0, 4);
    return '<div class="lb-dbar"><button type="button" class="lb-back" id="lb-back" aria-label="رجوع إلى المكتبة">' + ICD.back + '<span>المكتبة</span></button></div>' +
      '<section class="lb-dhero"><div class="lb-dcov">' + coverHTML(b, "big") + (isNew(b) ? '<b class="lb-ribbon">جديد</b>' : "") + '</div>' +
        '<div class="lb-dmain">' +
          '<div class="lb-dchips">' + (cat ? '<span class="lb-cat"><i aria-hidden="true">' + esc(cat.icon || "📘") + '</i>' + esc(cat.name) + '</span>' : "") +
            '<span class="lb-dtag ' + (free ? "free" : owned ? "own" : "paid") + '">' + (free ? "مجاني" : owned ? "تم الشراء ✓" : "مدفوع") + '</span></div>' +
          '<h2 class="lb-dt">' + esc(b.title) + '</h2>' +
          (pub ? '<p class="lb-dpub"><span>الناشر</span> ' + esc(pub) + '</p>' : "") +
          '<div class="lb-dprice ' + (free ? "free" : "") + '"><small>' + (free ? "الوصول" : "السعر") + '</small><b>' + esc(priceText(b)) + '</b></div>' +
        '</div></section>' +
      '<section class="lb-dsec"><h3>عن الكتاب</h3>' +
        (desc ? '<p class="lb-ddesc">' + esc(desc).replace(/\n/g, "<br>") + '</p>' : '<p class="lb-ddesc mut">لم يضف المعلم وصفًا لهذا الكتاب بعد.</p>') + '</section>' +
      '<section class="lb-dsec"><h3>معلومات الكتاب</h3><div class="lb-dgrid">' + cells + '</div></section>' +
      (related.length ? '<section class="lb-dsec"><h3>كتب مشابهة</h3><div class="lb-grid lb-rel" id="lb-rel">' + related.map(bookCard).join("") + '</div></section>' : "") +
      '<div class="lb-act"><div class="lb-act-p"><small>' + (free ? "كتاب مجاني" : owned ? "اشتريته" : "السعر") + '</small><b>' + esc(owned ? "تم الشراء ✓" : priceText(b)) + '</b></div>' +
        '<button type="button" class="ew-btn ' + (free || owned ? "" : "gold") + '" id="lb-go">' + (free || owned ? ICD.read + " اقرأ الكتاب" : ICD.cart + " اشترِ الكتاب") + '</button></div>';
  }

  function bindDetail(b, box) {
    var back = box.querySelector("#lb-back"); if (back) back.onclick = goBack;
    box.addEventListener("error", function (e) { if (e.target && e.target.tagName === "IMG") e.target.remove(); }, true);
    var go = box.querySelector("#lb-go");
    if (go) go.onclick = function () {
      if (false) return buyFlow(b);          // الخطوة 16: الشراء
      if (typeof api.onAction === "function") return api.onAction(b);  // الخطوتان 20–21: القراءة
      C.toast("القراءة داخل التطبيق ستتفعّل قريبًا", "ok");
    };
    var rel = box.querySelector("#lb-rel");
    if (rel) {
      var open = function (el) { if (el && el.dataset.id) openDetail(el.dataset.id, true); };
      rel.addEventListener("click", function (e) { var c = e.target.closest(".lb-card"); if (c) open(c); });
      rel.addEventListener("keydown", function (e) { if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("lb-card")) { e.preventDefault(); open(e.target); } });
    }
  }


  /* ===================== شراء كتاب مدفوع (الخطوة 16) ===================== */
  /* الخصم والتسجيل يتمان بالكامل داخل قاعدة البيانات عبر edu_buy_book؛ الواجهة لا تحسب ولا تكتب شيئًا بنفسها */
  var buying = false;
  function buyError(err) {
    var m = String((err && (err.message || err.details)) || "");
    if (/insufficient_balance/i.test(m)) return "insufficient";
    if (/book_not_available/i.test(m)) return "الكتاب غير متاح للشراء حاليًا. ربما تم إخفاؤه أو حذفه.";
    if (/own_book/i.test(m)) return "لا يمكنك شراء كتابك الخاص.";
    if (/free_book/i.test(m)) return "هذا الكتاب مجاني ولا يحتاج إلى شراء.";
    if (/not_authenticated/i.test(m)) return "سجّل الدخول أولًا ثم أعد المحاولة.";
    if (/edu_buy_book/i.test(m) && /(not exist|schema cache|could not find)/i.test(m)) return "الشراء قيد التجهيز. على مسؤول المنصة تشغيل ملف library-16-purchase.sql في Supabase.";
    return "تعذر إتمام الشراء. تحقق من اتصالك وحاول مرة أخرى. لم يُخصم أي مبلغ.";
  }
  function afterPurchase(b) {
    state.owned[String(b.id)] = true;
    b.sales_count = (Number(b.sales_count) || 0) + 1;
    try { if (window.EduWallet) EduWallet.refresh(); } catch (e) {}
    if (detailOpen && host) {
      var box = host.querySelector("#lb-detail");
      if (box && !box.hidden && lastCardId === String(b.id)) { box.innerHTML = detailHTML(b, ""); bindDetail(b, box); teacherName(b.teacher_id).then(function (tn) {
        if (!tn || !detailOpen) return; var cell = box.querySelectorAll(".lb-ic");
        for (var i = 0; i < cell.length; i++) { var sp = cell[i].querySelector("span"); if (sp && sp.textContent === "المعلم") cell[i].querySelector("b").textContent = tn; }
      }); }
    }
    var card = host && host.querySelector('.lb-card[data-id="' + String(b.id).replace(/"/g, "") + '"] .lb-price');
    if (card) { card.classList.add("own"); card.textContent = "تم الشراء ✓"; }
  }
  async function buyFlow(b) {
    if (buying) return;
    var price = 0, bal = 0;
    try { bal = Number(await C.Data.balance()); } catch (e) {}
    if (C.Data.mode !== "db") { C.toast("الشراء يتطلب اتصالًا بحسابك على المنصة", "err"); return; }
    var enough = bal != null && bal >= price;
    var after = bal != null ? Math.round((bal - price) * 100) / 100 : null;
    C.sheet("", function (sh) {
      if (sh.el.dataset.init) return; sh.el.dataset.init = 1;
      function note(t, cls) { return '<div class="w-note ' + (cls || "") + '">' + C.IC.info + '<span>' + t + '</span></div>'; }
      sh.set(
        '<h3>تأكيد شراء الكتاب</h3><p class="sub">سيُخصم المبلغ من محفظتك فورًا، ويصبح الكتاب لك.</p>' +
        '<div class="ew-sum"><div><span>الكتاب</span><b>' + esc(b.title) + '</b></div>' +
        '<div><span>السعر</span><b>' + esc(C.money(price)) + ' ج.م</b></div>' +
        '<div><span>رصيدك الحالي</span><b>' + (bal != null ? esc(C.money(bal)) + ' ج.م' : "—") + '</b></div>' +
        (enough ? '<div><span>رصيدك بعد الشراء</span><b>' + esc(C.money(after)) + ' ج.م</b></div>' : '') + '</div>' +
        (bal != null && !enough ? note("رصيدك غير كافٍ لشراء هذا الكتاب. ينقصك " + esc(C.money(price - bal)) + " ج.م — اشحن محفظتك ثم أعد المحاولة.") : "") +
        '<p class="ew-err" id="lb-buy-err"></p>' +
        (bal != null && !enough
          ? '<button type="button" class="ew-btn gold" id="lb-topup">' + C.IC.wallet + ' اشحن المحفظة</button>'
          : '<button type="button" class="ew-btn gold" id="lb-pay">' + C.IC.check + ' تأكيد الشراء</button>') +
        '<button type="button" class="ew-btn ghost" id="lb-cancel">إلغاء</button>'
      );
      var cancel = sh.el.querySelector("#lb-cancel"); if (cancel) cancel.onclick = sh.close;
      var tp = sh.el.querySelector("#lb-topup");
      if (tp) tp.onclick = function () { sh.close(); if (window.EduWallet && EduWallet.topup) setTimeout(EduWallet.topup, 220); };
      var pay = sh.el.querySelector("#lb-pay");
      if (pay) pay.onclick = async function () {
        if (buying) return; buying = true; pay.disabled = true;
        var oldTxt = pay.innerHTML; pay.textContent = "جارٍ الشراء…";
        var er = sh.el.querySelector("#lb-buy-err");
        try {
          var r = await sb().rpc("edu_buy_book", { p_book: String(b.id) });
          if (r.error) throw r.error;
          var d = r.data || {};
          if (d.ok === false) throw { message: "تعذر إتمام الشراء" };
          buying = false; sh.close(); afterPurchase(b);
          C.toast(d.already ? "اشتريت هذا الكتاب من قبل" : "تم شراء الكتاب بنجاح ✓", "ok");
        } catch (e) {
          buying = false;
          var m = buyError(e);
          if (m === "insufficient") m = "رصيدك غير كافٍ. اشحن محفظتك أولًا.";
          if (er) er.textContent = m;
          pay.disabled = false; pay.innerHTML = oldTxt;
        }
      };
    });
  }

  /* فتح صفحة التفاصيل. replace=true عند الانتقال من كتاب إلى كتاب مشابه */
  async function openDetail(id, replace) {
    if (!host) return;
    var b = findBook(id), box = host.querySelector("#lb-detail"); if (!b || !box) return;
    var my = ++detailSeq;
    lastCardId = String(id);
    if (!detailOpen) {
      savedY = window.pageYOffset || document.documentElement.scrollTop || 0;
      try { history.pushState({ lbBook: String(id) }, ""); } catch (e) {}
    } else if (replace) {
      try { history.replaceState({ lbBook: String(id) }, ""); } catch (e) {}
    }
    detailOpen = true;
    var hero = host.querySelector(".lb-hero"), body = host.querySelector("#lb-body"), tools = host.querySelector("#lb-tools");
    if (hero) hero.hidden = true; if (body) body.hidden = true; if (tools) tools.hidden = true;
    box.hidden = false;
    box.innerHTML = detailHTML(b, "");
    bindDetail(b, box);
    try { window.scrollTo(0, 0); } catch (e) {}
    var bk = box.querySelector("#lb-back"); if (bk) try { bk.focus({ preventScroll: true }); } catch (e) {}
    /* اسم المعلم يُحدَّث عند وصوله دون إعادة بناء الصفحة */
    var tn = await teacherName(b.teacher_id);
    if (tn && my === detailSeq && detailOpen) {
      var cell = box.querySelectorAll(".lb-ic");
      for (var i = 0; i < cell.length; i++) {
        var sp = cell[i].querySelector("span");
        if (sp && sp.textContent === "المعلم") cell[i].querySelector("b").textContent = tn;
      }
    }
  }

  /* إغلاق الصفحة والعودة للقائمة بنفس موضع التمرير */
  function closeDetail() {
    if (!host || !detailOpen) return;
    detailOpen = false; detailSeq++;
    var hero = host.querySelector(".lb-hero"), body = host.querySelector("#lb-body"), box = host.querySelector("#lb-detail"), tools = host.querySelector("#lb-tools");
    if (box) { box.hidden = true; box.innerHTML = ""; }
    if (hero) hero.hidden = false; if (body) body.hidden = false; if (tools) tools.hidden = false;
    try { window.scrollTo(0, savedY); } catch (e) {}
    var card = lastCardId && host.querySelector('.lb-card[data-id="' + String(lastCardId).replace(/"/g, "") + '"]');
    if (card) try { card.focus({ preventScroll: true }); } catch (e) {}
  }
  function goBack() {
    if (history.state && history.state.lbBook) { try { history.back(); return; } catch (e) {} }
    closeDetail();
  }
  /* زر الرجوع في الهاتف/المتصفح يغلق الصفحة بدل مغادرة التطبيق */
  window.addEventListener("popstate", function () {
    if (detailOpen && !(history.state && history.state.lbBook)) closeDetail();
  });

  async function mountStudent(el) {
    host = el; if (!host) return;
    var my = ++seq;
    if (detailOpen && history.state && history.state.lbBook) { try { history.back(); } catch (e) {} }
    host.innerHTML = '<div class="ew">' + hero("") + '<div class="lb-body" id="lb-body">' + skeletons() + '</div><div class="lb-detail" id="lb-detail" hidden></div></div>';
    detailOpen = false; state.q = ""; state.f = { price: "all", cat: "all" }; state.sort = "rel";
    try {
      await load();
      if (my !== seq) return;                       // تغيّر القسم أثناء التحميل
      host.querySelector("#lb-stats").innerHTML =
        stat(state.books.length, "كتاب") + (state.categories.length ? stat(state.categories.length, "تخصص") : "");
      buildTools(); paintResults();
    } catch (e) {
      if (my !== seq) return;
      state.error = e;
      var hint = missingTables(e)
        ? "المكتبة قيد التجهيز. على مسؤول المنصة تشغيل ملف library-01-tables.sql في Supabase."
        : "تعذر تحميل المكتبة. تحقق من اتصالك بالإنترنت وحاول مرة أخرى.";
      host.querySelector("#lb-body").innerHTML = stateBox("err", ICON.warn, "تعذر فتح المكتبة", esc(hint),
        '<button type="button" class="ew-btn gold sm" id="lb-retry">إعادة المحاولة</button>');
      var b = host.querySelector("#lb-retry"); if (b) b.onclick = function () { mountStudent(host); };
    }
  }

  /* شارة «جديد» على عنصر المكتبة في ورقة «المزيد» حتى يفتحها الطالب أول مرة */
  document.addEventListener("DOMContentLoaded", function () {
    var seen = false; try { seen = !!localStorage.getItem("edu_lib_seen"); } catch (e) {}
    var b = document.getElementById("mi-lib-new"); if (b && !seen) b.style.display = "grid";
  });

  var api = window.EduLibrary = { mountStudent: mountStudent, state: state, ICON: ICON, esc: esc, paint: paint, onPaint: null, onOpen: openDetail, onAction: null, extraFilter: null, search: setQuery, resetFilters: resetAll, searchBooks: searchBooks, visibleBooks: visibleBooks, repaint: paintResults, openDetail: openDetail, closeDetail: closeDetail,
    coverHTML: coverHTML, parseIcon: parseIcon, priceText: priceText, GRADS: GRADS, EMOJIS: EMOJIS, safeUrl: safeUrl };
})();
