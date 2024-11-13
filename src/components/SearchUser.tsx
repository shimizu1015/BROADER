import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, FlatList, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../supabaseClient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface SearchUserProps {
  userId: string | null;
}

const SearchUser: React.FC<SearchUserProps> = ({ userId }) => {
  const [searchQuery, setSearchQuery] = useState(''); // 検索クエリの状態
  const [searchResults, setSearchResults] = useState<{ id: string; username: string; icon: string | null }[]>([]);
  const navigation = useNavigation();
  

  // ユーザー名での検索処理
  const searchUsers = async () => {
    if (!searchQuery) return;

    const { data, error } = await supabase
      .from('users')
      .select('id, username, icon')//もしアイコンも保存するようにした場合データベースに保存されている画像のURlを取得する処理を追加する。
      .ilike('username', `%${searchQuery}%`);

    if (error) {
      console.error('Error fetching users:', error);
    } else {
      setSearchResults(data || []);
    }
  };

  // ユーザーページへの遷移
  const handleUserPress = (userId: string) => {
    //@ts-ignore
    navigation.navigate('UserPage', { userId });
  };

  // バツボタンを押したときに戻る
  const handleClose = () => {
    navigation.goBack();
  };

  useEffect(() => {
    // デフォルトで検索を実行する
    searchUsers();
  }, [searchQuery]);

  return (
    <View style={styles.container}>
      {/* 右上のバツボタン */}
      <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
        <MaterialCommunityIcons name="close" size={30} color="#000" />
      </TouchableOpacity>

      {/* 検索入力フィールド */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="ユーザー名で検索"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* 検索結果のリスト */}
      {searchResults.length > 0 ? (

       <FlatList
         data={searchResults}
         keyExtractor={(item) => item.id}
         renderItem={({ item }) => (
           <TouchableOpacity style={styles.resultItem} onPress={() => handleUserPress(item.id)}>
             {/* Use the user's icon or a default placeholder */}
             <Image
               source={item.icon ? { uri: item.icon } : require('../../assets/user_default_icon.png')}
               style={styles.avatar}
             />
             <Text style={styles.username}>{item.username}</Text>
           </TouchableOpacity>
         )}
       />
       
      ) : (
        <Text style={styles.noResultText}>ユーザーが見つかりません</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center',
    marginTop: 50,
  },
  searchInput: {
    flex: 1,
    padding: 8,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    marginRight: 8,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  username: {
    fontSize: 18,
  },
  noResultText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#888',
  },
});

export default SearchUser;
