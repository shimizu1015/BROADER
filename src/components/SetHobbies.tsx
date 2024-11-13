import React, { useState, useEffect } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { supabase } from '../supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toHiragana } from 'wanakana';
import NavigationBar from '../components/NavigationBar';
import { getToken } from '../utils/tokenUtils'; 

interface Hobby {
  id: number;
  name: string;
  created_by: string | null;
}

const SetHobbies: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [hobbiesList, setHobbiesList] = useState<Hobby[]>([]);
  const [filteredHobbies, setFilteredHobbies] = useState<Hobby[]>([]);
  const [selectedHobbies, setSelectedHobbies] = useState<Set<number>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hobbyName, setHobbyName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserIdAndHobbies = async () => {
      try {
        const storedUserId = await getToken();
        if (storedUserId) {
          setUserId(storedUserId.user.id);
          console.log(userId)

          const { data: userHobbies, error: userHobbiesError } = await supabase
            .from('user_hobbies')
            .select('hobby_ids')
            .eq('user_id', storedUserId);
          if (userHobbiesError) throw userHobbiesError;

          if (userHobbies && userHobbies.length > 0) {
            const hobbyIds = userHobbies[0].hobby_ids || [];
            setSelectedHobbies(new Set(hobbyIds));
          }

          const { data: hobbies, error: hobbiesError } = await supabase
            .from('hobbies')
            .select('*');
          if (hobbiesError) throw hobbiesError;

          setHobbiesList(hobbies);
          if (userHobbies && userHobbies.length > 0) {
            const hobbyIds = userHobbies[0].hobby_ids || [];
            updateFilteredHobbies(hobbies, storedUserId, new Set(hobbyIds));
          }
        } else {
          console.error('User not found');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        Alert.alert('エラー', 'データの取得中にエラーが発生しました');
      } finally {
        setLoading(false);
      }
    };

    fetchUserIdAndHobbies();
  }, [userId]);

  useEffect(() => {
    filterHobbies(searchTerm);
  }, [hobbiesList, searchTerm, selectedHobbies]);

  const toggleHobby = (hobbyId: number) => {
    setSelectedHobbies((prevSelectedHobbies) => {
      const newSelectedHobbies = new Set(prevSelectedHobbies);
      if (newSelectedHobbies.has(hobbyId)) {
        newSelectedHobbies.delete(hobbyId);
      } else {
        newSelectedHobbies.add(hobbyId);
      }
      updateFilteredHobbies(hobbiesList, userId, newSelectedHobbies);
      return newSelectedHobbies;
    });
  };

  const saveHobbies = async () => {
    try {
      if (userId) {
        const hobbyIdsArray = Array.from(selectedHobbies);

        const { error: upsertError } = await supabase
          .from('user_hobbies')
          .upsert({
            user_id: userId,
            hobby_ids: hobbyIdsArray
          });
        if (upsertError) throw upsertError;

        console.log('Saved user hobbies:', hobbyIdsArray);
        setSearchTerm('');
        setHobbyName('');
        setError(null);
        navigation.navigate('Top');
      }
    } catch (error) {
      console.error('Error saving user hobbies:', error);
      Alert.alert('エラー', '趣味の保存中にエラーが発生しました');
    }
  };

  const addHobby = async () => {
    if (hobbyName.trim() === '') {
      setError('趣味の名前を入力してください');
      return;
    }

    const allHobbies = hobbiesList.concat(filteredHobbies);
    if (allHobbies.some(hobby => hobby.name === hobbyName)) {
      setError('この趣味は既に存在します');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('hobbies')
        .insert([{ name: hobbyName, created_by: userId }])
        .select();

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        const newHobby = data[0];
        setHobbiesList((prevHobbies) => [...prevHobbies, newHobby]);
        updateFilteredHobbies([...hobbiesList, newHobby], userId, selectedHobbies);
      }

      setError(null);
      setHobbyName('');
      Alert.alert('成功', '趣味が追加されました');
    } catch (error) {
      console.error('Error adding hobby:', error);
      Alert.alert('エラー', '趣味の追加中にエラーが発生しました');
    }
  };

  const normalizeString = (str: string): string => {
    return toHiragana(str
      .normalize('NFKC')
      .replace(/[\u30A1-\u30F6]/g, match => String.fromCharCode(match.charCodeAt(0) - 0x60)));
  };

  const filterHobbies = (term: string) => {
    setSearchTerm(term);
    const normalizedTerm = normalizeString(term);

    if (normalizedTerm.trim() === '') {
      updateFilteredHobbies(hobbiesList, userId, selectedHobbies);
    } else {
      const filtered = hobbiesList.filter(hobby =>
        normalizeString(hobby.name).includes(normalizedTerm) && !selectedHobbies.has(hobby.id)
      );
      setFilteredHobbies(filtered);
    }
  };

  const updateFilteredHobbies = (hobbies: Hobby[], userId: string | null, selectedHobbies: Set<number>) => {
    const userCreatedHobbies = hobbies.filter(hobby => hobby.created_by === userId && !selectedHobbies.has(hobby.id));
    const otherHobbies = hobbies.filter(hobby => hobby.created_by !== userId && !selectedHobbies.has(hobby.id));
    const combinedHobbies = [...otherHobbies.slice(0, 40 - userCreatedHobbies.length), ...userCreatedHobbies];
    setFilteredHobbies(combinedHobbies);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={200}
      >
        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          <View style={styles.formContainer}>
            <Text style={styles.title}>趣味を設定する</Text>
            <TextInput
              style={styles.input}
              placeholder="趣味を検索"
              value={searchTerm}
              onChangeText={filterHobbies}
            />
            <Text style={styles.sectionTitle}>現在設定されている趣味</Text>
            <View style={styles.hobbiesContainer}>
              {Array.from(selectedHobbies).map((hobbyId) => {
                const hobby = hobbiesList.find((h) => h.id === hobbyId);
                if (hobby) {
                  return (
                    <TouchableOpacity
                      key={hobby.id}
                      style={[
                        styles.hobbyButton,
                        styles.selectedHobby,
                      ]}
                      onPress={() => toggleHobby(hobby.id)}
                    >
                      <Text style={styles.hobbyText}>{hobby.name}</Text>
                    </TouchableOpacity>
                  );
                }
                return null;
              })}
            </View>
            <Text style={styles.sectionTitle}>すべての趣味</Text>
            <View style={styles.hobbiesContainer}>
              {filteredHobbies.filter((hobby) => !selectedHobbies.has(hobby.id)).map((hobby) => (
                <TouchableOpacity
                  key={hobby.id}
                  style={[
                    styles.hobbyButton,
                    hobby.created_by === userId ? styles.createdHobby : styles.unselectedHobby,
                  ]}
                  onPress={() => toggleHobby(hobby.id)}
                >
                  <Text style={styles.hobbyText}>{hobby.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.sectionTitle}>作成した趣味</Text>
            <View style={styles.hobbiesContainer}>
              {filteredHobbies.filter((hobby) => hobby.created_by === userId && !selectedHobbies.has(hobby.id)).map((hobby) => (
                <TouchableOpacity
                  key={hobby.id}
                  style={[
                    styles.hobbyButton,
                    styles.createdHobby,
                  ]}
                  onPress={() => toggleHobby(hobby.id)}
                >
                  <Text style={styles.hobbyText}>{hobby.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.addHobbyContainer}>
              <Text style={styles.sectionTitle}>新しい趣味を追加する</Text>
              <TextInput
                style={styles.input}
                placeholder="新しい趣味の名前"
                value={hobbyName}
                onChangeText={(text) => setHobbyName(text)}
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <TouchableOpacity
                style={styles.addButton}
                onPress={addHobby}
              >
                <Text style={styles.addButtonText}>追加</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={saveHobbies}
            >
              <Text style={styles.saveButtonText}>保存</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        <NavigationBar />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    paddingBottom: 100, // ナビゲーションバーの高さを考慮したパディング
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#fff',
    borderColor: '#ccc',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 4,
    fontSize: 16,
    marginBottom: 16,
    width: '100%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  hobbiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  hobbyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    margin: 4,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedHobby: {
    backgroundColor: '#FF6347',
  },
  unselectedHobby: {
    backgroundColor: '#D3D3D3',
  },
  createdHobby: {
    backgroundColor: '#d3d3d3',
  },
  hobbyText: {
    fontSize: 14,
    color: '#000',
  },
  saveButton: {
    backgroundColor: '#32CD32',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 16,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 18,
  },
  addHobbyContainer: {
    marginTop: 24,
    width: '100%',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#1E90FF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    width: '100%',
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 18,
  },
  errorText: {
    color: 'red',
    marginTop: 8,
  },
});

export default SetHobbies;
