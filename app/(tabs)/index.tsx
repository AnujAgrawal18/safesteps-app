import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Animated } from 'react-native';
import { auth, db } from '@/firebase/config';
import { signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');

interface Report {
  id: string;
  type: string;
  timeAgo: string;
  description: string;
  location?: string;
}

interface QuickAction {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: "/saferoutes" | "/report" | "/profile" | "/explore";
}

interface SafetyTip {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export default function HomeScreen() {
  const [userName, setUserName] = useState('User');
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [safetyScore, setSafetyScore] = useState(85);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [trustedContacts, setTrustedContacts] = useState<any[]>([]);
  const [emergencyContact, setEmergencyContact] = useState('');
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const scrollY = new Animated.Value(0);
  const [isHovered, setIsHovered] = useState<string | null>(null);

  const headerScale = scrollY.interpolate({
    inputRange: [-100, 0, 100],
    outputRange: [1.2, 1, 0.8],
  });

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
    <ScrollView 
      style={[styles.container, isDark && styles.darkContainer]}
      onScroll={Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: true }
      )}
      scrollEventThrottle={16}
    >
      {/* Welcome Section */}
      <Animated.View 
        style={[
          styles.header,
          { transform: [{ scale: headerScale }] }
        ]}
      >
        <View style={styles.welcomeOverlay}>
          <View>
            <Text style={styles.greeting}>Hi {userName} 👋</Text>
            <Text style={styles.locationText}>
              {userLocation ? 'You are in a SafeZone ✅' : 'Fetching location...'}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.sosButton}
            onPress={handleQuickSOS}
          >
            <Text style={styles.sosButtonText}>Quick SOS</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Safety Score Card */}
      <View style={styles.scoreCard}>
        <View style={styles.scoreContent}>
          <Text style={styles.cardTitle}>Safety Score</Text>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreText}>{safetyScore}%</Text>
            <View style={styles.scoreBar}>
              <View style={[styles.scoreProgress, { width: `${safetyScore}%` }]} />
            </View>
          </View>
        </View>
      </View>

      {/* Quick Actions Grid */}
      <View style={styles.actionGrid}>
        {QUICK_ACTIONS.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.actionButton,
              isHovered === action.title && styles.actionButtonHovered
            ]}
            onPress={() => router.push(action.route)}
            onPressIn={() => setIsHovered(action.title)}
            onPressOut={() => setIsHovered(null)}
          >
            <Ionicons 
              name={action.icon} 
              size={32} 
              color={isDark ? '#fff' : '#1E90FF'} 
            />
            <Text style={[
              styles.actionText,
              isDark && styles.darkActionText
            ]}>{action.title}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent Alerts */}
      <View style={[styles.section, isDark && styles.darkSection]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Recent Alerts</Text>
          <TouchableOpacity 
            style={styles.seeAllButton}
            onPress={() => router.push('/explore')}
          >
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.alertsList}>
          {recentReports.slice(0, 2).map((report, index) => (
            <View key={index} style={styles.miniAlert}>
              <Ionicons name="warning" size={20} color="#FF3B30" />
              <Text style={styles.alertText}>{report.type}</Text>
              <Text style={styles.timeText}>{report.timeAgo}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Safety Tips */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Safety Tips</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.tipsCarousel}
        >
          {SAFETY_TIPS.map((tip, index) => (
            <View key={index} style={styles.tipCard}>
              <Text style={styles.tipTitle}>{tip.title}</Text>
              <Text style={styles.tipDescription}>{tip.description}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
}

const QUICK_ACTIONS: QuickAction[] = [
  { title: 'Safe Routes', icon: 'map', route: '/saferoutes' },
  { title: 'Report', icon: 'warning', route: '/report' },
  { title: 'Contacts', icon: 'people', route: '/profile' },
  { title: 'Explore', icon: 'compass', route: '/explore' },
];

const SAFETY_TIPS: SafetyTip[] = [
  {
    title: 'Share Location',
    description: 'Keep trusted contacts updated about your location',
    icon: 'location',
  },
  {
    title: 'Emergency SOS',
    description: 'Triple click power button for quick SOS',
    icon: 'flash',
  },
  {
    title: 'Safe Routes',
    description: 'Always take well-lit and crowded paths',
    icon: 'compass',
  },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212', // Dark background
  },
  darkContainer: {
    backgroundColor: '#000', // Adjusted dark background for dark mode
  },
  header: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  welcomeOverlay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  locationText: {
    fontSize: 16,
    color: '#fff',
    marginTop: 4,
  },
  scoreCard: {
    margin: 16,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  scoreContent: {
    padding: 16,
    flex: 1,
    justifyContent: 'center',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    justifyContent: 'space-between',
  },
  actionButton: {
    width: (width - 48) / 2,
    height: 100,
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  miniAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  alertText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  tipsCarousel: {
    marginTop: 8,
  },
  tipCard: {
    width: width * 0.7,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
  },
  tipDescription: {
    fontSize: 14,
    color: '#555',
    marginTop: 8,
  },
  alertsList: {
    flex: 1,
    padding: 8,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  actionButtonHovered: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  darkSection: {
    backgroundColor: '#2D2D2D',
  },
  darkText: {
    color: '#FFFFFF',
  },
  darkActionText: {
    color: '#FFFFFF',
  },
  seeAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  seeAllText: {
    color: '#1E90FF',
    fontSize: 14,
    fontWeight: '500',
  },
  timeText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  scoreText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  scoreBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  scoreProgress: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 24,
    elevation: 2,
  },
  sosButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  actionText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
});
