/* =====================================================================
   Edu — الإعلانات
   - المعلم: ينشئ إعلانًا (30 ج.م لليوم) يحدد أيامه وساعة ظهوره، ويُخصم من محفظته.
   - الأدمن يراجعه، وبعد الموافقة يظهر لكل الطلاب من حساب «Edu» الرسمي.
   - الطالب: يظهر له الإعلان مرة واحدة يوميًا بعد حلول ساعته.
   ===================================================================== */
(function () {
  "use strict";
  var C = window.EduCore;
  if (!C) return;
  var esc = C.esc, IC = C.IC, money = C.money;
  var PRICE_DAY = 30;
  var MEGA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1z"/><path d="M16 8a5 5 0 0 1 0 8M19 5a9 9 0 0 1 0 14"/></svg>';
  var VERIFIED = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#1F63E0" d="M12 1.8l2.4 1.7 2.9-.2 1 2.8 2.4 1.7-.6 2.9 1 2.7-2.2 2 -.4 2.9-2.9.7-1.8 2.3-2.7-1.2-2.7 1.2-1.8-2.3-2.9-.7-.4-2.9-2.2-2 1-2.7-.6-2.9 2.4-1.7 1-2.8 2.9.2z"/><path d="M8.2 12.2l2.5 2.5 5-5.2" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function sb() { return C.sb(); }
  function hourLabel(h) { var p = h >= 12 ? "م" : "ص", x = h % 12 || 12; return x + ":00 " + p; }
  function dateLabel(d) { return new Date(d + "T00:00:00").toLocaleDateString("ar-EG-u-nu-latn", { day: "numeric", month: "short" }); }
  function todayISO() { var n = new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Cairo" })); return n.getFullYear() + "-" + String(n.getMonth() + 1).padStart(2, "0") + "-" + String(n.getDate()).padStart(2, "0"); }
  var ST = { pending: ["بانتظار الموافقة", "pending"], approved: ["معتمد", "done"], rejected: ["مرفوض", "rejected"], cancelled: ["ملغى", "rejected"] };

  /* ============================ صفحة المعلم ============================ */
  var host = null;
  async function render() {
    if (!host) return;
    var rows = [], err = false;
    try { var r = await sb().from("edu_ads").select("*").order("created_at", { ascending: false }).limit(50); if (r.error) err = true; else rows = r.data || []; } catch (e) { err = true; }
    host.innerHTML = '<div class="ew">' +
      '<div class="ew-head"><i>' + MEGA + '</i><div class="ew-grow"><h2>الإعلانات</h2><p>أرسل رسالة لكل الطلاب من حساب Edu الرسمي</p></div>' +
      '<button type="button" class="ew-btn gold sm" id="ad-new" style="width:auto;padding:11px 14px;font-size:14px">' + IC.plus + ' إعلان جديد</button></div>' +
      '<div class="w-note">' + IC.info + '<span>سعر اليوم الواحد ' + PRICE_DAY + ' ج.م يُخصم من محفظتك. تظهر الرسالة لجميع الطلاب في الساعة التي تحددها بعد مراجعتها.</span></div>' +
      (err ? '<div class="w-note">' + IC.info + '<span>الإعلانات غير مفعّلة بعد في قاعدة البيانات (شغّل ملف admin-ads.sql).</span></div>' : '') +
      '<div class="ew-card"><h3>إعلاناتي</h3>' + (rows.length ? rows.map(row).join("") : '<div class="ew-empty">' + MEGA + 'لم ترسل أي إعلان بعد</div>') + '</div></div>';
    host.querySelector("#ad-new").onclick = form;
    host.querySelectorAll("[data-cancel]").forEach(function (b) {
      b.onclick = async function () {
        if (!(await EduUI.confirm("سيُسترد المبلغ إلى محفظتك.", { title: "إلغاء الإعلان؟", ok: "إلغاء الإعلان", cancel: "رجوع", danger: true }))) return;
        var r = await sb().rpc("edu_cancel_ad", { p_ad: b.dataset.cancel });
        C.toast(r.error ? "تعذر الإلغاء" : "تم الإلغاء واسترداد المبلغ", r.error ? "err" : "ok");
        try { EduWallet.refresh(); } catch (e) {} render();
      };
    });
  }
  function row(a) {
    var st = ST[a.status] || ["—", "pending"];
    return '<div class="w-tx buy" style="align-items:flex-start"><i>' + MEGA + '</i><div class="t"><b>' + esc(a.title || "إعلان") + '</b>' +
      '<small style="display:block;white-space:normal;line-height:1.7">' + esc(a.body) + '</small>' +
      '<small>' + dateLabel(a.start_date) + " • " + a.days + " يوم • الساعة " + hourLabel(a.show_hour) + '</small> <span class="w-st ' + st[1] + '">' + st[0] + '</span>' +
      (a.note ? '<small style="display:block;color:#C2410C">' + esc(a.note) + '</small>' : '') +
      (a.status === "pending" ? '<div style="margin-top:8px"><button type="button" class="ew-btn ghost sm" data-cancel="' + esc(a.id) + '" style="width:auto;padding:7px 14px;font-size:13px">إلغاء واسترداد</button></div>' : '') +
      '</div><div class="a">' + money(a.price) + ' ج.م</div></div>';
  }
  function form() {
    var hours = ""; for (var h = 0; h < 24; h++) hours += '<option value="' + h + '"' + (h === 18 ? " selected" : "") + ">" + hourLabel(h) + "</option>";
    C.sheet(
      '<h3>إعلان جديد</h3><p class="sub">يصل لكل الطلاب من حساب <b>Edu</b> الرسمي</p>' +
      '<label>عنوان قصير (اختياري)</label><input type="text" id="ad-t" maxlength="60" placeholder="مثال: خصم على كورس الفيزياء">' +
      '<label>نص الرسالة</label><textarea id="ad-b" maxlength="400" placeholder="اكتب رسالتك للطلاب…"></textarea>' +
      '<label>تاريخ البدء</label><input type="date" id="ad-d" min="' + todayISO() + '" value="' + todayISO() + '">' +
      '<label>عدد الأيام</label><input type="number" id="ad-n" min="1" max="30" value="1" inputmode="numeric">' +
      '<label>ساعة ظهور الرسالة للطلاب</label><select id="ad-h">' + hours + '</select>' +
      '<div class="ew-sum" style="margin-top:14px"><div><span>التكلفة</span><b id="ad-p">' + PRICE_DAY + ' ج.م</b></div></div>' +
      '<p class="ew-err" id="ad-e"></p><button type="button" class="ew-btn gold" id="ad-go">إرسال للمراجعة</button>',
      function (api) {
        if (api.el.dataset.init) return; api.el.dataset.init = 1;
        var q = function (s) { return api.el.querySelector(s); };
        q("#ad-n").oninput = function () { var n = Math.max(1, Math.min(30, Number(q("#ad-n").value) || 1)); q("#ad-p").textContent = n * PRICE_DAY + " ج.م"; };
        q("#ad-go").onclick = async function () {
          var body = q("#ad-b").value.trim(), days = Math.round(Number(q("#ad-n").value) || 0), d = q("#ad-d").value, e = q("#ad-e");
          if (body.length < 5) return (e.textContent = "اكتب نص الرسالة (5 أحرف على الأقل)");
          if (!d || d < todayISO()) return (e.textContent = "اختر تاريخًا صحيحًا");
          if (days < 1 || days > 30) return (e.textContent = "عدد الأيام من 1 إلى 30");
          var bal = 0; try { bal = Number(await EduWallet.balance()) || 0; } catch (x) {}
          if (bal < days * PRICE_DAY) return (e.textContent = "رصيدك " + money(bal) + " ج.م والتكلفة " + days * PRICE_DAY + " ج.م — اشحن محفظتك أولًا");
          var btn = q("#ad-go"); btn.disabled = true;
          var r = await sb().rpc("edu_create_ad", { p_title: q("#ad-t").value, p_body: body, p_start: d, p_days: days, p_hour: Number(q("#ad-h").value) });
          btn.disabled = false;
          if (r.error) return (e.textContent = /insufficient/i.test(r.error.message) ? "الرصيد غير كافٍ" : /function|schema cache/i.test(r.error.message) ? "الإعلانات غير مفعّلة بعد في قاعدة البيانات" : "تعذر إرسال الإعلان");
          api.close(); C.toast("تم إرسال إعلانك للمراجعة", "ok"); try { EduWallet.refresh(); } catch (x) {} render();
        };
      }
    );
  }

  /* ============================ جهة الطالب ============================ */
  function seenKey(id) { return "edu_ad_" + id + "_" + todayISO(); }
  function show(ad) {
    var ov = document.createElement("div"); ov.className = "eu-ov"; ov.style.zIndex = 2147482000;
    ov.innerHTML = '<div class="eu-dlg" role="dialog" aria-modal="true" style="text-align:right">' +
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px"><img src="assets/icon-192.png" alt="" width="42" height="42" style="border-radius:14px;flex:none">' +
      '<div style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:5px;font-weight:800;color:#0B1633;font-size:16px">Edu <span style="width:18px;height:18px;display:inline-flex">' + VERIFIED + '</span></div>' +
      '<small style="color:#55627F;font-size:12px">حساب رسمي</small></div></div>' +
      (ad.title ? '<h3 style="font-size:17px;margin:0 0 6px"></h3>' : "") + '<div class="eu-dm"><p style="white-space:pre-line"></p></div>' +
      '<div class="eu-da"><button type="button" class="eu-b go" data-close>حسنًا</button></div></div>';
    if (ad.title) ov.querySelector("h3").textContent = ad.title;
    ov.querySelector("p").textContent = ad.body;
    function close() { ov.classList.remove("in"); setTimeout(function () { ov.remove(); }, 220); }
    ov.onclick = function (e) { if (e.target === ov || (e.target.closest && e.target.closest("[data-close]"))) close(); };
    document.body.appendChild(ov); requestAnimationFrame(function () { ov.classList.add("in"); });
  }
  async function check() {
    try {
      var r = await sb().rpc("edu_active_ads");
      if (r.error || !r.data) return;
      var list = r.data.filter(function (a) { return !C.LS.get(seenKey(a.id)); });
      if (!list.length) return;
      var a = list[0]; C.LS.set(seenKey(a.id), "1"); show(a);
    } catch (e) {}
  }

  window.EduAds = {
    mountTeacher: function (el) { host = el; return render(); },
    check: check
  };
})();
