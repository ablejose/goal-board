import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Animated, Platform, AppState } from 'react-native';
import Svg, { Defs, ClipPath, Polygon, LinearGradient, Stop, Rect } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseSms } from './parser';

// ---- Config: rewire here ----
const ACCOUNT = 'X7046';
const GOAL_NAME = 'GYM MONEY';
const TARGET = 4000;
const SEED = 100;
const STORE_KEY = 'gym_balance';

// Expo Go CANNOT read SMS. Keep true only to demo UI in Expo Go; false for a dev/EAS build.
const USE_MOCK = false;

const SAMPLE = [
  'A/c X7046 credited for INR 100.00 on 06-07-26 11:12:44 by MANJU JOSE thru UPI.AvlBal INR 276.58(UPI:210116315342).-PNB',
  'A/c X7046 debited INR 2.00 Dt 18-07-26 14:26:37 to Google Cloud thru UPI:766975301996.Bal INR 49.58 Not u?Fwd this SMS to 9264092640 to block UPI.-PNB',
];

const AnimatedRect = Animated.createAnimatedComponent(Rect);

export default function App() {
  const { width } = useWindowDimensions();
  const [balance, setBalance] = useState(SEED);
  const anim = useRef(new Animated.Value(0)).current;

  const CAP = 80, PAD = 20, H = 74;
  const W = Math.max(180, width - PAD * 2 - CAP);
  const DX = H * 0.3;
  const frame = `${DX},0 ${W},0 ${W - DX},${H} 0,${H}`;

  const applyBalance = useCallback((value) => {
    setBalance(value);
    AsyncStorage.setItem(STORE_KEY, String(value));
  }, []);

  const applyBody = useCallback((body) => {
    const t = parseSms(body);
    if (t == null || t.account !== ACCOUNT) return;
    applyBalance(t.balance); // single account: SMS balance is authoritative
  }, [applyBalance]);

  // Read the SMS inbox and set balance from the most recent X7046 message.
  const backfillFromInbox = useCallback(async () => {
    if (Platform.OS !== 'android' || USE_MOCK) return;
    try {
      const RNExpoReadSms = require('@maniac-tech/react-native-expo-read-sms').default;
      if (RNExpoReadSms == null || RNExpoReadSms.getInboxMessages == null) return;
      const list = await RNExpoReadSms.getInboxMessages(150);
      for (let i = 0; i < list.length; i++) {
        const t = parseSms(String(list[i]));
        if (t != null && t.account === ACCOUNT) { applyBalance(t.balance); break; }
      }
    } catch (e) {}
  }, [applyBalance]);

  // Load last saved value immediately.
  useEffect(() => {
    AsyncStorage.getItem(STORE_KEY).then((v) => { if (v != null) setBalance(parseFloat(v)); });
  }, []);

  // Request permission, backfill from inbox once, then listen for new SMS.
  useEffect(() => {
    if (USE_MOCK) {
      let i = 0;
      const id = setInterval(() => { applyBody(SAMPLE[i % SAMPLE.length]); i++; }, 2600);
      return () => clearInterval(id);
    }
    if (Platform.OS === 'android') {
      const { startReadSMS, requestReadSMSPermission } = require('@maniac-tech/react-native-expo-read-sms');
      (async () => {
        await requestReadSMSPermission();
        await backfillFromInbox();
        startReadSMS((status, sms) => { if (sms) applyBody(String(sms)); }, () => {});
      })();
    }
  }, [applyBody, backfillFromInbox]);

  // Re-sync whenever the app returns to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') backfillFromInbox();
    });
    return () => sub.remove();
  }, [backfillFromInbox]);

  const pct = Math.max(0, Math.min(1, balance / TARGET));
  useEffect(() => {
    Animated.timing(anim, { toValue: pct, duration: 1200, useNativeDriver: false }).start();
  }, [pct]);

  const fillW = anim.interpolate({ inputRange: [0, 1], outputRange: [0, W] });
  const level = 1 + Math.floor(pct * 5);

  return (
    <View style={s.root}>
      <Text style={s.h1}>GOAL BOARD</Text>
      <Text style={s.sub}>Auto-updated from bank SMS - no buttons</Text>

      <View style={s.row}>
        <View style={s.cap}>
          <Text style={s.lv}>{level}</Text>
          <Text style={s.lvl}>LEVEL</Text>
        </View>

        <View style={{ width: W, height: H }}>
          <Svg width={W} height={H}>
            <Defs>
              <ClipPath id="clip"><Polygon points={frame} /></ClipPath>
              <LinearGradient id="g" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#0077ff" />
                <Stop offset="1" stopColor="#28e0ff" />
              </LinearGradient>
            </Defs>
            <Polygon points={frame} fill="rgba(40,224,255,0.10)" />
            <AnimatedRect x="0" y="0" width={fillW} height={H} fill="url(#g)" clipPath="url(#clip)" />
            <Polygon points={frame} fill="none" stroke="#28e0ff" strokeWidth="3" />
          </Svg>
          <View style={s.nameWrap} pointerEvents="none">
            <Text style={s.name}>{GOAL_NAME}</Text>
          </View>
        </View>
      </View>

      <Text style={s.readout}>{'\u20B9'}{Math.round(balance)} / {'\u20B9'}{TARGET}   {Math.round(pct * 100)}%</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#05070d', alignItems: 'center', justifyContent: 'center', padding: 20 },
  h1: { color: '#7fb2ff', fontSize: 14, letterSpacing: 6, fontWeight: '900' },
  sub: { color: '#4a5f7a', fontSize: 11, letterSpacing: 1, marginTop: 6, marginBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center' },
  cap: { width: 80, alignItems: 'center' },
  lv: { color: '#28e0ff', fontSize: 40, fontWeight: '900', fontStyle: 'italic' },
  lvl: { color: '#28e0ff', fontSize: 10, letterSpacing: 3, opacity: 0.85 },
  nameWrap: { position: 'absolute', left: 26, top: 22 },
  name: { color: '#02121a', fontSize: 18, fontWeight: '800', fontStyle: 'italic', backgroundColor: '#eaf6ff', paddingHorizontal: 12, paddingVertical: 2, transform: [{ skewX: '-16deg' }] },
  readout: { color: '#9fc4ff', fontSize: 12, letterSpacing: 2, marginTop: 16 },
});
