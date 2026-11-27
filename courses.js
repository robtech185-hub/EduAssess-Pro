/* =====================================================================
   Edu — الكورسات
   - المعلم: إنشاء كورس عبر معالج من 4 خطوات + إدارة كورساته
   - الطالب: تصفّح الكورسات والانضمام إليها (جميع الكورسات مجانية بالكامل)
   يعتمد على wallet.js (EduCore) للوظائف المشتركة فقط (لا توجد أي رسوم). يعمل مع Supabase، وبدونه يعمل محليًا.
   ===================================================================== */
(function () {
  "use strict";
  if (!window.EduCore) return;
  var C = EduCore, esc = C.esc, IC = C.IC;

  var COVERS = [
    { g: "linear-gradient(135deg,#0A2260,#1F63E0)", e: "📘" },
    { g: "linear-gradient(135deg,#0E9F7E,#34D399)", e: "🧪" },
    { g: "linear-gradient(135deg,#7C3AED,#C084FC)", e: "🧠" },
    { g: "linear-gradient(135deg,#E8590C,#FFB400)", e: "📐" },
    { g: "linear-gradient(135deg,#BE185D,#FB7185)", e: "🎨" },
    { g: "linear-gradient(135deg,#0F766E,#38BDF8)", e: "🌍" }
  ];
  var LEVELS = ["ابتدائي", "إعدادي", "ثانوي", "جامعي", "مهارات"];

  /* ----------------------------- طبقة البيانات ----------------------------- */
  var mode = "db";
  function lcAll() { return C.jget("edu_courses_local", []); }
  function lcSave(a) { C.LS.set("edu_courses_local", JSON.stringify(a)); }
  function enrAll() { return C.jget("edu_enroll_local", []); }
  function uuid() { return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  var D = {
    async mine() {
      var m = await C.me(), c = C.sb();
      if (c && m.id !== "local" && mode === "db") {
        try { var r = await c.from("edu_courses").select("*").eq("teacher_id", m.id).order("created_at", { ascending: false }); if (!r.error) return r.data || []; } catch (e) {}
        mode = "local";
      }
      return lcAll().filter(function (x) { return x.teacher_id === m.id; });
    },
    async published() {
      var m = await C.me(), c = C.sb();
      if (c && m.id !== "local" && mode === "db") {
        try { var r = await c.from("edu_courses").select("*").eq("published", true).order("created_at", { ascending: false }); if (!r.error) return r.data || []; } catch (e) {}
        mode = "local";
      }
      return lcAll().filter(function (x) { return x.published; });
    },
    async save(course) {
      var m = await C.me(), c = C.sb();
      var row = { teacher_id: m.id, teacher_name: m.name, title: course.title, description: course.description, level: course.level, subject: course.subject, price: 0, cover: course.cover, lessons: course.lessons, published: course.published };
      if (c && m.id !== "local" && mode === "db") {
        try {
          var r = course.id ? await c.from("edu_courses").update(row).eq("id", course.id).select().single() : await c.from("edu_courses").insert(row).select().single();
          if (!r.error) return r.data;
        } catch (e) {}
        mode = "local";
      }
      var a = lcAll();
      if (course.id) { a = a.map(function (x) { return x.id === course.id ? Object.assign({}, x, row) : x; }); }
      else { row.id = uuid(); row.created_at = new Date().toISOString(); a.unshift(row); }
      lcSave(a); return row;
    },
    async setPub(id, v) {
      var c = C.sb();
      if (c && mode === "db") { try { var r = await c.from("edu_courses").update({ published: v }).eq("id", id); if (!r.error) return; } catch (e) {} mode = "local"; }
      lcSave(lcAll().map(function (x) { return x.id === id ? Object.assign({}, x, { published: v }) : x; }));
    },
    async remove(id) {
      var c = C.sb();
      if (c && mode === "db") { try { var r = await c.from("edu_courses").delete().eq("id", id); if (!r.error) return; } catch (e) {} mode = "local"; }
      lcSave(lcAll().filter(function (x) { return x.id !== id; }));
    },
    async enrolled() {
      var m = await C.me(), c = C.sb(), ids = [];
      if (c && m.id !== "local" && mode === "db") {
        try { var r = await c.from("edu_course_enrollments").select("course_id").eq("student_id", m.id); if (!r.error) return (r.data || []).map(function (x) { return x.course_id; }); } catch (e) {}
        mode = "local";
      }
      enrAll().forEach(function (x) { if (x.student_id === m.id) ids.push(x.course_id); });
      return ids;
    },
    async counts(ids) {
      var out = {}, c = C.sb();
      if (c && mode === "db" && ids.length) {
        try { var r = await c.from("edu_course_enrollments").select("course_id").in("course_id", ids); if (!r.error) { (r.data || []).forEach(function (x) { out[x.course_id] = (out[x.course_id] || 0) + 1; }); return out; } } catch (e) {}
      }
      enrAll().forEach(function (x) { out[x.course_id] = (out[x.course_id] || 0) + 1; });
      return out;
    },
    /* الانضمام للكورس: مجاني بالكامل — بدون أي خصم من المحفظة */
    async enroll(course) {
      var m = await C.me(), c = C.sb();
      if (c && m.id !== "local" && mode === "db") {
        try {
          var ins = await c.from("edu_course_enrollments").insert({ student_id: m.id, course_id: course.id });
          if (!ins.error || /duplicate|already|23505/i.test((ins.error.code || "") + " " + (ins.error.message || ""))) return { ok: true };
        } catch (e) {}
        try {
          var r = await c.rpc("edu_enroll_course", { p_course: course.id });
          if (!r.error || /already|مشترك/i.test(r.error.message || "")) return { ok: true };
        } catch (e) {}
      }
      /* وضع محلي */
      var en = enrAll();
      if (en.some(function (x) { return x.student_id === m.id && x.course_id === course.id; })) return { ok: true };
      en.push({ student_id: m.id, course_id: course.id, price: 0, created_at: new Date().toISOString() });
      C.LS.set("edu_enroll_local", JSON.stringify(en));
      return { ok: true };
    }
  };

  /* ------------------------------ مكونات مشتركة ------------------------------ */
  function cover(c) { var cv = COVERS[Number(c.cover) || 0] || COVERS[0]; return cv; }
  function lessonsOf(c) { var l = c.lessons; if (typeof l === "string") { try { l = JSON.parse(l); } catch (e) { l = []; } } return Array.isArray(l) ? l : []; }
  function mins(c) { return lessonsOf(c).reduce(function (s, l) { return s + (Number(l.min) || 0); }, 0); }
  function card(c, extra, i) {
    var cv = cover(c), ls = lessonsOf(c);
    return '<div class="cc" style="animation-delay:' + Math.min(i || 0, 8) * 50 + 'ms"><div class="cc-cv" style="background:' + cv.g + '"><span>' + cv.e + '</span>' + (c.level ? '<b class="cc-tag">' + esc(c.level) + '</b>' : '') + '</div>' +
      '<div class="cc-b"><h4>' + esc(c.title) + '</h4><div class="by">' + (c.teacher_name ? 'المعلم: ' + esc(c.teacher_name) : '') + (c.subject ? ' • ' + esc(c.subject) : '') + '</div>' +
      '<div class="cc-m"><div class="meta"><span>' + ls.length + ' درس</span>' + (mins(c) ? '<span>' + mins(c) + ' دقيقة</span>' : '') + '</div></div>' + (extra || '') + '</div></div>';
  }
  function head(icon, t, p, btn) {
    return '<div class="ew-head"><i>' + icon + '</i><div class="ew-grow"><h2>' + t + '</h2><p>' + p + '</p></div>' + (btn || '') + '</div>';
  }

  /* =========================== صفحة المعلم =========================== */
  var tHost = null;
  async function renderTeacher() {
    if (!tHost) return;
    var list = await D.mine(), cnt = await D.counts(list.map(function (x) { return x.id; }));
    tHost.innerHTML = '<div class="ew">' +
      head(IC.book, "الكورسات", "أنشئ كورساتك وانشرها لطلابك", '<button type="button" class="ew-btn gold sm" id="cr-new">' + IC.plus + ' كورس جديد</button>') +
      (list.length ? '<div class="c-grid">' + list.map(function (c, i) {
        return '<div>' + card(c, '<div><span class="cc-st ' + (c.published ? 'on' : 'off') + '">' + (c.published ? 'منشور' : 'مسودة') + '</span> <small style="color:#55627F">' + (cnt[c.id] || 0) + ' طالب</small></div>' +
          '<div class="cc-acts"><button data-a="edit" data-id="' + esc(c.id) + '">تعديل</button><button class="p" data-a="pub" data-id="' + esc(c.id) + '">' + (c.published ? 'إيقاف' : 'نشر') + '</button><button class="d" data-a="del" data-id="' + esc(c.id) + '">حذف</button></div>', i) + '</div>';
      }).join("") + '</div>' : '<div class="ew-card"><div class="ew-empty">' + IC.book + 'لم تنشئ أي كورس بعد.<br>ابدأ بإنشاء أول كورس خطوة بخطوة.<div style="margin-top:14px"><button type="button" class="ew-btn gold sm" id="cr-new2" style="margin:auto">' + IC.plus + ' إنشاء كورس</button></div></div></div>') +
      '</div>';
    var nb = tHost.querySelector("#cr-new"), nb2 = tHost.querySelector("#cr-new2");
    [nb, nb2].forEach(function (b) { if (b) b.onclick = function () { wizard(null); }; });
    tHost.querySelectorAll("[data-a]").forEach(function (b) {
      b.onclick = async function () {
        var id = b.dataset.id, c = list.filter(function (x) { return String(x.id) === id; })[0]; if (!c) return;
        if (b.dataset.a === "edit") wizard(c);
        else if (b.dataset.a === "pub") { await D.setPub(c.id, !c.published); C.toast(c.published ? "تم إيقاف الكورس" : "تم نشر الكورس"); renderTeacher(); }
        else if (b.dataset.a === "del") {
          var ok = true; try { if (window.EduUI && EduUI.confirm) ok = await EduUI.confirm("حذف الكورس نهائيًا؟"); else ok = confirm("حذف الكورس نهائيًا؟"); } catch (e) { ok = confirm("حذف الكورس نهائيًا؟"); }
          if (ok) { await D.remove(c.id); C.toast("تم حذف الكورس"); renderTeacher(); }
        }
      };
    });
  }

  /* --------------------------- معالج إنشاء الكورس --------------------------- */
  function wizard(edit) {
    var d = edit ? { id: edit.id, title: edit.title || "", description: edit.description || "", level: edit.level || LEVELS[2], subject: edit.subject || "", cover: Number(edit.cover) || 0, lessons: lessonsOf(edit).slice(), published: !!edit.published }
      : { title: "", description: "", level: LEVELS[2], subject: "", cover: 0, lessons: [], published: true };
    var step = 1, N = 4, names = ["المعلومات", "الغلاف", "الدروس", "المراجعة"];
    C.sheet("", function (api) {
      if (api.el.dataset.init) return; api.el.dataset.init = 1; draw(api);
    });
    function bar() { var b = ""; for (var i = 1; i <= N; i++) b += '<i class="' + (i <= step ? 'on' : '') + '"></i>'; return '<div class="wz2-bar">' + b + '</div><div class="wz2-st"><span>الخطوة ' + step + ' من ' + N + '</span><span>' + names[step - 1] + '</span></div>'; }
    function nav(last) { return '<p class="ew-err" id="wz-err"></p><div class="wz2-nav">' + (step > 1 ? '<button type="button" class="ew-btn wz2-prev" id="wz-prev">السابق</button>' : '') + '<button type="button" class="ew-btn' + (last ? ' gold' : '') + '" id="wz-next">' + (last ? (edit ? 'حفظ التعديلات' : 'نشر الكورس') : 'التالي') + '</button></div>'; }
    function err(api, t) { var e = api.el.querySelector("#wz-err"); if (e) e.textContent = t; }
    function draw(api) {
      var h = '<h3>' + (edit ? 'تعديل الكورس' : 'إنشاء كورس جديد') + '</h3>' + bar();
      if (step === 1) {
        h += '<label>اسم الكورس</label><input type="text" id="f-title" maxlength="80" placeholder="مثال: أساسيات الفيزياء للصف الثالث الثانوي" value="' + esc(d.title) + '">' +
          '<label>وصف الكورس</label><textarea id="f-desc" maxlength="600" placeholder="ماذا سيتعلم الطالب في هذا الكورس؟">' + esc(d.description) + '</textarea>' +
          '<label>المرحلة</label><select id="f-level">' + LEVELS.map(function (l) { return '<option' + (l === d.level ? ' selected' : '') + '>' + l + '</option>'; }).join("") + '</select>' +
          '<label>المادة</label><input type="text" id="f-sub" maxlength="40" placeholder="مثال: فيزياء" value="' + esc(d.subject) + '">' + nav(false);
      } else if (step === 2) {
        h += '<label>غلاف الكورس</label><div class="cov-g">' + COVERS.map(function (c, i) { return '<button type="button" data-c="' + i + '" class="' + (i === d.cover ? 'on' : '') + '" style="background:' + c.g + '">' + c.e + '</button>'; }).join("") + '</div>' + nav(false);
      } else if (step === 3) {
        h += '<div id="ls-list">' + lessonList() + '</div>' +
          '<div class="ls-add"><label style="margin-top:0">عنوان الدرس</label><input type="text" id="l-t" maxlength="80" placeholder="مثال: الدرس الأول: الحركة">' +
          '<label>رابط الفيديو (اختياري)</label><input type="url" id="l-u" placeholder="https://youtube.com/..." dir="ltr">' +
          '<div class="g2" style="margin-top:12px"><div></div><div><input type="number" id="l-m" inputmode="numeric" min="0" placeholder="دقائق"></div></div>' +
          '<button type="button" class="ew-btn sm" id="l-add" style="margin-top:10px;width:100%">' + IC.plus + ' إضافة الدرس</button></div>' + nav(false);
      } else {
        var cv = COVERS[d.cover];
        h += '<div class="rv-cov" style="background:' + cv.g + '">' + cv.e + '</div>' +
          '<div class="ew-sum"><div><span>الاسم</span><b>' + esc(d.title) + '</b></div><div><span>المرحلة / المادة</span><b>' + esc(d.level) + (d.subject ? ' • ' + esc(d.subject) : '') + '</b></div><div><span>الدروس</span><b>' + d.lessons.length + '</b></div></div>' +
          '<div class="sw"><button type="button" id="f-pub" class="' + (d.published ? 'on' : '') + '" aria-label="نشر الآن"></button><span>نشر الكورس الآن للطلاب</span></div>' + nav(true);
      }
      api.set(h);
      bind(api);
    }
    function lessonList() {
      if (!d.lessons.length) return '<div class="ew-empty" style="padding:14px">أضف درسك الأول بالأسفل</div>';
      return d.lessons.map(function (l, i) { return '<div class="ls-row"><span class="n">' + (i + 1) + '</span><span class="t"><b>' + esc(l.title) + '</b><small>' + (l.min ? l.min + ' دقيقة' : 'بدون مدة') + (l.url ? ' • فيديو' : '') + '</small></span><button type="button" data-rm="' + i + '" aria-label="حذف">✕</button></div>'; }).join("");
    }
    function bind(api) {
      var q = function (s) { return api.el.querySelector(s); };
      var prev = q("#wz-prev"); if (prev) prev.onclick = function () { collect(api); step--; draw(api); };
      q("#wz-next").onclick = async function () {
        collect(api);
        if (step === 1) { if (d.title.trim().length < 3) return err(api, "اكتب اسم الكورس (3 أحرف على الأقل)"); }
        if (step === 3 && !d.lessons.length) return err(api, "أضف درسًا واحدًا على الأقل");
        if (step < N) { step++; draw(api); return; }
        var btn = q("#wz-next"); btn.disabled = true;
        await D.save({ id: d.id, title: d.title.trim(), description: d.description.trim(), level: d.level, subject: d.subject.trim(), cover: d.cover, lessons: d.lessons, published: d.published });
        api.close(); C.toast(edit ? "تم حفظ التعديلات" : (d.published ? "تم نشر الكورس" : "تم حفظ الكورس كمسودة")); renderTeacher();
      };
      api.el.querySelectorAll("[data-c]").forEach(function (b) { b.onclick = function () { d.cover = Number(b.dataset.c); api.el.querySelectorAll("[data-c]").forEach(function (x) { x.classList.toggle("on", x === b); }); }; });
      var pb = q("#f-pub"); if (pb) pb.onclick = function () { d.published = !d.published; pb.classList.toggle("on", d.published); };
      var add = q("#l-add");
      if (add) add.onclick = function () {
        var t = q("#l-t").value.trim(); if (!t) return err(api, "اكتب عنوان الدرس");
        var u = q("#l-u").value.trim(); if (u && !/^https?:\/\//i.test(u)) return err(api, "الرابط يجب أن يبدأ بـ https://");
        d.lessons.push({ title: t, url: u, min: Number(q("#l-m").value) || 0 });
        draw(api);
      };
      api.el.querySelectorAll("[data-rm]").forEach(function (b) { b.onclick = function () { d.lessons.splice(Number(b.dataset.rm), 1); draw(api); }; });
    }
    function collect(api) {
      var q = function (s) { return api.el.querySelector(s); };
      if (step === 1 && q("#f-title")) { d.title = q("#f-title").value; d.description = q("#f-desc").value; d.level = q("#f-level").value; d.subject = q("#f-sub").value; }
    }
  }

  /* =========================== صفحة الطالب =========================== */
  var sHost = null, filt = "all", term = "";
  async function renderStudent() {
    if (!sHost) return;
    var all = await D.published(), mine = await D.enrolled(), cnt = await D.counts([]);
    sHost.innerHTML = '<div class="ew">' + head(IC.cap, "الكورسات", "تعلّم مجانًا من أفضل المعلمين") +
      '<div class="c-top"><div class="c-search"><input id="cs-q" type="search" placeholder="ابحث عن كورس أو معلم أو مادة" value="' + esc(term) + '"></div></div>' +
      '<div class="c-fl">' + [["all", "الكل"], ["mine", "كورساتي"]].map(function (f) { return '<button type="button" data-f="' + f[0] + '" class="' + (filt === f[0] ? 'on' : '') + '">' + f[1] + '</button>'; }).join("") + '</div>' +
      '<div id="cs-grid"></div></div>';
    function paint() {
      var t = term.trim().toLowerCase();
      var l = all.filter(function (c) {
        if (filt === "mine" && mine.indexOf(c.id) < 0) return false;
        return !t || [c.title, c.teacher_name, c.subject, c.level].join(" ").toLowerCase().indexOf(t) >= 0;
      });
      $g().innerHTML = l.length ? '<div class="c-grid">' + l.map(function (c, i) {
        var own = mine.indexOf(c.id) >= 0;
        return card(c, own ? '<div><span class="cc-st on">مسجّل ✓</span></div>' : '', i).replace('<div class="cc"', '<div class="cc" data-id="' + esc(c.id) + '" role="button" tabindex="0" style="cursor:pointer"');
      }).join("") + '</div>' : '<div class="ew-card"><div class="ew-empty">' + IC.book + (filt === "mine" ? 'لم تنضم إلى أي كورس بعد' : 'لا توجد كورسات مطابقة حاليًا') + '</div></div>';
      $g().querySelectorAll("[data-id]").forEach(function (b) { var open = function () { detail(all.filter(function (x) { return String(x.id) === b.dataset.id; })[0], mine); }; b.onclick = open; b.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } }; });
    }
    function $g() { return sHost.querySelector("#cs-grid"); }
    sHost.querySelector("#cs-q").oninput = function (e) { term = e.target.value; paint(); };
    sHost.querySelectorAll("[data-f]").forEach(function (b) { b.onclick = function () { filt = b.dataset.f; sHost.querySelectorAll("[data-f]").forEach(function (x) { x.classList.toggle("on", x === b); }); paint(); }; });
    paint();
  }

  async function detail(c, mine) {
    if (!c) return;
    var cv = cover(c), ls = lessonsOf(c);
    var own = mine.indexOf(c.id) >= 0;
    var prog = null, sbc = C.sb();
    if (sbc) { try { var pr = await sbc.rpc("edu_course_progress", { p_course: c.id }); if (!pr.error) prog = pr.data || []; } catch (e) {} }
    C.sheet("", function (api) {
      if (api.el.dataset.init) return; api.el.dataset.init = 1; paint(api);
    });
    function paint(api) {
      api.set('<div class="rv-cov" style="background:' + cv.g + '">' + cv.e + '</div><h3>' + esc(c.title) + '</h3>' +
        '<p class="sub">' + (c.teacher_name ? 'المعلم: ' + esc(c.teacher_name) : '') + (c.level ? ' • ' + esc(c.level) : '') + (c.subject ? ' • ' + esc(c.subject) : '') + '</p>' +
        (c.description ? '<p style="line-height:1.9;font-size:14px;color:#33415f;margin:0 0 14px">' + esc(c.description) + '</p>' : '') +
        '<div class="ew-sum"><div><span>عدد الدروس</span><b>' + ls.length + '</b></div>' + (mins(c) ? '<div><span>المدة الإجمالية</span><b>' + mins(c) + ' دقيقة</b></div>' : '') + '</div>' +
        '<div class="ew-lessons">' + ls.map(function (l, i) {
          var p = prog && prog[i];
          var unlocked = p ? !!p.unlocked : true;
          var hasQuiz = p && p.exam_id;
          var open = unlocked;
          var quizBtn = "";
          if (open && hasQuiz) {
            quizBtn = p.passed
              ? '<span class="tag ok" style="margin-inline-start:6px">اجتزت اختبار الدرس ✓ (' + Math.round(p.best_pct) + '%)</span>'
              : '<a class="ls-play" style="margin-inline-start:6px" target="_blank" rel="noopener" href="exam.html?code=' + esc(p.secret_code) + '">ابدأ اختبار الدرس</a>';
          }
          return '<div class="ls-row"><span class="n">' + (i + 1) + '</span><span class="t"><b>' + esc(l.title) + '</b><small>' + (l.min ? l.min + ' دقيقة' : '') + (!open ? ' • أنهِ اختبار الدرس السابق بنسبة 50% على الأقل لفتح هذا الدرس' : '') + '</small></span>' +
            (open ? ((l.url ? '<a class="ls-play" target="_blank" rel="noopener" href="' + esc(l.url) + '">مشاهدة</a>' : '') + quizBtn) : '<span class="ls-lock">' + IC.lock.replace('<svg', '<svg style="width:18px;height:18px"') + '</span>') + '</div>';
        }).join("") + '</div><p class="ew-err" id="en-err"></p>' +
        (own ? '<div class="w-note">' + IC.info + '<span>أنت مسجّل في هذا الكورس.</span></div>' :
          '<button type="button" class="ew-btn" id="en-go">ابدأ التعلم مجانًا</button>'));
      var go = api.el.querySelector("#en-go");
      if (go) go.onclick = async function () {
        go.disabled = true;
        var r = await D.enroll(c);
        if (!r.ok) { go.disabled = false; api.el.querySelector("#en-err").textContent = r.msg || "تعذر التسجيل في الكورس"; return; }
        mine.push(c.id); own = true; C.toast("تم التسجيل في الكورس 🎉");
        if (sbc) { try { var pr2 = await sbc.rpc("edu_course_progress", { p_course: c.id }); if (!pr2.error) prog = pr2.data || []; } catch (e2) {} }
        paint(api); renderStudent();
      };
    }
  }

  window.EduCourses = {
    mountTeacher: function (el) { tHost = el; return renderTeacher(); },
    mountStudent: function (el) { sHost = el; return renderStudent(); }
  };
})();
