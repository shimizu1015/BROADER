import React, { useEffect, useState } from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity,ScrollView,Image,FlatList,Platform,Modal,TextInput, Dimensions, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabaseClient';
import QRCodeComponent from'./QRCodeComponent';
import SearchUser from './SearchUser'; 
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import * as Notifications from 'expo-notifications';
import * as Permissions from 'expo-permissions';
import SideBar from './SideBar';
import { LinearGradient } from 'expo-linear-gradient';
import AttributeList from './AttributeList';
import { sendPushNotification } from '../utils/sendPushNotification';


const Tab = createMaterialTopTabNavigator();

const FriendList = ({ userId }: { userId: string | null }) => {
  const [list, setList] = useState<{ id: string, username: string, icon: string | null }[]>([]);
  const [userIdsListArray, setUserIdsListArray] = useState<string[]>([]);
  const navigation = useNavigation();

  useEffect(()=>{
          const fetchFriendList = async () => {
            console.log("フレンドリスト取得関数動作")
           try {
                const { data, error } = await supabase
                  .from('friends')
                  .select('user_id, friend_id')
                  .or(`user_id.eq.${userId},friend_id.eq.${userId}`)  // 自分のUUIDがuser_idまたはfriend_idに含まれている行を取得
                  .eq('status', 1);  // statusが1（フレンド関係が承認済み）のみ取得

                if (error) {
                  console.error('Error fetching friends:', error);
                  return;
                }

                // フレンドのUUIDリストを作成
                const friendsArray = data.map(item => {
                  // friend_idが自分のuuidの場合はuser_idを、それ以外の場合はfriend_idを返す
                  return item.user_id === userId ? item.friend_id : item.user_id;
                });

                console.log('Friends:', friendsArray);
                setUserIdsListArray(friendsArray)
                // return friendsArray; 

              } catch (error) {
                console.error('Error fetching friends:', error);
              }
          }
          fetchFriendList();
          // friendsテーブルの変更を監視
          const subscription = supabase
    .channel('List-changes')
    .on('postgres_changes', 
      {
        event: '*',        // 作成、削除、更新のすべてのイベントを監視
        schema: 'public',
        table: 'friends',
      },
      () => {
        console.log("フレンドリストにてBD変化を検知 関数呼び出し")
        fetchFriendList();  // ステータスを再度フェッチ
        
        
      }
    )
    .subscribe();

  // クリーンアップ
  return () => {
    supabase.removeChannel(subscription);
  };

  }, [])

  // UUIDからユーザーネームとアイコンURLを取得
  useEffect(() => {
    const fetchUserIdsAndUsernames = async (idArray: string[]) => {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, icon') // id, username, iconを取得
        .in('id', idArray);

      if (error) {
        console.error('Error fetching user ids and usernames:', error);
        return [];
      }

      // リストにフレンドのユーザー名とアイコンURLを追加
      setList(data.map(user => ({
        id: user.id,
        username: user.username,
        icon: user.icon || null // iconがnullの場合はnullを設定
      })));
    };

    if (userIdsListArray.length > 0) {
      fetchUserIdsAndUsernames(userIdsListArray);
    }
  }, [userIdsListArray]);


  const renderFriendItem = ({ item, index }: { item: { id: string, username: string, icon: string | null }, index: number }) => (
    <TouchableOpacity
      key={item.id}
      style={[
        styles.listItem,
        index === 0 ? { marginTop: 10 } : { marginTop: 0 },
      ]}
      //@ts-ignore
      onPress={() => navigation.navigate('UserPage', { userId: item.id })}
    >
      <Image
        source={item.icon ? { uri: item.icon } : require('../../assets/user_default_icon.png')}
        //@ts-ignore
        style={styles.avatar}
      />
      <Text style={styles.userName}>{item.username}</Text>
    </TouchableOpacity>
  );
  

 return (
    <LinearGradient
      colors={['#ff00a1', '#040045']}
      style={styles.container} // グラデーション全体のスタイル
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <AttributeList />      
      <FlatList
        data={list} // 表示するデータ
        renderItem={renderFriendItem} // 各フレンドのレンダリング
        keyExtractor={(item) => item.id.toString()} // ユニークなキー
        contentContainerStyle={styles.listContainer} // 内側のスタイル
      />
    </LinearGradient>
  );
};



const AddFriend = ({ userId }: { userId: string | null }) => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<{ id: string, username: string, icon: string | null }[]>([]);

  // 検索クエリが変更されるたびにSupabaseでユーザーを検索
  useEffect(() => {
    if (searchQuery.length > 0) {
      const fetchUsers = async () => {
        const { data, error } = await supabase
          .from('users')
          .select('id, username, icon')
          .ilike('username', `%${searchQuery}%`); // 検索クエリに一致するユーザー名を取得

        if (error) {
          console.error('Error fetching users:', error);
          return;
        }

        setSuggestions(data || []); // サジェストとして表示するユーザーリストをセット
      };

      fetchUsers();
    } else {
      setSuggestions([]);
    }
  }, [searchQuery]);

  

  // 検索結果のレンダリング
  const renderSuggestion = ({ item, index }: { item: { id: string, username: string, icon: string | null }, index: number }) => (
    <TouchableOpacity
      key={item.id}
      style={[
        styles.listItem,
        index === 0 ? { marginTop: 0 } : { marginTop: 0 },
      ]}
      onPress={() => {
        //@ts-ignore
        navigation.navigate('UserPage', { userId: item.id });
      }}
    >
      <Image
        source={item.icon ? { uri: item.icon } : require('../../assets/user_default_icon.png')}
        //@ts-ignore
        style={styles.avatar}
      />
      <Text style={styles.userName}>{item.username}</Text>
    </TouchableOpacity>
  );

  return (
    <LinearGradient
      colors={['#ff00a1', '#040045']}
      style={styles.container} // グラデーション全体のスタイル
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {Platform.OS === 'web' ? (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="ユーザーを検索"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      ) : (
        <View style={styles.fixedHeader}>
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.qrButton} 
              //@ts-ignore
              onPress={() => navigation.navigate('QRCodeComponent', { userId })}
            >
              <MaterialCommunityIcons name="qrcode-scan" size={50} color="#A9A9A9" />
              <Text style={styles.qrButtonText}>QRコード</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.searchButton}
              //@ts-ignore
              onPress={() => navigation.navigate('SearchUser', { userId })}
            >
              <MaterialCommunityIcons name="magnify" size={50} color="#A9A9A9" />
              <Text style={styles.searchButtonText}>検索</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* サジェストリスト */}
      {suggestions.length > 0 && (
        <FlatList
          data={suggestions}
          renderItem={renderSuggestion}
          keyExtractor={(item) => item.id}
          style={styles.suggestionList}
        />
      )}
    </LinearGradient>
  );
};

const PendingList = ({ userId, width }: { userId: string | null; width: number }) => {
  // サイドバーの幅を決定
  // const sidebarWidth = Platform.OS === 'web' ? (width < 748 ? 60 : 250) : 0;
  //申請中リスト   pendinglistないに申請中も入れることにした
  const [Applications, setApplications] = useState<{ id: string, username: string }[]>([]);
  const [userIdsApplicationsArray, setUserIdsApplicationsArray] = useState<string[]>([]);  //保留中のフレンドuuidからユーザネームを取得の際に利用
    // 申請中のuuidを取得
        useEffect(()=>{
          const fetchApplications = async () => {
            const { data, error } = await supabase
            .from('friends')
            .select('friend_id')
            .eq('user_id', userId)  // 自分のUUIDが user_id にある
            .eq('status', 0);       // ステータスが 0 （保留中）

              if (error) {
                console.error('Error fetching Applications friend requests received:', error);
              } else {
                console.log('Applications friend requests received:', data);
                const userIdsArray = data.map(item => item.friend_id);
                setUserIdsApplicationsArray(userIdsArray)
              }
          }
          fetchApplications();
          // friendsテーブルの変更を監視
          const subscription = supabase
    .channel('Applications-changes')
    .on('postgres_changes', 
      {
        event: '*',        // 作成、削除、更新のすべてのイベントを監視
        schema: 'public',
        table: 'friends',
      },
      () => {
        console.log("DBの変更を確認")
        fetchApplications();  // ステータスを再度フェッチ
      }
    )
    .subscribe();

  // クリーンアップ
  return () => {
    supabase.removeChannel(subscription);
  };

  }, [])

  //uuidからユーザネームを取得
  useEffect(()=>{
    const fetchUserIdsAndUsernames = async (idArray: string[]) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, username')  // idとusernameの両方を取得
    .in('id', idArray);  // userIdsArrayに含まれるidでフィルタリング

  if (error) {
    console.error('Error fetching user ids and usernames:', error);
    return [];
  }

  // id（UUID）とusernameのペアをオブジェクト形式で返す
  setApplications(data.map(user => ({ id: user.id, username: user.username })))
  console.log(data.map(user => ({ id: user.id, username: user.username })))
};
fetchUserIdsAndUsernames(userIdsApplicationsArray)
  },[userIdsApplicationsArray])





  //ここから保留中リスト
  const navigation = useNavigation();
  const [pending, setPending] = useState<{ id: string, username: string }[]>([]);
  const [userIdsPendingArray, setUserIdsPendingArray] = useState<string[]>([]);  //保留中のフレンドuuidからユーザネームを取得の際に利用

    const handleApprove = async (friendId: string) => {    //friendIdはDBでのuser_idと思われます
    // 承認処理
    console.log(`Approve ${friendId}`);
     const { data, error } = await supabase
    .from('friends')
    .update({ status: 1 })  // statusを1に設定
    .eq('user_id', friendId)
    .eq('friend_id', userId);
    //ここから下に承認通知処理　　通知は変数userIdに対して行う（多分）

  // 承認通知の送信
  try {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('pushNotificationToken, username')
      .eq('id', friendId)
      .single();
    
    const { data: ownData, error: ownError } = await supabase
      .from('users')
      .select('username')
      .eq('id', userId)
      .single();
    
    if (userError || ownError) {
      console.error('Error fetching usernames or notification token:', userError || ownError);
      return;
    }

    const notificationBody = `${ownData.username}さんがフレンドリクエストを承認しました`;

    if (userData.pushNotificationToken) {
      sendPushNotification(userData.pushNotificationToken, notificationBody);
    } else {
      console.warn('Push notification token is not available');
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
    
    //ここから下に個人チャット作成処理
 try {
  const { data: existingChatRoom, error: checkError } = await supabase
    .from('personal_chats')
    .select('id')
    .or(`and(host_user_id.eq.${userId},receiver_user_id.eq.${friendId}),and(host_user_id.eq.${friendId},receiver_user_id.eq.${userId})`)
    .limit(1);

  if (checkError) {
    console.error('Error checking existing chat room:', checkError);
    return;
  }

  // 既存のチャットルームがない場合のみ新しく作成
  if (existingChatRoom && existingChatRoom.length === 0) {
    const { data: chatData, error: chatError } = await supabase
      .from('personal_chats')
      .insert([
        {
          host_user_id: userId, // 自分のユーザーIDをホストとして設定
          receiver_user_id: friendId, // フレンドのユーザーIDを受信者として設定
          created_at: new Date().toISOString(),
        },
      ]);

    if (chatError) {
      console.error('Error creating chat room:', chatError);
      return;
    }

    console.log('Chat room created successfully:', chatData);
  } else {
    console.log('Chat room already exists, no new room created.');
  }
} catch (error) {
  console.error('Failed to check or create chat room:', error);
}
};
  const handleReject = async (friendId: string) => {
    // 拒否処理をここに追加
    const { error } = await supabase
        .from('friends')
        .delete()
        .eq('user_id', friendId)
        .eq('friend_id', userId);

      if (error) {
        console.error('Error deleting friend relationship:', error);
      } else {
        console.log('Friend relationship deleted successfully.');
        
      }
  };

  // 保留中のuuidを取得
        useEffect(()=>{
          const fetchPending = async () => {
            console.log("保留中の取得関数動作")
            const { data, error } = await supabase
            .from('friends')
            .select('*')  // 必要に応じてカラムを指定できます
            .eq('friend_id', userId)  // 自分が受け取ったフレンドリクエストを取得
            .eq('status', 0);  // ステータスが保留中（0）のもの

      if (error) {
        console.error('Error fetching pending friend requests received:', error);
      } else {
        console.log('Pending friend requests received:', data);
        const userIdsArray = data.map(item => item.user_id);
        console.log("保留中のhook"+userIdsArray)
        setUserIdsPendingArray(userIdsArray)
      }
          }
          fetchPending();
          // friendsテーブルの変更を監視
          const subscription = supabase
    .channel('Pending-changes')
    .on('postgres_changes', 
      {
        event: '*',        // 作成、削除、更新のすべてのイベントを監視
        schema: 'public',
        table: 'friends',
      },
      () => {
        console.log("保留中にてBD変化を検知　関数呼び出し")
        fetchPending();  // ステータスを再度フェッチ
      }
    )
    .subscribe();

  // クリーンアップ
  return () => {
    supabase.removeChannel(subscription);
  };

  }, [])

  //uuidからユーザネームを取得
  useEffect(()=>{
    const fetchUserIdsAndUsernames = async (idArray: string[]) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, username,icon')  // idとusernameの両方を取得
    .in('id', idArray);  // userIdsArrayに含まれるidでフィルタリング

  if (error) {
    console.error('Error fetching user ids and usernames:', error);
    return [];
  }

  // id（UUID）とusernameのペアをオブジェクト形式で返す
  setPending(data.map(user => ({ id: user.id, username: user.username })))
  console.log(data.map(user => ({ id: user.id, username: user.username })))
  console.log("保留中表示物の中身："+pending)
};
fetchUserIdsAndUsernames(userIdsPendingArray)
  },[userIdsPendingArray])

  // リスト項目のレンダリング
  const renderPendingItem = ({ item, index }: { item: { id: string, username: string, icon: string | null }, index: number }) => (
    <View key={item.id} style={styles.listItem}>
      {/* ユーザー名やアイコンをタップしたらUserPageへ遷移 */}
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center' }}
        //@ts-ignore
        onPress={() => navigation.navigate('UserPage', { userId: item.id })}
        activeOpacity={0.7} // 押下時の透明度調整
      >
        <Image
          source={item.icon ? { uri: item.icon } : require('../../assets/user_default_icon.png')}
          //@ts-ignore
          style={styles.avatar}
        />
        <Text style={styles.PendingUserName}>{item.username}</Text>
      </TouchableOpacity>
  
      {/* 承認/拒否ボタン */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.approveButton}  // 元のスタイル
          onPress={(e) => {
            e.stopPropagation(); // 承認ボタンのイベントがリスト全体に伝わらないように
            handleApprove(item.id);
          }}
        >
          <Text style={styles.approveButtonText}>承認</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.rejectButton}  // 元のスタイル
          onPress={(e) => {
            e.stopPropagation(); // 拒否ボタンのイベントがリスト全体に伝わらないように
            handleReject(item.id);
          }}
        >
          <Text style={styles.rejectButtonText}>拒否</Text>
        </TouchableOpacity>
      </View>
    </View>
  );


  const renderApplicationItem = ({ item, index }: { item: { id: string, username: string, icon: string | null }, index: number }) => (
    <TouchableOpacity
      key={item.id}
      style={[
        styles.listItem,
        index === 0 ? { marginTop: 10 } : { marginTop: 0 },
      ]}
      //@ts-ignore
      onPress={() => navigation.navigate('UserPage', { userId: item.id })}
    >
      <Image
        source={item.icon ? { uri: item.icon } : require('../../assets/user_default_icon.png')}
        //@ts-ignore
        style={styles.avatar}
      />
      <Text style={styles.userName}>{item.username}</Text>
    </TouchableOpacity>
  );
  


  return (
    <LinearGradient
  colors={['#ff00a1', '#040045']}
  style={[styles.container]}  // グラデーション全体のスタイル
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
    >
    <View style={styles.innerContainer}>
      <Text>保留中</Text>
    
        <FlatList
          data={pending}  // 保留中のフレンドデータ
          renderItem={renderPendingItem}  // 各項目のレンダリング
          keyExtractor={(item) => item.id}  // ユニークキー
          contentContainerStyle={[ 
            styles.PendingListContainer,
            pending.length === 0 && styles.emptyContainer, // 空の場合のスタイル
          ]}
          ListEmptyComponent={<View style={styles.noData}><Text>誰からも申請がきてないよ！！</Text></View>} // 空データの場合の表示
        />

        {/* 申請中のエリアをFlatListの直後に配置する */}
        <Text>申請中</Text>
        <FlatList
              data={Applications}  // 申請中のフレンドデータ
              renderItem={renderApplicationItem}  // 各項目のレンダリング
              keyExtractor={(item) => item.id}  // ユニークキー
              ListEmptyComponent={<View style={styles.noData}><Text>友達にフレンドリクエストを送ろう！！</Text></View>} // 空データの場合の表示
            />
      </View>
    </LinearGradient>
  );
};

const Social = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const { width } = useWindowDimensions(); // ウィンドウの幅を取得
  const { height: screenHeight } = Dimensions.get('window');
  const [isModalVisible, setIsModalVisible] = useState(false);
    
  const windowHeight = Dimensions.get('window').height;
      // サイドバーの幅を決定
  const sidebarWidth = Platform.OS === 'web' ? (width < 748 ? 60 : 250) : 0;

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem('supabase_user_id');
        if (storedUserId) {
          setUserId(storedUserId);
        } else {
          console.error('ユーザーIDが見つかりません');
        }
      } catch (error) {
        console.error('ユーザーIDの取得に失敗しました:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserId();
  }, []);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    //サイドバー分　右にできた余白を消す
    // サイドバー分　コンテントを右にずらす
  <View style={[styles.container, { paddingRight: sidebarWidth }]}>   
  {Platform.OS === 'web' && <SideBar style={{ zIndex: 2, width: sidebarWidth } } />}

  
    <Tab.Navigator
    screenOptions={{
      tabBarScrollEnabled: true, // タブをスクロール可能にする
      tabBarItemStyle: { width: 120 }, // 各タブの幅を狭く設定
      tabBarLabelStyle: { fontSize: 14, fontWeight: 'bold', color: '#fff' }, // タブラベルを太く設定
      tabBarStyle: { backgroundColor: '#000' } 
      }}
      style={[styles.innerContainer, { marginLeft: sidebarWidth }]} // サイドバー分　コンテントを右にずらす
      
      >
        <Tab.Screen name="FriendList" options={{ title: 'フレンド一覧' }}>
          {() => <FriendList userId={userId} />}
        </Tab.Screen>
        <Tab.Screen name="AddFriend" options={{ title: '追加' }}>
          {() => <AddFriend userId={userId} />}
        </Tab.Screen>
        <Tab.Screen name="PendingList" options={{ title: '保留中/申請中' }}>
          {() => <PendingList userId={userId} width={width} />}
        </Tab.Screen>
        {/* <Tab.Screen name="ApplicationsList" options={{ title: '申請中' }}>
          {() => <ApplicationsList userId={userId} />}
        </Tab.Screen> */}
      </Tab.Navigator>
   
  </View>   
  );
};

const styles = StyleSheet.create({
  
  container: {
    flex: 1,
    width: '100%',
    //@ts-ignore
    background: "#000",
    //@ts-ignore
    minHeight: '90vh', //高さはこれが適切？（暫定）
  },
  innerContainer:{
    flex: 1,
    width: '100%',
    //@ts-ignore
    minHeight: '0vh',
  },
  PendingListContainer: {
    width: '100%',
    // width:Platform.OS === 'web' ? '98%' : '100%', 
    flexGrow: 0, // 余分な高さを防ぐために0に設定
  },
  emptyContainer: {
    paddingVertical: 0, // 空の場合は高さを縮める
    
  },
  noData: {
    padding: 16,
    // alignItems: 'center',
  },
  fixedHeader: {
    backgroundColor: '#fff',
    padding: 10,
    width: '100%',
    alignItems: 'center',
    zIndex: 1000,
    marginTop:2,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'space-between',
    padding: 10,
  },
   buttonContainer: {
    flexDirection: 'row',
  },
  approveButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginRight: 10,
  },
  rejectButton: {
    backgroundColor: '#F44336',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  rejectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  qrButton: {
    backgroundColor: 'transparent',
    padding: 15,
    borderRadius: 10,
    width: '50%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.1,
    borderColor: '#A9A9A9',
  },
  qrButtonText: {
    color: '#A9A9A9',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
  },
  searchButton: {
    backgroundColor: 'transparent',
    padding: 15,
    borderRadius: 10,
    width: '50%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.1,
    borderColor: '#A9A9A9',
  },
  searchButtonText: {
    color: '#A9A9A9',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrCodeContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  qrText: {
    marginTop: 20,
    fontSize: 16,
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 10,
    marginTop: 20,
  },
  copyButton: {
    backgroundColor: '#28a745',
    padding: 10,
    borderRadius: 10,
    marginTop: 20,
  },
  userIdText: {
    marginTop: 20,
    alignItems: 'center',
    color: '#333',
  },
  PendingUserName: {
    fontSize: 18,
    color: '#000',
  },
  userName: {
    fontSize: 18,
    color: '#000',
    flex: 1,
  },
  scrollContent: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 20,
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchInput: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    marginTop: 10,
  },
  suggestionList: {
    marginTop: 10,
  },
  suggestionItem: {
    padding: 10,
    backgroundColor: '#f1f1f1',
    borderBottomWidth: 1,
    borderColor: '#ccc',
  },
  suggestionText: {
    fontSize: 16,
  },
});

export default Social;
