import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { api } from '../api';
import { Button, ErrorText, BookRow } from '../components/UI';
import { colors, fonts } from '../theme';

export default function StoreDetailScreen({ route, navigate }) {
  const { storeId } = route.params || {};
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setData(await api(`/stores/${storeId}`));
      } catch (e) {
        setError(e.message);
        setData({ store: null, books: [] });
      }
    })();
  }, [storeId]);

  if (data === null) return <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />;

  return (
    <View style={s.wrap}>
      <Button title="← All stores" variant="ghost" onPress={() => navigate('stores')} />
      <ErrorText>{error}</ErrorText>
      {data.store && (
        <>
          <Text style={s.h1}>{data.store.store_name}</Text>
          {!!data.store.store_location && <Text style={s.loc}>{data.store.store_location}</Text>}
          <Text style={s.count}>{data.books.length} books in stock</Text>
          {data.books.map((b) => <BookRow key={b.id} book={b} />)}
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: 24 },
  h1: { fontFamily: fonts.serif, fontSize: 26, color: colors.ink },
  loc: { color: colors.faint, marginTop: 2 },
  count: { color: colors.moss, fontWeight: '600', marginVertical: 10, fontSize: 13 },
});
