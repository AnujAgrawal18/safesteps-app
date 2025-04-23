import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { auth, db } from '@/firebase/config';
import { signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const [userName, setUserName] = useState('User');
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [safetyScore, setSafetyScore] = useState(85);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [trustedContacts, setTrustedContacts] = useState<any[]>([]);
  const [emergencyContact, setEmergencyContact] = useState('');
  const [safetyStatus, setSafetyStatus] = useState('Fetching safety status...');
  const [smartSuggestion, setSmartSuggestion] = useState('Fetching suggestions...');
  const [latestReport, setLatestReport] = useState('Fetching latest report...');
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    const fetchUserData = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setUserName(userDoc.data().name || 'User');
          setTrustedContacts(userDoc.data().trustedContacts || []);
          setEmergencyContact(userDoc.data().emergencyContact || '');
        }
      }
    };

    const fetchRecentReports = () => {
      const q = query(
        collection(db, 'incidentReports'),
        orderBy('timestamp', 'desc'),
        limit(3)
      );

      return onSnapshot(q, (snapshot) => {
        const reports = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRecentReports(reports);
      });
    };

    fetchUserData();
    const unsubscribe = fetchRecentReports();
    getCurrentLocation();

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchDynamicContent = async () => {
      try {
        // Fetch recent reports
        const q = query(
          collection(db, 'incidentReports'),
          orderBy('timestamp', 'desc'),
          limit(1)
        );
        const snapshot = await getDocs(q);
        const latest = snapshot.docs[0]?.data();

        // Update "Latest Community Report"
        if (latest) {
          setLatestReport(
            `${latest.type} reported ${latest.locationName || 'nearby'}, ${formatTimeAgo(latest.timestamp?.toDate())}.`
          );
        } else {
          setLatestReport('No recent reports found.');
        }

        // Update "Safety Status" based on recent reports
        if (latest && latest.severity === 'High') {
          setSafetyStatus('High risk area. Stay alert!');
        } else {
          setSafetyStatus('Low risk area. No major incidents reported recently.');
        }

        // Update "Smart Suggestions" based on location
        if (userLocation) {
          setSmartSuggestion('The route to your destination is currently clear and safe.');
        } else {
          setSmartSuggestion('Enable location services for personalized suggestions.');
        }
      } catch (error) {
        console.error('Error fetching dynamic content:', error);
        setSafetyStatus('Unable to fetch safety status.');
        setSmartSuggestion('Unable to fetch suggestions.');
        setLatestReport('Unable to fetch latest report.');
      }
    };

    fetchDynamicContent();
  }, [userLocation]);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation(location);
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  interface FormatTimeAgoProps {
    date: Date | null;
  }

  const formatTimeAgo = (date: FormatTimeAgoProps['date']): string => {
    if (!date) return 'Unknown time';
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    if (diffInMinutes < 60) return `${diffInMinutes} mins ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  };

  const handleQuickSOS = () => {
    router.push('/sos');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <ScrollView style={[styles.container, isDark && styles.darkContainer]}>
      {/* Welcome Section */}
      <View style={[styles.header, isDark && styles.darkSection]}>
        <View style={styles.welcomeSection}>
          <View>
            <Text style={[styles.greeting, isDark && styles.darkText]}>Hi {userName} 👋</Text>
            <Text style={[styles.locationText, isDark && styles.darkSubtext]}>
              {userLocation ? 'You are in a SafeZone ✅' : 'Fetching location...'}
            </Text>
          </View>
          <TouchableOpacity onPress={handleQuickSOS} style={styles.sosButton}>
            <Ionicons name="alert-circle" size={24} color="#fff" />
            <Text style={styles.sosButtonText}>Quick SOS</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Safety Score Card */}
      <View style={[styles.scoreCard, isDark && styles.darkCard]}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔒 Safety Status</Text>
        <Text style={styles.cardText}>{safetyStatus}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📍 Smart Suggestion</Text>
        <Text style={styles.cardText}>{smartSuggestion}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔔 Latest Community Report</Text>
        <Text style={styles.cardText}>{latestReport}</Text>
      </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={[styles.actionButton, isDark && styles.darkActionButton]}
          onPress={() => router.push('/saferoutes')}>
          <Ionicons name="map" size={24} color={isDark ? '#fff' : '#1E90FF'} />
          <Text style={[styles.actionText, isDark && styles.darkText]}>Safe Routes</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, isDark && styles.darkActionButton]}
          onPress={() => router.push('/report')}>
          <Ionicons name="warning" size={24} color={isDark ? '#fff' : '#1E90FF'} />
          <Text style={[styles.actionText, isDark && styles.darkText]}>Report</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, isDark && styles.darkActionButton]}
          onPress={() => router.push('/profile')}>
          <Ionicons name="people" size={24} color={isDark ? '#fff' : '#1E90FF'} />
          <Text style={[styles.actionText, isDark && styles.darkText]}>Contacts</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Alerts */}
      <View style={[styles.section, isDark && styles.darkSection]}>
        <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Recent Alerts</Text>
        {recentReports.map((report, index) => (
          <View key={index} style={[styles.alertCard, isDark && styles.darkCard]}>
            <Ionicons name="alert-circle" size={20} color="#FF3B30" />
            <View style={styles.alertInfo}>
              <Text style={[styles.alertTitle, isDark && styles.darkText]}>{report.type}</Text>
              <Text style={[styles.alertDescription, isDark && styles.darkSubtext]}>
                {report.description?.slice(0, 100)}...
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Safety Tips */}
      <View style={[styles.section, isDark && styles.darkSection]}>
        <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Safety Tips</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {SAFETY_TIPS.map((tip, index) => (
            <View key={index} style={[styles.tipCard, isDark && styles.darkCard]}>
              <Ionicons name={tip.icon} size={24} color="#1E90FF" />
              <Text style={[styles.tipTitle, isDark && styles.darkText]}>{tip.title}</Text>
              <Text style={[styles.tipDescription, isDark && styles.darkSubtext]}>{tip.description}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Emergency Contacts */}
      <View style={[styles.section, isDark && styles.darkSection]}>
        <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Quick Contacts</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {trustedContacts.map((contact, index) => (
            <TouchableOpacity key={index} style={[styles.contactCard, isDark && styles.darkCard]}>
              <View style={styles.contactIcon}>
                <Ionicons name="person" size={24} color="#1E90FF" />
              </View>
              <Text style={[styles.contactName, isDark && styles.darkText]}>{contact.name}</Text>
              <Text style={[styles.contactPhone, isDark && styles.darkSubtext]}>{contact.phone}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
}

const SAFETY_TIPS = [
  {
    icon: 'location' as keyof typeof Ionicons.glyphMap,
    title: 'Share Location',
    description: 'Keep trusted contacts updated about your location'
  },
  {
    icon: 'flash' as keyof typeof Ionicons.glyphMap,
    title: 'Emergency SOS',
    description: 'Triple click power button for quick SOS'
  },
  {
    icon: 'compass' as keyof typeof Ionicons.glyphMap,
    title: 'Safe Routes',
    description: 'Always take well-lit and crowded paths'
  },
  // Add more tips as needed
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  darkContainer: {
    backgroundColor: '#121212',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
  },
  darkSection: {
    backgroundColor: '#1E1E1E',
  },
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  darkText: {
    color: '#FFFFFF',
  },
  locationText: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  darkSubtext: {
    color: '#888888',
  },
  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    padding: 12,
    borderRadius: 25,
    gap: 8,
  },
  sosButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  scoreCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 2,
  },
  card: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  darkCard: {
    backgroundColor: '#2D2D2D',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  cardText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  scoreBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#eee',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreProgress: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    width: width / 3.5,
  },
  darkActionButton: {
    backgroundColor: '#2D2D2D',
  },
  actionText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  alertInfo: {
    marginLeft: 12,
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  alertDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  tipCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    width: width * 0.6,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
  },
  tipDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  contactCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    alignItems: 'center',
    width: width * 0.35,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
  },
  contactPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});
