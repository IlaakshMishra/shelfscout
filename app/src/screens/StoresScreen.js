import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { api } from '../api';
import { Field, ErrorText, BookRow } from '../components/UI';
import { colors, fonts } from '../theme';

export default function StoresScreen({ navigate }) {
  const [stores, setStores] = useState(null);
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setStores((await api('/stores')).stores);
      } catch (e) {
        setError(e.message);
        setStores([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) { setResults(null); return; }
    let stale = false; // ignore responses for queries the user has since replaced
    const t = setTimeout(async () => {
      try {
        const data = await api(`/search?q=${encodeURIComponent(q.trim())}`);
        if (!stale) {
          setError('');
          setResults(data.results);
        }
      } catch (e) {
        if (!stale) setError(e.message);
      }
    }, 300);
    return () => { stale = true; clearTimeout(t); };
  }, [q]);

  if (stores === null) return <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />;

  return (
    <View style={s.wrap}>
      <Text style={s.h1}>Local bookstores</Text>
      <Field placeholder="Search a title across all stores…" value={q} onChangeText={setQ}
        role="searchbox" aria-label="Search books" />
      <ErrorText>{error}</ErrorText>

      {results !== null ? (
        results.length === 0 ? (
          <Text style={{ color: colors.faint, marginTop: 12 }}>No store stocks that title yet.</Text>
        ) : (
          results.map((r) => (
            <Pressable key={`${r.store_id}-${r.id}`}
              onPress={() => navigate('storeDetail', { storeId: r.store_id })}>
              <BookRow book={r} right={<Text style={s.storeTag}>{r.store_name}</Text>} />
            </Pressable>
          ))
        )
      ) : (
        stores.map((store) => (
          <Pressable key={store.id} role="link" aria-label={`View ${store.store_name}`}
            onPress={() => navigate('storeDetail', { storeId: store.id })} style={s.storeCard}>
            <Text style={s.storeName}>{store.store_name}</Text>
            {!!store.store_location && <Text style={s.storeLoc}>{store.store_location}</Text>}
            <Text style={s.storeCount}>{store.in_stock_count} books in stock</Text>
          </Pressable>
        ))
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: 24 },
  h1: { fontFamily: fonts.serif, fontSize: 26, color: colors.ink, marginBottom: 8 },
  storeCard: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 18, marginVertical: 6 },
  storeName: { fontFamily: fonts.serif, fontSize: 19, color: colors.ink },
  storeLoc: { color: colors.faint, marginTop: 2 },
  storeCount: { color: colors.moss, fontWeight: '600', marginTop: 8, fontSize: 13 },
  storeTag: { color: colors.accent, fontSize: 12, fontWeight: '700', maxWidth: 110 },
});
