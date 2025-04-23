import { View, Text, StyleSheet } from 'react-native';

export default function SafeRoutesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>Map view is not available on the web platform.</Text>
      <Text style={styles.subMessage}>Please use the mobile app for full functionality.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  message: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  subMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
});
