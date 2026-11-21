package com.eduassess.app;

import android.app.Activity;
import android.app.ActivityManager;
import android.content.Context;
import android.os.Build;
import android.view.View;
import android.view.WindowManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/* قفل الاختبار: تثبيت الشاشة + منع لقطات الشاشة + إبقاء الشاشة مضاءة + رصد أي خروج من التطبيق */
@CapacitorPlugin(name = "ExamLock")
public class ExamLockPlugin extends Plugin {
    static volatile boolean locked = false;
    static ExamLockPlugin instance;
    private static long graceUntil = 0;
    private static long leftAt = 0;
    private static int leaves = 0;
    private static long awayMs = 0;

    @Override
    public void load() { instance = this; }

    private static boolean isPinned(Activity a) {
        try {
            ActivityManager am = (ActivityManager) a.getSystemService(Context.ACTIVITY_SERVICE);
            return Build.VERSION.SDK_INT >= 23 && am.getLockTaskModeState() != ActivityManager.LOCK_TASK_MODE_NONE;
        } catch (Throwable t) { return false; }
    }

    static void immersive(Activity a) {
        try {
            a.getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
        } catch (Throwable t) { }
    }

    @PluginMethod
    public void enable(final PluginCall call) {
        final Activity a = getActivity();
        a.runOnUiThread(new Runnable() {
            public void run() {
                locked = true; leaves = 0; awayMs = 0; leftAt = 0;
                /* نافذة سماح: نافذة "تثبيت الشاشة" نفسها تسحب التركيز لحظيًا */
                graceUntil = System.currentTimeMillis() + 10000;
                a.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                immersive(a);
                try { a.startLockTask(); } catch (Throwable t) { }
                JSObject r = new JSObject();
                r.put("pinned", isPinned(a));
                call.resolve(r);
            }
        });
    }

    @PluginMethod
    public void disable(final PluginCall call) {
        final Activity a = getActivity();
        a.runOnUiThread(new Runnable() {
            public void run() {
                locked = false;
                try { a.stopLockTask(); } catch (Throwable t) { }
                a.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                try { a.getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE); } catch (Throwable t) { }
                call.resolve();
            }
        });
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject r = new JSObject();
        r.put("locked", locked);
        r.put("pinned", isPinned(getActivity()));
        r.put("leaves", leaves);
        r.put("awayMs", awayMs);
        call.resolve(r);
    }

    /* تستدعيها MainActivity عند تغيّر تركيز النافذة */
    static void focusChanged(Activity a, boolean hasFocus) {
        if (!locked) return;
        long now = System.currentTimeMillis();
        if (hasFocus) {
            immersive(a);
            if (leftAt > 0) {
                long away = now - leftAt; leftAt = 0; awayMs += away;
                if (instance != null) {
                    JSObject d = new JSObject();
                    d.put("type", "return"); d.put("leaves", leaves); d.put("awayMs", away);
                    instance.notifyListeners("examLock", d, true);
                }
            }
        } else if (now > graceUntil && leftAt == 0) {
            leftAt = now; leaves++;
            if (instance != null) {
                JSObject d = new JSObject();
                d.put("type", "leave"); d.put("leaves", leaves);
                instance.notifyListeners("examLock", d, true);
            }
        }
    }
}
