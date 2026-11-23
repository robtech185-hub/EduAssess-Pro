/* EduAssess Pro — محرّك الشهادات الإلكترونية (مشترك بين صفحة المعلم وصفحة الطالب)
   - رسم الشهادة بالكامل على Canvas (بدون مكتبات خارجية) بـ 6 قوالب قابلة للاختيار.
   - تصدير PNG عالي الدقة و PDF (ملف PDF يُبنى داخل المتصفح).
   - عارض الشهادة بملء الشاشة (عرض / تنزيل / مشاركة / تكبير). */
(function () {
  "use strict";
  var W = 2480, H = 1754;                       // A4 أفقي (≈ 212 dpi) — الإحداثيات المنطقية للرسم
  var FONT_URL = "https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Aref+Ruqaa:wght@400;700&family=Reem+Kufi:wght@500;700&display=swap";
  var FF = {
    title: '"Reem Kufi","Amiri","IBM Plex Sans Arabic",Tahoma,serif',
    name: '"Amiri","IBM Plex Sans Arabic",Tahoma,serif',
    body: '"IBM Plex Sans Arabic","Readex Pro",Tahoma,sans-serif',
    sig: '"Aref Ruqaa","Amiri","IBM Plex Sans Arabic",serif'
  };

  var TYPES = ["شهادة تقدير", "شهادة تفوق", "شهادة شكر وتقدير", "شهادة إتمام", "شهادة حضور والتزام", "شهادة مشاركة متميزة", "شهادة إتقان وحفظ", "شهادة حسن الخلق"];

  var THEMES = [
    { id: "royal",   name: "ذهبي ملكي",    layout: "classic", bg: ["#FFFCF2", "#F6E9C8"], ink: "#33240A", muted: "#7B6A43", accent: "#9C6F14", accent2: "#D4A52F" },
    { id: "academy", name: "أكاديمي أزرق", layout: "elegant", bg: ["#FFFFFF", "#EEF3FF"], ink: "#0B1633", muted: "#55627F", accent: "#0A2260", accent2: "#E0A100" },
    { id: "emerald", name: "زمردي",        layout: "classic", bg: ["#F6FCF8", "#DDF1E6"], ink: "#0C2B22", muted: "#4C6B5F", accent: "#0B6B52", accent2: "#C79A33" },
    { id: "modern",  name: "عصري",         layout: "modern",  bg: ["#FFFFFF", "#F4F7FD"], ink: "#0B1633", muted: "#55627F", accent: "#1F63E0", accent2: "#FFB400", band: ["#1F63E0", "#0A2260"] },
    { id: "plum",    name: "أرجواني أنيق", layout: "elegant", bg: ["#FFF8FC", "#F4E5F0"], ink: "#3A1030", muted: "#7A5A71", accent: "#7A2A64", accent2: "#CF9A33" },
    { id: "night",   name: "ليلي ذهبي",    layout: "modern",  bg: ["#0B1633", "#12296A"], ink: "#FFFFFF", muted: "#A9B7DD", accent: "#FFC933", accent2: "#FFB400", band: ["#FFB400", "#C98A00"], dark: true }
  ];
  function theme(id) { for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === id) return THEMES[i]; return THEMES[0]; }

  /* ---------- أدوات عامة ---------- */
  function injectFonts() {
    try {
      if (document.getElementById("cg-fonts")) return;
      var l = document.createElement("link"); l.id = "cg-fonts"; l.rel = "stylesheet"; l.href = FONT_URL;
      document.head.appendChild(l);
    } catch (e) {}
  }
  var fontP = null;
  function fonts() {
    if (fontP) return fontP;
    injectFonts();
    var s = "شهادة تقدير أحمد", list = ['700 80px "Reem Kufi"', '700 80px "Amiri"', '700 80px "Aref Ruqaa"', '500 40px "IBM Plex Sans Arabic"', '700 40px "IBM Plex Sans Arabic"'];
    var all = (document.fonts && document.fonts.load) ? Promise.all(list.map(function (f) { return document.fonts.load(f, s).catch(function () { return 0; }); })) : Promise.resolve();
    fontP = Promise.race([all, new Promise(function (r) { setTimeout(r, 3500); })]);
    return fontP;
  }
  var IMGS = {};
  function loadImg(src) {
    if (!src) return Promise.resolve(null);
    if (IMGS[src]) return IMGS[src];
    IMGS[src] = new Promise(function (res) {
      var i = new Image(); i.onload = function () { res(i); }; i.onerror = function () { res(null); }; i.src = src;
    });
    return IMGS[src];
  }
  function codeOf(id) { return id ? "EDU-" + String(id).replace(/-/g, "").slice(0, 8).toUpperCase() : "EDU-XXXXXXXX"; }
  function fmtDate(v) {
    if (!v) return "—";
    try {
      var d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v + "T12:00:00") : new Date(v);
      return d.toLocaleDateString("ar-EG-u-nu-latn", { day: "numeric", month: "long", year: "numeric" });
    } catch (e) { return String(v); }
  }

  /* ---------- الرسم ---------- */
  function font(x, w, px, fam) { x.font = w + " " + Math.round(px) + "px " + fam; }
  function text(x, s, px, py, fnt, color) { x.font = fnt; x.fillStyle = color; x.fillText(s, px, py); }
  function fit(x, s, w, maxPx, minPx, maxW, fam) {
    var px = maxPx; font(x, w, px, fam);
    while (px > minPx && x.measureText(s).width > maxW) { px -= 4; font(x, w, px, fam); }
    return px;
  }
  function wrap(x, s, maxW) {
    var words = String(s || "").replace(/\s+/g, " ").trim().split(" "), lines = [], cur = "";
    words.forEach(function (w) {
      var t = cur ? cur + " " + w : w;
      if (!cur || x.measureText(t).width <= maxW) cur = t; else { lines.push(cur); cur = w; }
    });
    if (cur) lines.push(cur);
    return lines;
  }
  function diamond(x, cx, cy, r, color) {
    x.beginPath(); x.moveTo(cx, cy - r); x.lineTo(cx + r, cy); x.lineTo(cx, cy + r); x.lineTo(cx - r, cy); x.closePath();
    x.fillStyle = color; x.fill();
  }
  function flourish(x, cx, cy, half, T) {
    var g = x.createLinearGradient(cx - half, 0, cx + half, 0);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(.2, T.accent2); g.addColorStop(.8, T.accent2); g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g; x.fillRect(cx - half, cy - 2, half * 2, 4);
    diamond(x, cx, cy, 14, T.accent2);
    diamond(x, cx - 44, cy, 7, T.accent); diamond(x, cx + 44, cy, 7, T.accent);
  }
  function pattern(x, T) {
    x.save(); x.lineWidth = 3; x.strokeStyle = T.dark ? "rgba(255,255,255,.05)" : T.accent; x.globalAlpha = T.dark ? 1 : .06;
    [[0, 0], [W, H]].forEach(function (c) { for (var i = 1; i <= 9; i++) { x.beginPath(); x.arc(c[0], c[1], i * 130, 0, 6.2832); x.stroke(); } });
    x.restore();
  }
  function emblem(x, cx, cy, r, T) {
    x.save(); x.fillStyle = T.accent; x.strokeStyle = T.accent; x.lineWidth = Math.max(4, r * .04);
    x.beginPath(); x.moveTo(cx, cy - .42 * r); x.lineTo(cx + .62 * r, cy - .12 * r); x.lineTo(cx, cy + .18 * r); x.lineTo(cx - .62 * r, cy - .12 * r); x.closePath(); x.fill();
    x.beginPath(); x.moveTo(cx - .36 * r, cy + .02 * r); x.lineTo(cx - .36 * r, cy + .26 * r); x.quadraticCurveTo(cx, cy + .5 * r, cx + .36 * r, cy + .26 * r); x.lineTo(cx + .36 * r, cy + .02 * r); x.lineTo(cx, cy + .18 * r); x.closePath(); x.fill();
    x.beginPath(); x.moveTo(cx + .62 * r, cy - .12 * r); x.lineTo(cx + .62 * r, cy + .22 * r); x.stroke();
    x.beginPath(); x.arc(cx + .62 * r, cy + .27 * r, r * .05, 0, 6.2832); x.fillStyle = T.accent2; x.fill();
    x.restore();
  }
  function drawLogo(x, cx, cy, r, T, logo) {
    x.save();
    x.beginPath(); x.arc(cx, cy, r + 16, 0, 6.2832); x.lineWidth = 4; x.strokeStyle = T.accent; x.globalAlpha = .55; x.stroke(); x.globalAlpha = 1;
    x.beginPath(); x.arc(cx, cy, r, 0, 6.2832); x.fillStyle = "#fff"; x.fill(); x.lineWidth = 10; x.strokeStyle = T.accent2; x.stroke();
    if (logo && logo.width) {
      x.save(); x.beginPath(); x.arc(cx, cy, r - 12, 0, 6.2832); x.clip();
      var m = 1.36 * r, s = Math.min(m / logo.width, m / logo.height), w = logo.width * s, h = logo.height * s;
      x.drawImage(logo, cx - w / 2, cy - h / 2, w, h); x.restore();
    } else emblem(x, cx, cy, r, T);
    x.restore();
  }
  function seal(x, cx, cy, r, T) {
    x.save();
    var rib = x.createLinearGradient(0, cy, 0, cy + r + 60);
    rib.addColorStop(0, T.accent); rib.addColorStop(1, T.accent2);
    [[-.5, -12], [.5, 12]].forEach(function (p) {
      var bx = cx + p[0] * r * .8;
      x.beginPath(); x.moveTo(bx - 34, cy + r * .3); x.lineTo(bx + 34, cy + r * .3); x.lineTo(bx + 34 + p[1] * 1.2, cy + r + 62); x.lineTo(bx + p[1] * .4, cy + r + 36); x.lineTo(bx - 34 + p[1] * 1.2, cy + r + 62); x.closePath();
      x.fillStyle = rib; x.fill();
    });
    var g = x.createRadialGradient(cx - r * .3, cy - r * .3, r * .1, cx, cy, r * 1.05);
    g.addColorStop(0, "#FFE9A6"); g.addColorStop(.55, T.accent2); g.addColorStop(1, T.accent);
    x.beginPath();
    for (var i = 0; i < 64; i++) { var a = i / 64 * 6.2832, rr = i % 2 ? r * .93 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    x.closePath(); x.fillStyle = g; x.fill();
    x.beginPath(); x.arc(cx, cy, r * .76, 0, 6.2832); x.lineWidth = 5; x.strokeStyle = "rgba(255,255,255,.8)"; x.stroke();
    x.beginPath(); x.arc(cx, cy, r * .66, 0, 6.2832); x.fillStyle = "rgba(0,0,0,.14)"; x.fill();
    x.beginPath();
    for (var k = 0; k < 10; k++) { var b = -1.5708 + k * .62832, q = k % 2 ? r * .22 : r * .5; x.lineTo(cx + Math.cos(b) * q, cy + Math.sin(b) * q); }
    x.closePath(); x.fillStyle = "#fff"; x.fill();
    x.restore();
  }
  function notch(x, inset, r) {
    x.beginPath();
    x.moveTo(inset + r, inset); x.lineTo(W - inset - r, inset);
    x.arc(W - inset, inset, r, Math.PI, Math.PI / 2, true); x.lineTo(W - inset, H - inset - r);
    x.arc(W - inset, H - inset, r, -Math.PI / 2, Math.PI, true); x.lineTo(inset + r, H - inset);
    x.arc(inset, H - inset, r, 0, -Math.PI / 2, true); x.lineTo(inset, inset + r);
    x.arc(inset, inset, r, Math.PI / 2, 0, true); x.closePath();
  }
  function frameClassic(x, T) {
    x.save(); x.lineJoin = "miter";
    x.strokeStyle = T.accent; x.lineWidth = 16; x.strokeRect(60, 60, W - 120, H - 120);
    x.strokeStyle = T.accent2; x.lineWidth = 5; x.strokeRect(100, 100, W - 200, H - 200);
    x.strokeStyle = T.accent; x.lineWidth = 2; x.strokeRect(120, 120, W - 240, H - 240);
    [[0, 0, 1, 1], [W, 0, -1, 1], [0, H, 1, -1], [W, H, -1, -1]].forEach(function (c) {
      x.save(); x.translate(c[0], c[1]); x.scale(c[2], c[3]);
      x.fillStyle = T.accent; x.fillRect(46, 46, 140, 140);
      x.fillStyle = T.bg[0]; x.fillRect(58, 58, 116, 116);
      x.strokeStyle = T.accent2; x.lineWidth = 4; x.strokeRect(72, 72, 88, 88);
      diamond(x, 116, 116, 30, T.accent2); diamond(x, 116, 116, 12, T.accent);
      x.restore();
    });
    diamond(x, W / 2, 100, 20, T.accent2); diamond(x, W / 2, H - 100, 20, T.accent2);
    x.restore();
  }
  function frameElegant(x, T) {
    x.save();
    notch(x, 70, 70); x.fillStyle = "rgba(255,255,255,.6)"; x.fill();
    notch(x, 70, 70); x.lineWidth = 9; x.strokeStyle = T.accent; x.stroke();
    notch(x, 112, 46); x.lineWidth = 3; x.strokeStyle = T.accent2; x.stroke();
    [[70, 70], [W - 70, 70], [70, H - 70], [W - 70, H - 70]].forEach(function (p) { diamond(x, p[0], p[1], 16, T.accent2); });
    x.restore();
  }
  function frameModern(x, T, logo) {
    var bw = 340, bx = W - bw;
    x.save();
    x.fillStyle = T.accent; x.globalAlpha = T.dark ? .09 : .07;
    x.beginPath(); x.moveTo(0, 0); x.lineTo(520, 0); x.lineTo(0, 520); x.closePath(); x.fill();
    x.beginPath(); x.moveTo(0, H); x.lineTo(520, H); x.lineTo(0, H - 520); x.closePath(); x.fill();
    x.globalAlpha = 1;
    var g = x.createLinearGradient(bx, 0, W, H); g.addColorStop(0, T.band[0]); g.addColorStop(1, T.band[1]);
    x.fillStyle = g; x.fillRect(bx, 0, bw, H);
    x.fillStyle = T.dark ? T.accent : T.accent2; x.fillRect(bx - 18, 0, 18, H);
    x.globalAlpha = .1; x.fillStyle = T.dark ? "#0B1633" : "#fff";
    [[bx + 170, 1500, 300], [bx + 60, 1160, 200], [bx + 280, 900, 150]].forEach(function (c) { x.beginPath(); x.arc(c[0], c[1], c[2], 0, 6.2832); x.fill(); });
    x.globalAlpha = 1;
    var cx = bx + bw / 2;
    drawLogo(x, cx, 400, 140, T, logo);
    x.textAlign = "center"; x.direction = "rtl";
    text(x, "EduAssess Pro", cx, 640, "700 46px " + FF.body, T.dark ? "#2B1D00" : "#fff");
    x.globalAlpha = .55; x.fillStyle = T.dark ? "#2B1D00" : "#fff"; x.fillRect(cx - 70, 676, 140, 3); x.globalAlpha = 1;
    x.restore();
    return { l: 190, r: bx - 110 };
  }

  function draw(x, d, logo) {
    var T = theme(d.template);
    x.save(); x.direction = "rtl"; x.textAlign = "center"; x.textBaseline = "alphabetic";
    var bg = x.createLinearGradient(0, 0, W, H); bg.addColorStop(0, T.bg[0]); bg.addColorStop(1, T.bg[1]);
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    pattern(x, T);
    var area = { l: 190, r: W - 190 }, modern = T.layout === "modern";
    if (T.layout === "classic") frameClassic(x, T); else if (T.layout === "elegant") frameElegant(x, T); else area = frameModern(x, T, logo);
    x.direction = "rtl"; x.textAlign = "center";
    var cx = (area.l + area.r) / 2, maxW = area.r - area.l - 80, dy = modern ? -110 : 0;
    if (!modern) drawLogo(x, cx, 280, 118, T, logo);

    /* العنوان = نوع الشهادة */
    var title = d.cert_type || "شهادة تقدير";
    var tp = fit(x, title, 700, 176, 84, maxW * .92, FF.title);
    font(x, 700, tp, FF.title);
    var tw = Math.min(maxW, x.measureText(title).width), tg;
    if (T.dark) tg = T.accent; else { tg = x.createLinearGradient(cx - tw / 2, 0, cx + tw / 2, 0); tg.addColorStop(0, T.accent); tg.addColorStop(.5, T.accent2); tg.addColorStop(1, T.accent); }
    x.fillStyle = tg; x.fillText(title, cx, 575 + dy);
    text(x, "تُمنح هذه الشهادة إلى", cx, 690 + dy, "500 54px " + FF.body, T.muted);

    /* اسم الطالب */
    var nm = d.student_name || "اسم الطالب", np = fit(x, nm, 700, 196, 90, maxW, FF.name);
    text(x, nm, cx, 890 + dy, "700 " + np + "px " + FF.name, T.ink);
    flourish(x, cx, 950 + dy, Math.min(560, maxW / 2), T);

    /* سبب الحصول */
    text(x, "سبب منح الشهادة", cx, 1048 + dy, "700 40px " + FF.body, T.accent2);
    var reason = d.reason || "—", rp = 60, lines, lh;
    for (; rp >= 40; rp -= 2) { font(x, 500, rp, FF.body); lines = wrap(x, reason, maxW * .9); lh = rp * 1.45; if (lines.length * lh <= 240) break; }
    if (lines.length > 4) { lines = lines.slice(0, 4); lines[3] = lines[3].replace(/\s*\S*$/, "") + "…"; }
    font(x, 500, rp, FF.body); x.fillStyle = T.ink;
    lines.forEach(function (l, i) { x.fillText(l, cx, 1128 + dy + i * lh); });

    /* التذييل: التاريخ — الختم — التوقيع */
    var fy = 1470, sx = area.l + 300, dx = area.r - 300;
    seal(x, cx, 1420, 96, T);
    text(x, fmtDate(d.issue_date), dx, fy, "700 58px " + FF.body, T.ink);
    x.fillStyle = T.accent2; x.fillRect(dx - 240, fy + 24, 480, 4);
    text(x, "تاريخ التسليم", dx, fy + 78, "500 38px " + FF.body, T.muted);
    var sg = d.teacher_name || "اسم المعلم", sp = fit(x, sg, 700, 96, 48, 520, FF.sig);
    text(x, sg, sx, fy - 4, "700 " + sp + "px " + FF.sig, T.accent);
    x.fillStyle = T.accent2; x.fillRect(sx - 240, fy + 24, 480, 4);
    text(x, "توقيع المعلم", sx, fy + 78, "500 38px " + FF.body, T.muted);
    text(x, "رقم الشهادة: " + codeOf(d.id) + "  •  صادرة عبر EduAssess Pro", cx, 1612, "500 30px " + FF.body, T.muted);
    x.restore();
  }

  function render(cv, d, o) {
    o = o || {};
    var tok = cv._ct = (cv._ct || 0) + 1;
    return Promise.all([fonts(), loadImg(d && d.logo_data)]).then(function (r) {
      if (tok !== cv._ct) return;
      var w = o.width || 1200, h = Math.round(w * H / W);
      cv.width = w; cv.height = h;
      var x = cv.getContext("2d"); x.setTransform(w / W, 0, 0, h / H, 0, 0);
      draw(x, d || {}, r[1]);
    });
  }
  function lazy(cv, d, width) {
    if (!("IntersectionObserver" in window)) { render(cv, d, { width: width }); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); render(cv, d, { width: width }); } }); }, { rootMargin: "200px" });
    io.observe(cv);
  }

  /* ---------- التصدير ---------- */
  function canvasBlob(d, type, width, q) {
    var cv = document.createElement("canvas");
    return render(cv, d, { width: width }).then(function () {
      return new Promise(function (res) { cv.toBlob(function (b) { cv.width = cv.height = 1; res(b); }, type, q); });
    }).catch(function () { return null; });
  }
  function pdfFromJpeg(jpg, iw, ih) {
    var pw = 841.89, ph = 595.28, enc = new TextEncoder(), parts = [], off = 0, xr = [];
    function add(u) { parts.push(u); off += u.length; }
    function str(s) { add(enc.encode(s)); }
    function obj(n, body) { xr[n] = off; str(n + " 0 obj\n" + body + "\nendobj\n"); }
    add(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, 0x0A, 0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A]));
    obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
    obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    obj(3, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + pw + " " + ph + "] /Resources << /XObject << /Im0 4 0 R >> /ProcSet [/PDF /ImageC] >> /Contents 5 0 R >>");
    xr[4] = off; str("4 0 obj\n<< /Type /XObject /Subtype /Image /Width " + iw + " /Height " + ih + " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " + jpg.length + " >>\nstream\n");
    add(jpg); str("\nendstream\nendobj\n");
    var c = "q " + pw + " 0 0 " + ph + " 0 0 cm /Im0 Do Q";
    obj(5, "<< /Length " + c.length + " >>\nstream\n" + c + "\nendstream");
    var xo = off; str("xref\n0 6\n0000000000 65535 f \n");
    for (var i = 1; i <= 5; i++) str(("0000000000" + xr[i]).slice(-10) + " 00000 n \n");
    str("trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" + xo + "\n%%EOF");
    return new Blob(parts, { type: "application/pdf" });
  }
  function pngBlob(d) { return canvasBlob(d, "image/png", 3508).then(function (b) { return b || canvasBlob(d, "image/png", 2480); }); }
  function pdfBlob(d) {
    return canvasBlob(d, "image/jpeg", 2480, .95).then(function (b) {
      if (!b) throw new Error("export");
      return b.arrayBuffer().then(function (buf) { return pdfFromJpeg(new Uint8Array(buf), 2480, Math.round(2480 * H / W)); });
    });
  }
  function fileName(d, ext) {
    var n = String((d.cert_type || "شهادة") + "-" + (d.student_name || "")).replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, "-").slice(0, 60);
    return n + "." + ext;
  }
  function isNative() { try { return !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform()); } catch (e) { return false; } }
  function toast(m, t) { try { window.EduUI ? EduUI.toast(m, t || "ok") : alert(m); } catch (e) {} }
  function imageOverlay(blob) {
    var u = URL.createObjectURL(blob), o = document.createElement("div");
    o.className = "cg-ov cg-img";
    o.innerHTML = '<div class="cg-ib"><p>اضغط مطولًا على الصورة ثم اختر «حفظ الصورة»</p><img alt=""><button type="button" class="cg-b">إغلاق</button></div>';
    o.querySelector("img").src = u;
    o.onclick = function (e) { if (e.target === o || e.target.tagName === "BUTTON") { o.remove(); URL.revokeObjectURL(u); } };
    document.body.appendChild(o);
  }
  function deliver(blob, name, mime) {
    if (!blob) { toast("تعذر إنشاء الملف — جرّب مرة أخرى", "err"); return Promise.resolve(); }
    var native = isNative();
    if (native && navigator.canShare) {
      try {
        var f = new File([blob], name, { type: mime });
        if (navigator.canShare({ files: [f] })) return navigator.share({ files: [f], title: name }).catch(function () {});
      } catch (e) {}
    }
    if (native) {
      if (mime === "image/png") { imageOverlay(blob); return Promise.resolve(); }
      toast("تنزيل PDF غير متاح داخل التطبيق على هذا الجهاز — نزّل الصورة بدلًا منه", "warn"); return Promise.resolve();
    }
    var u = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = u; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { a.remove(); URL.revokeObjectURL(u); }, 5000);
    return Promise.resolve();
  }
  function downloadPng(d) { toast("جارٍ تجهيز الصورة…", "info"); return pngBlob(d).then(function (b) { return deliver(b, fileName(d, "png"), "image/png"); }); }
  function downloadPdf(d) { toast("جارٍ تجهيز ملف PDF…", "info"); return pdfBlob(d).then(function (b) { return deliver(b, fileName(d, "pdf"), "application/pdf"); }).catch(function () { toast("تعذر إنشاء ملف PDF", "err"); }); }
  function share(d) {
    return pngBlob(d).then(function (b) {
      var f = new File([b], fileName(d, "png"), { type: "image/png" });
      return navigator.share({ files: [f], title: d.cert_type || "شهادة" });
    }).catch(function () {});
  }
  function canShareFiles() { try { return !!(navigator.canShare && navigator.canShare({ files: [new File([new Blob(["x"])], "a.png", { type: "image/png" })] })); } catch (e) { return false; } }

  /* ---------- تجهيز الشعار المرفوع ---------- */
  function fitLogo(file) {
    return new Promise(function (res, rej) {
      if (!file || !/^image\//.test(file.type)) return rej(new Error("type"));
      var fr = new FileReader();
      fr.onerror = function () { rej(new Error("read")); };
      fr.onload = function () {
        var im = new Image();
        im.onerror = function () { rej(new Error("img")); };
        im.onload = function () {
          var png = file.type === "image/png" || file.type === "image/webp" || file.type === "image/gif" || file.type === "image/svg+xml";
          var max = 440, out = "";
          for (var k = 0; k < 4; k++) {
            var s = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement("canvas");
            c.width = Math.max(1, Math.round(im.width * s)); c.height = Math.max(1, Math.round(im.height * s));
            var g = c.getContext("2d"); if (!png) { g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); }
            g.drawImage(im, 0, 0, c.width, c.height);
            out = png && k < 2 ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", .86);
            if (out.length < 260000) break; max = Math.round(max * .75);
          }
          out.length < 300000 ? res(out) : rej(new Error("big"));
        };
        im.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  /* ---------- عارض الشهادة ---------- */
  function view(d, opt) {
    opt = opt || {};
    var old = document.querySelector(".cg-ov.cg-view"); if (old) old.remove();
    var o = document.createElement("div"); o.className = "cg-ov cg-view";
    o.innerHTML = '<div class="cg-vb" role="dialog" aria-modal="true"><div class="cg-vt"><div class="cg-vh"><b></b><small></small></div><button type="button" class="cg-x" aria-label="إغلاق">✕</button></div>' +
      '<div class="cg-vs"><canvas></canvas></div><div class="cg-va"></div><p class="cg-vp">للحصول على أفضل عرض أدر هاتفك بالوضع الأفقي، أو اضغط «تكبير».</p></div>';
    o.querySelector("b").textContent = d.cert_type || "شهادة";
    o.querySelector("small").textContent = (d.student_name || "") + " · " + fmtDate(d.issue_date);
    var cv = o.querySelector("canvas"), sc = o.querySelector(".cg-vs"), acts = o.querySelector(".cg-va"), big = false;
    function btn(label, fn, cls) { var b = document.createElement("button"); b.type = "button"; b.className = "cg-b " + (cls || ""); b.textContent = label; b.onclick = function () { fn(b); }; acts.appendChild(b); return b; }
    btn("تنزيل صورة PNG", function () { downloadPng(d); }, "go");
    btn("تنزيل PDF", function () { downloadPdf(d); });
    if (canShareFiles()) btn("مشاركة", function () { share(d); });
    btn("تكبير", function (b) { big = !big; cv.style.width = big ? "230%" : "100%"; b.textContent = big ? "تصغير" : "تكبير"; });
    (opt.actions || []).forEach(function (a) { btn(a.label, function () { a.fn(d, close); }, a.cls); });
    function close() { document.removeEventListener("keydown", key); o.remove(); document.documentElement.style.overflow = ""; }
    function key(e) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", key);
    o.querySelector(".cg-x").onclick = close;
    o.onclick = function (e) { if (e.target === o) close(); };
    document.documentElement.style.overflow = "hidden";
    document.body.appendChild(o);
    render(cv, d, { width: Math.min(2000, Math.round(Math.min(window.innerWidth, 1200) * (window.devicePixelRatio || 1) * 1.2)) });
    return { close: close };
  }

  /* ---------- التنسيق المشترك ---------- */
  (function css() {
    var s = document.createElement("style");
    s.textContent = [
      ".cg-ov{position:fixed;inset:0;z-index:100002;background:rgba(8,18,48,.72);backdrop-filter:blur(6px);display:grid;place-items:center;padding:14px;direction:rtl;font-family:'IBM Plex Sans Arabic',Tahoma,sans-serif;animation:cgf .2s ease both}",
      "@keyframes cgf{from{opacity:0}}",
      ".cg-vb{width:min(100%,1180px);max-height:100%;display:flex;flex-direction:column;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 40px 90px rgba(0,0,0,.45)}",
      ".cg-vt{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 16px;background:linear-gradient(135deg,#0A2260,#123C9C);color:#fff;border-bottom:3px solid #FFB400}",
      ".cg-vh b{display:block;font-size:16px}.cg-vh small{opacity:.8;font-size:12.5px}",
      ".cg-x{border:0;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.16);color:#fff;font-size:16px;cursor:pointer}",
      ".cg-vs{overflow:auto;background:#EEF2FB;padding:12px;flex:1;min-height:0}.cg-vs canvas{display:block;width:100%;height:auto;border-radius:10px;box-shadow:0 10px 30px rgba(10,34,96,.2);background:#fff}",
      ".cg-va{display:flex;flex-wrap:wrap;gap:8px;padding:12px 14px;border-top:1px solid #E1E8F6}",
      ".cg-b{border:1.5px solid #E1E8F6;background:#fff;color:#0B1633;border-radius:14px;min-height:44px;padding:0 16px;font:700 14px 'IBM Plex Sans Arabic',Tahoma,sans-serif;cursor:pointer;flex:1;white-space:nowrap}",
      ".cg-b.go{background:linear-gradient(180deg,#FFD15C,#FFB400);border-color:transparent;color:#2b2007}.cg-b.bad{color:#D6453D;border-color:#F1C4BE}",
      ".cg-vp{display:none;margin:0;padding:0 14px 12px;font-size:12px;color:#55627F;text-align:center}",
      "@media(max-width:720px) and (orientation:portrait){.cg-vp{display:block}.cg-vb{border-radius:20px}}",
      ".cg-img .cg-ib{background:#fff;border-radius:20px;padding:16px;max-width:560px;text-align:center}.cg-img img{width:100%;border-radius:10px;margin:8px 0 12px}.cg-img p{margin:0;font-size:13px;color:#55627F}",
      /* بطاقات القوائم */
      ".cg-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:14px;margin-top:14px}",
      ".cg-card{position:relative;background:#fff;border:1.5px solid rgba(228,220,200,.9);border-radius:22px;overflow:hidden;box-shadow:0 10px 30px rgba(10,34,96,.07);display:flex;flex-direction:column;transition:transform .2s,box-shadow .2s}",
      ".cg-card:hover{transform:translateY(-3px);box-shadow:0 18px 44px rgba(10,34,96,.14)}",
      ".cg-card.new{border-color:#FFB400}.cg-card.new:after{content:'جديدة';position:absolute;top:12px;left:12px;background:#FFB400;color:#3a2b05;font:800 11px 'IBM Plex Sans Arabic',sans-serif;padding:2px 11px;border-radius:20px}",
      ".cg-th{display:block;width:100%;height:auto;aspect-ratio:2480/1754;background:#EEF2FB;cursor:pointer}",
      ".cg-ci{padding:12px 14px 4px;line-height:1.6}.cg-ci b{display:block;font-size:15.5px;color:#0B1633}.cg-ci span{display:block;font-size:13.5px;color:#0A2260;font-weight:700}.cg-ci small{display:block;font-size:12px;color:#55627F}",
      ".cg-ca{display:flex;flex-wrap:wrap;gap:6px;padding:8px 12px 14px}.cg-ca button{flex:1;min-width:64px;border:1.5px solid #E1E8F6;background:#fff;border-radius:12px;min-height:38px;font:700 12.5px 'IBM Plex Sans Arabic',sans-serif;color:#0B1633;cursor:pointer}",
      ".cg-ca button.p{background:linear-gradient(180deg,#FFD15C,#FFB400);border-color:transparent;color:#2b2007}.cg-ca button.d{color:#D6453D;border-color:#F1C4BE}",
      ".cg-empty{grid-column:1/-1;text-align:center;color:#55627F;padding:26px 12px;line-height:1.9}"
    ].join("\n");
    document.head.appendChild(s);
  })();

  window.EduCert = { W: W, H: H, THEMES: THEMES, TYPES: TYPES, theme: theme, render: render, lazy: lazy, codeOf: codeOf, fmtDate: fmtDate,
    downloadPng: downloadPng, downloadPdf: downloadPdf, share: share, canShareFiles: canShareFiles, view: view, fitLogo: fitLogo, pdfFromJpeg: pdfFromJpeg, fonts: fonts };
})();
