/* جسر التنبيهات المحلية (Capacitor LocalNotifications) لتطبيق EduAssess Pro
   يعمل داخل تطبيق أندرويد فقط، بلا Firebase: يجدول مواعيد الاختبارات في منبّه النظام فتصل والتطبيق مغلق. */
(function () {
  "use strict";
  var C = window.Capacitor;
  if (!C || !C.isNativePlatform || !C.isNativePlatform()) return;
  var LN = C.Plugins && C.Plugins.LocalNotifications;
  if (!LN) return;

  var DAYS = 21, MAX = 60, CH = "edu", busy = false, lastRun = 0;
  function ls(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; }
  }
  async function session() {
    try { var r = await window.sbClient.auth.getSession(); return (r && r.data && r.data.session) || null; } catch (e) { return null; }
  }
  async function perm() {
    var p = await LN.checkPermissions();
    if (p.display !== "granted") p = await LN.requestPermissions();
    return p.display === "granted";
  }
  async function channel() {
    try { await LN.createChannel({ id: CH, name: "تنبيهات الاختبارات", importance: 5, visibility: 1, vibration: true }); } catch (e) {}
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
  async function collect(user) {
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
      var P = function (k) { try { return !window.EduPush || window.EduPush.pref(k, "student"); } catch (e) { return true; } };
      list.forEach(function (x) {
        var who = x.teacher ? " — " + x.teacher : "";
        if (P("exam_start")) {
          push(new Date(x.at - 60 * 6e4), "📝 يبدأ اختبار «" + x.name + "» بعد ساعة" + who);
          push(new Date(x.at - 10 * 6e4), "📝 يبدأ اختبار «" + x.name + "» بعد ١٠ دقائق" + who);
          push(x.at, "🚀 بدأ الآن اختبار «" + x.name + "»" + who);
        }
        if (x.end && !isNaN(x.end) && P("exam_end")) push(new Date(x.end - 30 * 6e4), "⏳ يُغلق دخول اختبار «" + x.name + "» بعد 30 دقيقة" + who);
      });
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
      await LN.schedule({ notifications: [{ id: 999, title: "EduAssess Pro", body: "✅ التنبيهات تعمل بنجاح", schedule: { at: new Date(Date.now() + 10000), allowWhileIdle: true }, channelId: CH }] });
      alert("سيصلك تنبيه بعد 10 ثوانٍ، أغلق التطبيق الآن");
    } catch (e) { alert("تعذر جدولة التجربة"); }
  };
})();
