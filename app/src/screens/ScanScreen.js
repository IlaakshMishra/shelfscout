import { useState } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../api';
import { Button, ErrorText } from '../components/UI';
import { colors, fonts } from '../theme';

export default function ScanScreen({ mode, navigate }) {
  const [assets, setAssets] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pick = async () => {
    setError('');
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Photo access was denied — allow it to scan your shelf.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 2,
      quality: 0.8,
    });
    if (!res.canceled) setAssets(res.assets.slice(0, 2));
  };

  const submit = async () => {
    setBusy(true);
    setError('');
    const MAX_BYTES = 8 * 1024 * 1024;
    const oversize = assets.find((a) => a.fileSize && a.fileSize > MAX_BYTES);
    if (oversize) {
      setError('Each photo must be under 8MB — pick a smaller photo.');
      setBusy(false);
      return;
    }
    try {
      const form = new FormData();
      for (const [i, a] of assets.entries()) {
        // Web-only app: fetching the picked blob URI is the reliable browser path (native would need {uri,name,type}).
        const blob = await (await fetch(a.uri)).blob();
        form.append('photos', blob, `photo-${i}.jpg`);
      }
      const data = await api(`/scan?kind=${mode}`, { method: 'POST', formData: form });
      navigate('review', { scanId: data.scanId, books: data.books, mode });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.wrap}>
      <Text style={s.h1}>{mode === 'store' ? 'Scan your shelves' : 'Scan your bookshelf'}</Text>
      <Text style={s.sub}>
        {mode === 'store'
          ? 'Photograph your store shelves — we read the spines and update your inventory.'
          : 'Take up to 2 photos of your shelf. We read the spines and build your library.'}
      </Text>
      <Text style={s.limit}>Up to 2 photos per scan</Text>

      <View style={s.previewRow}>
        {assets.map((a) => (
          <Image key={a.assetId || a.uri} source={{ uri: a.uri }} style={s.preview} />
        ))}
      </View>

      <Button title={assets.length ? 'Change photos' : 'Choose photos'} variant="ghost" onPress={pick} />
      {busy ? (
        <View style={{ alignItems: 'center', padding: 16 }}>
          <ActivityIndicator color={colors.accent} />
          <Text style={{ color: colors.faint, marginTop: 8 }}>Reading spines…</Text>
        </View>
      ) : (
        <Button title="Scan books" onPress={submit} disabled={assets.length === 0} />
      )}
      <ErrorText>{error}</ErrorText>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: 24 },
  h1: { fontFamily: fonts.serif, fontSize: 26, color: colors.ink },
  sub: { color: colors.faint, marginTop: 6, marginBottom: 2 },
  limit: { color: colors.accent, fontSize: 12, fontWeight: '600', marginBottom: 12 },
  previewRow: { flexDirection: 'row', gap: 10, marginVertical: 10 },
  preview: { width: 120, height: 160, borderRadius: 10, backgroundColor: colors.accentSoft },
});
