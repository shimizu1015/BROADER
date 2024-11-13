import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, SectionList,ScrollView, Image, TouchableOpacity, ActivityIndicator, Dimensions, Platform, useWindowDimensions, Modal } from 'react-native';
import { useNavigation, NavigationProp, useRoute, RouteProp } from '@react-navigation/native';
import { supabase } from '../supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/FontAwesome5';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Octicons from 'react-native-vector-icons/Octicons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, withSpring } from 'react-native-reanimated';
import { RootStackParamList } from '../types';
import prefecturesData from '../pref_city.json';
import SideBar from './SideBar';
import ProfileEdit from '../screens/ProfileEdit';
import Calendar from './Calendar';
import {  sendPushNotification  } from '../utils/sendPushNotification';

const { width } = Dimensions.get('window');

// RoutePropの型を指定
type UserPageRouteProp = RouteProp<RootStackParamList, 'UserPage'>;

type City = {
  citycode: string;
  city: string;
};

type Prefecture = {
  id: string;
  name: string;
  short: string;
  kana: string;
  en: string;
  city: City[];
};

// JSON配列をオブジェクトに変換
const prefecturesObject = prefecturesData[0] as { [key: string]: Prefecture };

const UserPage: React.FC = () => {
  const route = useRoute<UserPageRouteProp>();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  //@ts-ignore
  const { userId: routeUserId } = route.params || {};
  const [ownUserId, setOwnUserId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [friendStatus, setFriendStatus] = useState<'not_friends' | 'requested' | 'friends'>('not_friends');
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [userParticipatingEvents, setUserParticipatingEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userNotFound, setUserNotFound] = useState(false);
  const [currentTab, setCurrentTab] = useState('posts');
  const translateX = useSharedValue(0);
  const { width } = useWindowDimensions(); // ウィンドウの幅を取得
  const { height: screenHeight } = Dimensions.get('window');
  const [isModalVisible, setIsModalVisible] = useState(false);

  // アイコンのキャッシュ
  const iconCache = useRef(new Map<string, string>());

  // サイドバーの幅を決定
  const sidebarWidth = Platform.OS === 'web' ? (width < 748 ? 60 : 250) : 0;

  // ユーザーIDを取得
  useEffect(() => {
    const fetchUserId = async () => {
      if (routeUserId) {
        setUserId(routeUserId);
        const uuid = await AsyncStorage.getItem('supabase_user_id');
        setOwnUserId(uuid)
      } else {
        const storedUserId = await AsyncStorage.getItem('supabase_user_id');
        if (storedUserId) {
          setUserId(storedUserId);
        }
      }
    };
    fetchUserId();
  }, [routeUserId]);

  // ユーザー情報を取得
  // リアルタイムでユーザー情報を監視する
useEffect(() => {
  if (userId) {
    fetchUserInfo(userId);

    // supabaseのリアルタイム機能でユーザー情報の変更を監視
    const subscription = supabase
      .channel('user-changes')
      .on('postgres_changes', 
        {
          event: '*',  // すべてのイベント（INSERT, UPDATE, DELETE）を監視
          schema: 'public',
          table: 'users',
          filter: `id=eq.${userId}`  // 特定のユーザーIDの変更のみを監視
        },
        () => {
          // ユーザー情報が変更された際に再取得
          fetchUserInfo(userId);
        }
      )
      .subscribe();

    // クリーンアップ: コンポーネントがアンマウントされる際にサブスクリプションを削除
    return () => {
      supabase.removeChannel(subscription);
    };
  }
  }, [userId]);

  const handleMessageIconPress = async () => {
    try {
      // チャットルームがすでに存在するか確認
      const { data: existingChatRoom, error } = await supabase
        .from('personal_chats')
        .select('id')
        .or(`and(host_user_id.eq.${ownUserId},receiver_user_id.eq.${userId}),and(host_user_id.eq.${userId},receiver_user_id.eq.${ownUserId})`)
        .limit(1);
  
      if (error) {
        console.error('チャットルーム確認エラー:', error);
        return;
      }
  
      // チャットルームのIDを取得
      let chatRoomId = existingChatRoom && existingChatRoom.length > 0 ? existingChatRoom[0].id : null;
  
      // チャットルームが存在しない場合のみ新規作成
      if (!chatRoomId) {
        const { data, error: insertError } = await supabase
          .from('personal_chats')
          .insert([{ host_user_id: ownUserId, receiver_user_id: userId }]);
  
        if (insertError) {
          console.error('新しいチャットルーム作成エラー:', insertError);
          return;
        } else if (data) {
           //@ts-ignore
          chatRoomId = data[0].id;
        }
      }
  
      // チャットルームが存在するか新規作成後にナビゲート
      if (chatRoomId) {
        navigation.navigate('ChatRoom', {
          chatRoomId,
          chatRoomTitle: userInfo?.username || 'チャット',
          activeTab: 'personal'
        });
      }
    } catch (error) {
      console.error('handleMessageIconPressエラー:', error);
    }
  };
  
  

  useEffect(() => {
    if (!ownUserId || !userId) return;//これ
    const fetchFriendsStatus = async () => {
      // 自分が送信したリクエストの状態を取得
  const { data: sentRequest, error: sentError } = await supabase
    .from('friends')
    .select('status')
    .eq('user_id', ownUserId)
    .eq('friend_id', userId)
    .maybeSingle();

  if (sentError && sentError.code !== 'PGRST100') {
    console.error('Error fetching sent request status:', sentError);
  }

  // 相手が送信したリクエストの状態を取得
  const { data: receivedRequest, error: receivedError } = await supabase
    .from('friends')
    .select('status')
    .eq('user_id', userId)
    .eq('friend_id', ownUserId)
    .maybeSingle();

  if (receivedError && receivedError.code !== 'PGRST100') {
    console.error('Error fetching received request status:', receivedError);
  }

  // 状態を設定する
  if (sentRequest) {
    // 自分が送信したリクエストの状態に基づく
    const status = sentRequest.status;
    if (status === 0) {
      setFriendStatus('requested');
    } else if (status === 1) {
      setFriendStatus('friends');
    }
  } else if (receivedRequest) {
    // 相手が送信したリクエストの状態に基づく
    const status = receivedRequest.status;
    if (status === 0) {
      setFriendStatus('requested');
    } else if (status === 1) {
      setFriendStatus('friends');
    }
  } else {
    // データベースにデータがない場合
    setFriendStatus('not_friends');
  }
    }
    fetchFriendsStatus();
      // friendsテーブルの変更を監視
      // 監視コードはこれで動きはするが、friendテーブルの自分に関係のないすべての変化を読み取り　関数が動く
      // 今後の修正対象です

      const subscription = supabase
    .channel('friends-changes')
    .on('postgres_changes', 
      {
        event: '*',        // 作成、削除、更新のすべてのイベントを監視
        schema: 'public',
        table: 'friends',
      },
      () => {
        // `ownUserId` が含まれる行が変更された場合に処理を行う
          fetchFriendsStatus();  // ステータスを再度フェッチ
      }
    )
    .subscribe();

  // クリーンアップ
  return () => {
    supabase.removeChannel(subscription);
  };
  }
  )

  const fetchUserInfo = async (id: string) => {
    setLoading(true);
    
    // まず、キャッシュされたアイコンがあるか確認
    const cachedIcon = iconCache.current.get(id);
    if (cachedIcon) {
      setProfileImage(cachedIcon);
    }
  
    // Supabaseからユーザー情報を取得
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
  
    if (error || !data) {
      console.error('ユーザー情報の取得に失敗しました', error);
      setUserNotFound(true);
      setUserInfo({ username: 'Unknown', bio: 'このユーザーは存在しません。' });
      setProfileImage(null);
    } else {
      console.log("icon URL:", data['icon']);
      setUserInfo(data);
      setUserNotFound(false);
  
      // アイコンが変更された場合のみキャッシュを更新
      if (data['icon'] !== cachedIcon) {
        iconCache.current.set(id, data['icon'] || null);
      }
      
      // アイコンをキャッシュから取得し、UIを更新
      setProfileImage(iconCache.current.get(id) || null);
  
      const storedUserId = await AsyncStorage.getItem('supabase_user_id');
      setIsCurrentUser(storedUserId === id);
  
      // 投稿と参加イベント情報を取得
      fetchUserPosts(id);
      fetchUserParticipatingEvents(id);
    }
    
    setLoading(false);
  };
  
  

// 投稿を取得
const fetchUserPosts = async (id: string) => {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('host_user_id', id)
    .order('event_date', { ascending: true });

  if (error) {
    console.error('投稿の取得に失敗しました', error);
  } else {
    console.log('User posts:', data);  // デバッグ用にログを出力
    setUserPosts(data);
  }
};

// 参加しているイベントを取得
const fetchUserParticipatingEvents = async (id: string) => {
  if (!id) {
    console.error('ユーザーIDが無効です');
    return;
  }

  // 自分が参加者として含まれているイベントを取得
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .contains('participant_ids', [id])  // 配列内に自分のIDが含まれているイベントを取得
    .order('event_date', { ascending: true });

  if (error) {
    console.error('参加しているイベントの取得に失敗しました', error);
  } else if (data) {
    console.log('取得したイベントデータ:', data);  // デバッグ用のログ
    setUserParticipatingEvents(data);  // イベントデータを状態にセット
  }
};
// 自分のユーザー名を取得する関数
const fetchOwnUsername = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('username')
    .eq('id', ownUserId)
    .single();

    console.log(fetchOwnUsername)
  if (error) {
    console.error('ユーザー名の取得エラー:', error);
    return 'ユーザー'; // 取得できない場合のデフォルト名
  }

  return data.username;
};
 // フレンドリクエストを送信する際に通知を送る処理
const handleFriendAction = async () => {
  if (friendStatus === 'not_friends') {
    const { error } = await supabase
      .from('friends')
      .insert([
        { user_id: ownUserId, friend_id: userId, status: 0 }
      ]);

    if (!error) {
      const ownUsername = await fetchOwnUsername();
      const notificationBody = `${ownUsername}さんがフレンドリクエストを送りました`;

      // プッシュ通知の送信
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('pushNotificationToken')
        .eq('id', userId)
        .single();

      if (userData?.pushNotificationToken) {
        sendPushNotification(userData.pushNotificationToken, notificationBody);
      } else {
        console.warn('プッシュ通知トークンが設定されていません');
      }
    } else {
      console.error('フレンドリクエスト送信エラー:', error);
    }
 
    } else if (friendStatus === 'requested') {
      // フレンドクリエストキャンセルボタン
      // フレンド保留中にプロフィールからこのボタンを見るとリクエスト済みと表示され　ボタンを押しても処理は何も起こらない
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('user_id', ownUserId)
        .eq('friend_id', userId);

      if (error) {
        console.error('Error deleting friend relationship:', error);
      } else {
        console.log('Friend relationship deleted successfully.');
        
      }
    } else if (friendStatus === 'friends') {
      // フレンド削除ボタン
       const { error: deleteSentError } = await supabase
    .from('friends')
    .delete()
    .eq('user_id', ownUserId)
    .eq('friend_id', userId);

  if (deleteSentError) {
    console.error('Error deleting sent friend relationship:', deleteSentError);
    return;
  }

  // 相手が送信したフレンドリクエストの削除
  const { error: deleteReceivedError } = await supabase
    .from('friends')
    .delete()
    .eq('user_id', userId)
    .eq('friend_id', ownUserId);

  if (deleteReceivedError) {
    console.error('Error deleting received friend relationship:', deleteReceivedError);
    return;
  }

    }
  };
  
  // 時間フォーマットを整える
  const formatTime = (time: string) => time.replace(/:00$/, '');

  // イベントのレンダリング
  const renderEvent = ({ item, index }: { item: any, index: number }) => {
    let prefectureName = '未設定';
    let prefectureStyle = styles.articlePrefectureMissing;

    if (item.prefecture_id !== null) {
      const prefectureId = String(item.prefecture_id).padStart(2, '0');
      prefectureName = prefecturesObject[prefectureId]?.name || '不明';
      prefectureStyle = styles.articlePrefecture;
    }

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.articleContainer,
          Platform.OS === 'web' && styles.articleContainerWeb,
          index === 0 && styles.firstArticleContainer
        ]}
        onPress={() => navigation.navigate('ArticleDetail', { articleId: item.id })}
      >
        <View style={styles.articleContent}>
          <View style={styles.articleHeader}>
            <Text
              style={styles.articleTitle}
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.5}
            >
              {item.title}
            </Text>
            <View style={styles.authorPrefectureContainer}>
              <Text
                style={styles.articleAuthor}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.8}
              >
                {item.users?.username || '無効ユーザー'}
              </Text>
              <View style={styles.iconTextContainer}>
                <Icon name="map-marker-alt" size={16} color="#ddd" style={styles.icon} />
                <Text style={prefectureStyle}>{prefectureName}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.articleDate}>
            {new Date(item.event_date).toLocaleDateString()} {formatTime(item.meeting_time)}
          </Text>
          <View style={styles.iconTextContainer}>
            <Icon name="map-marked-alt" size={16} color="#ddd" style={styles.icon} />
            <Text style={styles.articleLocation}>{item.meeting_place}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const handleEditPress = () => {
    if (Platform.OS === 'web') {
      setIsModalVisible(true);  // Web版の場合、モーダルを表示
    } else {
      //@ts-ignore
      navigation.navigate('ProfileEdit');  // スマホ版の場合、通常のナビゲーション
    }
  };

  if (!userInfo || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', flex: 1 }}>
      {Platform.OS === 'web' && <SideBar style={{ zIndex: 2, width: sidebarWidth }} />}

      <View style={{ flex: 1, backgroundColor: Platform.OS === 'web' ? '#FFF' : 'transparent' }}>
        <View style={Platform.OS === 'web' ? { marginTop: 30, backgroundColor: '#FFF', flex: 1 } : { flex: 1 }}>
          {Platform.OS === 'web' && (
            <TouchableOpacity style={[styles.backButton]} onPress={() => navigation.goBack()}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
            </TouchableOpacity>
          )}
            <LinearGradient
              colors={['#ff00a1', '#040045']}
              style={[styles.container, { marginLeft: sidebarWidth, }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <SectionList
                ListHeaderComponent={
                  <View style={styles.profileSection}>
                    <View style={styles.userInfoContainer}>
                    <View style={styles.leftContainer}>
                    {profileImage ? (
                        <Image
                          source={{ uri: `${profileImage}?t=${new Date().getTime()}` }} // 常に最新の画像を取得
                          style={styles.profileIcon}
                        />
                      ) : (
                        <Image
                          source={require('../../assets/user_default_icon.png')} // デフォルトアイコン
                          style={styles.profileIcon}
                        />
                      )}
                      <Text style={styles.username}>{userInfo.username}</Text>
                      <Text style={styles.bio}>{userInfo.bio}</Text>

                    </View>
                      <View style={styles.rightContainer}>
                        {isCurrentUser ? (
                          <TouchableOpacity style={styles.editButton} onPress={handleEditPress}>
                            <Text style={styles.editButtonText}>編集</Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.actionButtonsContainer}>
                          {(friendStatus === 'requested' || friendStatus === 'friends') && (
                            <TouchableOpacity style={styles.messageIconButton} onPress={handleMessageIconPress}>
                              <Octicons name="mail" size={24} color="#000" />
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={[
                              styles.friendButton,
                              friendStatus === 'requested' && styles.requestButton,
                              friendStatus === 'friends' && styles.requestButton,
                            ]}
                            onPress={handleFriendAction}
                          >
                            <Text style={styles.friendButtonText}>
                              {friendStatus === 'not_friends' && 'フレンドリクエスト'}
                              {friendStatus === 'requested' && 'リクエスト中'}
                              {friendStatus === 'friends' && 'フレンド削除'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        
                        )}
                      </View>
                    </View>
                    
                    
                    <View style={styles.calendarContainer}>
  <Calendar
    availableDates={userParticipatingEvents.map(event => ({
      date: event.event_date,
      allDay: true,
      startTime: null,
      endTime: null,
    }))}
    onDateChange={(date) => {
      console.log('選択された日付:', date);
    }}
  />
                  </View>
                    
                  </View>
                }
            
                sections={[{ title: 'Tab Content', data: currentTab === 'posts' ? userPosts : userParticipatingEvents }]}
                renderSectionHeader={() => (
                  <View style={styles.tabsContainer}>
                    {['自分の投稿', '参加しているイベント'].map((tab, index) => (
                      <TouchableOpacity
                        key={`tab-${index}`}
                        style={styles.tabButton}
                        onPress={() => {
                          setCurrentTab(index === 0 ? 'posts' : 'events');
                          translateX.value = withSpring(index === 0 ? 0 : -width);
                        }}
                      >
                        <Text style={styles.tabText}>{tab}</Text>
                        {currentTab === (index === 0 ? 'posts' : 'events') && (
                          <View style={styles.blueUnderline} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                renderItem={({ item, index }) => renderEvent({ item, index })}
                keyExtractor={(item, index) => index.toString()}
                contentContainerStyle={styles.container}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
              />
            </LinearGradient>
        </View>
      </View>

      {/* モーダルの表示 */}
      <Modal
  visible={isModalVisible}
  transparent={true}
  animationType="none"  // アニメーションを無効にする
  onRequestClose={() => setIsModalVisible(false)}
>
  
  <View style={styles.modalOverlay}>
    <View style={styles.modalContent}>
    <View style={styles.modalHeader}>
        <Text style={styles.modalHeaderText}>プロフィール編集</Text>  {/* ヘッダーに表示するテキスト */}
        <TouchableOpacity style={styles.closeButton} onPress={() => setIsModalVisible(false)}>
          {/* MaterialCommunityIconsのcloseアイコンを使用 */}
          <MaterialCommunityIcons name="close" size={32} color="#000" />
        </TouchableOpacity>
      </View>
{/* ProfileEditコンポーネントにonCloseを渡す */}
{userId ? (
       <ProfileEdit 
       //@ts-ignore
       userId={userId} 
       onClose={() => setIsModalVisible(false)}  // モーダルを閉じる処理を渡す
     />
      ) : (
        <Text>ユーザーIDが無効です</Text>
      )}
    </View>
  </View>
</Modal>
    </View>
  );

};



const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
    width: '100%',
  },
  container: {
    flexGrow: 1,
    backgroundColor: 'transparent',
  },
  profileSection: {
    backgroundColor: '#fff',
    zIndex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingTop: 20,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  leftContainer: {
    alignItems: 'flex-start',
    flex: 2,
    marginLeft: 0,
  },
  rightContainer: {
    alignItems: 'flex-end',
    flex: 1,
    marginRight: 20,
  },
  profileIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'left',
  },
  bio: {
    fontSize: 16,
    color: '#555',
    textAlign: 'left',
    marginTop: 10,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageIconButton: {
    padding: 10,
    backgroundColor: 'transparent', // 一旦背景色を透明に
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    alignItems: 'center',
    backgroundColor: '#02B902',
    borderWidth: 1,
    borderColor: '#7DE33D',
    width: 150,
    marginRight: -10,
  },
  friendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  requestButton: {
    backgroundColor: '#f63b3b',
    borderWidth: 1,
    borderColor: '#f63b3b',
  },
  editButton: {
    
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d3d3d3',
    backgroundColor: 'transparent',
    width: 65,
  },
  editButtonText: {
    color: '#000',
    fontSize: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#d3d3d3',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  tabText: {
    fontSize: 16,
    color: '#000',
    marginBottom: 4,
  },
  blueUnderline: {
    height: 2,
    width: '100%',
    backgroundColor: '#1d9bf0',
    borderRadius: 4,
    marginBottom: 0,
  },
  articleContainer: {
    width: '90%',
    padding: 16,
    marginBottom: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: Platform.OS === 'web' ? 'center' : 'center',
  },
  firstArticleContainer: {
    marginTop: 8,
  },
  articleContainerWeb: {
    maxWidth: 800,
    alignSelf: 'center',
  },
  articleContent: {
    flex: 1,
  },
  articleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  articleTitle: {
    fontSize: 30, 
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 10,
    maxWidth: '70%',
    lineHeight: 30,
  },
  authorPrefectureContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    maxWidth: '30%',
  },
  articlePrefectureMissing: {
    fontSize: 16,
    color: '#ddd',
  },
  articleAuthor: {
    fontSize: 16,
    color: '#ddd',
    maxWidth: '100%',
    lineHeight: 18,
    textAlign: 'right',
  },
  articlePrefecture: {
    fontSize: 16,
    color: '#ddd',
  },
  articleDate: {
    color: '#ccc',
    fontSize: 15,
  },
  articleLocation: {
    color: '#ddd',
    fontSize: 17,
  },
  iconTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',  // 半透明の背景
  },
  modalContent: {
    width: '90%',
    maxWidth: 800,
    height: '70%',
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',  // はみ出し防止
  },
  modalHeader: {
    width: '100%',
    flexDirection: 'row',  // 横並びにする
    justifyContent: 'space-between',  // 左右にスペースを空ける
    alignItems: 'center',
    marginBottom: 20,  // ヘッダー下に余白を追加
  },
  modalHeaderText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 10,
    borderRadius: 5,
    backgroundColor: 'transparent',
  },
  backButton: {
    marginLeft: 251,
  },

  calendarContainer: {
   paddingHorizontal:15,
  },

});

export default UserPage;
