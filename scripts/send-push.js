// يرسل الإشعارات المنتظرة في push_outbox: Web Push + أندرويد FCM (يعمل والتطبيق مغلق) — داخل GitHub Actions
const webpush = require("web-push");
let admin = null;
try { admin = require("firebase-admin"); } catch (e) { console.warn("تنبيه: حزمة firebase-admin غير مثبّتة — سيعمل Web Push فقط ولن تصل إشعارات أندرويد. أضفها في خطوة npm install داخل send-push.yml"); }
const { createClient } = require("@supabase/supabase-js");

const { SUPABASE_URL, SUPABASE_SERVICE_KEY, VAPID_PUBLIC, VAPID_PRIVATE, FIREBASE_SERVICE_ACCOUNT } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) { console.error("ناقص: SUPABASE_URL / SUPABASE_SERVICE_KEY"); process.exit(1); }
if (VAPID_PUBLIC && VAPID_PRIVATE) webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", VAPID_PUBLIC, VAPID_PRIVATE);
let fcm = null;
if (admin && FIREBASE_SERVICE_ACCOUNT) {
  try { admin.initializeApp({ credential: admin.credential.cert(JSON.parse(FIREBASE_SERVICE_ACCOUNT)) }); fcm = admin.messaging(); }
  catch (e) { console.error("خطأ: FIREBASE_SERVICE_ACCOUNT غير صالح (يجب أن يكون ملف JSON كاملًا):", e.message); }
} else if (!FIREBASE_SERVICE_ACCOUNT) console.warn("تنبيه: FIREBASE_SERVICE_ACCOUNT غير موجود — لن تصل إشعارات أندرويد");
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

/* نصوص الإشعارات بلغة كل مستخدم (ar/en/fr) */
const T = {
  message:    { t: { ar: "رسالة جديدة من {n}", en: "New message from {n}", fr: "Nouveau message de {n}" } },
  exam_new:   { t: { ar: "اختبار جديد من {n}", en: "New exam from {n}", fr: "Nouvel examen de {n}" }, b: { ar: "{e}", en: "{e}", fr: "{e}" } },
  exam_enter: { t: { ar: "طالب دخل اختبارك", en: "A student entered your exam", fr: "Un élève est entré dans votre examen" }, b: { ar: "{n} — {e}", en: "{n} — {e}", fr: "{n} — {e}" } },
  exam_done:  { t: { ar: "طالب أنهى اختبارك", en: "A student finished your exam", fr: "Un élève a terminé votre examen" }, b: { ar: "{n} — {e}", en: "{n} — {e}", fr: "{n} — {e}" } },
  sub_new:    { t: { ar: "مشترك جديد", en: "New subscriber", fr: "Nouvel abonné" }, b: { ar: "اشترك {n} معك", en: "{n} subscribed to you", fr: "{n} s'est abonné à vous" } }
};
const fill = (s, m) => s.replace(/\{(\w+)\}/g, (_, k) => (m && m[k]) || "");
function localize(it, lang) {
  const k = T[it.kind]; if (!k || !["en", "fr"].includes(lang)) return { title: it.title, body: it.body || "" };
  const m = it.meta || {};
  return { title: fill(k.t[lang], m), body: k.b ? fill(k.b[lang], m) : (it.body || "") };
}

const users = {};
async function userInfo(id) {
  if (users[id]) return users[id];
  let md = {};
  try { const r = await sb.auth.admin.getUserById(id); md = (r.data && r.data.user && r.data.user.user_metadata) || {}; } catch (e) {}
  return (users[id] = { lang: md.lang || "ar", prefs: md["notif_prefs_" + (md.role === "teacher" ? "teacher" : "student")] || {} });
}

(async () => {
  const { data: items, error } = await sb.from("push_outbox").select("*").is("sent_at", null).lt("attempts", 5).order("created_at").limit(300);
  if (error) throw error;
  if (!items.length) console.log("لا توجد إشعارات منتظرة");
  else {
    const ids = [...new Set(items.map(i => i.user_id))], subsBy = {};
    for (let i = 0; i < ids.length; i += 100) {
      const { data, error: e2 } = await sb.from("push_subscriptions").select("endpoint,p256dh,auth,user_id").in("user_id", ids.slice(i, i + 100));
      if (e2) throw e2;
      (data || []).forEach(s => (subsBy[s.user_id] = subsBy[s.user_id] || []).push(s));
    }
    let sent = 0, failed = 0, dead = 0, muted = 0, nosubs = 0;
    for (const it of items) {
      const u = await userInfo(it.user_id);
      if (it.kind && u.prefs[it.kind] === false) { muted++; await sb.from("push_outbox").update({ sent_at: new Date().toISOString() }).eq("id", it.id); continue; }
      const txt = localize(it, u.lang), subs = subsBy[it.user_id] || [];
      let ok = 0, transient = 0;
      for (const s of subs) {
        try {
          if (s.endpoint.startsWith("fcm:")) {
            if (!fcm) { transient++; continue; }
            const an = { channelId: "edu", sound: "default" }; if (it.tag) an.tag = it.tag;
            await fcm.send({ token: s.endpoint.slice(4), notification: { title: txt.title, body: txt.body }, data: { url: String(it.url || "./"), kind: String(it.kind || "") },
              android: { priority: "high", ttl: 86400000, notification: an } });
          } else {
            const payload = JSON.stringify({ title: txt.title, body: txt.body, url: it.url || "./", kind: it.kind || undefined, tag: it.tag || undefined, starts_at: it.starts_at || undefined, lang: u.lang });
            await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400, urgency: "high" });
          }
          ok++;
        } catch (e) {
          const gone = e.statusCode === 404 || e.statusCode === 410 || (e.code && /registration-token-not-registered|invalid-registration-token/.test(e.code));
          if (gone) { dead++; await sb.from("push_subscriptions").delete().eq("endpoint", s.endpoint); }
          else { transient++; console.warn("فشل مؤقت:", e.statusCode || e.code, (e.body || e.message || "").toString().slice(0, 120)); }
        }
      }
      if (!subs.length) { nosubs++; await sb.from("push_outbox").update({ attempts: it.attempts + 1 }).eq("id", it.id); continue; } /* لا جهاز مسجّل بعد: نُعيد المحاولة بدل إهدار الإشعار */
      if (ok || !transient) { sent += ok; await sb.from("push_outbox").update({ sent_at: new Date().toISOString() }).eq("id", it.id); }
      else { failed++; await sb.from("push_outbox").update({ attempts: it.attempts + 1 }).eq("id", it.id); }
    }
    console.log(`تم: ${sent} إشعار، موقوف بتفضيلات المستخدم: ${muted}، بلا جهاز مسجّل: ${nosubs}، فشل مؤقت: ${failed}، اشتراكات منتهية حُذفت: ${dead}`);
  }
  await sb.from("push_outbox").delete().lt("created_at", new Date(Date.now() - 7 * 864e5).toISOString());
})().catch(e => { console.error(e); process.exit(1); });
