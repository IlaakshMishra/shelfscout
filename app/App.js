import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadToken, setToken, setOnUnauthorized } from './src/api';
import { colors, fonts } from './src/theme';
import AuthScreen from './src/screens/AuthScreen';
import ScanScreen from './src/screens/ScanScreen';
import ReviewScreen from './src/screens/ReviewScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import RecommendationsScreen from './src/screens/RecommendationsScreen';
import InventoryScreen from './src/screens/InventoryScreen';
import StoresScreen from './src/screens/StoresScreen';
import StoreDetailScreen from './src/screens/StoreDetailScreen';

const TABS = {
  reader: [
    ['scan', 'Scan'], ['library', 'Library'], ['recs', 'For You'], ['stores', 'Stores'],
  ],
  business: [
    ['storeScan', 'Scan Stock'], ['inventory', 'Inventory'], ['stores', 'Stores'],
  ],
  guest: [['stores', 'Stores'], ['auth', 'Sign in']],
};

export default function App() {
  const [user, setUser] = useState(null);
  const [route, setRoute] = useState({ name: 'auth', params: {} });
  const [ready, setReady] = useState(false);

  const navigate = (name, params = {}) => setRoute({ name, params });

  useEffect(() => {
    (async () => {
      setOnUnauthorized(() => {
        AsyncStorage.removeItem('user').catch(() => {});
        setUser(null);
        setRoute({ name: 'auth', params: {} });
      });
      try {
        await loadToken();
        const raw = await AsyncStorage.getItem('user');
        if (raw) {
          const u = JSON.parse(raw);
          setUser(u);
          setRoute({ name: u.role === 'business' ? 'inventory' : 'scan', params: {} });
        }
      } catch {
        await AsyncStorage.removeItem('user').catch(() => {});
        await setToken(null).catch(() => {});
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const onAuthed = async (u) => {
    await AsyncStorage.setItem('user', JSON.stringify(u));
    setUser(u);
    navigate(u.role === 'business' ? 'inventory' : 'scan');
  };

  const logout = async () => {
    await setToken(null);
    await AsyncStorage.removeItem('user');
    setUser(null);
    navigate('auth');
  };

  if (!ready) return null;

  const screens = {
    auth: <AuthScreen onAuthed={onAuthed} />,
    scan: <ScanScreen mode="shelf" navigate={navigate} />,
    storeScan: <ScanScreen mode="store" navigate={navigate} />,
    review: <ReviewScreen route={route} navigate={navigate} />,
    library: <LibraryScreen navigate={navigate} />,
    recs: <RecommendationsScreen navigate={navigate} />,
    inventory: <InventoryScreen navigate={navigate} />,
    stores: <StoresScreen navigate={navigate} />,
    storeDetail: <StoreDetailScreen route={route} navigate={navigate} />,
  };

  const tabs = TABS[user ? user.role : 'guest'];

  return (
    <View style={s.app}>
      <View style={s.header}>
        <Text style={s.brand}>ShelfScout</Text>
        {user && (
          <Pressable role="button" aria-label="Sign out" onPress={logout}>
            <Text style={{ color: colors.accent, fontWeight: '600' }}>Sign out</Text>
          </Pressable>
        )}
      </View>
      <View style={s.tabBar} role="tablist">
        {tabs.map(([name, label]) => (
          <Pressable key={name} role="tab" aria-selected={route.name === name}
            onPress={() => navigate(name)} style={[s.tab, route.name === name && s.tabOn]}>
            <Text style={[s.tabText, route.name === name && { color: colors.accent }]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 48 }}>
        {screens[route.name] || screens.stores}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.paper },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8 },
  brand: { fontFamily: fonts.serif, fontSize: 22, color: colors.ink },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderColor: colors.line, paddingHorizontal: 12 },
  tab: { paddingVertical: 10, paddingHorizontal: 14 },
  tabOn: { borderBottomWidth: 2, borderColor: colors.accent },
  tabText: { color: colors.faint, fontWeight: '600' },
});
