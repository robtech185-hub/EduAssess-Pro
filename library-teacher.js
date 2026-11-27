/* =====================================================================
   Edu — المكتبة الإلكترونية (حساب المعلم)
   الخطوة 18: «مبيعات كتبي» (openSales) — المبيعات والأرباح ونصيب المنصة وصافي المستحقات.
   الخطوة 9: قسم «نشر كتبي» + واجهة إضافة كتاب جديد (الهيكل والتنقل).
   الخطوة 10: نموذج الإضافة  → يُسجَّل عبر EduLibrary.teacher.renderForm
   الخطوة 11: رفع الغلاف       → داخل النموذج
   الخطوة 12: متابعة الكتب      → قائمة بالحالات + سبب الرفض + تعديل وإعادة الإرسال (renderList / openEdit)
   يعتمد على: wallet.js (EduCore) + library.js (EduLibrary) + library.css + wallet.css.
   ===================================================================== */
(function () {
  "use strict";
  if (!window.EduCore || !window.EduLibrary) return;
  var C = EduCore, L = EduLibrary, esc = C.esc;

  var S = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
  var IC = {
    plus: S + '<path d="M12 5v14M5 12h14"/></svg>',
    back: S + '<path d="M5 12h14M13 6l6 6-6 6"/></svg>',        // سهم يمين = رجوع في الواجهة العربية
    info: S + '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
    book: S + '<path d="M2 5.5A2.5 2.5 0 0 1 4.5 3H11v16H4.5A2.5 2.5 0 0 0 2 21.5z"/><path d="M22 5.5A2.5 2.5 0 0 0 19.5 3H13v16h6.5a2.5 2.5 0 0 1 2.5 2.5z"/></svg>',
    img: S + '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="9" r="1.6"/><path d="M21 16l-5-5-9 9"/></svg>',
    coin: S + '<circle cx="12" cy="12" r="9"/><path d="M14.5 9.2c-.5-.8-1.5-1.2-2.5-1.2-1.4 0-2.5.8-2.5 1.9 0 2.700 5 1.300 5 3.900 0 1.200-1.100 2-2.500 2-1.100 0-2.100-.5-2.600-1.300M12 6.500V8m0 8v1.500"/></svg>',
    warn: S + '<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>'
  };

  var state = { books: [], loaded: false, error: null, view: "home", teacherId: null };
  var host = null, seq = 0;

  /* ---- مساعدات ---- */
  function isLocked() { var lk = document.getElementById("lock"); return !!(lk && !lk.classList.contains("hide")); }
  function missingTables(err) {
    var m = String((err && (err.message || err.details)) || "").toLowerCase();
    return (err && (err.code === "42P01" || err.code === "PGRST205")) || m.indexOf("does not exist") >= 0 || m.indexOf("schema cache") >= 0;
  }
  function denied(err) {
    var m = String((err && err.message) || "").toLowerCase();
    return (err && (err.code === "42501" || err.status === 401 || err.status === 403)) || m.indexOf("permission") >= 0 || m.indexOf("row-level") >= 0;
  }
  /* توحيد حالة الكتاب: pending | approved | rejected | hidden */
  function statusKey(b) {
    var s = String((b && b.status) || "").toLowerCase();
    if (s === "approved" || s === "published") return "approved";
    if (s === "rejected" || s === "declined") return "rejected";
    if (s === "hidden" || s === "archived" || s === "unpublished") return "hidden";
    return "pending";
  }
  var STATUS_LABEL = { pending: "قيد المراجعة", approved: "منشور", rejected: "مرفوض", hidden: "مخفي" };
  function ts(b) { var d = b.created_at || b.submitted_at || b.updated_at || b.published_at; var t = d ? new Date(d).getTime() : 0; return t || 0; }

  async function load() {
    var c = window.sbClient;
    if (!c) throw { message: "لم يتم ضبط الاتصال بقاعدة البيانات" };
    var u = await C.me();
    if (!u || !u.id || u.id === "local") throw { message: "تعذر تحديد حساب المعلم. أعد تسجيل الدخول." };
    state.teacherId = u.id;
    /* select("*") عمدًا: لا نفترض أسماء أعمدة غير مؤكدة، والفرز يتم هنا لا في الاستعلام */
    var r = await c.from("edu_books").select("*").eq("teacher_id", u.id).limit(500);
    if (r.error) throw r.error;
    state.books = (r.data || []).slice().sort(function (a, b) { return ts(b) - ts(a); });
    state.loaded = true; state.error = null;
  }

  function counts() {
    var n = { all: state.books.length, pending: 0, approved: 0, rejected: 0, hidden: 0 };
    state.books.forEach(function (b) { n[statusKey(b)]++; });
    return n;
  }

  /* ---- الرسم ---- */
  function hero(stats) {
    return '<div class="lb-hero"><div class="lb-hero-in"><div class="lb-hero-ic">' + L.ICON.lib + '</div>' +
      '<div><h2>نشر كتبي</h2><p>انشر كتبك ومراجعك للطلاب، وتحصل على مجانًا ليستفيد منها الطلاب</p></div></div>' +
      '<div class="lb-stats" id="lbt-stats">' + (stats || "") + '</div></div>';
  }
  function stat(n, label) { return '<span class="lb-stat"><b>' + esc(String(n)) + '</b>' + esc(label) + '</span>'; }

  function ctaCard() {
    return '<div class="lbt-cta"><div class="lbt-cta-ic">' + IC.plus + '</div>' +
      '<div class="lbt-cta-tx"><b>إضافة كتاب جديد</b><small>أضف بيانات الكتاب ورابط ملف PDF، وسنراجعه قبل نشره للطلاب.</small></div>' +
      '<button type="button" class="ew-btn gold sm" id="lbt-add">' + IC.plus + '<span>إضافة كتاب</span></button></div>';
  }
  function howCard() {
    return '<div class="lbt-how">' +
      '<div class="lbt-hs"><i>1</i><div><b>أضف كتابك</b><small>البيانات والغلاف ورابط PDF</small></div></div>' +
      '<div class="lbt-hs"><i>2</i><div><b>مراجعة الإدارة</b><small>نتحقق منه ونُبلغك بالنتيجة</small></div></div>' +
      '<div class="lbt-hs"><i>3</i><div><b>يُنشر وتربح</b><small>مجانًا لجميع الطلاب</small></div></div></div>';
  }
  function stateBox(cls, icon, h, p, btn) {
    return '<div class="lbt-state ' + cls + '"><div class="ic">' + icon + '</div><h4>' + h + '</h4><p>' + p + '</p>' + (btn || "") + '</div>';
  }
  function skeleton() { return '<div class="lbt-list" aria-busy="true" aria-label="جارٍ التحميل"><div class="lbt-skel"></div><div class="lbt-skel"></div></div>'; }

  function row(b) {
    var k = statusKey(b), sales = Number(b.sales_count) || 0;
    return '<div class="lbt-row">' + L.coverHTML(b) +
      '<div class="lbt-row-tx"><b>' + esc(b.title || "بدون عنوان") + '</b><small>كتاب مجاني للطلاب</small></div>' +
      '<span class="lbt-badge ' + k + '">' + STATUS_LABEL[k] + '</span></div>';
  }

  /* القائمة المختصرة (الخطوة 12 تستبدلها عبر teacher.renderList) */
  function paintList() {
    var box = host && host.querySelector("#lbt-books"); if (!box) return;
    if (typeof api.renderList === "function") { api.renderList(box, state); return; }
    if (!state.books.length) {
      box.innerHTML = stateBox("", IC.book, "لم تنشر أي كتاب بعد", "ابدأ بإضافة أول كتاب لك، وسيظهر هنا مع حالته بعد الإرسال.",
        '<button type="button" class="ew-btn gold sm" id="lbt-add2">' + IC.plus + '<span>إضافة أول كتاب</span></button>');
      var b2 = box.querySelector("#lbt-add2"); if (b2) b2.onclick = openAdd;
      return;
    }
    box.innerHTML = '<div class="lbt-h"><h3>كتبي</h3><span>' + esc(String(state.books.length)) + ' كتاب</span></div>' +
      '<div class="lbt-list">' + state.books.map(row).join("") + '</div>';
    box.addEventListener("error", function (e) { if (e.target && e.target.tagName === "IMG") e.target.remove(); }, true);
  }

  function paintStats() {
    var el = host && host.querySelector("#lbt-stats"); if (!el) return;
    var n = counts();
    el.innerHTML = stat(n.all, "كتاب") + stat(n.approved, "منشور") + (n.pending ? stat(n.pending, "قيد المراجعة") : "") + (n.rejected ? stat(n.rejected, "مرفوض") : "");
  }

  function paintHome() {
    state.view = "home";
    host.innerHTML = '<div class="ew lbt">' + hero("") + ctaCard() + howCard() + '<div id="lbt-books">' + skeleton() + '</div></div>';
    var add = host.querySelector("#lbt-add"); if (add) add.onclick = openAdd;
    
    if (state.loaded) { paintStats(); paintList(); }
  }

  /* ---- شاشة إضافة كتاب جديد ---- */
  function openAdd() {
    if (isLocked()) { C.toast("انتهت فترتك. جدّد اشتراكك من «حسابي» لتتمكن من نشر الكتب.", "err"); return; }
    if (!host) return;
    state.view = "add";
    host.innerHTML = '<div class="ew lbt">' +
      '<div class="lbt-top"><button type="button" class="lbt-back" id="lbt-back" aria-label="رجوع إلى نشر كتبي">' + IC.back + '</button>' +
      '<div><h2>إضافة كتاب جديد</h2><p>املأ بيانات كتابك ثم أرسله للمراجعة</p></div></div>' +
      '<div class="lbt-card"><h3>ما الذي ستحتاجه؟</h3><ul class="lbt-chk">' +
        '<li>اسم الكتاب ووصف مختصر يوضح محتواه</li>' +
        '<li>التخصص (التصنيف) واسم الناشر</li>' +
        '<li>الكتب مجانية لجميع الطلاب</li>' +
        '<li>رابط ملف PDF من Google Drive أو غيره، بصلاحية الوصول عبر الرابط</li>' +
        '<li>غلاف الكتاب (اختياري) — أو اختر أيقونة جاهزة بدلًا منه</li></ul></div>' +
      '<div class="lbt-note">' + IC.info + '<span>بعد الإرسال تراجع الإدارة الكتاب قبل ظهوره للطلاب. الكتب متاحة للطلاب مجانًا دون أي رسوم.</span></div>' +
      '<div id="lbt-form"></div></div>';
    window.scrollTo({ top: 0 });
    host.querySelector("#lbt-back").onclick = backHome;
    var f = host.querySelector("#lbt-form");
    if (typeof api.renderForm === "function") {
      api.renderForm(f, { teacherId: state.teacherId, books: state.books, onCancel: backHome, onDone: function () { backHome(true); } });
    } else {
      f.innerHTML = '<div class="lbt-note">' + IC.info + '<span>نموذج إدخال بيانات الكتاب قيد التفعيل وسيظهر هنا قريبًا.</span></div>';
    }
  }

  function backHome(reload) {
    if (!host) return;
    if (reload === true || !state.loaded) return mountTeacher(host);
    paintHome(); window.scrollTo({ top: 0 });
  }

  /* ---- نقطة الدخول ---- */
  async function mountTeacher(el) {
    host = el; if (!host) return;
    var my = ++seq;
    state.loaded = false; state.error = null;
    paintHome();
    try {
      await load();
      if (my !== seq || state.view !== "home") return;     // تغيّر القسم/الشاشة أثناء التحميل
      paintStats(); paintList();
    } catch (e) {
      if (my !== seq || state.view !== "home") return;
      state.error = e;
      var hint = missingTables(e) ? "قسم المكتبة قيد التجهيز. على مسؤول المنصة تشغيل ملف library-01-tables.sql في Supabase."
        : denied(e) ? "لا تملك صلاحية عرض كتبك. تأكد من تسجيل الدخول بحساب معلم ومن سياسات الأمان (RLS) لجدول edu_books."
        : "تعذر تحميل كتبك. تحقق من اتصالك بالإنترنت وحاول مرة أخرى.";
      var box = host.querySelector("#lbt-books");
      if (box) {
        box.innerHTML = stateBox("err", IC.warn, "تعذر فتح القسم", esc(hint), '<button type="button" class="ew-btn gold sm" id="lbt-retry">إعادة المحاولة</button>');
        box.querySelector("#lbt-retry").onclick = function () { mountTeacher(host); };
      }
    }
  }


  /* =====================================================================
     الخطوة 18: مبيعات كتبي — المبيعات + إجمالي الأرباح + نصيب المنصة + صافي المستحقات
     المصدر: edu_book_purchases (سياسة RLS تسمح للمعلم بقراءة مبيعات كتبه فقط).
     الحصص (teacher_share / platform_share) تُسجَّل وقت الشراء في الخطوة 17.
     ===================================================================== */
  function salesCta() {
    return '<div class="lbt-cta lbt-cta-s"><div class="lbt-cta-ic">' + IC.coin + '</div>' +
      '<div class="lbt-cta-tx"><b>مبيعات كتبي وأرباحي</b><small>تابع الكتب التي نشرتها وحالة مراجعتها.</small></div>' +
      '<button type="button" class="ew-btn sm" id="lbt-sales"><span>عرض المبيعات</span></button></div>';
  }
  function n2(v) { return Number(v) || 0; }
  function share(x) {   // حصة المعلم: المسجَّلة، وإلا 50% (للصفوف التي لم تُسوَّ بعد)
    if (x.teacher_share != null) return n2(x.teacher_share);
    return Math.round(n2(x.price) * 50) / 100;
  }
  function salesDate(d) { try { return new Date(d).toLocaleDateString("ar-EG-u-nu-latn", { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return ""; } }

  function salesSummary(list) {
    var gross = 0, mine = 0, plat = 0;
    list.forEach(function (x) { var t = share(x); gross += n2(x.price); mine += t; plat += x.platform_share != null ? n2(x.platform_share) : Math.round((n2(x.price) - t) * 100) / 100; });
    return { count: list.length, gross: gross, mine: mine, plat: plat };
  }
  function salesHTML(list) {
    var t = salesSummary(list), M = C.money;
    var perBook = {};
    list.forEach(function (x) { var k = String(x.book_id || x.book_title); var o = perBook[k] || (perBook[k] = { title: x.book_title || "كتاب محذوف", n: 0, mine: 0 }); o.n++; o.mine += share(x); });
    var books = Object.keys(perBook).map(function (k) { return perBook[k]; }).sort(function (a, b) { return b.mine - a.mine; });
    return '<div class="lbt-dbar"><button type="button" class="lb-back" id="lbt-sback">' + IC.back + '<span>نشر كتبي</span></button></div>' +
      '<div class="lbt-kpis">' +
        '<div class="lbt-kpi main"><small>صافي مستحقاتك</small><b>' + esc(M(t.mine)) + ' <em>ج.م</em></b><span>أُضيفت إلى محفظتك تلقائيًا</span></div>' +
        '<div class="lbt-kpi"><small>عدد المبيعات</small><b>' + esc(String(t.count)) + '</b></div>' +
        '<div class="lbt-kpi"><small>إجمالي قيمة المبيعات</small><b>' + esc(M(t.gross)) + ' <em>ج.م</em></b></div>' +
        '<div class="lbt-kpi"><small>نصيب المنصة (50%)</small><b>' + esc(M(t.plat)) + ' <em>ج.م</em></b></div>' +
      '</div>' +
      (list.length ? '<div class="lbt-h"><h3>أرباح كل كتاب</h3></div><div class="lbt-list">' + books.map(function (o) {
          return '<div class="lbt-row lbt-sr"><div class="lbt-row-tx"><b>' + esc(o.title) + '</b><small>' + esc(String(o.n)) + ' عملية شراء</small></div><span class="lbt-earn">+' + esc(M(o.mine)) + ' ج.م</span></div>'; }).join("") + '</div>' +
        '<div class="lbt-h"><h3>سجل المبيعات</h3><span>آخر ' + esc(String(Math.min(list.length, 100))) + '</span></div><div class="lbt-list">' + list.slice(0, 100).map(function (x) {
          return '<div class="lbt-row lbt-sr"><div class="lbt-row-tx"><b>' + esc(x.book_title || "كتاب محذوف") + '</b><small>' + esc(salesDate(x.created_at)) + ' · السعر ' + esc(M(n2(x.price))) + ' ج.م</small></div><span class="lbt-earn">+' + esc(M(share(x))) + ' ج.م</span></div>'; }).join("") + '</div>'
        : stateBox("", IC.book, "لا توجد مبيعات بعد", "ستظهر هنا الكتب التي نشرتها وحالة مراجعتها."));
  }
  async function openSales() {
    if (!host) return;
    state.view = "sales"; var my = ++seq;
    host.innerHTML = '<div class="ew lbt">' + '<div class="lbt-dbar"><button type="button" class="lb-back" id="lbt-sback">' + IC.back + '<span>نشر كتبي</span></button></div>' + skeleton() + '</div>';
    host.querySelector("#lbt-sback").onclick = function () { backHome(true); };
    try {
      var u = await C.me(), c = window.sbClient;
      if (!c || !u || !u.id || u.id === "local") throw { message: "تعذر تحديد حساب المعلم. أعد تسجيل الدخول." };
      var r = await c.from("edu_book_purchases").select("id,book_id,book_title,price,teacher_share,platform_share,status,created_at")
        .eq("teacher_id", u.id).eq("status", "paid").order("created_at", { ascending: false }).limit(2000);
      if (r.error) throw r.error;
      if (my !== seq || state.view !== "sales") return;
      host.innerHTML = '<div class="ew lbt">' + salesHTML(r.data || []) + '</div>';
      host.querySelector("#lbt-sback").onclick = function () { backHome(true); };
    } catch (e) {
      if (my !== seq || state.view !== "sales") return;
      var hint = missingTables(e) ? "المبيعات قيد التجهيز. على مسؤول المنصة تشغيل ملفي library-16-purchase.sql و library-17-earnings.sql في Supabase."
        : "تعذر تحميل المبيعات. تحقق من اتصالك وحاول مرة أخرى.";
      host.innerHTML = '<div class="ew lbt"><div class="lbt-dbar"><button type="button" class="lb-back" id="lbt-sback">' + IC.back + '<span>نشر كتبي</span></button></div>' +
        stateBox("err", IC.warn, "تعذر فتح المبيعات", esc(hint), '<button type="button" class="ew-btn gold sm" id="lbt-sretry">إعادة المحاولة</button>') + '</div>';
      host.querySelector("#lbt-sback").onclick = function () { backHome(true); };
      host.querySelector("#lbt-sretry").onclick = openSales;
    }
  }

  var api = L.teacher = { mount: mountTeacher, state: state, openAdd: openAdd, backHome: backHome, statusKey: statusKey, STATUS_LABEL: STATUS_LABEL, renderForm: null, renderList: null, openSales: openSales, salesSummary: salesSummary };
  L.mountTeacher = mountTeacher;

  /* =====================================================================
     الخطوة 10: نموذج إضافة كتاب جديد (الاسم + الوصف + التخصص + الناشر + رابط PDF)
     أسماء الأعمدة في مكان واحد (COL) لتسهيل مطابقتها مع جدول edu_books.
     الغلاف (الخطوة 11) يُضاف لاحقًا داخل هذا النموذج بدون تغيير بقية المنطق.
     ===================================================================== */
  var COL = { title: "title", description: "description", category: "category_id", publisher: "publisher", price: "price", pdf: "pdf_url", coverIcon: "cover_icon", coverUrl: "cover_url", teacher: "teacher_id", status: "status" };
  var COVER_BUCKET = "question-images";   // نفس حاوية صور الأسئلة (سياستها تسمح للمعلم بالرفع داخل مجلده)
  var LIM = { coverMaxMB: 8, coverMaxSide: 900,  titleMin: 3, titleMax: 120, descMin: 20, descMax: 2000, pubMax: 80, priceMax: 5000 };

  function fnorm(v) {   // أرقام هندية → لاتينية + تقليم
    return String(v == null ? "" : v).replace(/[\u0660-\u0669]/g, function (d) { return String(d.charCodeAt(0) - 0x660); })
      .replace(/[\u06F0-\u06F9]/g, function (d) { return String(d.charCodeAt(0) - 0x6F0); }).replace(/\u066B/g, ".").trim();
  }
  function tnorm(v) { return String(v || "").replace(/\s+/g, " ").trim().toLowerCase(); }
  function fld(id, label, ctl, hint, req) {
    return '<div class="lbt-fg" id="g-' + id + '"><label for="f-' + id + '">' + label + (req ? ' <i class="req" aria-hidden="true">*</i>' : '') + '</label>' + ctl +
      (hint ? '<small class="lbt-hint">' + hint + '</small>' : '') + '<small class="lbt-err" id="e-' + id + '" role="alert"></small></div>';
  }


  /* ---- الخطوة 11: غلاف الكتاب (رفع صورة + أيقونات بديلة جاهزة) ---- */
  function coverWidget() {
    var emos = L.EMOJIS.map(function (e, i) {
      return '<button type="button" class="lbt-emo" role="radio" aria-checked="' + (i === 0) + '" data-i="' + i + '" aria-label="رمز ' + (i + 1) + '">' + e + '</button>';
    }).join("");
    var grads = L.GRADS.map(function (g, i) {
      return '<button type="button" class="lbt-gr" role="radio" aria-checked="' + (i === 0) + '" data-g="' + i + '" style="background:' + g + '" aria-label="لون ' + (i + 1) + '"></button>';
    }).join("");
    return '<div class="lbt-cv"><div class="lbt-cv-pv" id="cv-pv"></div><div class="lbt-cv-ctl">' +
      '<button type="button" class="ew-btn ghost sm" id="f-cover">' + IC.img + '<span>رفع صورة الغلاف</span></button>' +
      '<button type="button" class="lbt-link" id="cv-rm" hidden>إزالة الصورة</button>' +
      '<small class="lbt-hint">JPG أو PNG أو WebP حتى ' + LIM.coverMaxMB + ' ميجا. يُفضّل غلاف طولي بنسبة 3:4.</small></div>' +
      '<input type="file" id="f-coverfile" accept="image/jpeg,image/png,image/webp" hidden></div>' +
      '<div class="lbt-ic-h">أو اختر أيقونة ولونًا جاهزين</div>' +
      '<div class="lbt-emos" role="radiogroup" aria-label="رمز الغلاف">' + emos + '</div>' +
      '<div class="lbt-grs" role="radiogroup" aria-label="لون الغلاف">' + grads + '</div>';
  }
  /* تصغير الصورة (أقصى ضلع 900px) وتحويلها JPEG على خلفية بيضاء */
  function shrinkCover(file) {
    return new Promise(function (res, rej) {
      var im = new Image(), u = URL.createObjectURL(file);
      im.onload = function () {
        try {
          var r = Math.min(1, LIM.coverMaxSide / Math.max(im.width, im.height)), cv = document.createElement("canvas");
          cv.width = Math.max(1, Math.round(im.width * r)); cv.height = Math.max(1, Math.round(im.height * r));
          var cx = cv.getContext("2d"); cx.fillStyle = "#fff"; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(im, 0, 0, cv.width, cv.height);
          URL.revokeObjectURL(u);
          cv.toBlob(function (b) { b ? res(b) : rej(new Error("تعذر معالجة الصورة")); }, "image/jpeg", 0.85);
        } catch (e) { URL.revokeObjectURL(u); rej(e); }
      };
      im.onerror = function () { URL.revokeObjectURL(u); rej(new Error("ملف الصورة غير صالح")); };
      im.src = u;
    });
  }

  api.renderForm = function (el, ctx) {
    ctx = ctx || {};
    el.innerHTML = '<form class="lbt-card lbt-f" id="lbt-fm" novalidate autocomplete="off">' +
      fld("title", "اسم الكتاب", '<input id="f-title" name="title" type="text" maxlength="' + LIM.titleMax + '" placeholder="مثال: ملخص الفيزياء للصف الثالث الثانوي" enterkeyhint="next">', "", true) +
      fld("desc", "وصف الكتاب", '<textarea id="f-desc" name="desc" rows="4" maxlength="' + LIM.descMax + '" placeholder="اكتب نبذة توضح محتوى الكتاب والفئة المستهدفة"></textarea>', '<span id="c-desc">0</span> / ' + LIM.descMax, true) +
      fld("cat", "التخصص", '<select id="f-cat" name="cat" disabled><option value="">جارٍ تحميل التخصصات…</option></select>', "", true) +
      fld("pub", "الناشر", '<input id="f-pub" name="pub" type="text" maxlength="' + LIM.pubMax + '" placeholder="اسمك أو اسم دار النشر" enterkeyhint="next">', "", true) +
      fld("pdf", "رابط ملف PDF", '<input id="f-pdf" name="pdf" type="url" dir="ltr" inputmode="url" placeholder="https://drive.google.com/file/d/..." enterkeyhint="done">',
        "الصق رابط الكتاب من Google Drive أو أي موقع آخر، وتأكد أن الرابط يعمل لمن لديه الرابط.", true) +
      fld("cover", "غلاف الكتاب", coverWidget(), "اختياري. إن لم ترفع صورة سيظهر الغلاف بالأيقونة واللون اللذين تختارهما.", false) +
      '<div class="lbt-fa"><button type="submit" class="ew-btn gold" id="lbt-send">' + IC.plus + '<span>إرسال للمراجعة</span></button>' +
      '<button type="button" class="ew-btn ghost" id="lbt-cancel">إلغاء</button></div></form>';

    var fm = el.querySelector("#lbt-fm"), $ = function (id) { return el.querySelector("#" + id); }, busy = false;
    var sendLabel = ctx.book ? "حفظ وإعادة الإرسال" : "إرسال للمراجعة";
    var sel = $("f-cat"), hasCats = false;

    /* التخصصات */
    (async function () {
      try {
        var r = await window.sbClient.from("edu_book_categories").select("id,name,icon,sort_order").eq("active", true).order("sort_order");
        if (r.error) throw r.error;
        var cats = r.data || [];
        hasCats = cats.length > 0;
        sel.innerHTML = '<option value="">' + (hasCats ? "اختر التخصص" : "لا توجد تخصصات متاحة") + '</option>' +
          cats.map(function (c) { return '<option value="' + esc(c.id) + '">' + esc((c.icon ? c.icon + " " : "") + c.name) + '</option>'; }).join("");
        sel.disabled = !hasCats;
        if (ctx.book && ctx.book[COL.category] != null) sel.value = String(ctx.book[COL.category]);
      } catch (e) {
        sel.innerHTML = '<option value="">تعذر تحميل التخصصات</option>'; sel.disabled = true;
        setErr("cat", "تعذر تحميل التخصصات. أعد فتح الصفحة وحاول مرة أخرى.");
      }
    })();

    function setErr(k, m) { var g = $("g-" + k), e = $("e-" + k); if (!g || !e) return; e.textContent = m || ""; g.classList.toggle("lbt-bad", !!m); var inp = g.querySelector("input,textarea,select"); if (inp) inp.setAttribute("aria-invalid", m ? "true" : "false"); }
    function clearErrs() { ["title", "desc", "cat", "pub", "pdf"].forEach(function (k) { setErr(k, ""); }); }

    function read() {
      return { title: String($("f-title").value || "").replace(/\s+/g, " ").trim(), desc: String($("f-desc").value || "").trim(), cat: sel.value,
        pub: String($("f-pub").value || "").replace(/\s+/g, " ").trim(), price: "0", pdf: String($("f-pdf").value || "").trim() };
    }
    function validate(v) {
      var e = {};
      if (v.title.length < LIM.titleMin) e.title = "اكتب اسم الكتاب (3 أحرف على الأقل)";
      else if ((ctx.books || state.books).some(function (b) { return !(ctx.book && b.id === ctx.book.id) && tnorm(b.title) === tnorm(v.title); })) e.title = "لديك كتاب بنفس هذا الاسم بالفعل";
      if (v.desc.length < LIM.descMin) e.desc = "اكتب وصفًا لا يقل عن " + LIM.descMin + " حرفًا";
      if (hasCats && !v.cat) e.cat = "اختر تخصص الكتاب";
      if (!v.pub) e.pub = "اكتب اسم الناشر";
      v.price = "0";
      if (!v.pdf) e.pdf = "أضف رابط ملف PDF";
      else if (!/^https:\/\//i.test(v.pdf) || /\s/.test(v.pdf) || !L.safeUrl(v.pdf)) e.pdf = "الرابط غير صالح. يجب أن يبدأ بـ https://";
      return e;
    }
  
    $("f-desc").addEventListener("input", function () { $("c-desc").textContent = String(this.value.length); });
    fm.addEventListener("input", function (e) { var id = e.target && e.target.id; if (id && id.indexOf("f-") === 0) setErr(id.slice(2), ""); });

    /* ---- منطق الغلاف ---- */
    var cover = { ei: 0, gi: 0, blob: null, url: "", up: null, keep: "" };
    function paintCover() {
      var pv = $("cv-pv"); pv.innerHTML = L.coverHTML({ cover_icon: L.EMOJIS[cover.ei] + "|" + cover.gi }, "lbt-cv-c");
      var shown = cover.url || cover.keep;
      if (shown) { var im = document.createElement("img"); im.src = shown; im.alt = "معاينة الغلاف"; pv.querySelector(".lb-cover").appendChild(im); }
      $("cv-rm").hidden = !(cover.blob || cover.keep);
      el.querySelectorAll(".lbt-emo").forEach(function (b) { b.setAttribute("aria-checked", String(Number(b.dataset.i) === cover.ei)); });
      el.querySelectorAll(".lbt-gr").forEach(function (b) { b.setAttribute("aria-checked", String(Number(b.dataset.g) === cover.gi)); });
    }
    function dropCoverFile() { if (cover.url) { try { URL.revokeObjectURL(cover.url); } catch (x) {} } cover.blob = null; cover.url = ""; cover.up = null; }
    $("f-cover").onclick = function () { if (!busy) $("f-coverfile").click(); };
    $("cv-rm").onclick = function () { if (busy) return; dropCoverFile(); cover.keep = ""; setErr("cover", ""); paintCover(); };
    $("f-coverfile").addEventListener("change", async function () {
      var f = this.files && this.files[0]; this.value = ""; if (!f || busy) return;
      setErr("cover", "");
      if (!/^image\/(jpeg|png|webp)$/i.test(f.type)) { setErr("cover", "اختر صورة بصيغة JPG أو PNG أو WebP"); return; }
      if (f.size > LIM.coverMaxMB * 1048576) { setErr("cover", "حجم الصورة أكبر من " + LIM.coverMaxMB + " ميجا"); return; }
      try {
        var b = await shrinkCover(f);
        dropCoverFile(); cover.blob = b; cover.url = URL.createObjectURL(b); paintCover();
      } catch (e) { setErr("cover", "تعذر قراءة الصورة. جرّب صورة أخرى."); }
    });
    el.querySelector(".lbt-emos").addEventListener("click", function (e) { var b = e.target.closest(".lbt-emo"); if (b) { cover.ei = Number(b.dataset.i); paintCover(); } });
    el.querySelector(".lbt-grs").addEventListener("click", function (e) { var b = e.target.closest(".lbt-gr"); if (b) { cover.gi = Number(b.dataset.g); paintCover(); } });
    el.addEventListener("error", function (e) { if (e.target && e.target.tagName === "IMG" && e.target.closest("#cv-pv")) e.target.remove(); }, true);
    /* وضع التعديل: تعبئة الحقول من الكتاب المرفوض */
    if (ctx.book) {
      var eb = ctx.book;
      $("f-title").value = eb[COL.title] || ""; $("f-desc").value = eb[COL.description] || ""; $("c-desc").textContent = String($("f-desc").value.length);
      $("f-pub").value = eb[COL.publisher] || ""; $("f-pdf").value = eb[COL.pdf] || "";
      var pi = String(eb[COL.coverIcon] || "").split("|"), ei0 = L.EMOJIS.indexOf(pi[0]), gi0 = Number(pi[1]);
      if (ei0 >= 0) cover.ei = ei0; if (isFinite(gi0) && gi0 >= 0 && gi0 < L.GRADS.length) cover.gi = gi0;
      cover.keep = eb[COL.coverUrl] || "";
      $("lbt-send").querySelector("span").textContent = sendLabel;
    }
    paintCover();
    /* رفع الغلاف المعالَج (مرة واحدة؛ يُعاد استخدامه إن فشل الإدراج ثم أُعيد الإرسال) */
    async function uploadCover(tid) {
      if (!cover.blob) return "";
      if (cover.up && cover.up.url) return cover.up.url;
      var path = tid + "/book-cover-" + Date.now() + "_" + Math.random().toString(36).slice(2, 8) + ".jpg";
      var st = window.sbClient.storage.from(COVER_BUCKET);
      var up = await st.upload(path, cover.blob, { contentType: "image/jpeg" });
      if (up.error) throw up.error;
      var pu = st.getPublicUrl(path), url = pu && pu.data && pu.data.publicUrl;
      if (!url) throw new Error("no url");
      cover.up = { path: path, url: url }; return url;
    }
    function discardUploaded() {   // تنظيف الصورة المرفوعة إن لم يُحفظ الكتاب
      if (cover.up && cover.up.path) { try { window.sbClient.storage.from(COVER_BUCKET).remove([cover.up.path]); } catch (x) {} cover.up = null; }
    }
    $("lbt-cancel").onclick = function () { if (busy) return; discardUploaded(); dropCoverFile(); if (typeof ctx.onCancel === "function") ctx.onCancel(); };

    fm.addEventListener("submit", async function (ev) {
      ev.preventDefault();
      if (busy) return;                                   // منع الإرسال المكرر
      if (isLocked()) { C.toast("انتهت فترتك. جدّد اشتراكك من «حسابي» لتتمكن من نشر الكتب.", "err"); return; }
      clearErrs();
      var v = read(), errs = validate(v), keys = Object.keys(errs);
      if (keys.length) {
        keys.forEach(function (k) { setErr(k, errs[k]); });
        var first = el.querySelector(".lbt-fg.lbt-bad input, .lbt-fg.lbt-bad textarea, .lbt-fg.lbt-bad select");
        if (first) { try { first.focus(); first.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (x) {} }
        return;
      }
      var c = window.sbClient; if (!c) { C.toast("لم يتم ضبط الاتصال بقاعدة البيانات", "err"); return; }
      var tid = ctx.teacherId || state.teacherId;
      if (!tid) { try { var u = await C.me(); tid = u && u.id; } catch (x) {} }
      if (!tid || tid === "local") { C.toast("تعذر تحديد حساب المعلم. أعد تسجيل الدخول.", "err"); return; }

      var row = {}; row[COL.title] = v.title; row[COL.description] = v.desc; row[COL.publisher] = v.pub; row[COL.price] = 0;
      row[COL.pdf] = v.pdf; row[COL.teacher] = tid; row[COL.status] = "pending";
      if (v.cat) row[COL.category] = v.cat;
      row[COL.coverIcon] = L.EMOJIS[cover.ei] + "|" + cover.gi;
      if (ctx.book) {                                   // تعديل: نحتفظ بالغلاف القديم أو نزيله، ونمسح سبب الرفض السابق
        row[COL.coverUrl] = cover.keep || null;
        REASON_KEYS.forEach(function (k) { if (k in ctx.book) row[k] = null; });
        if ("updated_at" in ctx.book) row.updated_at = new Date().toISOString();
      }

      busy = true; var btn = $("lbt-send"); btn.disabled = true; btn.querySelector("span").textContent = cover.blob && !(cover.up && cover.up.url) ? "جارٍ رفع الغلاف…" : "جارٍ الإرسال…";
      try {
        try { var cu = await uploadCover(tid); if (cu) row[COL.coverUrl] = cu; }
        catch (ue) {
          busy = false; btn.disabled = false; btn.querySelector("span").textContent = sendLabel;
          setErr("cover", "تعذر رفع الغلاف. جرّب مرة أخرى أو أزل الصورة واستخدم أيقونة جاهزة.");
          try { $("g-cover").scrollIntoView({ block: "center", behavior: "smooth" }); } catch (x) {}
          try { console.warn("[library] cover upload failed", ue); } catch (x) {}
          return;
        }
        btn.querySelector("span").textContent = "جارٍ الإرسال…";
        var r;
        if (ctx.book) {
          delete row[COL.teacher];
          r = await c.from("edu_books").update(row).eq("id", ctx.book.id).eq(COL.teacher, tid).eq(COL.status, ctx.book[COL.status]).select("id");
          if (!r.error && (!r.data || !r.data.length)) throw { code: "NOROWS", message: "no rows updated" };
        } else r = await c.from("edu_books").insert(row);
        if (r.error) throw r.error;
        C.toast(ctx.book ? "تم حفظ التعديلات وإعادة إرسال الكتاب للمراجعة ✓" : "تم إرسال الكتاب للمراجعة ✓", "ok");
        busy = false; cover.up = null; dropCoverFile();
        if (typeof ctx.onDone === "function") ctx.onDone();
      } catch (e) {
        busy = false; btn.disabled = false; btn.querySelector("span").textContent = sendLabel;
        var m = String((e && e.message) || "");
        var badCol = (e && e.code === "PGRST204") || (/column/i.test(m) && /(find|exist)/i.test(m) && !/relation/i.test(m));
        var msg = (e && e.code === "NOROWS") ? "تعذر حفظ التعديل. تأكد أن الكتاب ما زال مرفوضًا، وأن مسؤول المنصة شغّل ملف library-12-teacher-resubmit.sql في Supabase."
          : badCol ? "اسم عمود غير مطابق لجدول edu_books: " + m
          : missingTables(e) ? "قسم المكتبة قيد التجهيز. على مسؤول المنصة تشغيل ملف library-01-tables.sql في Supabase."
          : denied(e) ? "لا تملك صلاحية إضافة كتاب. تأكد من حساب المعلم ومن سياسة الإدراج (RLS) لجدول edu_books."
          : "تعذر إرسال الكتاب. تحقق من اتصالك وحاول مرة أخرى.";
        C.toast(msg, "err");
        try { console.warn("[library] insert failed", e); } catch (x) {}
      }
    });
    setTimeout(function () { try { $("f-title").focus({ preventScroll: true }); } catch (x) {} }, 60);
  };

  /* =====================================================================
     الخطوة 12: متابعة الكتب المنشورة — الحالة + سبب الرفض + التعديل وإعادة الإرسال
     التعديل متاح للكتب المرفوضة فقط (حتى لا يتجاوز المعلم المراجعة بتعديل كتاب منشور).
     ===================================================================== */
  var REASON_KEYS = ["reject_reason", "rejection_reason", "rejected_reason", "review_note", "admin_note", "reject_note", "review_reason", "note"];
  IC.edit = S + '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>';
  var FILTERS = [["all", "الكل"], ["pending", "قيد المراجعة"], ["approved", "منشور"], ["rejected", "مرفوض"], ["hidden", "مخفي"]];
  var filt = "all";

  function reasonOf(b) {
    for (var i = 0; i < REASON_KEYS.length; i++) { var v = b[REASON_KEYS[i]]; if (v != null && String(v).trim()) return String(v).trim(); }
    return "";
  }
  function dateTxt(b) {
    var t = ts(b); if (!t) return "";
    try { return new Date(t).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" }); } catch (x) { return ""; }
  }
  function noteOf(b, k) {
    if (k === "rejected") {
      var r = reasonOf(b);
      return '<div class="lbt-rej" role="note"><b>' + IC.warn + '<span>سبب الرفض</span></b><p>' + (r ? esc(r).replace(/\n/g, "<br>") : "لم تذكر الإدارة سببًا محددًا. عدّل بيانات الكتاب ثم أعد إرساله للمراجعة.") + '</p></div>';
    }
    if (k === "pending") return '<div class="lbt-inf pending">الكتاب قيد المراجعة عند الإدارة، وسنُبلغك بالنتيجة.</div>';
    if (k === "approved") return '<div class="lbt-inf approved">الكتاب منشور ويظهر للطلاب في المكتبة.</div>';
    return '<div class="lbt-inf hidden">الكتاب مخفي مؤقتًا من الإدارة ولا يظهر للطلاب.</div>';
  }
  function card(b) {
    var k = statusKey(b), sales = Number(b.sales_count) || 0, d = dateTxt(b);
    return '<article class="lbt-bk ' + k + '" data-id="' + esc(String(b.id)) + '"><div class="lbt-bk-top">' + L.coverHTML(b) +
      '<div class="lbt-row-tx"><b class="wrap">' + esc(b.title || "بدون عنوان") + '</b>' +
      '<small>كتاب مجاني للطلاب</small>' +
      (d ? '<small>أُرسل في ' + esc(d) + '</small>' : "") + '</div>' +
      '<span class="lbt-badge ' + k + '">' + STATUS_LABEL[k] + '</span></div>' + noteOf(b, k) +
      (k === "rejected" ? '<div class="lbt-bk-act"><button type="button" class="ew-btn gold sm" data-edit="' + esc(String(b.id)) + '">' + IC.edit + '<span>تعديل وإعادة الإرسال</span></button></div>' : "") + '</article>';
  }

  api.renderList = function (box, st) {
    var books = (st && st.books) || [];
    if (!books.length) {
      box.innerHTML = stateBox("", IC.book, "لم تنشر أي كتاب بعد", "ابدأ بإضافة أول كتاب لك، وسيظهر هنا مع حالته بعد الإرسال.",
        '<button type="button" class="ew-btn gold sm" id="lbt-add2">' + IC.plus + '<span>إضافة أول كتاب</span></button>');
      var b2 = box.querySelector("#lbt-add2"); if (b2) b2.onclick = openAdd;
      return;
    }
    var n = counts();
    if (filt !== "all" && !n[filt]) filt = "all";
    var chips = FILTERS.filter(function (f) { return f[0] === "all" || n[f[0]]; }).map(function (f) {
      return '<button type="button" class="lbt-chip' + (filt === f[0] ? " on" : "") + '" data-f="' + f[0] + '" aria-pressed="' + (filt === f[0]) + '">' + f[1] + ' <i>' + n[f[0]] + '</i></button>';
    }).join("");
    var shown = books.filter(function (b) { return filt === "all" || statusKey(b) === filt; });
    box.innerHTML = '<div class="lbt-h"><h3>كتبي</h3><span>' + esc(String(books.length)) + ' كتاب</span></div>' +
      (n.rejected ? '<div class="lbt-alert">' + IC.warn + '<span>لديك ' + esc(String(n.rejected)) + ' كتاب مرفوض. اقرأ سبب الرفض ثم عدّل الكتاب وأعد إرساله.</span></div>' : "") +
      '<div class="lbt-chips" role="group" aria-label="تصفية حسب الحالة">' + chips + '</div>' +
      '<div class="lbt-list">' + shown.map(card).join("") + '</div>';
    box.onclick = function (e) {
      var f = e.target.closest("[data-f]"); if (f) { filt = f.dataset.f; api.renderList(box, st); return; }
      var ed = e.target.closest("[data-edit]");
      if (ed) { var bk = books.filter(function (x) { return String(x.id) === ed.dataset.edit; })[0]; if (bk) openEdit(bk); }
    };
    box.addEventListener("error", function (e) { if (e.target && e.target.tagName === "IMG") e.target.remove(); }, true);
  };

  /* شاشة تعديل كتاب مرفوض */
  function openEdit(book) {
    if (isLocked()) { C.toast("انتهت فترتك. جدّد اشتراكك من «حسابي» لتتمكن من تعديل الكتب.", "err"); return; }
    if (!host || !book || statusKey(book) !== "rejected") return;
    state.view = "edit";
    var r = reasonOf(book);
    host.innerHTML = '<div class="ew lbt">' +
      '<div class="lbt-top"><button type="button" class="lbt-back" id="lbt-back" aria-label="رجوع إلى نشر كتبي">' + IC.back + '</button>' +
      '<div><h2>تعديل الكتاب</h2><p>عدّل البيانات ثم أعد الإرسال للمراجعة</p></div></div>' +
      '<div class="lbt-rej" role="note"><b>' + IC.warn + '<span>سبب الرفض</span></b><p>' + (r ? esc(r).replace(/\n/g, "<br>") : "لم تذكر الإدارة سببًا محددًا.") + '</p></div>' +
      '<div id="lbt-form"></div></div>';
    window.scrollTo({ top: 0 });
    host.querySelector("#lbt-back").onclick = backHome;
    api.renderForm(host.querySelector("#lbt-form"), { teacherId: state.teacherId, books: state.books, book: book, onCancel: backHome, onDone: function () { backHome(true); } });
  }
  api.openEdit = openEdit;
})();
