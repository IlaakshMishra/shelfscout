import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { api } from '../api';
import { Button, ErrorText, BookRow } from '../components/UI';
import { colors, fonts } from '../theme';

export default function LibraryScreen({ navigate }) {
  const [books, setBooks] = useState(null);
  const [scans, setScans] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [lib, hist] = await Promise.all([api('/library'), api('/library/scans')]);
        setBooks(lib.books);
        setScans(hist.scans);
      } catch (e) {
        setError(e.message);
        setBooks([]);
      }
    })();
  }, []);

  if (books === null) return <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />;

  return (
    <View style={s.wrap}>
      <Text style={s.h1}>My library</Text>
      <Text style={s.sub}>{books.length} books · {scans.length} scans</Text>
      <ErrorText>{error}</ErrorText>
      {books.length === 0 ? (
        <>
          <Text style={{ color: colors.faint, marginVertical: 16 }}>
            Nothing here yet — scan your first shelf.
          </Text>
          <Button title="Scan a shelf" onPress={() => navigate('scan')} />
        </>
      ) : (
        books.map((b) => <BookRow key={b.id} book={b} />)
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: 24 },
  h1: { fontFamily: fonts.serif, fontSize: 26, color: colors.ink },
  sub: { color: colors.faint, marginTop: 4, marginBottom: 12 },
});
