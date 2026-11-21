package com.eduassess.app;

import android.os.Bundle;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ExamLockPlugin.class);
        super.onCreate(savedInstanceState);
        /* زر الرجوع لا يعمل أثناء الاختبار (يُسجَّل بعد callback كاباسيتور فيُنفَّذ أولًا) */
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (ExamLockPlugin.locked) return;
                setEnabled(false);
                getOnBackPressedDispatcher().onBackPressed();
                setEnabled(true);
            }
        });
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        ExamLockPlugin.focusChanged(this, hasFocus);
    }
}
