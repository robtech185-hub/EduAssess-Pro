-- شغّل هذا الملف مرة واحدة في Supabase ← SQL Editor
-- قبل التشغيل: غيّر القيمتين في الأعلى (رابط المشروع + كلمة سر الإرسال)
create extension if not exists pg_net;

create table if not exists public.edu_push_subs (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  ua text,
  created_at timestamptz default now()
);
alter table public.edu_push_subs enable row level security;   -- لا سياسات: الوصول عبر الدوال فقط

drop function if exists public.save_push_subscription(text,text,text,text);
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_ua text default null)
returns void language sql security definer set search_path=public as $$
  insert into edu_push_subs(user_id,endpoint,p256dh,auth,ua) values (auth.uid(),p_endpoint,p_p256dh,p_auth,p_ua)
  on conflict (endpoint) do update set user_id=auth.uid(), p256dh=excluded.p256dh, auth=excluded.auth, ua=excluded.ua;
$$;

drop function if exists public.remove_push_subscription(text);
create or replace function public.remove_push_subscription(p_endpoint text)
returns void language sql security definer set search_path=public as $$
  delete from edu_push_subs where endpoint=p_endpoint and user_id=auth.uid();
$$;
grant execute on function public.save_push_subscription(text,text,text,text), public.remove_push_subscription(text) to authenticated;

create or replace function public.edu_push_fire() returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform net.http_post(
    url := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/send-push',          -- ← غيّرها
    headers := jsonb_build_object('Content-Type','application/json','x-push-secret','CHANGE_ME_SECRET'), -- ← غيّرها
    body := jsonb_build_object('table', tg_table_name, 'record', to_jsonb(new))
  );
  return new;
end $$;

drop trigger if exists edu_push_sn on public.student_notifications;
create trigger edu_push_sn after insert on public.student_notifications for each row execute function public.edu_push_fire();
drop trigger if exists edu_push_msg on public.edu_messages;
create trigger edu_push_msg after insert on public.edu_messages for each row execute function public.edu_push_fire();

-- إشعارات المعلم: دخول الطالب للاختبار، إنهاؤه، واشتراك طالب جديد
drop trigger if exists edu_push_enter on public.exam_students;
create trigger edu_push_enter after insert on public.exam_students for each row execute function public.edu_push_fire();
drop trigger if exists edu_push_done on public.exam_students;
create trigger edu_push_done after update on public.exam_students for each row
  when (old.finished_at is null and new.finished_at is not null) execute function public.edu_push_fire();
drop trigger if exists edu_push_newsub on public.student_teacher_subscriptions;
create trigger edu_push_newsub after insert on public.student_teacher_subscriptions for each row execute function public.edu_push_fire();
