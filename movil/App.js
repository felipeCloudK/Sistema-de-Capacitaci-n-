import React from 'react';
import { SafeAreaView, StatusBar, Text, View } from 'react-native';

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#17243a' }}>
      <StatusBar barStyle="light-content" backgroundColor="#17243a" />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'center' }}>
          Gestión de Personal
        </Text>
        <Text style={{ color: '#cbd5e1', marginTop: 12, lineHeight: 22, textAlign: 'center' }}>
          La aplicación móvil quedó desactivada. Utilice la aplicación web privada para administrar trabajadores y capacitaciones.
        </Text>
      </View>
    </SafeAreaView>
  );
}
