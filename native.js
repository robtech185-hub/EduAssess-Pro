/* جسر التنبيهات المحلية (Capacitor LocalNotifications) لتطبيق EduAssess Pro
   يعمل داخل تطبيق أندرويد فقط، بلا Firebase: يجدول مواعيد الاختبارات في منبّه النظام فتصل والتطبيق مغلق. */
(function () {
  "use strict";
  var C = window.Capacitor;
  if (!C || !C.isNativePlatform || !C.isNativePlatform()) return;
  var LN = C.Plugins && C.Plugins.LocalNotifications;
  if (!LN) return;

  var I=window.EduI18N||{msg:function(k){return k},lang:function(){return "ar"}};
  var DAYS = 21, MAX = 60, CH = "edu", busy = false, lastRun = 0;
  function ls(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; }
  }
  function role() { return ls("edu_role") === "teacher" || /teacher\.html/i.test(location.pathname) ? "teacher" : "student"; }
  async function session() {
    try { var r = await window.sbClient.auth.getSession(); return (r && r.data && r.data.session) || null; } catch (e) { return null; }
  }
  async function perm() {
    var p = await LN.checkPermissions();
    if (p.display !== "granted") p = await LN.requestPermissions();
    return p.display === "granted";
  }
  async function channel() {
    try { await LN.createChannel({ id: CH, name: ({ en: "Exam alerts", fr: "Alertes d'examens" })[I.lang()] || "تنبيهات الاختبارات", importance: 5, visibility: 1, vibration: true }); } catch (e) {}
  }
  async function exact() {
    try {
      var e = await LN.checkExactNotificationSetting();
      if (e.exact_alarm !== "granted" && !ls("edu_exact")) { ls("edu_exact", "1"); await LN.changeExactNotificationSetting(); }
    } catch (e) {}
  }
  async function cancelAll() {
    try {
      var p = await LN.getPending();
      if (p.notifications && p.notifications.length) await LN.cancel({ notifications: p.notifications.map(function (n) { return { id: n.id }; }) });
    } catch (e) {}
  }

  /* مواعيد الاختبارات القادمة: تنبيهات المعلمين + تقويم المعلمين المشترك معهم */
  async function collectTeacher(user) {
    var sb = window.sbClient, now = new Date(), to = new Date(now.getTime() + DAYS * 864e5), out = [];
    try {
      var r = await sb.from("exams").select("exam_name,starts_at,ends_at").eq("teacher_id", user.id).gte("starts_at", now.toISOString()).lte("starts_at", to.toISOString()).order("starts_at").limit(40);
      (r.data || []).forEach(function (x) { var t = new Date(x.starts_at); if (!isNaN(t) && t > now) out.push({ name: x.exam_name || "", at: t, teacher: "", end: x.ends_at ? new Date(x.ends_at) : null }); });
    } catch (e) {}
    return out;
  }
  async function teacherEnds(user) {
    try { var r = await window.sbClient.from("teachers").select("trial_ends_at,subscription_ends_at").eq("id", user.id).single(); return r.data || null; } catch (e) { return null; }
  }
  async function collect(user) {
    if (role() === "teacher") return collectTeacher(user);
    var sb = window.sbClient, now = new Date(), to = new Date(now.getTime() + DAYS * 864e5), out = {};
    function add(name, start, teacher, end) {
      if (!start) return;
      var t = new Date(start);
      if (isNaN(t) || t <= now || t > to) return;
      out[(name || "") + "|" + t.getTime()] = { name: name || "اختبار", at: t, teacher: teacher || "", end: end ? new Date(end) : null };
    }
    try {
      var n = await sb.from("student_notifications").select("exam_name,teacher_name,starts_at,ends_at").eq("student_id", user.id).order("created_at", { ascending: false }).limit(100);
      (n.data || []).forEach(function (r) { add(r.exam_name, r.starts_at, r.teacher_name, r.ends_at); });
    } catch (e) {}
    try {
      var s = await sb.from("student_teacher_subscriptions").select("teacher_id").eq("student_id", user.id);
      var ids = (s.data || []).map(function (r) { return r.teacher_id; });
      if (ids.length) {
        var r = await sb.rpc("my_calendar_exams", { p_from: now.toISOString(), p_to: to.toISOString() });
        (r.data || []).filter(function (e) { return !e.teacher_id || ids.indexOf(e.teacher_id) >= 0; })
          .forEach(function (e) { add(e.exam_name, e.starts_at, e.teacher_name); });
      }
    } catch (e) {}
    return Object.keys(out).map(function (k) { return out[k]; }).sort(function (a, b) { return a.at - b.at; });
  }

  async function schedule() {
    if (busy) return;
    busy = true;
    try {
      var ses = await session();
      if (!ses || !ses.user) return;
      if (!(await perm())) return;
      await channel(); await exact();
      var list = await collect(ses.user), notes = [], id = 1000, now = Date.now();
      var push = function (at, body) {
        if (at.getTime() > now + 2000 && notes.length < MAX)
          notes.push({ id: id++, title: "EduAssess Pro", body: body, schedule: { at: at, allowWhileIdle: true }, channelId: CH });
      };
      var P = function (k) { try { return !window.EduPush || window.EduPush.pref(k, role()); } catch (e) { return true; } };
      list.forEach(function (x) {
        var who = x.teacher ? " — " + x.teacher : "", v = { n: x.name, t: who };
        if (P("exam_start") || P("exam_reminder")) {
          push(new Date(x.at - 60 * 6e4), I.msg("h1", v));
          push(new Date(x.at - 10 * 6e4), I.msg("m10", v));
          push(x.at, I.msg("now", v));
        }
        if (x.end && !isNaN(x.end) && role() === "student" && P("exam_end")) push(new Date(x.end - 30 * 6e4), I.msg("end", v));
      });
      if (role() === "teacher") {
        var tc = await teacherEnds(ses.user);
        [["trial_ends_at", "trial", "trial_end"], ["subscription_ends_at", "sub", "sub_end"]].forEach(function (c) {
          var d = tc && tc[c[0]] && new Date(tc[c[0]]);
          if (!d || isNaN(d) || d <= new Date() || !P(c[2])) return;
          [2, 1].forEach(function (n) { var at = new Date(d - n * 864e5); at.setHours(10, 0, 0, 0); push(at, I.msg(c[1], { n: n })); });
        });
      }
      await cancelAll();
      if (notes.length) await LN.schedule({ notifications: notes });
    } catch (e) {} finally { busy = false; }
  }

  function run(force) {
    var t = Date.now();
    if (!force && t - lastRun < 20000) return;
    lastRun = t;
    schedule();
  }

  var w = setInterval(function () {
    if (!window.sbClient) return;
    clearInterval(w);
    try {
      window.sbClient.auth.onAuthStateChange(function (ev) {
        if (ev === "SIGNED_OUT") cancelAll();
        else if (ev === "SIGNED_IN") setTimeout(function () { run(true); }, 800);
      });
    } catch (e) {}
    run(true);
  }, 1500);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) run(false); });
  setInterval(function () { if (!document.hidden) run(false); }, 15 * 60 * 1000);

  window.testNotif = async function () {
    try {
      if (!(await perm())) { alert("فعّل إذن الإشعارات من إعدادات التطبيق"); return; }
      await channel(); await exact();
      await LN.schedule({ notifications: [{ id: 999, title: "EduAssess Pro", body: I.msg("ok"), schedule: { at: new Date(Date.now() + 10000), allowWhileIdle: true }, channelId: CH }] });
      alert(I.msg("wait"));
    } catch (e) { alert("تعذر جدولة التجربة"); }
  };
})();
