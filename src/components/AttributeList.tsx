import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import { supabase } from '../supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useSWR, { mutate } from 'swr';
import { Button } from 'react-native-elements';
import { TextInput, TouchableOpacity } from 'react-native-gesture-handler';

const fetchUserId = async () => {
  const storedUserId = await AsyncStorage.getItem('supabase_user_id');
  return storedUserId;
};

const fetchAttributes = async (userId: string) => {
  if (!userId) return []; 

  const { data, error } = await supabase
    .from('friend_attributes')
    .select('create_attributes')
    .eq('user_id', userId); 

      supabase
      .channel(`friends_channel:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_attributes' }, (payload) => {
        // 新しいデータが挿入されたときにSWRのキャッシュを更新
        mutate(`attributes-${userId}`);
      })
      .subscribe();

  if (error) {
    console.error('Error fetching attributes:', error);
    return [];
  } else {
    return data; 
  }
};



const AttributeList: React.FC = () => {
 const { data: userId, error, isLoading } = useSWR('supabase_user_id', fetchUserId);
 //useSWRは第一引数の値が有効な値になると動くっぽい　　nullだと動かないらしい
 const { data: attributes, error: attributeError } = useSWR(`attributes-${userId}`, () => fetchAttributes(userId!));
 

  const [showInputField, setShowInputField] = useState(false); // 入力フィールドの表示状態
  const [newAttribute, setNewAttribute] = useState(''); // 新しい属性の入力内容
  const [createLoading, setCreateLoading] = useState(false); // ローディング状態
  const [selectedAttributes, setSelectedAttributes] = useState<number[]>([]); //選択状態の属性
  const [attributeIds, setAttributeIds] = useState<number[]>([]); 

 // 新しい属性をデータベースに追加する
  const addAttribute = async () => {
    if (newAttribute.trim() === '') return; // 入力が空の場合は処理しない

    setCreateLoading(true); // ローディング開始

    const { error } = await supabase
      .from('friend_attributes')
      .insert([{ user_id: userId, create_attributes: newAttribute }]);

    setCreateLoading(false); // ローディング終了

    if (error) {
      console.error('Error adding attribute:', error);
    } else {
      setNewAttribute(''); // 入力フィールドをクリア
      setShowInputField(false); // 入力フィールドを非表示にする
    }
  };

  const handleDelete = async () => {

  };


  // 属性がタップされたときに呼ばれる関数
const handleSelectAttribute = (id: number) => {
  setSelectedAttributes(prevState => {
    if (prevState.includes(id)) {
      
      // すでに選択されていれば選択を解除
      return prevState.filter(attributeId => attributeId !== id);
    } else {
      // 新しく選択する
      return [...prevState, id];
    }
  });
};

useEffect(() => {
  const getAttributeIds = async (userId: string | null | undefined, selectedAttributes: number[]) => {
    if (!userId || selectedAttributes.length === 0) return;

    try {
      // 各属性に対してIDを取得
      const ids = [];
      for (const attribute of selectedAttributes) {
        const { data, error } = await supabase
          .from('friend_attributes')
          .select('id')
          .eq('user_id', userId)
          .eq('create_attributes', attribute);

        if (error) {
          console.error('Error fetching attribute id for', attribute, error);
          continue; // エラーが発生した場合は次の属性へ
        }

        if (data && data.length > 0) {
          ids.push(data[0].id); // IDを配列に追加
        }
      }

      // すべてのIDを一度にセット
      if (ids.length > 0) {
        setAttributeIds(ids);
      }
    } catch (error) {
      console.error('Error fetching attribute ids:', error);
    }
  };


  getAttributeIds(userId, selectedAttributes);
}, [userId, selectedAttributes]); 



console.log("属性ID: "+attributeIds)
console.log(selectedAttributes)



  if (isLoading) return (
    <View style={styles.loaderContainer}>
      <ActivityIndicator size="large" color="#0000ff" />
    </View>
  );
  if (error) return <Text>Error loading user ID</Text>;
  
  console.log(attributes)

  return (
    <View style={styles.container}>
      <Text>User ID: {userId}</Text>
      <Text style={styles.title}>属性</Text>

      {/* 属性リストの表示 */}
      <View style={styles.attributeList}>
        {attributes?.map((item, index) => (
          <View
            key={item.create_attributes ? item.create_attributes.toString() : index.toString()}
            style={[
            styles.attributeItem,
            selectedAttributes.includes(item.create_attributes ? item.create_attributes.toString() : index.toString()) && styles.selectedAttributeItem, 
          ]}
          >
            <TouchableOpacity onPress={() => handleSelectAttribute(item.create_attributes ? item.create_attributes.toString() : index.toString())}>
            <Text style={styles.attributeText}>{item.create_attributes}</Text>
          </TouchableOpacity>
          </View>
        ))}
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowInputField(!showInputField)} // ボタンを押したら入力フィールドの表示を切り替え
        >
          <Text style={styles.addButtonText}>
            {showInputField ? 'キャンセル' : '属性を追加'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>削除</Text>
        </TouchableOpacity>
      </View>

      {showInputField && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={newAttribute}
            onChangeText={setNewAttribute}
            placeholder="新しい属性を入力"
          />
          <TouchableOpacity style={styles.saveButton} onPress={addAttribute}>
            {createLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>保存</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default AttributeList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
     marginBottom: 70 , 
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  addButton: {
    // backgroundColor: '#4CAF50',

  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  deleteButton: {

  },
  deleteButtonText: {
    backgroundColor: '#E53935',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    alignSelf: 'flex-end',  
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    maxWidth: "30%",

  },
  input: {
    height: 35,                    
    flex: 1,                    
    paddingLeft: 15,               
    paddingRight: 10,               
    borderRadius: 8,              
    backgroundColor: '#f0f0f0',   
    borderWidth: 1, 
    borderColor: '#d1d1d1', 
    fontSize: 16,   
    color: '#333',  
    marginRight: 10, 
  },
  saveButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  attributeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginTop: 10,
  },
  attributeItem: {
    minWidth: 50,
    maxWidth: '48%', 
    margin: 4,
    padding: 7,
    paddingBottom:2,
    paddingTop: 2,
    borderRadius: 24,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
   selectedAttributeItem: {
    backgroundColor: '#2196F3', // 選択された属性の背景色
    borderColor: '#1e88e5',      // ボーダー色を変更
  },
  attributeText: {
    textAlign: 'center',
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
  },
  loaderContainer: {

  }
});