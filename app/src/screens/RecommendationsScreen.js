import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { api } from '../api';
import { Button, ErrorText, Chip, BookRow } from '../components/UI';
import { colors, fonts } from '../theme';

export default function RecommendationsScreen({ navigate }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setData(await api('/recommendations'));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <View style={{ alignItems: 'center', marginTop: 40 }}>
        <ActivityIndicator color={colors.accent} />
        <Text style={{ color: colors.faint, marginTop: 8 }}>Reading your shelf's personality…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.wrap}>
        <ErrorText>{error}</ErrorText>
        <Button title="Scan a shelf" onPress={() => navigate('scan')} />
      </View>
    );
  }

  return (
    <View style={s.wrap}>
      <View style={s.moodCard}>
        <Text style={s.moodName}>{data.mood.profileName}</Text>
        <Text style={s.moodSummary}>{data.mood.summary}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }}>
          {data.mood.tags.map((t) => <Chip key={t} label={t} tone="moss" />)}
        </View>
      </View>

      <Text style={s.h2}>Picked for you</Text>
      {data.recommendations.map((rec) => (
        <View key={`${rec.title}-${rec.author}`}>
          <BookRow book={rec} />
          <Text style={s.reason}>{rec.reason}</Text>
          {rec.availableAt.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
              {rec.availableAt.map((store) => (
                <Pressable key={store.store_id}
                  onPress={() => navigate('storeDetail', { storeId: store.store_id })}>
                  <Chip label={`Available at ${store.store_name}`} />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      ))}
      <Button title="Refresh" variant="ghost" onPress={load} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: 24 },
  moodCard: { backgroundColor: colors.mossSoft, borderRadius: 16, padding: 20, marginBottom: 20 },
  moodName: { fontFamily: fonts.serif, fontSize: 24, color: colors.moss },
  moodSummary: { color: colors.ink, marginTop: 8, lineHeight: 20 },
  h2: { fontFamily: fonts.serif, fontSize: 20, color: colors.ink, marginBottom: 8 },
  reason: { color: colors.faint, fontSize: 13, marginLeft: 8, marginBottom: 4, fontStyle: 'italic' },
});
