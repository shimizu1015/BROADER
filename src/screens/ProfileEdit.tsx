import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, Text, View, ScrollView, Platform } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import ProfileForm from '../components/ProfileForm';
import { supabase } from '../supabaseClient';
import { t } from 'react-native-tailwindcss';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NavigationBar from '../components/NavigationBar';
import Icon from 'react-native-vector-icons/FontAwesome';

const fetchUserIdFromToken = async () => {
  try {
    const tokenString = await AsyncStorage.getItem('auth_token');
    const userId = await AsyncStorage.getItem('supabase_user_id');
    if (tokenString && userId) {
      console.log('Retrieved token and userId:', tokenString, userId);
      return userId;
    } else {
      console.warn('No token or userId found');
      return null;
    }
  } catch (error) {
    console.error('Error retrieving user ID from token:', error);
    return null;
  }
};

const ProfileEdit: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  useEffect(() => {
    const fetchUserId = async () => {
      const userId = await fetchUserIdFromToken();
      if (userId) {
        setUserId(userId);
      } else {
        Alert.alert('エラー', 'ユーザーIDが見つかりません');
      }
    };

    fetchUserId();
  }, []);

  const handleLogout = async () => {
    console.log('Logging out...');
    const { error } = await supabase.auth.signOut();

    if (error) {
      if (Platform.OS === 'web') {
        alert(`ログアウトエラー: ${error.message}`);
      } else {
        Alert.alert('ログアウトエラー', error.message);
      }
    } else {
      try {
        await AsyncStorage.removeItem('auth_token');
        await AsyncStorage.removeItem('supabase_user_id');
        console.log('AsyncStorage token removed');

        if (Platform.OS === 'web') {
          localStorage.removeItem('auth_token');
          alert('ログアウトに成功しました');
        } else {
          Alert.alert('ログアウトに成功しました');
        }
        navigation.navigate('Welcome');
        onClose();
      } catch (e) {
        const errorMessage = (e as Error).message;
        //console.error('Error removing token:', errorMessage);
        if (Platform.OS === 'web') {
          //alert(`トークン削除エラー: ${errorMessage}`);
        } else {
          //Alert.alert('トークン削除エラー', errorMessage);
        }
      }
    }
  };

  return (
    <View style={[t.flex1, t.bgGray100]}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {userId ? (
          <ProfileForm
            isEdit={true}
            userId={userId}
            onLogout={handleLogout}
            onClose={onClose}
          />
        ) : (
          <Text style={styles.errorText}>ユーザーIDが見つかりません。</Text>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    paddingTop: Platform.OS === 'web' ? 40 : 0,
    paddingBottom: Platform.OS === 'web' ? 60 : 100,
    backgroundColor:'#fff',
  },
  errorText: {
    color: 'red',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 20,
  },
});

export default ProfileEdit;
