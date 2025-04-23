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

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const fetchedReports = snapshot.docs.map(doc => ({
            id: doc.id,
            type: doc.data().type || 'Unknown',
            location: doc.data().location || { latitude: 0, longitude: 0 },
            description: doc.data().description || 'No description provided',
            verified: doc.data().verified || false,
            timeAgo: formatTimeAgo(doc.data().timestamp?.toDate()),
          }));
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

  const formatLocation = (location: string | { latitude: number; longitude: number } | undefined): string => {
    if (!location) return 'Unknown location';
    if (typeof location === 'string') return location;
    return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
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
          location: doc.data().location || { latitude: 0, longitude: 0 },
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
          <View key={index} style={styles.reportCard}>
            <View style={styles.reportHeader}>
              <View style={styles.reportType}>
                <Ionicons name="alert-circle" size={20} color="#ff4d4f" />
                <Text style={styles.reportTypeText}>{report.type}</Text>
              </View>
              <Text style={styles.timeAgo}>{report.timeAgo}</Text>
            </View>
            <View style={styles.locationContainer}>
              <Ionicons name="location" size={16} color="#666" />
              <Text style={styles.location}>{formatLocation(report.location)}</Text>
            </View>
            <Text style={styles.description}>{report.description}</Text>
            <View style={styles.reportFooter}>
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
                location: doc.data().location || { latitude: 0, longitude: 0 },
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
    backgroundColor: '#f8f9fa',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#eee',
  },
  activeTab: {
    backgroundColor: '#1E90FF',
  },
  tabText: {
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#fff',
  },
  content: {
    padding: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterText: {
    color: '#666',
    fontSize: 14,
  },
  reportCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reportTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff4d4f',
  },
  timeAgo: {
    color: '#666',
    fontSize: 14,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  location: {
    marginLeft: 4,
    color: '#666',
  },
  description: {
    fontSize: 14,
    color: '#444',
    marginBottom: 12,
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    color: '#1E90FF',
    fontSize: 14,
  },
  safeSpotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },
  safeSpotIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeSpotInfo: {
    flex: 1,
    marginLeft: 12,
  },
  safeSpotName: {
    fontSize: 16,
    fontWeight: '600',
  },
  safeSpotDistance: {
    color: '#666',
    fontSize: 14,
  },
  safeSpotStatus: {
    color: '#4CAF50',
    fontSize: 14,
  },
  directionButton: {
    backgroundColor: '#1E90FF',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },
  tipContent: {
    marginLeft: 12,
    flex: 1,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  tipDescription: {
    color: '#666',
    fontSize: 14,
  },
  darkContainer: {
    backgroundColor: '#1a1a1a',
  },
  darkCard: {
    backgroundColor: '#2d2d2d',
  },
  darkText: {
    color: '#fff',
  },
  darkFilterChip: {
    backgroundColor: '#2d2d2d',
    borderColor: '#444',
  },
  activeFilterChip: {
    backgroundColor: '#1E90FF',
    borderColor: '#1E90FF',
  },
  activeFilterText: {
    color: '#fff',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#ff4d4f',
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
  },
});
