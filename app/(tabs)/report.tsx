import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Image, Platform } from 'react-native';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/firebase/config';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from '@/hooks/useColorScheme';

const incidentTypes = [
  'Harassment', 'Stalking', 'Theft', 'Unsafe Area', 
  'Poor Lighting', 'Suspicious Activity', 'Other'
];

const severityLevels = ['Low', 'Medium', 'High', 'Critical'];

export default function ReportScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [severity, setSeverity] = useState('Medium');
  const [image, setImage] = useState<string | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [anonymous, setAnonymous] = useState(false);
  const [pressedButtons, setPressedButtons] = useState<{[key: string]: boolean}>({});

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to add images');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
        Toast.show({
          type: 'success',
          text1: 'Image added successfully',
          position: 'top',
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add image');
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required for accurate reporting.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setLocation(location);
      Toast.show({
        type: 'success',
        text1: 'Location added successfully',
        position: 'top',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to get location');
    }
  };

  const handleTypeSelection = (selectedType: string) => {
    setType(selectedType);
    Toast.show({
      type: 'info',
      text1: `Selected: ${selectedType}`,
      position: 'top',
    });
  };

  const handleSeveritySelection = (selectedSeverity: string) => {
    setSeverity(selectedSeverity);
    Toast.show({
      type: 'info',
      text1: `Severity set to: ${selectedSeverity}`,
      position: 'top',
    });
  };

  const toggleAnonymous = () => {
    setAnonymous(!anonymous);
    Toast.show({
      type: 'info',
      text1: `Reporting mode: ${!anonymous ? 'Anonymous' : 'Public'}`,
      position: 'top',
    });
  };

  const resetForm = () => {
    setType('');
    setDescription('');
    setName('');
    setSeverity('Medium');
    setImage(null);
    setLocation(null);
    setAnonymous(false);
  };

  const handleButtonPress = (buttonId: string) => {
    setPressedButtons(prev => ({...prev, [buttonId]: true}));
  };

  const handleButtonRelease = (buttonId: string) => {
    setPressedButtons(prev => ({...prev, [buttonId]: false}));
    
    // Add haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const submitReport = async () => {
    if (!type || !description) {
      Alert.alert('Missing Fields', 'Please select incident type and provide description');
      return;
    }

    setLoading(true);

    try {
      // Validate user authentication
      if (!auth.currentUser) {
        Alert.alert('Authentication Error', 'Please log in to submit a report');
        return;
      }

      const reportData = {
        type,
        description,
        severity,
        timestamp: serverTimestamp(),
        location: location ? {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        } : null,
        image: image,
        reportedBy: anonymous ? 'Anonymous' : (auth.currentUser?.displayName || 'Unknown'),
        userId: anonymous ? null : auth.currentUser?.uid,
        verified: false,
        status: 'pending',
      };

      await addDoc(collection(db, 'incidentReports'), reportData);

      Toast.show({
        type: 'success',
        text1: '✅ Report submitted successfully!',
        position: 'top',
        visibilityTime: 3000,
      });

      resetForm();
    } catch (error: any) {
      console.error('Failed to submit report:', error);
      Toast.show({
        type: 'error',
        text1: '❌ Failed to submit report',
        text2: error.message || 'Please try again',
        position: 'top',
        visibilityTime: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, isDark && styles.darkContainer]}>
      <Text style={[styles.heading, isDark && styles.darkText]}>Report an Incident</Text>

      <View style={styles.typeContainer}>
        {incidentTypes.map((incidentType) => (
          <TouchableOpacity
            key={incidentType}
            style={[
              styles.typeChip,
              type === incidentType && styles.selectedTypeChip,
              isDark && styles.darkTypeChip
            ]}
            onPress={() => handleTypeSelection(incidentType)}
          >
            <Text style={[
              styles.typeText,
              type === incidentType && styles.selectedTypeText,
              isDark && styles.darkText
            ]}>
              {incidentType}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, isDark && styles.darkText]}>Severity Level</Text>
      <View style={styles.severityContainer}>
        {severityLevels.map((level) => (
          <TouchableOpacity
            key={level}
            style={[
              styles.severityChip,
              severity === level && styles.selectedSeverityChip,
              isDark && styles.darkSeverityChip
            ]}
            onPress={() => handleSeveritySelection(level)}
          >
            <Text style={[
              styles.severityText,
              severity === level && styles.selectedSeverityChip,
              isDark && styles.darkText
            ]}>
              {level}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, isDark && styles.darkText]}>Description</Text>
      <TextInput
        style={[styles.input, { height: 100 }, isDark && styles.darkInput]}
        multiline
        placeholder="Describe what happened..."
        placeholderTextColor={isDark ? '#888' : '#666'}
        value={description}
        onChangeText={setDescription}
      />

      <View style={styles.mediaSection}>
        <TouchableOpacity 
          style={[
            styles.mediaButton, 
            isDark && styles.darkMediaButton,
            pressedButtons['photo'] && styles.pressedButton,
            image && styles.selectedButton
          ]} 
          onPressIn={() => handleButtonPress('photo')}
          onPressOut={() => handleButtonRelease('photo')}
          onPress={pickImage}
        >
          <Ionicons 
            name="camera" 
            size={24} 
            color={image ? '#fff' : (isDark ? '#fff' : '#1E90FF')} 
          />
          <Text style={[
            styles.mediaButtonText, 
            isDark && styles.darkText,
            image && styles.selectedButtonText
          ]}>
            {image ? 'Photo Added' : 'Add Photo'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.mediaButton, 
            isDark && styles.darkMediaButton,
            pressedButtons['location'] && styles.pressedButton,
            location && styles.selectedButton
          ]}
          onPressIn={() => handleButtonPress('location')}
          onPressOut={() => handleButtonRelease('location')}
          onPress={getCurrentLocation}
        >
          <Ionicons 
            name="location" 
            size={24} 
            color={location ? '#fff' : (isDark ? '#fff' : '#1E90FF')} 
          />
          <Text style={[
            styles.mediaButtonText, 
            isDark && styles.darkText,
            location && styles.selectedButtonText
          ]}>
            {location ? 'Location Added' : 'Add Location'}
          </Text>
        </TouchableOpacity>
      </View>

      {image && (
        <View style={styles.imagePreview}>
          <Image source={{ uri: image }} style={styles.previewImage} />
          <TouchableOpacity onPress={() => setImage(null)}>
            <Ionicons name="close-circle" size={24} color="red" />
          </TouchableOpacity>
        </View>
      )}

      {location && (
        <View style={styles.locationInfo}>
          <Ionicons name="location" size={16} color={isDark ? '#fff' : '#666'} />
          <Text style={[styles.locationText, isDark && styles.darkText]}>
            Location added successfully
          </Text>
          <TouchableOpacity onPress={() => setLocation(null)}>
            <Ionicons name="close-circle" size={20} color="red" />
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={[styles.toggleButton, isDark && styles.darkToggleButton]}
        onPress={toggleAnonymous}
      >
        <Ionicons 
          name={anonymous ? "eye-off" : "eye"} 
          size={24} 
          color={isDark ? '#fff' : '#1E90FF'} 
        />
        <Text style={[styles.toggleText, isDark && styles.darkText]}>
          {anonymous ? 'Report Anonymously' : 'Report with Identity'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.submitButton,
          loading && styles.buttonDisabled,
          isDark && styles.darkSubmitButton,
          pressedButtons['submit'] && styles.pressedSubmitButton
        ]}
        onPressIn={() => handleButtonPress('submit')}
        onPressOut={() => handleButtonRelease('submit')}
        onPress={submitReport}
        disabled={loading}
      >
        <Text style={styles.submitButtonText}>
          {loading ? 'Submitting...' : 'Submit Report'}
        </Text>
      </TouchableOpacity>

      <Toast />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 30,
    paddingHorizontal: 20,
    gap: 20,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    color: '#444',
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 14,
    borderRadius: 10,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#1E90FF',
    padding: 16,
    alignItems: 'center',
    borderRadius: 12,
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#1E90FF',
    padding: 16,
    alignItems: 'center',
    borderRadius: 12,
    marginTop: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedTypeChip: {
    backgroundColor: '#1E90FF',
    borderColor: '#1E90FF',
  },
  typeText: {
    color: '#666',
    fontSize: 14,
  },
  selectedTypeText: {
    color: '#fff',
  },
  severityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  severityChip: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  selectedSeverityChip: {
    backgroundColor: '#1E90FF',
  },
  mediaSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  imagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  mediaButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#444',
    marginLeft: 8,
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 8,
  },
  darkContainer: {
    backgroundColor: '#1a1a1a',
  },
  darkText: {
    color: '#fff',
  },
  darkInput: {
    backgroundColor: '#2d2d2d',
    color: '#fff',
    borderColor: '#444',
  },
  darkTypeChip: {
    backgroundColor: '#2d2d2d',
    borderColor: '#444',
  },
  darkSeverityChip: {
    backgroundColor: '#2d2d2d',
  },
  darkMediaButton: {
    backgroundColor: '#2d2d2d',
  },
  darkSubmitButton: {
    backgroundColor: '#1E90FF',
  },
  toggleButton: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  darkToggleButton: {
    backgroundColor: '#2d2d2d',
  },
  severityText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#444',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  locationText: {
    fontSize: 14,
    marginLeft: 4,
  },
  pressedButton: {
    backgroundColor: '#e0e0e0',
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  pressedSubmitButton: {
    backgroundColor: '#1873CC',
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    backgroundColor: '#A9A9A9',
    elevation: 0,
    shadowOpacity: 0,
  },
  selectedButton: {
    backgroundColor: '#1E90FF',
    borderColor: '#1E90FF',
  },
  selectedButtonText: {
    color: '#fff',
  },
});
