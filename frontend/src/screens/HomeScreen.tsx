import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Zemen Express</Text>
      <Text style={styles.subtitle}>React Native Web Integration Active</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2A1B7A',
  },
  subtitle: {
    fontSize: 16,
    color: '#F28C3A',
    marginTop: 8,
  },
});
