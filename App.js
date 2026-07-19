import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Animated, AppState } from 'react-native';
import Svg, { Defs, ClipPath, Polygon, LinearGradient, Stop, Rect } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---- Config: rewire here ----
const GOAL_NAME = 'GYM MONEY';
const TARGET = 4000;
const SEED = 100;
const STORE_KEY = 'gym_balance';
const POLL_MS = 15000;

// Paste your Apps Script Web App URL (ends with /exec) after deploying it:
const ENDPOINT = 'https://script.google.com/macros/s/AKfycbwLtvZ9zQw6O3zyXvYD7xy3NxsMy-a0xsj5UNpFLzLckyuXpkv_88UFWNm2xtFuNjaJ/exec';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

export default function App() {
  const { width } = useWindowDimensions();
  const [balance, setBalance] = useState(SEED);
  const anim = useRef(new Animated.Value(0)).current;

  const CAP = 80, PAD = 20, H = 74;
  const W = Math.max(180, width - PAD * 2 - CAP);
  const DX = H * 0.3;
  const frame = `${DX},0 ${W},0 ${W - DX},${H} 0,${H}`;

  // Read the current balance from the Google Apps Script endpoint.
  const fetchBalance = useCallback(async () => {
    if (ENDPOINT.indexOf('http') !== 0) return;
    try {
      const res = await fetch(ENDPOINT, { method: 'GET' });
      const data = await res.json();
      if (data && typeof data.balance === 'number') {
        setBalance(data.balance);
        AsyncStorage.setItem(STORE_KEY, String(data.balance));
      }
    } catch (e) {}
  }, []);

  // Show last saved value instantly on cold start.
  useEffect(() => {
    AsyncStorage.getItem(STORE_KEY).then((v) => { if (v != null) setBalance(parseFloat(v)); });
  }, []);

  // Poll while open + refresh on foreground.
  useEffect(() => {
    fetchBalance();
    const id = setInterval(fetchBalance, POLL_MS);
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') fetchBalance(); });
    return () => { clearInterval(id); sub.remove(); };
  }, [fetchBalance]);

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
