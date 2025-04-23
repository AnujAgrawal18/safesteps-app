import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { auth, db } from '@/firebase/config';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const [userName, setUserName] = useState('User');
  const router = useRouter();

  useEffect(() => {
    const fetchUserName = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setUserName(userDoc.data().name || 'User');
        }
      }
    };
    fetchUserName();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/login'); // Redirect to login after logout
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.subheading}>Hi {userName} 👋</Text>
      <Text style={styles.subheading}>You are currently in a SafeZone ✅</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔒 Safety Status</Text>
        <Text style={styles.cardText}>Low risk area. No incidents reported in the past hour.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📍 Smart Suggestion</Text>
        <Text style={styles.cardText}>The route to your hostel is currently clear and safe.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔔 Latest Community Report</Text>
        <Text style={styles.cardText}>Catcalling reported 400m away, 16 mins ago.</Text>
      </View>

      <View style={styles.userBox}>
        <Image
          source={require('@/assets/images/profile-placeholder.jpg')}
          style={styles.avatar}
        />
        <View>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userContact}>Emergency Contact: +91 9876543210</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 50,
    paddingHorizontal: 20,
    gap: 16,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '600',
  },
  subheading: {
    fontSize: 16,
    color: '#666',
  },
  card: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardText: {
    fontSize: 14,
    color: '#444',
  },
  userBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ccc',
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color:'#666',
  },
  userContact: {
    fontSize: 13,
    color: '#666',
  },
  logoutButton: {
    marginTop: 20,
    backgroundColor: '#FF3B30',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
