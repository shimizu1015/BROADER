import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons'; // Import icon from @expo/vector-icons

const BlankScreen: React.FC = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      {/* Back Arrow Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="black" />
      </TouchableOpacity>

      {/* Main Text */}
      <Text style={styles.text}>通知を管理するページにしたい（願望）</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 18,
    color: '#333',
    marginTop: 40, // Added margin to adjust text position if needed
  },
  backButton: {
    position: 'absolute',
    top: 40, // Adjust this value based on the safe area on your device
    left: 20,
    padding: 10,
    backgroundColor: 'transparent',
  },
});

export default BlankScreen;
