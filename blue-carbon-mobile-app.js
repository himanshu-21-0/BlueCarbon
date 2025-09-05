// App.js - Main React Native Application
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  StatusBar,
  Image,
  ActivityIndicator,
  Dimensions,
  Modal,
  FlatList,
  RefreshControl,
  PermissionsAndroid
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from '@react-native-community/geolocation';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import DocumentPicker from 'react-native-document-picker';
import NetInfo from '@react-native-community/netinfo';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');

// Main App Component
export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [location, setLocation] = useState(null);
  const [projects, setProjects] = useState([]);
  const [mrvData, setMrvData] = useState([]);
  const [credits, setCredits] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState('');

  // Form states
  const [projectForm, setProjectForm] = useState({
    name: '',
    ecosystem: 'mangrove',
    coordinates: '',
    area: '',
    proponent: '',
    methodology: 'VM0033',
    duration: '',
    expectedCarbon: '',
    description: ''
  });

  const [mrvForm, setMrvForm] = useState({
    projectId: '',
    date: new Date().toISOString().split('T')[0],
    soilCarbon: '',
    ndviValue: '',
    canopyHeight: '',
    dbh: '',
    treeHeight: '',
    survivalRate: '',
    species: '',
    photos: []
  });

  // Initialize app
  useEffect(() => {
    checkPermissions();
    loadLocalData();
    checkNetworkConnection();
    loadSampleData();
  }, []);

  // Check permissions
  const checkPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        ]);
      } catch (err) {
        console.warn(err);
      }
    }
  };

  // Network connection monitoring
  const checkNetworkConnection = () => {
    NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });
  };

  // Load local data
  const loadLocalData = async () => {
    try {
      const storedProjects = await AsyncStorage.getItem('projects');
      const storedMrvData = await AsyncStorage.getItem('mrvData');
      const storedCredits = await AsyncStorage.getItem('credits');
      
      if (storedProjects) setProjects(JSON.parse(storedProjects));
      if (storedMrvData) setMrvData(JSON.parse(storedMrvData));
      if (storedCredits) setCredits(JSON.parse(storedCredits));
    } catch (error) {
      console.error('Error loading local data:', error);
    }
  };

  // Save data locally
  const saveLocalData = async (key, data) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving local data:', error);
    }
  };

  // Load sample data
  const loadSampleData = () => {
    const sampleProjects = [
      {
        id: 1,
        name: "Sundarbans Mangrove Restoration",
        ecosystem: "mangrove",
        coordinates: "22.2587, 89.9101",
        area: 150.5,
        proponent: "Bengal Coastal Conservation Society",
        methodology: "VM0033",
        duration: 25,
        expectedCarbon: 2250.5,
        status: "active",
        carbonSequestered: 1850.3,
        creditsIssued: 1665.27
      },
      {
        id: 2,
        name: "Kerala Backwater Seagrass Project",
        ecosystem: "seagrass",
        coordinates: "9.4981, 76.3388",
        area: 85.2,
        proponent: "Malabar Marine Foundation",
        methodology: "VM0033",
        duration: 20,
        expectedCarbon: 1420.5,
        status: "active",
        carbonSequestered: 892.1,
        creditsIssued: 802.89
      }
    ];
    setProjects(sampleProjects);
    saveLocalData('projects', sampleProjects);
  };

  // Get current location
  const getCurrentLocation = () => {
    setIsLoading(true);
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const coordinates = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        setLocation(position.coords);
        setProjectForm({ ...projectForm, coordinates });
        Alert.alert('Location Captured', coordinates);
        setIsLoading(false);
      },
      (error) => {
        Alert.alert('Location Error', error.message);
        setIsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );
  };

  // Take photo
  const takePhoto = () => {
    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      saveToPhotos: true,
    };

    launchCamera(options, (response) => {
      if (response.didCancel || response.error) {
        return;
      }
      const photo = response.assets[0];
      setMrvForm({
        ...mrvForm,
        photos: [...mrvForm.photos, photo]
      });
      Alert.alert('Success', 'Photo captured successfully');
    });
  };

  // Select file
  const selectFile = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.csv, DocumentPicker.types.xlsx],
      });
      Alert.alert('File Selected', result[0].name);
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        // User cancelled
      } else {
        Alert.alert('Error', 'Failed to select file');
      }
    }
  };

  // Submit project
  const submitProject = async () => {
    if (!projectForm.name || !projectForm.area || !projectForm.proponent) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setIsLoading(true);
    
    const newProject = {
      id: projects.length + 1,
      ...projectForm,
      area: parseFloat(projectForm.area),
      duration: parseInt(projectForm.duration),
      expectedCarbon: parseFloat(projectForm.expectedCarbon),
      status: 'pending',
      carbonSequestered: 0,
      creditsIssued: 0,
      registrationDate: new Date().toISOString(),
    };

    const updatedProjects = [...projects, newProject];
    setProjects(updatedProjects);
    await saveLocalData('projects', updatedProjects);

    // Sync with server if connected
    if (isConnected) {
      await syncWithServer('project', newProject);
    }

    Alert.alert('Success', 'Project registered successfully');
    setProjectForm({
      name: '',
      ecosystem: 'mangrove',
      coordinates: '',
      area: '',
      proponent: '',
      methodology: 'VM0033',
      duration: '',
      expectedCarbon: '',
      description: ''
    });
    setActiveTab('dashboard');
    setIsLoading(false);
  };

  // Submit MRV data
  const submitMRVData = async () => {
    if (!mrvForm.projectId) {
      Alert.alert('Error', 'Please select a project');
      return;
    }

    setIsLoading(true);

    const newMrvData = {
      id: mrvData.length + 1,
      ...mrvForm,
      timestamp: new Date().toISOString(),
      synced: isConnected
    };

    const updatedMrvData = [...mrvData, newMrvData];
    setMrvData(updatedMrvData);
    await saveLocalData('mrvData', updatedMrvData);

    if (isConnected) {
      await syncWithServer('mrv', newMrvData);
    }

    Alert.alert('Success', 'MRV data submitted successfully');
    setMrvForm({
      projectId: '',
      date: new Date().toISOString().split('T')[0],
      soilCarbon: '',
      ndviValue: '',
      canopyHeight: '',
      dbh: '',
      treeHeight: '',
      survivalRate: '',
      species: '',
      photos: []
    });
    setIsLoading(false);
  };

  // Sync with server
  const syncWithServer = async (type, data) => {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`Synced ${type} with server:`, data);
        resolve();
      }, 1000);
    });
  };

  // Refresh data
  const onRefresh = async () => {
    setRefreshing(true);
    await loadLocalData();
    setRefreshing(false);
  };

  // Render header
  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Blue Carbon Registry</Text>
      <Text style={styles.headerSubtitle}>MRV System</Text>
      <View style={styles.connectionStatus}>
        <Icon 
          name={isConnected ? "wifi" : "wifi-off"} 
          size={20} 
          color={isConnected ? "#22c55e" : "#ef4444"} 
        />
        <Text style={[styles.connectionText, { color: isConnected ? "#22c55e" : "#ef4444" }]}>
          {isConnected ? "Online" : "Offline Mode"}
        </Text>
      </View>
    </View>
  );

  // Render navigation tabs
  const renderTabs = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabContainer}>
      {['dashboard', 'register', 'mrv', 'credits', 'sync'].map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tab, activeTab === tab && styles.activeTab]}
          onPress={() => setActiveTab(tab)}
        >
          <Icon 
            name={getTabIcon(tab)} 
            size={24} 
            color={activeTab === tab ? "#fff" : "#94a3b8"} 
          />
          <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  // Get tab icon
  const getTabIcon = (tab) => {
    switch(tab) {
      case 'dashboard': return 'dashboard';
      case 'register': return 'add-circle';
      case 'mrv': return 'satellite';
      case 'credits': return 'monetization-on';
      case 'sync': return 'sync';
      default: return 'home';
    }
  };

  // Render dashboard
  const renderDashboard = () => (
    <ScrollView 
      style={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{projects.length}</Text>
          <Text style={styles.statLabel}>Total Projects</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {projects.reduce((sum, p) => sum + p.creditsIssued, 0).toFixed(0)}
          </Text>
          <Text style={styles.statLabel}>Credits Issued</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {projects.reduce((sum, p) => sum + p.carbonSequestered, 0).toFixed(0)}
          </Text>
          <Text style={styles.statLabel}>tCO₂e Sequestered</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{mrvData.length}</Text>
          <Text style={styles.statLabel}>MRV Records</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Recent Projects</Text>
      <FlatList
        data={projects}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.projectCard}>
            <View style={styles.projectHeader}>
              <Text style={styles.projectName}>{item.name}</Text>
              <View style={[styles.statusBadge, item.status === 'active' ? styles.activeStatus : styles.pendingStatus]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.projectDetail}>Ecosystem: {item.ecosystem}</Text>
            <Text style={styles.projectDetail}>Area: {item.area} hectares</Text>
            <Text style={styles.projectDetail}>Carbon Sequestered: {item.carbonSequestered.toFixed(1)} tCO₂e</Text>
          </View>
        )}
        scrollEnabled={false}
      />
    </ScrollView>
  );

  // Render register project form
  const renderRegisterForm = () => (
    <ScrollView style={styles.content}>
      <View style={styles.form}>
        <Text style={styles.formTitle}>Register New Project</Text>
        
        <Text style={styles.label}>Project Name *</Text>
        <TextInput
          style={styles.input}
          value={projectForm.name}
          onChangeText={(text) => setProjectForm({...projectForm, name: text})}
          placeholder="Enter project name"
          placeholderTextColor="#64748b"
        />

        <Text style={styles.label}>Ecosystem Type *</Text>
        <View style={styles.pickerContainer}>
          {['mangrove', 'seagrass', 'saltmarsh', 'wetland'].map((eco) => (
            <TouchableOpacity
              key={eco}
              style={[styles.pickerOption, projectForm.ecosystem === eco && styles.pickerOptionActive]}
              onPress={() => setProjectForm({...projectForm, ecosystem: eco})}
            >
              <Text style={[styles.pickerText, projectForm.ecosystem === eco && styles.pickerTextActive]}>
                {eco.charAt(0).toUpperCase() + eco.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Location Coordinates</Text>
        <View style={styles.locationContainer}>
          <TextInput
            style={[styles.input, styles.locationInput]}
            value={projectForm.coordinates}
            onChangeText={(text) => setProjectForm({...projectForm, coordinates: text})}
            placeholder="12.9716, 77.5946"
            placeholderTextColor="#64748b"
          />
          <TouchableOpacity style={styles.locationButton} onPress={getCurrentLocation}>
            <Icon name="my-location" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Area (Hectares) *</Text>
        <TextInput
          style={styles.input}
          value={projectForm.area}
          onChangeText={(text) => setProjectForm({...projectForm, area: text})}
          placeholder="50.5"
          keyboardType="numeric"
          placeholderTextColor="#64748b"
        />

        <Text style={styles.label}>Proponent Organization *</Text>
        <TextInput
          style={styles.input}
          value={projectForm.proponent}
          onChangeText={(text) => setProjectForm({...projectForm, proponent: text})}
          placeholder="Organization name"
          placeholderTextColor="#64748b"
        />

        <Text style={styles.label}>Methodology</Text>
        <View style={styles.pickerContainer}>
          {['VM0033', 'AR-ACM0003', 'AMS-III.BF'].map((method) => (
            <TouchableOpacity
              key={method}
              style={[styles.pickerOption, projectForm.methodology === method && styles.pickerOptionActive]}
              onPress={() => setProjectForm({...projectForm, methodology: method})}
            >
              <Text style={[styles.pickerText, projectForm.methodology === method && styles.pickerTextActive]}>
                {method}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Project Duration (Years)</Text>
        <TextInput
          style={styles.input}
          value={projectForm.duration}
          onChangeText={(text) => setProjectForm({...projectForm, duration: text})}
          placeholder="20"
          keyboardType="numeric"
          placeholderTextColor="#64748b"
        />

        <Text style={styles.label}>Expected Annual CO₂e (tonnes)</Text>
        <TextInput
          style={styles.input}
          value={projectForm.expectedCarbon}
          onChangeText={(text) => setProjectForm({...projectForm, expectedCarbon: text})}
          placeholder="1250.5"
          keyboardType="numeric"
          placeholderTextColor="#64748b"
        />

        <Text style={styles.label}>Project Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={projectForm.description}
          onChangeText={(text) => setProjectForm({...projectForm, description: text})}
          placeholder="Detailed description of the restoration project..."
          multiline
          numberOfLines={4}
          placeholderTextColor="#64748b"
        />

        <TouchableOpacity 
          style={styles.submitButton} 
          onPress={submitProject}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon name="save" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Register Project</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // Render MRV data collection
  const renderMRVForm = () => (
    <ScrollView style={styles.content}>
      <View style={styles.form}>
        <Text style={styles.formTitle}>Submit MRV Data</Text>

        <Text style={styles.label}>Select Project *</Text>
        <View style={styles.pickerContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {projects.map((project) => (
              <TouchableOpacity
                key={project.id}
                style={[styles.pickerOption, mrvForm.projectId === project.id.toString() && styles.pickerOptionActive]}
                onPress={() => setMrvForm({...mrvForm, projectId: project.id.toString()})}
              >
                <Text style={[styles.pickerText, mrvForm.projectId === project.id.toString() && styles.pickerTextActive]}>
                  {project.name.length > 20 ? project.name.substring(0, 20) + '...' : project.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <Text style={styles.label}>Monitoring Date</Text>
        <TextInput
          style={styles.input}
          value={mrvForm.date}
          onChangeText={(text) => setMrvForm({...mrvForm, date: text})}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#64748b"
        />

        <Text style={styles.sectionTitle}>Field Measurements</Text>

        <Text style={styles.label}>Soil Carbon (tCO₂e/ha)</Text>
        <TextInput
          style={styles.input}
          value={mrvForm.soilCarbon}
          onChangeText={(text) => setMrvForm({...mrvForm, soilCarbon: text})}
          placeholder="15.5"
          keyboardType="numeric"
          placeholderTextColor="#64748b"
        />

        <Text style={styles.label}>NDVI Value (-1 to 1)</Text>
        <TextInput
          style={styles.input}
          value={mrvForm.ndviValue}
          onChangeText={(text) => setMrvForm({...mrvForm, ndviValue: text})}
          placeholder="0.65"
          keyboardType="numeric"
          placeholderTextColor="#64748b"
        />

        <Text style={styles.label}>Canopy Height (meters)</Text>
        <TextInput
          style={styles.input}
          value={mrvForm.canopyHeight}
          onChangeText={(text) => setMrvForm({...mrvForm, canopyHeight: text})}
          placeholder="8.5"
          keyboardType="numeric"
          placeholderTextColor="#64748b"
        />

        <Text style={styles.sectionTitle}>Tree Measurements</Text>

        <Text style={styles.label}>Species</Text>
        <View style={styles.pickerContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {['Rhizophora', 'Avicennia', 'Bruguiera', 'Ceriops'].map((species) => (
              <TouchableOpacity
                key={species}
                style={[styles.pickerOption, mrvForm.species === species && styles.pickerOptionActive]}
                onPress={() => setMrvForm({...mrvForm, species: species})}
              >
                <Text style={[styles.pickerText, mrvForm.species === species && styles.pickerTextActive]}>
                  {species}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <Text style={styles.label}>DBH (cm)</Text>
        <TextInput
          style={styles.input}
          value={mrvForm.dbh}
          onChangeText={(text) => setMrvForm({...mrvForm, dbh: text})}
          placeholder="15.5"
          keyboardType="numeric"
          placeholderTextColor="#64748b"
        />

        <Text style={styles.label}>Tree Height (meters)</Text>
        <TextInput
          style={styles.input}
          value={mrvForm.treeHeight}
          onChangeText={(text) => setMrvForm({...mrvForm, treeHeight: text})}
          placeholder="8.5"
          keyboardType="numeric"
          placeholderTextColor="#64748b"
        />

        <Text style={styles.label}>Survival Rate (%)</Text>
        <TextInput
          style={styles.input}
          value={mrvForm.survivalRate}
          onChangeText={(text) => setMrvForm({...mrvForm, survivalRate: text})}
          placeholder="85"
          keyboardType="numeric"
          placeholderTextColor="#64748b"
        />

        <Text style={styles.sectionTitle}>Data Upload</Text>

        <View style={styles.uploadContainer}>
          <TouchableOpacity style={styles.uploadButton} onPress={takePhoto}>
            <Icon name="camera-alt" size={24} color="#3b82f6" />
            <Text style={styles.uploadText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.uploadButton} onPress={selectFile}>
            <Icon name="upload-file" size={24} color="#3b82f6" />
            <Text style={styles.uploadText}>Upload CSV</Text>
          </TouchableOpacity>
        </View>

        {mrvForm.photos.length > 0 && (
          <View style={styles.photoContainer}>
            <Text style={styles.label}>Captured Photos ({mrvForm.photos.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {mrvForm.photos.map((photo, index) => (
                <Image key={index} source={{ uri: photo.uri }} style={styles.thumbnail} />
              ))}
            </ScrollView>
          </View>
        )}

        <TouchableOpacity 
          style={styles.submitButton} 
          onPress={submitMRVData}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon name="cloud-upload" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Submit MRV Data</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // Render credits view
  const renderCredits = () => (
    <ScrollView style={styles.content}>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>₹2,450</Text>
          <Text style={styles.statLabel}>Avg Price/tCO₂e</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>1,250</Text>
          <Text style={styles.statLabel}>Available</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Carbon Credit Operations</Text>
      
      <TouchableOpacity 
        style={[styles.actionCard, { backgroundColor: '#22c55e20' }]}
        onPress={() => Alert.alert('Issue Credits', 'Credit issuance functionality')}
      >
        <Icon name="add-circle" size={32} color="#22c55e" />
        <View style={styles.actionCardContent}>
          <Text style={styles.actionCardTitle}>Issue Credits</Text>
          <Text style={styles.actionCardDesc}>Generate new carbon credits from verified projects</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.actionCard, { backgroundColor: '#f59e0b20' }]}
        onPress={() => Alert.alert('Retire Credits', 'Credit retirement functionality')}
      >
        <Icon name="local-fire-department" size={32} color="#f59e0b" />
        <View style={styles.actionCardContent}>
          <Text style={styles.actionCardTitle}>Retire Credits</Text>
          <Text style={styles.actionCardDesc}>Permanently retire credits for offsetting</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.actionCard, { backgroundColor: '#3b82f620' }]}
        onPress={() => Alert.alert('Marketplace', 'Trading functionality')}
      >
        <Icon name="store" size={32} color="#3b82f6" />
        <View style={styles.actionCardContent}>
          <Text style={styles.actionCardTitle}>Marketplace</Text>
          <Text style={styles.actionCardDesc}>Buy and sell carbon credits</Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );

  // Render sync view
  const renderSync = () => (
    <ScrollView style={styles.content}>
      <View style={styles.syncContainer}>
        <Icon 
          name={isConnected ? "cloud-done" : "cloud-off"} 
          size={80} 
          color={isConnected ? "#22c55e" : "#ef4444"} 
        />
        <Text style={styles.syncStatus}>
          {isConnected ? "Connected to Server" : "Working Offline"}
        </Text>
        <Text style={styles.syncDesc}>
          {isConnected 
            ? "All data is automatically synced with the server" 
            : "Data will be synced when connection is restored"}
        </Text>

        <View style={styles.syncStats}>
          <View style={styles.syncStatItem}>
            <Text style={styles.syncStatNumber}>{projects.filter(p => p.synced !== false).length}</Text>
            <Text style={styles.syncStatLabel}>Projects Synced</Text>
          </View>
          <View style={styles.syncStatItem}>
            <Text style={styles.syncStatNumber}>{mrvData.filter(m => m.synced !== false).length}</Text>
            <Text style={styles.syncStatLabel}>MRV Data Synced</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.submitButton, { marginTop: 30 }]}
          onPress={async () => {
            if (isConnected) {
              setIsLoading(true);
              await new Promise(resolve => setTimeout(resolve, 2000));
              setIsLoading(false);
              Alert.alert('Success', 'All data synced successfully');
            } else {
              Alert.alert('No Connection', 'Please check your internet connection');
            }
          }}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon name="sync" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Manual Sync</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {mrvData.slice(-5).reverse().map((item, index) => (
          <View key={index} style={styles.activityItem}>
            <Icon name="check-circle" size={20} color="#22c55e" />
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>MRV data submitted</Text>
              <Text style={styles.activityTime}>Project #{item.projectId} • {new Date(item.timestamp).toLocaleDateString()}</Text>
            </View>
          </View>
        ))}
      