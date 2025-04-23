import { useState, useEffect } from 'react';
import Toast from 'react-native-toast-message';
import { View, Text, StyleSheet, Image, TouchableOpacity, TextInput, Alert, ScrollView, Switch, Platform, Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '@/firebase/config';
import { signOut } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [userName, setUserName] = useState('');
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingEmergency, setEditingEmergency] = useState(false);
  const [emergencyContact, setEmergencyContact] = useState('+91 9876543210');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const router = useRouter();

  const [trustedContacts, setTrustedContacts] = useState([
    { name: 'Mom', phone: '+91 9876543210' },
    { name: 'Sister', phone: '+91 9876543211' },
  ]);
  const [locationSharing, setLocationSharing] = useState(true);
  const [safetyAlerts, setSafetyAlerts] = useState(true);
  const [biometricLock, setBiometricLock] = useState(false);
  const [emergencyInfo, setEmergencyInfo] = useState({
    bloodGroup: 'O+',
    allergies: 'None',
    medications: 'None',
  });

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingContactIndex, setEditingContactIndex] = useState<number | null>(null);
  const [tempContactName, setTempContactName] = useState('');
  const [tempContactPhone, setTempContactPhone] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setUserName(userDoc.data().name || '');
          setEmergencyContact(userDoc.data().emergencyContact || '');
          setEmergencyInfo({
            bloodGroup: userDoc.data().bloodGroup || 'Not Set',
            allergies: userDoc.data().allergies || 'None',
            medications: userDoc.data().medications || 'None'
          });
          setTrustedContacts(userDoc.data().trustedContacts || []);
        }
      }
    };
    fetchUserData();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/login'); // Redirect to login after logout
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleSaveChanges = async () => {
    try {
      if (auth.currentUser) {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userDocRef, {
          name: userName,
          emergencyContact,
        });
      } else {
        console.error('No authenticated user found.');
        Alert.alert('Error', 'No authenticated user found. Please log in again.');
      }
      Alert.alert('Profile Updated', 'Your changes have been saved.');
      setEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setProfilePicture(result.assets[0].uri);
      Alert.alert('Profile Picture Updated', 'Your profile picture has been updated.');
    }
  };

  const handleEditContact = (index: number) => {
    setEditingContactIndex(index);
    setTempContactName(trustedContacts[index].name);
    setTempContactPhone(trustedContacts[index].phone);
    setIsModalVisible(true);
  };

  const handleAddContact = () => {
    setEditingContactIndex(null);
    setTempContactName('');
    setTempContactPhone('+91');
    setIsModalVisible(true);
  };

  const handleSaveContact = async () => {
    try {
      const newContact = { name: tempContactName, phone: tempContactPhone };
      let newContacts;

      if (editingContactIndex !== null) {
        // Edit existing contact
        newContacts = [...trustedContacts];
        newContacts[editingContactIndex] = newContact;
      } else {
        // Add new contact
        newContacts = [...trustedContacts, newContact];
      }

      setTrustedContacts(newContacts);
      await updateUserData({ trustedContacts: newContacts });
      Toast.show({
        type: 'success',
        text1: editingContactIndex !== null ? 'Contact updated' : 'Contact added',
        position: 'top',
      });
      }
    catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed to save contact',
        position: 'top',
      });
    }
  };

  const handleUpdateEmergencyInfo = async () => {
    try {
      await updateUserData({ 
        emergencyInfo,
        emergencyContact 
      });
      setEditingEmergency(false);
      Alert.alert('Success', 'Emergency information updated');
    } catch (error) {
      Alert.alert('Error', 'Failed to update emergency information');
    }
  };

  const updateUserData = async (data: any) => {
    if (auth.currentUser) {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, data);
    }
  };

  return (
    <ScrollView style={[styles.container, isDark && styles.darkContainer]}>
      <View style={[styles.header, isDark && styles.darkSection]}>
        <TouchableOpacity onPress={handlePickImage}>
          <Image
            source={profilePicture ? { uri: profilePicture } : require('@/assets/images/profile-placeholder.jpg')}
            style={styles.avatar}
          />
          <Text style={styles.changePictureText}>Change Picture</Text>
        </TouchableOpacity>
        
        <Text style={[styles.userName, isDark && styles.darkText]}>{userName}</Text>
        <View style={styles.statusBadge}>
          <Ionicons name="shield-checkmark" size={16} color="#4CAF50" />
          <Text style={styles.statusText}>Protected</Text>
        </View>
      </View>

      <View style={[styles.section, isDark && styles.darkSection]}>
        <Text style={[styles.sectionTitle, isDark && styles.darkTitle]}>Trusted Contacts</Text>
        {trustedContacts.map((contact, index) => (
          <View key={index} style={[styles.contactCard, isDark && styles.darkCard]}>
            <Ionicons name="person-circle" size={24} color={isDark ? '#888' : '#666'} />
            <View style={styles.contactInfo}>
              <Text style={[styles.contactName, isDark && styles.darkText]}>{contact.name}</Text>
              <Text style={[styles.contactPhone, isDark && styles.darkSubtext]}>{contact.phone}</Text>
            </View>
            <TouchableOpacity onPress={() => handleEditContact(index)}>
              <Ionicons name="create-outline" size={24} color="#1E90FF" />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity 
          style={[styles.addButton, isDark && styles.darkAddButton]}
          onPress={handleAddContact}
        >
          <Text style={styles.addButtonText}>+ Add Trusted Contact</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.section, isDark && styles.darkSection]}>
        <Text style={[styles.sectionTitle, isDark && styles.darkTitle]}>Safety Settings</Text>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Location Sharing</Text>
            <Text style={styles.settingDescription}>Share location with trusted contacts</Text>
          </View>
          <Switch
            value={locationSharing}
            onValueChange={setLocationSharing}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={locationSharing ? '#1E90FF' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Safety Alerts</Text>
            <Text style={styles.settingDescription}>Receive alerts about incidents nearby</Text>
          </View>
          <Switch
            value={safetyAlerts}
            onValueChange={setSafetyAlerts}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={safetyAlerts ? '#1E90FF' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Biometric Lock</Text>
            <Text style={styles.settingDescription}>Secure app with fingerprint/face ID</Text>
          </View>
          <Switch
            value={biometricLock}
            onValueChange={setBiometricLock}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={biometricLock ? '#1E90FF' : '#f4f3f4'}
          />
        </View>
      </View>

      <View style={[styles.section, isDark && styles.darkSection]}>
        <Text style={[styles.sectionTitle, isDark && styles.darkTitle]}>Emergency Information</Text>
        <View style={[styles.emergencyCard, isDark && styles.darkCard]}>
          {editingEmergency ? (
            <>
              {Object.keys(emergencyInfo).map((key) => (
                <View key={key} style={styles.emergencyItem}>
                  <Text style={[styles.emergencyLabel, isDark && styles.darkSubtext]}>
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </Text>
                  <TextInput
                    style={[styles.input, isDark && styles.darkInput]}
                    value={emergencyInfo[key as keyof typeof emergencyInfo]}
                    onChangeText={(text) => setEmergencyInfo(prev => ({...prev, [key]: text}))}
                  />
                </View>
              ))}
              <TouchableOpacity 
                style={styles.editButton}
                onPress={handleUpdateEmergencyInfo}
              >
                <Text style={styles.buttonText}>Save Changes</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {Object.entries(emergencyInfo).map(([key, value]) => (
                <View key={key} style={styles.emergencyItem}>
                  <Text style={[styles.emergencyLabel, isDark && styles.darkSubtext]}>
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </Text>
                  <Text style={[styles.emergencyValue, isDark && styles.darkText]}>{value}</Text>
                </View>
              ))}
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => setEditingEmergency(true)}
              >
                <Text style={styles.buttonText}>Edit Emergency Info</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDark && styles.darkModalContent]}>
            <Text style={[styles.modalTitle, isDark && styles.darkText]}>
              {editingContactIndex !== null ? 'Edit Contact' : 'Add Contact'}
            </Text>
            
            <TextInput
              style={[styles.modalInput, isDark && styles.darkInput]}
              placeholder="Contact Name"
              placeholderTextColor={isDark ? '#888' : '#666'}
              value={tempContactName}
              onChangeText={setTempContactName}
            />
            
            <TextInput
              style={[styles.modalInput, isDark && styles.darkInput]}
              placeholder="Phone Number"
              placeholderTextColor={isDark ? '#888' : '#666'}
              value={tempContactPhone}
              onChangeText={setTempContactPhone}
              keyboardType="phone-pad"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveContact}
              >
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#4CAF50',
    marginLeft: 4,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#1E90FF',
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
  },
  contactPhone: {
    color: '#666',
  },
  addButton: {
    borderWidth: 1,
    borderColor: '#1E90FF',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: '#1E90FF',
    fontWeight: '500',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingDescription: {
    color: '#666',
    fontSize: 14,
  },
  emergencyCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
  },
  emergencyItem: {
    marginBottom: 12,
  },
  emergencyLabel: {
    color: '#666',
    fontSize: 14,
  },
  emergencyValue: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 4,
  },
  buttons: {
    padding: 16,
    marginTop: 16,
  },
  editButton: {
    backgroundColor: '#1E90FF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  changePictureText: {
    color: '#1E90FF',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  darkContainer: {
    backgroundColor: '#121212',
  },
  darkSection: {
    backgroundColor: '#1E1E1E',
    borderColor: '#333',
  },
  darkCard: {
    backgroundColor: '#2D2D2D',
  },
  darkText: {
    color: '#FFFFFF',
  },
  darkSubtext: {
    color: '#888888',
  },
  darkTitle: {
    color: '#1E90FF',
  },
  darkAddButton: {
    borderColor: '#1E90FF',
    backgroundColor: '#2D2D2D',
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
    fontSize: 16,
  },
  darkInput: {
    backgroundColor: '#333',
    color: '#fff',
    borderColor: '#444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  darkModalContent: {
    backgroundColor: '#2D2D2D',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
  },
  saveButton: {
    backgroundColor: '#1E90FF',
  },
});
