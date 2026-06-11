import { Pressable, Text, TextInput, View, Image, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme';

export function Button({ title, onPress, variant = 'primary', disabled }) {
  return (
    <Pressable
      role="button"
      aria-label={title}
      aria-disabled={disabled || undefined}
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        s.btn,
        variant === 'ghost' && s.btnGhost,
        disabled && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text style={[s.btnText, variant === 'ghost' && { color: colors.accent }]}>{title}</Text>
    </Pressable>
  );
}

export function Field(props) {
  return (
    <TextInput
      placeholderTextColor={colors.faint}
      autoCapitalize="none"
      {...props}
      style={[s.field, props.style]}
    />
  );
}

export function Chip({ label, tone = 'accent' }) {
  const soft = tone === 'moss' ? colors.mossSoft : colors.accentSoft;
  const text = tone === 'moss' ? colors.moss : colors.accent;
  return (
    <View style={[s.chip, { backgroundColor: soft }]}>
      <Text style={{ color: text, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

export function ErrorText({ children }) {
  if (!children) return null;
  return <Text role="alert" style={{ color: colors.danger, marginVertical: 8 }}>{children}</Text>;
}

export function BookRow({ book, right }) {
  return (
    <View style={s.bookRow}>
      {book.cover_url || book.coverUrl ? (
        <Image source={{ uri: book.cover_url || book.coverUrl }} style={s.cover} />
      ) : (
        <View style={[s.cover, s.coverFallback]}>
          <Text style={{ fontSize: 10, color: colors.faint }}>no{'\n'}cover</Text>
        </View>
      )}
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={s.bookTitle} numberOfLines={2}>{book.title}</Text>
        {!!book.author && <Text style={s.bookAuthor}>{book.author}</Text>}
      </View>
      {right}
    </View>
  );
}

const s = StyleSheet.create({
  btn: { backgroundColor: colors.accent, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, alignItems: 'center', marginVertical: 6 },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.accent },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  field: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 12, marginVertical: 6, fontSize: 15, color: colors.ink },
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, marginRight: 6, marginBottom: 6 },
  bookRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, padding: 12, marginVertical: 4, borderWidth: 1, borderColor: colors.line },
  cover: { width: 44, height: 64, borderRadius: 6, backgroundColor: colors.accentSoft },
  coverFallback: { alignItems: 'center', justifyContent: 'center' },
  bookTitle: { fontFamily: fonts.serif, fontSize: 16, color: colors.ink },
  bookAuthor: { color: colors.faint, fontSize: 13, marginTop: 2 },
});
