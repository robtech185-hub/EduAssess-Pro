// يرسل الإشعارات المنتظرة في push_outbox إلى أجهزة المستخدمين (Web Push) — يعمل داخل GitHub Actions
const webpush = require("web-push");
const { createClient } = require("@supabase/supabase-js");

const { SUPABASE_URL, SUPABASE_SERVICE_KEY, VAPID_PUBLIC, VAPID_PRIVATE } = process.env;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@example.com";
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !VAPID_PUBLIC || !VAPID_PRIVATE) {
  console.error("ناقص: SUPABASE_URL / SUPABASE_SERVICE_KEY / VAPID_PUBLIC / VAPID_PRIVATE في GitHub Secrets");
  process.exit(1);
}
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

(async () => {
  const { data: items, error } = await sb.from("push_outbox").select("*")
    .is("sent_at", null).lt("attempts", 5).order("created_at").limit(300);
  if (error) throw error;
  if (!items.length) { console.log("لا توجد إشعارات منتظرة"); }
  else {
    const userIds = [...new Set(items.map(i => i.user_id))];
    const subsBy = {};
    for (let i = 0; i < userIds.length; i += 100) {
      const { data, error: e2 } = await sb.from("push_subscriptions")
        .select("endpoint,p256dh,auth,user_id").in("user_id", userIds.slice(i, i + 100));
      if (e2) throw e2;
      (data || []).forEach(s => (subsBy[s.user_id] = subsBy[s.user_id] || []).push(s));
    }
    let sent = 0, failed = 0, dead = 0;
    for (const it of items) {
      const subs = subsBy[it.user_id] || [];
      const payload = JSON.stringify({ title: it.title, body: it.body || "", url: it.url || "./", tag: it.tag || undefined, starts_at: it.starts_at || undefined });
      let ok = 0, transient = 0;
      for (const s of subs) {
        try {
          // TTL يوم كامل: يصل الإشعار حين يعود الجهاز للاتصال حتى لو كان مغلقًا أو بلا إنترنت وقت الإرسال
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400, urgency: "high" });
          ok++;
        } catch (e) {
          if (e.statusCode === 404 || e.statusCode === 410) { dead++; await sb.from("push_subscriptions").delete().eq("endpoint", s.endpoint); }
          else { transient++; console.warn("فشل مؤقت:", e.statusCode, (e.body || e.message || "").toString().slice(0, 120)); }
        }
      }
      if (ok || !transient) { sent += ok; await sb.from("push_outbox").update({ sent_at: new Date().toISOString() }).eq("id", it.id); }
      else { failed++; await sb.from("push_outbox").update({ attempts: it.attempts + 1 }).eq("id", it.id); }
    }
    console.log(`تم: ${sent} إشعار، فشل مؤقت: ${failed}، اشتراكات منتهية حُذفت: ${dead}`);
  }
  await sb.from("push_outbox").delete().lt("created_at", new Date(Date.now() - 7 * 864e5).toISOString());
})().catch(e => { console.error(e); process.exit(1); });
