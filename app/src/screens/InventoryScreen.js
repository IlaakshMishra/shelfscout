import { useEffect, useState } from 'react';
import { View, Text, Switch, StyleSheet, ActivityIndicator } from 'react-native';
import { api } from '../api';
import { Button, ErrorText, BookRow } from '../components/UI';
import { colors, fonts } from '../theme';

export default function InventoryScreen({ navigate }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setItems((await api('/inventory')).items);
      } catch (e) {
        setError(e.message);
        setItems([]);
      }
    })();
  }, []);

  const toggle = async (bookId, inStock) => {
    setItems((xs) => xs.map((i) => (i.book_id === bookId ? { ...i, in_stock: inStock } : i)));
    try {
      await api(`/inventory/${bookId}`, { method: 'PATCH', body: { inStock } });
    } catch (e) {
      setError(e.message);
      setItems((xs) => xs.map((i) => (i.book_id === bookId ? { ...i, in_stock: !inStock } : i)));
    }
  };

  if (items === null) return <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />;

  return (
    <View style={s.wrap}>
      <Text style={s.h1}>Store inventory</Text>
      <Text style={s.sub}>{items.filter((i) => i.in_stock).length} in stock · toggle to mark sold out</Text>
      <ErrorText>{error}</ErrorText>
      {items.length === 0 ? (
        <>
          <Text style={{ color: colors.faint, marginVertical: 16 }}>
            No inventory yet — photograph your shelves to get started.
          </Text>
          <Button title="Scan shelves" onPress={() => navigate('storeScan')} />
        </>
      ) : (
        items.map((i) => (
          <BookRow
            key={i.book_id}
            book={i}
            right={
              <Switch
                value={i.in_stock}
                onValueChange={(v) => toggle(i.book_id, v)}
                trackColor={{ true: colors.moss, false: colors.line }}
                aria-label={`${i.title} in stock`}
              />
            }
          />
        ))
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: 24 },
  h1: { fontFamily: fonts.serif, fontSize: 26, color: colors.ink },
  sub: { color: colors.faint, marginTop: 4, marginBottom: 12 },
});
