const fs = require('fs');
const path = require('path');

const androidDir = path.join(
  __dirname, '..', 'node_modules', '@maniac-tech',
  'react-native-expo-read-sms', 'android'
);

if (fs.existsSync(androidDir) === false) {
  console.log('[patch-sms] library not installed, skipping');
  process.exit(0);
}

function writeFile(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}

const buildGradle = `apply plugin: 'com.android.library'

def safeExtGet(prop, fallback) {
  rootProject.ext.has(prop) ? rootProject.ext.get(prop) : fallback
}

android {
  namespace "com.reactlibrary"
  compileSdkVersion safeExtGet('compileSdkVersion', 34)

  defaultConfig {
    minSdkVersion safeExtGet('minSdkVersion', 21)
    targetSdkVersion safeExtGet('targetSdkVersion', 34)
  }

  lintOptions { abortOnError false }
}

repositories {
  mavenCentral()
  google()
}

dependencies {
  implementation 'com.facebook.react:react-native:+'
}
`;

const manifest = `<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.READ_SMS" />
    <uses-permission android:name="android.permission.RECEIVE_SMS" />
</manifest>
`;

const javaModule = `package com.reactlibrary;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.telephony.SmsMessage;

import androidx.core.content.ContextCompat;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.util.Arrays;

public class RNExpoReadSmsModule extends ReactContextBaseJavaModule {

  private final ReactApplicationContext reactContext;
  private BroadcastReceiver msgReceiver;
  public static final String NAME = "RNExpoReadSms";

  public RNExpoReadSmsModule(ReactApplicationContext reactContext) {
    super(reactContext);
    this.reactContext = reactContext;
  }

  @Override
  public String getName() {
    return NAME;
  }

  @ReactMethod
  public void startReadSMS(final Callback success, final Callback error) {
    try {
      if (ContextCompat.checkSelfPermission(reactContext, Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED
              && ContextCompat.checkSelfPermission(reactContext, Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED) {
        msgReceiver = new BroadcastReceiver() {
          @Override
          public void onReceive(Context context, Intent intent) {
            reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit("received_sms", getMessageFromMessageIntent(intent));
          }
        };
        String SMS_RECEIVED_ACTION = "android.provider.Telephony.SMS_RECEIVED";
        reactContext.registerReceiver(msgReceiver, new IntentFilter(SMS_RECEIVED_ACTION));
        success.invoke("Start Read SMS successfully");
      } else {
        error.invoke("Required RECEIVE_SMS and READ_SMS permission");
      }
    } catch (Exception e) {
      e.printStackTrace();
    }
  }

  @ReactMethod
  public void stopReadSMS() {
    try {
      if (reactContext != null && msgReceiver != null) {
        reactContext.unregisterReceiver(msgReceiver);
      }
    } catch (Exception e) {
      e.printStackTrace();
    }
  }

  @ReactMethod
  public void getInboxMessages(int limit, Promise promise) {
    try {
      if (ContextCompat.checkSelfPermission(reactContext, Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED) {
        promise.reject("PERMISSION", "READ_SMS permission not granted");
        return;
      }
      WritableArray result = Arguments.createArray();
      Cursor cursor = reactContext.getContentResolver().query(
              Uri.parse("content://sms/inbox"),
              new String[]{"body"}, null, null, "date DESC");
      int count = 0;
      if (cursor != null) {
        while (cursor.moveToNext() && count < limit) {
          String body = cursor.getString(0);
          if (body != null) {
            result.pushString(body);
            count = count + 1;
          }
        }
        cursor.close();
      }
      promise.resolve(result);
    } catch (Exception e) {
      promise.reject("ERROR", e.getMessage());
    }
  }

  private String getMessageFromMessageIntent(Intent intent) {
    final Bundle bundle = intent.getExtras();
    String SMSReturnValues[] = new String[2];
    try {
      if (bundle != null) {
        final Object[] pdusObj = (Object[]) bundle.get("pdus");
        if (pdusObj != null) {
          for (Object aPdusObj : pdusObj) {
            SmsMessage currentMessage = SmsMessage.createFromPdu((byte[]) aPdusObj);
            SMSReturnValues[0] = currentMessage.getDisplayOriginatingAddress();
            SMSReturnValues[1] = currentMessage.getDisplayMessageBody();
          }
        }
      }
    } catch (Exception e) {
      e.printStackTrace();
    }
    return Arrays.toString(SMSReturnValues);
  }
}
`;

writeFile(path.join(androidDir, 'build.gradle'), buildGradle);
writeFile(path.join(androidDir, 'src', 'main', 'AndroidManifest.xml'), manifest);
writeFile(path.join(androidDir, 'src', 'main', 'java', 'com', 'reactlibrary', 'RNExpoReadSmsModule.java'), javaModule);
console.log('[patch-sms] Patched read-sms lib (AGP8 / RN0.74) and added getInboxMessages');
