import { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text, ActivityIndicator, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { collection, query, getDocs, orderBy, where } from 'firebase/firestore';
import { db } from '@/firebase/config';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';

// Define the Incident interface
interface Incident {
  latitude: number;
  longitude: number;
  type: string;
  severity: string;
  timestamp: Date;
}

// Define the Route interface
interface Route {
  points: { latitude: number; longitude: number }[];
  safetyScore: number;
  distance: string;
  estimatedTime: string;
}

export default function SafeRoutesScreen() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [loading, setLoading] = useState(true);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    fetchIncidents();
    getCurrentLocation();
  }, []);

  const fetchIncidents = async () => {
    try {
      // First try with both filter and order
      const q = query(
        collection(db, 'incidentReports'),
        where('verified', '==', true),
        orderBy('timestamp', 'desc')
      );

      try {
        const snapshot = await getDocs(q);
        const incidentData: Incident[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.latitude && data.longitude) {
            incidentData.push({
              latitude: data.latitude,
              longitude: data.longitude,
              type: data.type,
              severity: data.severity,
              timestamp: data.timestamp.toDate(),
            });
          }
        });
        setIncidents(incidentData);
      } catch (indexError) {
        // If index is not ready, fall back to simple query
        console.warn('Index not ready, falling back to simple query:', indexError);
        const fallbackQuery = query(
          collection(db, 'incidentReports'),
          orderBy('timestamp', 'desc')
        );
        const fallbackSnapshot = await getDocs(fallbackQuery);
        const fallbackData: Incident[] = [];
        fallbackSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.latitude && data.longitude && data.verified) {
            fallbackData.push({
              latitude: data.latitude,
              longitude: data.longitude,
              type: data.type,
              severity: data.severity,
              timestamp: data.timestamp.toDate(),
            });
          }
        });
        setIncidents(fallbackData);
      }
    } catch (error) {
      console.error('Error fetching incidents:', error);
      setIncidents([]); // Set empty array on error
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setCurrentLocation(location);
      } else {
        Alert.alert('Permission needed', 'Please enable location services to use this feature');
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const getMapHTML = () => {
    const lat = currentLocation?.coords.latitude || 20.5937;
    const lng = currentLocation?.coords.longitude || 78.9629;
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
          <script src="https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js"></script>
          <style>
            body { margin: 0; }
            #map { height: 100vh; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            const map = L.map('map').setView([${lat}, ${lng}], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors'
            }).addTo(map);
            
            // Add marker for current location
            L.marker([${lat}, ${lng}])
              .addTo(map)
              .bindPopup('You are here')
              .openPopup();

            // Convert incidents to heatmap data points
            const heatPoints = ${JSON.stringify(incidents.map(incident => {
              // Calculate intensity based on severity
              const intensity = incident.severity === 'High' ? 1.0 : 
                              incident.severity === 'Medium' ? 0.7 : 0.4;
              return [incident.latitude, incident.longitude, intensity];
            }))};

            // Add heatmap layer
            L.heatLayer(heatPoints, {
              radius: 25,
              blur: 15,
              maxZoom: 10,
              gradient: {
                0.4: '#ffffb2',
                0.6: '#fd8d3c',
                0.8: '#f03b20',
                1.0: '#bd0026'
              }
            }).addTo(map);

            // Add markers for incidents with popups
            ${incidents.map(incident => `
              L.marker([${incident.latitude}, ${incident.longitude}])
                .addTo(map)
                .bindPopup(
                  '<div style="text-align: center;">' +
                  '<strong>${incident.type}</strong><br>' +
                  '<span style="color: ${
                    incident.severity === 'High' ? '#bd0026' : 
                    incident.severity === 'Medium' ? '#f03b20' : '#fd8d3c'
                  };">${incident.severity}</span>' +
                  '</div>'
                );
            `).join('')}
          </script>
        </body>
      </html>
    `;
  };

  return (
    <View style={[styles.container, isDark && styles.darkContainer]}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="location" size={20} color="#666" />
          <TextInput
            style={styles.input}
            placeholder="Starting point"
            value={source}
            onChangeText={setSource}
          />
        </View>
        <View style={styles.searchBox}>
          <Ionicons name="navigate" size={20} color="#666" />
          <TextInput
            style={styles.input}
            placeholder="Destination"
            value={destination}
            onChangeText={setDestination}
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#1E90FF" style={styles.loader} />
      ) : (
        <WebView
          source={{ html: getMapHTML() }}
          style={styles.map}
          onLoadEnd={() => setLoading(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  darkContainer: {
    backgroundColor: '#000',
  },
  searchContainer: {
    position: 'absolute',
    top: 10,
    width: '100%',
    padding: 10,
    zIndex: 1,
    gap: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  map: {
    flex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
