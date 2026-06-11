import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { api, setToken } from '../api';
import { Button, Field, ErrorText } from '../components/UI';
import { colors, fonts } from '../theme';

export default function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState('login');
  const [role, setRole] = useState('reader');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storeLocation, setStoreLocation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    if (!email.includes('@')) return setError('Valid email required');
    if (password.length < 8) return setError('Password must be at least 8 characters');
    if (mode === 'register' && role === 'business' && !storeName.trim()) {
      return setError('Store name required for business accounts');
    }
    setBusy(true);
    try {
      const body = mode === 'register'
        ? { email, password, role, storeName, storeLocation }
        : { email, password };
      const data = await api(`/auth/${mode}`, { method: 'POST', body });
      await setToken(data.token);
      onAuthed(data.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.wrap}>
      <Text style={s.logo}>ShelfScout</Text>
      <Text style={s.tag}>Point your camera at a shelf. We'll do the rest.</Text>

      <View style={s.toggleRow}>
        {['login', 'register'].map((m) => (
          <Pressable key={m} role="tab" aria-selected={mode === m} onPress={() => setMode(m)}
            style={[s.toggle, mode === m && s.toggleOn]}>
            <Text style={[s.toggleText, mode === m && { color: '#fff' }]}>
              {m === 'login' ? 'Sign in' : 'Create account'}
            </Text>
          </Pressable>
        ))}
      </View>

      {mode === 'register' && (
        <View style={s.toggleRow}>
          {[['reader', "I'm a reader"], ['business', 'I run a bookstore']].map(([r, label]) => (
            <Pressable key={r} role="radio" aria-checked={role === r} onPress={() => setRole(r)}
              style={[s.toggle, role === r && s.toggleOn]}>
              <Text style={[s.toggleText, role === r && { color: '#fff' }]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Field placeholder="Email" value={email} onChangeText={setEmail} inputMode="email" />
      <Field placeholder="Password (min 8 characters)" value={password} onChangeText={setPassword} secureTextEntry />
      {mode === 'register' && role === 'business' && (
        <>
          <Field placeholder="Store name" value={storeName} onChangeText={setStoreName} />
          <Field placeholder="Location (optional)" value={storeLocation} onChangeText={setStoreLocation} />
        </>
      )}

      <ErrorText>{error}</ErrorText>
      <Button title={busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
        onPress={submit} disabled={busy} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 440, alignSelf: 'center', padding: 24 },
  logo: { fontFamily: fonts.serif, fontSize: 34, color: colors.ink, textAlign: 'center', marginTop: 32 },
  tag: { color: colors.faint, textAlign: 'center', marginBottom: 24 },
  toggleRow: { flexDirection: 'row', gap: 8, marginVertical: 6 },
  toggle: { flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.line, alignItems: 'center', backgroundColor: colors.card },
  toggleOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  toggleText: { color: colors.ink, fontWeight: '600', fontSize: 13 },
});
