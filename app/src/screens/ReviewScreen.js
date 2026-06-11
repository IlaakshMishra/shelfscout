import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { api } from '../api';
import { Button, Field, ErrorText, BookRow } from '../components/UI';
import { colors, fonts } from '../theme';

export default function ReviewScreen({ route, navigate }) {
  const { scanId, books: detected = [], mode = 'shelf' } = route.params || {};
  const [books, setBooks] = useState(detected.map((b, i) => ({ ...b, id: i, kept: true })));
  const [newTitle, setNewTitle] = useState('');
  const [preview, setPreview] = useState(null); // business step 2: {newBooks, existing}
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const kept = books.filter((b) => b.kept);
  const payload = kept.map(({ title, author }) => ({ title, author }));

  const toggle = (id) =>
    setBooks((bs) => bs.map((b) => (b.id === id ? { ...b, kept: !b.kept } : b)));
  const updateTitle = (id, title) =>
    setBooks((bs) => bs.map((b) => (b.id === id ? { ...b, title } : b)));
  const addManual = () => {
    const t = newTitle.trim();
    if (!t) return;
    setBooks((bs) => [...bs, { id: bs.length ? Math.max(...bs.map((x) => x.id)) + 1 : 0, title: t, author: '', kept: true }]);
    setNewTitle('');
  };

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      if (mode === 'store') {
        if (!preview) {
          setPreview(await api('/inventory/preview', { method: 'POST', body: { books: payload } }));
        } else {
          if (preview.newBooks.length) {
            await api('/inventory/confirm', { method: 'POST', body: { books: preview.newBooks } });
          }
          navigate('inventory');
        }
      } else {
        await api('/library/confirm', { method: 'POST', body: { scanId, books: payload } });
        navigate('library');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (mode === 'store' && preview) {
    return (
      <View style={s.wrap}>
        <Text style={s.h1}>Inventory preview</Text>
        <Text style={s.sub}>
          {preview.newBooks.length} new · {preview.existing.length} already in stock. Existing stock is never touched.
        </Text>
        {preview.newBooks.map((b) => (
          <BookRow key={`n-${b.title}`} book={b} right={<Text style={s.badgeNew}>NEW</Text>} />
        ))}
        {preview.existing.map((b) => (
          <BookRow key={`e-${b.title}`} book={b} right={<Text style={s.badgeHave}>IN STOCK</Text>} />
        ))}
        <ErrorText>{error}</ErrorText>
        {busy ? <ActivityIndicator color={colors.accent} /> : (
          <>
            <Button title={`Add ${preview.newBooks.length} new books`} onPress={confirm}
              disabled={preview.newBooks.length === 0} />
            <Button title="Back to edit" variant="ghost" onPress={() => setPreview(null)} />
          </>
        )}
      </View>
    );
  }

  return (
    <View style={s.wrap}>
      <Text style={s.h1}>Check what we found</Text>
      <Text style={s.sub}>
        AI misreads spines sometimes. Uncheck mistakes, fix typos, add anything we missed.
      </Text>

      {books.map((b) => (
        <View key={b.id} style={s.row}>
          <Pressable
            role="checkbox"
            aria-checked={b.kept}
            aria-label={`Keep ${b.title}`}
            onPress={() => toggle(b.id)}
            style={[s.check, b.kept && s.checkOn]}
          >
            {b.kept && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
          </Pressable>
          <Field
            value={b.title}
            onChangeText={(t) => updateTitle(b.id, t)}
            style={{ flex: 1, opacity: b.kept ? 1 : 0.4 }}
          />
        </View>
      ))}

      <View style={s.row}>
        <Field placeholder="Add a missed title…" value={newTitle} onChangeText={setNewTitle}
          style={{ flex: 1 }} />
        <Button title="Add" variant="ghost" onPress={addManual} />
      </View>

      <ErrorText>{error}</ErrorText>
      {busy ? <ActivityIndicator color={colors.accent} /> : (
        <Button
          title={mode === 'store' ? `Preview inventory update (${kept.length})` : `Add ${kept.length} books to my library`}
          onPress={confirm}
          disabled={kept.length === 0}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: 24 },
  h1: { fontFamily: fonts.serif, fontSize: 26, color: colors.ink },
  sub: { color: colors.faint, marginTop: 6, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  check: { width: 26, height: 26, borderRadius: 6, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  checkOn: { backgroundColor: colors.moss, borderColor: colors.moss },
  badgeNew: { color: colors.moss, fontWeight: '800', fontSize: 12 },
  badgeHave: { color: colors.faint, fontWeight: '700', fontSize: 12 },
});
