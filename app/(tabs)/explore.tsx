import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Share, Linking, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, query, where, orderBy, getDocs, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/config';
import * as Location from 'expo-location';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

const mockReports = [
  {
    id: '1',
    type: 'Stalking',
    location: 'Near Metro Station',
    timeAgo: '12 mins ago',
    description: 'A man followed me aggressively on the platform.',
    verified: true,
  },
  {
    id: '2',
    type: 'Harassment',
    location: 'Cafe Lane',
    timeAgo: '30 mins ago',
    description: 'Verbal abuse reported by 2 users.',
    verified: false,
  },
  {
    id: '3',
    type: 'Catcalling',
    location: 'Park Entrance',
    timeAgo: '1 hour ago',
    description: 'Two men whistled and shouted at a jogger.',
    verified: true,
  },
];

const safeSpots = [
  {
    name: 'Women Police Station',
    distance: '1.2 km',
    status: 'Open 24/7',
    type: 'Police',
  },
  {
    name: 'Safe Shelter Home',
    distance: '0.8 km',
    status: 'Available',
    type: 'Shelter',
  },
  {
    name: 'Women Help Center',
    distance: '2.1 km',
    status: 'Open',
    type: 'Help Center',
  },
];

const SafetyTips = [
  {
    title: 'Share Live Location',
    description: 'Keep trusted contacts updated about your whereabouts',
    icon: 'location',
  },
  {
    title: 'Stay Connected',
    description: 'Keep your phone charged and always on',
    icon: 'battery-charging',
  },
  {
    title: 'Use Safe Routes',
    description: 'Stick to well-lit and populated areas',
    icon: 'map',
  },
];

const INCIDENT_COLORS = {
  'Stalking': '#FF3B30',
  'Harassment': '#FF9500',
  'Catcalling': '#FF2D55',
  'Theft': '#5856D6', 
  'Unsafe Area': '#FF9500',
  'Poor Lighting': '#34C759',
  'Suspicious Activity': '#FF3B30',
  'Other': '#8E8E93',
};

export default function ExploreScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [activeTab, setActiveTab] = useState('reports');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('recent');
  interface Report {
    id: string;
    type: string;
    location: string | { latitude: number; longitude: number };
    timeAgo: string;
    description: string;
    verified: boolean;
  }
  
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const q = query(
          collection(db, 'incidentReports'),
          orderBy('timestamp', 'desc')
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
          const reportPromises = snapshot.docs.map(async doc => {
            const data = doc.data();
            let locationDisplay = '';

            if (data.location) {
              locationDisplay = await formatLocation(data.location);
            } else {
              locationDisplay = await formatLocation(null);
            }

            return {
              id: doc.id,
              type: data.type || 'Unknown',
              location: locationDisplay,
              description: data.description || 'No description provided',
              verified: data.verified || false,
              timeAgo: formatTimeAgo(data.timestamp?.toDate()),
            };
          });

          const fetchedReports = await Promise.all(reportPromises);
          setReports(fetchedReports);
          setLoading(false);
        }, (err) => {
          console.error('Error fetching reports:', err);
          setError(err.message);
          setLoading(false);
          setReports(mockReports);
        });

        return () => unsubscribe();
      } catch (err: any) {
        console.error('Failed to set up reports listener:', err);
        setError(err.message);
        setLoading(false);
        setReports(mockReports);
      }
    };

    fetchReports();
  }, []);

  interface FormatTimeAgo {
    (date: Date | null | undefined): string;
  }

  const formatTimeAgo: FormatTimeAgo = (date) => {
    if (!date) return 'Unknown time';
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes} mins ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  };

  const formatLocation = async (location: any): Promise<string> => {
    if (!location) {
      try {
        // Get user's current location
        const currentLocation = await Location.getCurrentPositionAsync({});
        const [address] = await Location.reverseGeocodeAsync({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });
        return `${address.street || ''} ${address.city || ''} ${address.region || ''}`.trim();
      } catch {
        return 'Location unavailable';
      }
    }

    if (typeof location === 'string') return location;

    if (location.latitude && location.longitude) {
      try {
        const [address] = await Location.reverseGeocodeAsync({
          latitude: location.latitude,
          longitude: location.longitude,
        });
        return `${address.street || ''} ${address.city || ''} ${address.region || ''}`.trim();
      } catch {
        return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
      }
    }

    return 'Location unavailable';
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.length > 0) {
      const filtered = reports.filter(report => 
        (report.type ?? '').toLowerCase().includes(text.toLowerCase()) ||
        typeof report.location === 'string' && report.location.toLowerCase().includes(text.toLowerCase())
      );
      setReports(filtered);
    } else {
      const q = query(
        collection(db, 'incidentReports'),
        orderBy('timestamp', 'desc')
      );
      onSnapshot(q, (snapshot) => {
        const fetchedReports = snapshot.docs.map(doc => ({
          id: doc.id,
          type: doc.data().type || 'Unknown',
          location: doc.data().locationName || 'Unknown Location', // Use location name
          description: doc.data().description || 'No description provided',
          verified: doc.data().verified || false,
          timeAgo: formatTimeAgo(doc.data().timestamp?.toDate()),
        }));
        setReports(fetchedReports);
      });
    }
  };

  const handleFilter = async (filter: string) => {
    setActiveFilter(filter);
    let filteredReports = [...mockReports];

    switch (filter) {
      case 'recent':
        filteredReports.sort((a, b) => b.timeAgo.localeCompare(a.timeAgo));
        break;
      case 'nearest':
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const location = await Location.getCurrentPositionAsync({});
          }
        } catch (error) {
          Alert.alert('Location Error', 'Unable to get current location');
        }
        break;
      case 'verified':
        filteredReports = filteredReports.filter(report => report.verified);
        break;
    }
    setReports(filteredReports);
  };

  const handleShare = async (report: any) => {
    try {
      await Share.share({
        message: `Safety Alert: ${report.type} reported at ${report.location}. ${report.description}`,
      });
    } catch (error) {
      Alert.alert('Error', 'Unable to share report');
    }
  };

  const handleReport = async (report: any) => {
    Alert.alert(
      'Report Incident',
      'Is this information incorrect or inappropriate?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Report',
          onPress: async () => {
            try {
              await addDoc(collection(db, 'reportedIncidents'), {
                reportId: report.id,
                timestamp: serverTimestamp(),
                reason: 'User reported'
              });
              Alert.alert('Thank you', 'We will review this report');
            } catch (error) {
              Alert.alert('Error', 'Failed to submit report');
            }
          }
        }
      ]
    );
  };

  const handleDirections = async (spot: any) => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${spot.latitude},${spot.longitude}`;
    const label = spot.name;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });

    try {
      const supported = await Linking.canOpenURL(url!);
      if (supported) {
        await Linking.openURL(url!);
      } else {
        Alert.alert('Error', 'Unable to open maps');
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to open maps');
    }
  };

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <Ionicons name="search" size={20} color="#666" />
      <TextInput
        style={styles.searchInput}
        placeholder="Search area or incident type..."
        value={searchQuery}
        onChangeText={handleSearch}
      />
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      {['Reports', 'Safe Places', 'Safety Tips'].map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[
            styles.tab,
            activeTab === tab.toLowerCase() && styles.activeTab,
          ]}
          onPress={() => setActiveTab(tab.toLowerCase())}
        >
          <Text style={[
            styles.tabText,
            activeTab === tab.toLowerCase() && styles.activeTabText,
          ]}>
            {tab}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const getIncidentColor = (type: string) => {
    return INCIDENT_COLORS[type as keyof typeof INCIDENT_COLORS] || '#1E90FF';
  };

  const renderReports = () => (
    <View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E90FF" />
          <Text style={[styles.loadingText, isDark && styles.darkText]}>Loading reports...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, isDark && styles.darkText]}>
            {error}. Pull down to retry.
          </Text>
        </View>
      ) : reports.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, isDark && styles.darkText]}>
            No reports found.
          </Text>
        </View>
      ) : (
        reports.map((report, index) => (
          <View 
            key={index} 
            style={[
              styles.reportTile,
              isDark && styles.darkTile,
              {
                borderLeftWidth: 4,
                borderLeftColor: getIncidentColor(report.type),
              }
            ]}
          >
            <View style={styles.reportHeader}>
              <Text style={[
                styles.reportType,
                isDark && styles.darkText,
                { color: getIncidentColor(report.type) }
              ]}>
                {report.type}
              </Text>
              <Text style={[styles.timeAgo, isDark && styles.darkText]}>{report.timeAgo}</Text>
            </View>
            <Text style={[styles.reportLocation, isDark && styles.darkText]}>
              {typeof report.location === 'string' ? report.location : 'Location unavailable'}
            </Text>
            <Text style={[styles.reportDescription, isDark && styles.darkText]}>
              {report.description}
            </Text>
            <View style={styles.reportActions}>
              <TouchableOpacity style={styles.actionButton} onPress={() => handleShare(report)}>
                <Ionicons name="share-social" size={16} color="#1E90FF" />
                <Text style={styles.actionText}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => handleReport(report)}>
                <Ionicons name="warning" size={16} color="#1E90FF" />
                <Text style={styles.actionText}>Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </View>
  );

  const renderSafePlaces = () => (
    <View>
      {safeSpots.map((spot, index) => (
        <View key={index} style={styles.safeSpotCard}>
          <View style={styles.safeSpotIcon}>
            <Ionicons name={
              spot.type === 'Police' ? 'shield' :
              spot.type === 'Shelter' ? 'home' : 'medical'
            } size={24} color="#4CAF50" />
          </View>
          <View style={styles.safeSpotInfo}>
            <Text style={styles.safeSpotName}>{spot.name}</Text>
            <Text style={styles.safeSpotDistance}>{spot.distance}</Text>
            <Text style={styles.safeSpotStatus}>{spot.status}</Text>
          </View>
          <TouchableOpacity style={styles.directionButton} onPress={() => handleDirections(spot)}>
            <Ionicons name="navigate" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );

  const renderSafetyTips = () => (
    <View>
      {SafetyTips.map((tip, index) => (
        <View key={index} style={styles.tipCard}>
          <Ionicons name={tip.icon as keyof typeof Ionicons.glyphMap} size={24} color="#1E90FF" />
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>{tip.title}</Text>
            <Text style={styles.tipDescription}>{tip.description}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <ScrollView 
      style={[styles.container, isDark && styles.darkContainer]}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={() => {
            setLoading(true);
            setError(null);
            const q = query(
              collection(db, 'incidentReports'),
              orderBy('timestamp', 'desc')
            );
            onSnapshot(q, (snapshot) => {
              const fetchedReports = snapshot.docs.map(doc => ({
                id: doc.id,
                type: doc.data().type || 'Unknown',
                location: doc.data().locationName || 'Unknown Location', // Use location name
                description: doc.data().description || 'No description provided',
                verified: doc.data().verified || false,
                timeAgo: formatTimeAgo(doc.data().timestamp?.toDate()),
              }));
              setReports(fetchedReports);
              setLoading(false);
            });
          }}
        />
      }
    >
      {renderSearchBar()}
      {renderTabs()}
      <View style={styles.content}>
        {activeTab === 'reports' && renderReports()}
        {activeTab === 'safe places' && renderSafePlaces()}
        {activeTab === 'safety tips' && renderSafetyTips()}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f9fa',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginRight: 12,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  activeTab: {
    backgroundColor: '#1E90FF',
    elevation: 4,
    shadowColor: '#1E90FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  tabText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 15,
  },
  activeTabText: {
    color: '#fff',
  },
  content: {
    padding: 16,
  },
  reportTile: {
    backgroundColor: '#ffffff',  // Pure white background
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    overflow: 'hidden',
  },
  darkTile: {
    backgroundColor: '#2d2d2d',
    borderColor: '#404040',
  },
  darkText: {
    color: '#ffffff',  // Keep white text for dark mode
  },
  safeSpotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  darkContainer: {
    backgroundColor: '#121212',
  },
  darkCard: {
    backgroundColor: '#2d2d2d',
    borderColor: '#404040',
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reportType: {
    fontSize: 18,
    fontWeight: '700',
    // Remove the fixed color since we'll set it dynamically
  },
  timeAgo: {
    fontSize: 14,
    color: '#666',
  },
  reportLocation: {
    fontSize: 15,
    marginBottom: 10,
    color: '#000000',  // Pure black text
    fontWeight: '500',
  },
  reportDescription: {
    fontSize: 15,
    marginBottom: 16,
    color: '#000000',  // Pure black text
    lineHeight: 22,
  },
  reportActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    marginTop: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  actionText: {
    fontSize: 14,
    color: '#1E90FF',
    fontWeight: '600',
  },
  safeSpotIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeSpotInfo: {
    flex: 1,
    marginLeft: 16,
  },
  safeSpotName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  safeSpotDistance: {
    fontSize: 15,
    color: '#666',
    marginBottom: 2,
  },
  safeSpotStatus: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  directionButton: {
    backgroundColor: '#1E90FF',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#1E90FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  tipContent: {
    flex: 1,
    marginLeft: 16,
  },
  tipTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  tipDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
  errorContainer: {
    padding: 32,
    alignItems: 'center',
  },
  errorText: {
    color: '#FF3B30',
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    fontSize: 16,
  },
});
