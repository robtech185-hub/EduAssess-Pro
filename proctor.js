/* مراقبة الاختبار (EduProctor)
   - داخل تطبيق أندرويد: قفل كامل عبر ExamLock (تثبيت الشاشة، منع الرجوع/لقطات الشاشة، رصد أي خروج).
   - في المتصفح: رصد مغادرة الصفحة + منع النسخ/اللصق/القائمة.
   - كاميرا المراقبة: لقطة كل 45 ثانية + عند كل مخالفة، وكشف تغطية الكاميرا/غياب الوجه (إن دعمه الجهاز).
   كل شيء يُحفظ في جدول exam_proctor_events ومخزن proctor (ملف setup-proctoring.sql). فشل الحفظ لا يُعطّل الاختبار. */
(function () {
  "use strict";
  var C = window.Capacitor;
  var LK = C && C.Plugins && C.Plugins.ExamLock;
  var NATIVE = !!(C && C.isNativePlatform && C.isNativePlatform() && LK);
  var MAX_LEAVES = 3;          // عدد مرات الخروج المسموحة قبل التسليم التلقائي (الثالثة تُنهي الاختبار)
  var SNAP_MS = 45000;         // لقطة دورية
  var CHECK_MS = 3000;         // فحص الكاميرا
  var REQUIRE_CAMERA = true;   // اجعلها false للسماح بالدخول بدون كاميرا

  var S = null;                // حالة الجلسة الجارية
  var pre = null;              // كاميرا جُهّزت قبل بدء الاختبار

  function $(id) { return document.getElementById(id); }
  function T(s) { try { return (window.EduI18N && EduI18N.t) ? EduI18N.t(s) : s; } catch (e) { return s; } }

  /* ---------- الكاميرا ---------- */
  async function openCam() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error("nocam");
    var st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 360 } }, audio: false });
    var v = document.createElement("video");
    v.muted = true; v.playsInline = true; v.autoplay = true; v.setAttribute("playsinline", ""); v.srcObject = st;
    try { await v.play(); } catch (e) {}
    return { stream: st, video: v };
  }
  /* يُستدعى قبل تسجيل الدخول للاختبار: لا يبدأ الاختبار بدون كاميرا */
  async function prepare() {
    try { pre = await openCam(); return { ok: true }; }
    catch (e) {
      if (!REQUIRE_CAMERA) { pre = null; return { ok: true }; }
      return { ok: false, msg: "يجب السماح باستخدام الكاميرا الأمامية لبدء الاختبار (مراقبة الاختبار). فعّل إذن الكاميرا من إعدادات التطبيق ثم حاول مرة أخرى." };
    }
  }
  function release() { if (pre) { try { pre.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {} pre = null; } }

  /* ---------- الحفظ ---------- */
  function shot(maxW) {
    if (!S || !S.cam) return null;
    var v = S.cam.video; if (!v.videoWidth) return null;
    var w = Math.min(maxW || 320, v.videoWidth), h = Math.round(w * v.videoHeight / v.videoWidth);
    var c = document.createElement("canvas"); c.width = w; c.height = h;
    c.getContext("2d").drawImage(v, 0, 0, w, h);
    return c;
  }
  async function log(kind, detail, withShot) {
    if (!S) return;
    var sb = S.o.sb, path = null;
    try {
      if (withShot) {
        var c = shot(320);
        if (c) {
          var blob = await new Promise(function (r) { c.toBlob(r, "image/jpeg", 0.5); });
          if (blob) {
            path = S.o.examId + "/" + S.o.userId + "/" + S.o.attemptId + "/" + Date.now() + "-" + kind + ".jpg";
            var up = await sb.storage.from("proctor").upload(path, blob, { contentType: "image/jpeg" });
            if (up && up.error) path = null;
          }
        }
      }
      await sb.from("exam_proctor_events").insert({
        attempt_id: S.o.attemptId, exam_id: S.o.examId, user_id: S.o.userId, full_name: S.o.name || null,
        kind: kind, detail: detail || null, snapshot_path: path
      });
    } catch (e) {}
  }

  /* نبضة حيّة للمعلم: السؤال الحالي، المتبقي، حالة الخروج، ومصغّرة من الكاميرا (جدول exam_live) */
  async function beat(status) {
    if (!S) return;
    var o = S.o, st = {}, thumb = null;
    try { st = o.getState ? o.getState() : {}; } catch (e) {}
    if (status !== "done") { var c = shot(160); if (c) { try { thumb = c.toDataURL("image/jpeg", 0.4); } catch (e) {} } }
    var row = { attempt_id: String(o.attemptId), exam_id: String(o.examId), user_id: o.userId, full_name: o.name || null,
      q_index: st.q || 0, q_total: st.total || 0, answered: st.answered || 0, left_secs: st.left || 0,
      leaves: S.leaves, away: !!S.away, status: status || "active", updated_at: new Date().toISOString() };
    if (thumb) row.thumb = thumb;
    try { await o.sb.from("exam_live").upsert(row, { onConflict: "attempt_id" }); } catch (e) {}
  }

  /* ---------- واجهة التنبيه ---------- */
  function banner(html, danger, ms) {
    var el = $("ep-banner");
    if (!el) {
      el = document.createElement("div"); el.id = "ep-banner";
      el.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:99998;padding:12px 14px;text-align:center;font:700 14px/1.7 'Readex Pro',sans-serif;color:#fff;display:none";
      document.body.appendChild(el);
    }
    el.style.background = danger ? "#D6453D" : "#B7791F"; el.textContent = html; el.style.display = "block";
    clearTimeout(el._t); el._t = setTimeout(function () { el.style.display = "none"; }, ms || 6000);
  }
  function modal(title, text) {
    return new Promise(function (res) {
      var o = document.createElement("div");
      o.style.cssText = "position:fixed;inset:0;z-index:99999;background:rgba(10,20,40,.88);display:flex;align-items:center;justify-content:center;padding:20px";
      o.innerHTML = '<div style="background:#fff;border-radius:20px;max-width:380px;width:100%;padding:24px;text-align:center;font-family:\'Readex Pro\',sans-serif;direction:rtl">' +
        '<div style="font-size:44px">⚠️</div><h3 style="margin:8px 0;color:#D6453D"></h3><p style="margin:0 0 16px;line-height:1.9;color:#33405A"></p>' +
        '<button style="width:100%;padding:13px;border:0;border-radius:12px;background:#0A2260;color:#fff;font:700 15px inherit;cursor:pointer">فهمت، متابعة الاختبار</button></div>';
      o.querySelector("h3").textContent = title; o.querySelector("p").textContent = text;
      o.querySelector("button").onclick = function () { o.remove(); res(); };
      document.body.appendChild(o);
    });
  }
  function eye() {
    if (!S || !S.cam) return;
    var w = document.createElement("div"); w.id = "ep-eye";
    w.style.cssText = "position:fixed;bottom:14px;left:14px;z-index:99990;width:74px;height:74px;border-radius:50%;overflow:hidden;border:3px solid #D6453D;box-shadow:0 4px 14px rgba(0,0,0,.35);background:#000";
    var v = S.cam.video; v.style.cssText = "width:100%;height:100%;object-fit:cover;transform:scaleX(-1)";
    w.appendChild(v);
    var dot = document.createElement("span");
    dot.style.cssText = "position:absolute;top:6px;right:6px;width:9px;height:9px;border-radius:50%;background:#ff3b30;animation:epb 1.2s infinite";
    w.appendChild(dot);
    if (!$("ep-css")) { var st = document.createElement("style"); st.id = "ep-css"; st.textContent = "@keyframes epb{50%{opacity:.2}}"; document.head.appendChild(st); }
    document.body.appendChild(w);
  }

  /* ---------- الخروج من الاختبار ---------- */
  async function onLeave(source, awayMs) {
    if (!S || S.ended) return;
    var now = Date.now();
    if (now - S.lastLeave < 1500) return;      // منع العدّ المزدوج
    S.lastLeave = now; S.leaves++; S.away = true; beat();
    var left = MAX_LEAVES - S.leaves;
    log("leave", source + (awayMs ? " away=" + Math.round(awayMs / 1000) + "s" : ""), true);
    if (left <= 0) { S.ended = true; var cb = S.o.onForceEnd; log("force_end", "leaves=" + S.leaves, true); if (cb) cb("left"); return; }
    var msg = "تم رصد خروجك من الاختبار (" + S.leaves + " من " + MAX_LEAVES + "). عند الوصول إلى " + MAX_LEAVES + " يُسلَّم اختبارك تلقائيًا ويُبلَّغ المعلم.";
    if (S.o.onWarn) S.o.onWarn(S.leaves, MAX_LEAVES);
    await modal("لا تغادر الاختبار", msg);
  }
  function onVis() {
    if (NATIVE || !S) return;
    if (document.visibilityState === "hidden") onLeave("visibility"); else { S.away = false; beat(); }
  }
  function block(e) {
    if (!S || S.ended) return;
    var t = e.target && e.target.tagName;
    if (e.type === "selectstart" && (t === "INPUT" || t === "TEXTAREA")) return;
    e.preventDefault();
  }
  function onKey(e) {
    if (!S) return;
    var k = (e.key || "").toLowerCase();
    if (k === "printscreen" || k === "f12" || ((e.ctrlKey || e.metaKey) && ["c", "v", "x", "p", "s", "u", "a"].indexOf(k) >= 0)) e.preventDefault();
  }

  /* ---------- فحص الكاميرا ---------- */
  async function check() {
    if (!S || S.ended || !S.cam) return;
    var v = S.cam.video, tr = S.cam.stream.getVideoTracks()[0];
    if (!tr || tr.readyState !== "live") {
      if (now() - S.lastCam > 20000) { S.lastCam = now(); log("camera_off", "track ended", false); banner("الكاميرا متوقفة — أعد تفعيلها وإلا سيُبلَّغ المعلم", true); try { S.cam = await openCam(); eye(); } catch (e) {} }
      return;
    }
    var c = document.createElement("canvas"); c.width = 48; c.height = 36;
    var x = c.getContext("2d"); try { x.drawImage(v, 0, 0, 48, 36); } catch (e) { return; }
    var d = x.getImageData(0, 0, 48, 36).data, sum = 0;
    for (var i = 0; i < d.length; i += 4) sum += (d[i] + d[i + 1] + d[i + 2]) / 3;
    var avg = sum / (d.length / 4);
    S.dark = avg < 18 ? S.dark + 1 : 0;
    if (S.dark >= 3 && now() - S.lastCam > 20000) {
      S.lastCam = now(); S.dark = 0; log("camera_covered", "brightness=" + Math.round(avg), true);
      banner("الكاميرا مغطّاة أو مظلمة — اكشفها فورًا، تم تسجيل المخالفة", true); return;
    }
    if (S.fd) {
      try {
        var f = await S.fd.detect(v);
        if (f.length === 0) S.noFace++; else S.noFace = 0;
        if (S.noFace >= 4 && now() - S.lastCam > 20000) { S.lastCam = now(); S.noFace = 0; log("no_face", null, true); banner("لا يظهر وجهك أمام الكاميرا — ابقَ أمامها طوال الاختبار", false); }
        else if (f.length > 1 && now() - S.lastCam > 20000) { S.lastCam = now(); log("multi_face", "faces=" + f.length, true); banner("ظهر أكثر من شخص أمام الكاميرا — تم تسجيل المخالفة", true); }
      } catch (e) { S.fd = null; }
    }
  }
  function now() { return Date.now(); }

  /* ---------- البدء والإنهاء ---------- */
  async function begin(o) {
    if (S) end();
    S = { o: o, cam: pre, leaves: 0, lastLeave: 0, lastCam: 0, dark: 0, noFace: 0, ended: false, timers: [], fd: null };
    pre = null;
    if (!S.cam && REQUIRE_CAMERA) { try { S.cam = await openCam(); } catch (e) {} }
    if (window.FaceDetector) { try { S.fd = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 3 }); } catch (e) { S.fd = null; } }
    eye();
    S.timers.push(setInterval(check, CHECK_MS));
    S.timers.push(setInterval(function () { beat(); }, 6000));
    setTimeout(function () { beat(); }, 800);
    S.timers.push(setInterval(function () { log("snap", null, true); }, SNAP_MS));
    setTimeout(function () { log("start", NATIVE ? "native" : "web", true); }, 1500);
    document.addEventListener("visibilitychange", onVis);
    ["contextmenu", "copy", "cut", "paste", "selectstart", "dragstart"].forEach(function (ev) { document.addEventListener(ev, block, true); });
    document.addEventListener("keydown", onKey, true);
    if (NATIVE) {
      try {
        var r = await LK.enable();
        S.lkH = await LK.addListener("examLock", function (e) { if (e && e.type === "leave") onLeave("native"); else if (e && e.type === "return" && S) { S.away = false; beat(); log("return", "away=" + Math.round((e.awayMs || 0) / 1000) + "s", false); }});
        if (r && !r.pinned) log("pin_failed", "screen pinning not active", false);
      } catch (e) {}
    } else {
      try { var el = document.documentElement; if (el.requestFullscreen) await el.requestFullscreen(); } catch (e) {}
    }
  }
  function end() {
    if (!S) { release(); return; }
    beat("done");
    var s = S; S = null; s.ended = true;
    s.timers.forEach(clearInterval);
    document.removeEventListener("visibilitychange", onVis);
    ["contextmenu", "copy", "cut", "paste", "selectstart", "dragstart"].forEach(function (ev) { document.removeEventListener(ev, block, true); });
    document.removeEventListener("keydown", onKey, true);
    try { if (s.lkH && s.lkH.remove) s.lkH.remove(); } catch (e) {}
    if (NATIVE) { try { LK.disable(); } catch (e) {} }
    else { try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen(); } catch (e) {} }
    try { s.cam && s.cam.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
    ["ep-eye", "ep-banner"].forEach(function (id) { var el = $(id); if (el) el.remove(); });
  }

  window.EduProctor = { prepare: prepare, release: release, begin: begin, end: end, native: NATIVE, maxLeaves: MAX_LEAVES };
})();
