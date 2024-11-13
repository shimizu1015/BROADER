import React, { useEffect, useState, useRef } from 'react';
import { View, TextInput, FlatList, Text, StyleSheet, SafeAreaView, TouchableOpacity, KeyboardAvoidingView, Modal, Platform, Alert, Clipboard, Image, AppState, AppStateStatus  } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabaseClient';
import { StackScreenProps } from '@react-navigation/stack';
import dayjs from 'dayjs';
import { RealtimeChannel } from '@supabase/supabase-js';
import { RootStackParamList } from '../types';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'; 
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { sendPushNotification } from '../utils/sendPushNotification';

type ChatRoomProps = StackScreenProps<RootStackParamList, 'ChatRoom'>;

interface Message {
  id: number;
  user_id: string;
  content: string;
  created_at: string;
  username: string;
  read_by_user_ids: string[];
  is_deleted?: boolean;
  icon?: string | null;
}

interface Participant {
  id: string;
  username: string;
  icon?: string | null;
}

const ChatRoom: React.FC<ChatRoomProps> = ({ route }) => {
  const { chatRoomId, chatRoomTitle, activeTab } = route.params;
  const [username, setUsername] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [inputHeight, setInputHeight] = useState(40);
  const [userId, setUserId] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState<number>(0);
  const [participants, setParticipants] = useState<Participant[]>([]); 
  const [hostUserId, setHostUserId] = useState<string | null>(null);
  const [isModalVisible, setModalVisible] = useState<boolean>(false); 
  const flatListRef = useRef<FlatList>(null);
  const subscriptionRef = useRef<RealtimeChannel | null>(null);
  const navigation = useNavigation();
  const [isChatRoomOpen, setIsChatRoomOpen] = useState<boolean>(false);
  const [isRequestSender, setIsRequestSender] = useState(false);
  //const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [isFriend, setIsFriend] = useState(false);
  const [showFriendRequestModal, setShowFriendRequestModal] = useState(false);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const userCache = useRef(new Map<string, { username: string; icon: string | null }>());




// チャットルームを開いているユーザーを取得する関数
const fetchOpenChatRoomUsers = async (chatRoomId: string) => {
  try {
    const { data, error } = await supabase
      .from('chat_room_status')
      .select('user_id')
      .eq('chat_room_id', chatRoomId)
      .eq('is_open', true); // チャットルームが開いているユーザーのみ取得

    if (error) {
      console.error('Error fetching open chat room users:', error);
      return [];
    }

    // デバッグ: データの内容をログに出力
    console.log('取得したデータ:', data);

    // 開いているユーザーのIDリストを返す
    return data.map((entry) => entry.user_id);
  } catch (error) {
    console.error('Failed to fetch open chat room users:', error);
    return [];
  }
};

   // チャットルームが開かれているユーザーを確認する関数
const checkOpenUsers = async () => {
  if (!chatRoomId) return;

  const openUsers = await fetchOpenChatRoomUsers(chatRoomId);
  // デバッグ: 取得したユーザーIDのリストをログに出力
  console.log('現在のチャットルームを開いているユーザー:', openUsers);
};


  // ユーザーIDと名前を取得
  useEffect(() => {
    console.log('ChatRoomコンポーネントがマウントされました'); // デバッグ: コンポーネントのマウント
  
    const loadUserData = async () => {
      console.log('ユーザーデータをロード中'); // デバッグ: データロード開始
      const storedUserId = await AsyncStorage.getItem('supabase_user_id');
      if (storedUserId) {
        console.log('取得したUserID:', storedUserId); // デバッグ: UserIDの取得確認
        setUserId(storedUserId);
        const { data: userData, error } = await supabase
          .from('users')
          .select('username')
          .eq('id', storedUserId)
          .single();
  
        if (userData) {
          setUsername(userData.username);
          console.log('ユーザー名を取得しました:', userData.username); // デバッグ: ユーザー名の取得
        } else {
          console.error('ユーザー名の取得中にエラーが発生しました:', error);
        }
      }
    };
    loadUserData();
  }, []);

  // userIdが設定された後にotherUserIdを設定
useEffect(() => {
  const fetchOtherUserId = async () => {
    try {
      const { data, error } = await supabase
        .from('personal_chats')
        .select('host_user_id, receiver_user_id')
        .eq('id', chatRoomId)
        .single();

    if (error || !data) {
      //console.error('該当するチャット参加者が見つかりませんでした');
      return;
    }

      // userIdと一致しないIDをotherUserIdとして設定
      const tempOtherUserId =
        data.host_user_id === userId ? data.receiver_user_id : data.host_user_id;

      setOtherUserId(tempOtherUserId);
      console.log('otherUserIdが設定されました:', tempOtherUserId); // デバッグログ

    } catch (error) {
      console.error('Error fetching other user ID:', error);
    }
  };

  if (userId && chatRoomId) {
    fetchOtherUserId();
  }
}, [userId, chatRoomId]);

// アプリの状態の監視
useEffect(() => {
  if (!userId) {
    console.log('userIdがまだ設定されていません。');
    return;
  }

  console.log('AppStateの監視を開始します');

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    console.log('アプリの状態が変更されました:', nextAppState); // デバッグ: アプリ状態の変更

    if (nextAppState === 'background' || nextAppState === 'inactive') {
      console.log('アプリがバックグラウンドに入りました'); // デバッグ: バックグラウンド移行
      if (userId) {
        console.log('バックグラウンドでのステータス更新を実行'); // 追加デバッグ
        await updateChatRoomStatus(false);
      }
    } else if (nextAppState === 'active') {
      console.log('アプリがアクティブになりました'); // デバッグ: アクティブ状態
      if (userId) {
        console.log('アクティブでのステータス更新を実行'); // 追加デバッグ
        await updateChatRoomStatus(true);
        await checkOpenUsers();
      }
    }
  };

  const subscription = AppState.addEventListener('change', handleAppStateChange);

  console.log('AppStateのリスナーを追加しました');

  return () => {
    console.log('AppStateのリスナーを削除します');
    subscription.remove();
  };
}, [userId]);

 // チャットルームのフォーカス状態を監視
 useFocusEffect(
  React.useCallback(() => {
    // チャットルームに入ったときにステータスを更新
    if (userId) {
      console.log('チャットルームに入ったため、ステータスを更新');
      updateChatRoomStatus(true);
    }

    // 戻るボタンが押されたときの処理
    const unsubscribe = navigation.addListener('beforeRemove', async () => {
      console.log('戻るボタンが押されました - is_openをfalseに設定');
      await updateChatRoomStatus(false);
    });

    return () => {
      unsubscribe();
    };
  }, [navigation, userId])
);


// チャットルームのステータスを更新する関数
const updateChatRoomStatus = async (isOpen: boolean) => {
  console.log('updateChatRoomStatus関数が呼び出されました - isOpen:', isOpen); // デバッグ: 関数の呼び出し
  if (!chatRoomId || !userId) {
    console.log('チャットルームIDまたはユーザーIDが無効です。chatRoomId:', chatRoomId, ', userId:', userId); // 追加デバッグ: ID無効時の詳細表示
    return;
  }

  try {
    console.log('チャットルームのステータスを更新中... isOpen:', isOpen); // デバッグ: ステータス更新の開始
    const { error } = await supabase
      .from('chat_room_status')
      .upsert(
        { chat_room_id: chatRoomId, user_id: userId, is_open: isOpen, updated_at: new Date().toISOString() },
        { onConflict: 'chat_room_id, user_id' }
      );

    if (error) {
      console.error('チャットルームのステータス更新中にエラーが発生しました:', error);
    } else {
      console.log('チャットルームのステータスを更新しました:', { chatRoomId, userId, isOpen }); // デバッグ: ステータス更新成功
      await checkOpenUsers(); // ステータス更新後に開いているユーザーを確認
    }
  } catch (error) {
    console.error('チャットルームのステータスを更新できませんでした:', error);
  }
};


  // スクロールを下まで移動させる関数
  const scrollToBottom = () => {
    if (flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  // メッセージが更新されたら、リストを下にスクロール
  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: false });
    }, 100);
  }, [messages]);

  // 参加者リストとホストのIDを取得
  useEffect(() => {
    const fetchParticipantsAndHost = async () => {
      const { data: articleData, error } = await supabase
        .from('articles')
        .select('participant_ids, host_user_id')
        .eq('chat_room_id', chatRoomId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching participants:', error);
      } else if (articleData) {
        const participantIds = articleData.participant_ids || [];
        setHostUserId(articleData.host_user_id);

        const { data: participantsData, error: usersError } = await supabase
          .from('users')
          .select('id, username, icon')
          .in('id', [...participantIds, articleData.host_user_id]);

        if (usersError) {
        console.error('Error fetching users:', usersError);
       } else {
          // ホストのユーザーを最初に持ってくるように並び替える
          const sortedParticipants = participantsData.sort((a: Participant, b: Participant) => {
            if (a.id === articleData.host_user_id) return -1;
            if (b.id === articleData.host_user_id) return 1;
            return 0;
          });

         setParticipants(sortedParticipants);
          setParticipantCount(sortedParticipants.length);
        }
      }
    };

    fetchParticipantsAndHost();
  }, [chatRoomId]);
  


  // メッセージをロードし、未読メッセージを既読にする
  useEffect(() => {
    const loadMessages = async () => {
      if (!chatRoomId) {
        console.error('Invalid chatRoomId:', chatRoomId);
        return;
      }
    
      try {
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_room_id', chatRoomId)
          .order('created_at', { ascending: true });
    
        if (messagesError) throw messagesError;
    
        // ユーザー名を取得してメッセージに追加
        const updatedMessages = await Promise.all(
          messagesData.map(async (message: Message) => {
            // user_idがnullまたは空の場合はユーザー情報の取得をスキップ
            if (!message.user_id || message.user_id === 'null') {
              return { ...message, username: 'システムメッセージ', icon: null };
            }
  
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('username, icon')
              .eq('id', message.user_id)
              .single();
        
            if (userError) {
              console.error(`Error fetching user for message ${message.id}:`, userError);
            }
            return { ...message, username: userData?.username || '無名ユーザー',
              icon: userData?.icon || null,
            };
          })
        );
        
        setMessages(updatedMessages);
      } catch (error) {
        console.error('Failed to load messages:', error);
      }
    };

    if (userId) {
      loadMessages();
    }

    // リアルタイムメッセージの監視
    const subscribeToMessages = () => {
      const channel = supabase
        .channel(`public:messages:chat_room_id=eq.${chatRoomId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_room_id=eq.${chatRoomId}` },
          async (payload) => {
            const newMessage = payload.new as Message;
    
            // キャッシュからユーザー情報を取得（キャッシュになければSupabaseから取得）
            let userInfo = userCache.current.get(newMessage.user_id);
            if (!userInfo) {
              const { data: userData, error: userError } = await supabase
                .from('users')
                .select('username, icon')
                .eq('id', newMessage.user_id)
                .single();
    
              if (userError) {
                console.error(`Error fetching user for message ${newMessage.id}:`, userError);
                return;
              }
    
              userInfo = { username: userData?.username || '無名ユーザー', icon: userData?.icon || null };
              userCache.current.set(newMessage.user_id, userInfo); // キャッシュに保存
            }
    
            const messageWithUsername = {
              ...newMessage,
              username: userInfo.username,
              icon: userInfo.icon, // キャッシュされたアイコンを利用
            };
            
    // メッセージ受信時の既読処理
      if (isChatRoomOpen && newMessage.user_id !== userId) {
              try {
                const openUsers = await fetchOpenChatRoomUsers(chatRoomId);
                const updatedReadByUserIds = openUsers.filter(id => id !== userId);
    
                const { data: messageData, error: messageError } = await supabase
                  .from('messages')
                  .select('read_by_user_ids')
                  .eq('id', newMessage.id)
                  .single();
    
                if (!messageError && messageData && !messageData.read_by_user_ids.includes(userId)) {
                  updatedReadByUserIds.push(userId);
                  await supabase
                    .from('messages')
                    .update({ read_by_user_ids: updatedReadByUserIds })
                    .eq('id', newMessage.id);
                }
              } catch (error) {
                console.error('Error updating read_by_user_ids:', error);
              }
            }
    
            setMessages((prevMessages) => [...prevMessages, messageWithUsername]);
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'messages', filter: `chat_room_id=eq.${chatRoomId}` },
          async (payload) => {
            const updatedMessage = payload.new as Message;
    
            // キャッシュからユーザー情報を取得（キャッシュになければSupabaseから取得）
            let userInfo = userCache.current.get(updatedMessage.user_id);
            if (!userInfo) {
              const { data: userData, error: userError } = await supabase
                .from('users')
                .select('username, icon')
                .eq('id', updatedMessage.user_id)
                .single();
    
              if (userError) {
                console.error(`Error fetching user for message ${updatedMessage.id}:`, userError);
                return;
              }
    
              userInfo = { username: userData?.username || '無名ユーザー', icon: userData?.icon || null };
              userCache.current.set(updatedMessage.user_id, userInfo); // キャッシュに保存
            }
    
            const messageWithUsername = {
              ...updatedMessage,
              username: userInfo.username,
              icon: userInfo.icon, // キャッシュされたアイコンを利用
            };
    
            setMessages((prevMessages) =>
              prevMessages.map((message) =>
                message.id === updatedMessage.id ? messageWithUsername : message
              )
            );
          }
        )
        .subscribe();
    
      subscriptionRef.current = channel;
    
      return () => {
        if (subscriptionRef.current) {
          supabase.removeChannel(subscriptionRef.current);
        }
      };
    };
    

    const unsubscribe = subscribeToMessages();

    return () => {
      unsubscribe();
    };
  }, [userId, chatRoomId]);
  // ChatRoomコンポーネント内のuseEffectフック
useEffect(() => {
  const markAllMessagesAsRead = async () => {
    if (!isFriend || !chatRoomId || !userId) return;

    try {
      console.log('Web環境で既読処理を開始しました'); // デバッグ用ログ

      // 未読メッセージを取得
      const { data: unreadMessages, error } = await supabase
  .from('messages')
  .select('id, read_by_user_ids')
  .eq('chat_room_id', chatRoomId)
  .not('read_by_user_ids', 'cs', `{${userId}}`); // 修正箇所

      if (error) {
        console.error('未読メッセージの取得中にエラーが発生しました（Web）:', error);
        return;
      }

      console.log('取得した未読メッセージ（Web）:', unreadMessages); // デバッグ用ログ

      if (unreadMessages && unreadMessages.length > 0) {
        for (const message of unreadMessages) {
          const updatedReadByUserIds = [...message.read_by_user_ids, userId];

          // メッセージの既読処理を実行
          const { error: updateError } = await supabase
            .from('messages')
            .update({ read_by_user_ids: updatedReadByUserIds })
            .eq('id', message.id);

          if (updateError) {
            console.error('メッセージの既読処理中にエラーが発生しました（Web）:', updateError);
          } else {
            console.log(`メッセージID ${message.id} の既読処理が成功しました（Web）`);
          }
        }
      }
    } catch (error) {
      console.error('既読処理中にエラーが発生しました（Web）:', error);
    }
  };

  if (Platform.OS === 'web') {
    markAllMessagesAsRead(); // Web環境のみで実行
  }
}, [chatRoomId, userId]);


  // メッセージ送信処理
  const handleSendMessage = async (): Promise<void> => {
    if (message.trim() && chatRoomId && userId) {
      try {
        // 現在のチャットルームを開いているユーザーを取得
        const openUsers = await fetchOpenChatRoomUsers(chatRoomId);

        // 自分のIDを除外
        const readByUserIds = openUsers.filter((id) => id !== userId);

        const { error } = await supabase.from('messages').insert([{
        chat_room_id: chatRoomId,
        user_id: userId || '',
        content: message,
        created_at: new Date().toISOString(),
        read_by_user_ids: readByUserIds, // 自分以外のユーザーIDをセット
      }]);
      
      if (error) {
        console.error('Error sending message:', error);
      } else {
        setMessage('');
        setInputHeight(40);

         // プッシュ通知送信処理
      let recipientIds: string[] = [];

      if (activeTab === 'group') {
        // グループチャットの場合、全員に通知（送信者を除外）
        recipientIds = participants.map((participant) => participant.id).filter((id) => id !== userId);
      } else if (activeTab === 'personal' && otherUserId) {
        // 個人チャットの場合、特定の相手に通知
        recipientIds = [otherUserId];
      }

      // プッシュ通知用トークンの取得と通知送信
      const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, pushNotificationToken')
      .in('id', recipientIds);

    if (!usersError && usersData) {
      const notificationBody = `${username || 'ユーザー'}: ${message}`;

      usersData.forEach((user) => {
        if (user.pushNotificationToken) {
          console.log(`通知送信先: ${user.id}, トークン: ${user.pushNotificationToken}`);
          sendPushNotification(user.pushNotificationToken, notificationBody);
        } else {
          console.warn(`プッシュ通知トークンが設定されていないユーザー: ${user.id}`);
        }
      });
    } else {
      console.error('プッシュ通知トークンの取得エラー:', usersError);
    }
        setTimeout(() => {
          if (flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: true });
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error handling message sending:', error);
    }
  }
};

  
    // メッセージがロードされるときに既読にする関数
  const handleMarkAsRead = async (messageId: number) => {
    if (!userId) return;

    try {
      const { data: messageData, error } = await supabase
        .from('messages')
        .select('read_by_user_ids')
        .eq('id', messageId)
        .single();

      if (error || !messageData) return;

      const alreadyRead = messageData.read_by_user_ids.includes(userId);
      if (!alreadyRead) {
        const updatedReadByUserIds = [...messageData.read_by_user_ids, userId];
        await supabase
          .from('messages')
          .update({ read_by_user_ids: updatedReadByUserIds })
          .eq('id', messageId);
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  // メッセージを削除する関数
  const handleDeleteMessage = async (messageId: number) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_deleted: true, content: '' })
        .eq('id', messageId);
  
      if (error) {
        console.error('Error marking message as deleted:', error);
      } else {
        setMessages((prevMessages) =>
          prevMessages.map((message) =>
            message.id === messageId ? { ...message, is_deleted: true } : message
          )
        );
      }
    } catch (error) {
      console.error('Failed to mark message as deleted:', error);
    }
  }
  // ユーザーIDと名前を取得
  useEffect(() => {
    console.log('ChatRoomコンポーネントがマウントされました');

    const loadUserData = async () => {
      console.log('ユーザーデータをロード中');
      const storedUserId = await AsyncStorage.getItem('supabase_user_id');
      if (storedUserId) {
        console.log('取得したUserID:', storedUserId);
        setUserId(storedUserId);
        const { data: userData, error } = await supabase
          .from('users')
          .select('username')
          .eq('id', storedUserId)
          .single();
    
        if (userData) {
          setUsername(userData.username);
          console.log('ユーザー名を取得しました:', userData.username);
        } else {
          console.error('ユーザー名の取得中にエラーが発生しました:', error);
        }
      }
    };
    loadUserData();
  }, []);

 // userIdが設定された後にotherUserIdを設定
 useEffect(() => {
  console.log('route.params:', route.params); // route.paramsの内容をログに出力
  if (userId) {
    const tempOtherUserId = userId === route.params.hostUserId ? route.params.receiverUserId : route.params.hostUserId;
    setOtherUserId(tempOtherUserId || null);
    console.log('otherUserIdが設定されました:', tempOtherUserId); // デバッグログ
  }
}, [userId, route.params.hostUserId, route.params.receiverUserId]);


  useEffect(() => {
    if (userId && otherUserId) {
      checkFriendStatus();  // 両方のIDが設定されてから実行
    } else {
      console.log('userIdまたはotherUserIdが設定されていない:', userId, otherUserId);
    }
  }, [userId, otherUserId]);
  
  

const checkFriendStatus = async () => {
  console.log('checkFriendStatus関数が呼ばれました');
  console.log('userId:', userId, 'otherUserId:', otherUserId);

  if (userId && otherUserId) {
    const { data, error } = await supabase
      .from('friends')
      .select('*')
      .or(`and(user_id.eq.${userId},friend_id.eq.${otherUserId}),and(user_id.eq.${otherUserId},friend_id.eq.${userId})`)
      .eq('status', 1)  // フレンドのステータスが1であることを確認
      .maybeSingle();

    if (error) {
      console.error('Error fetching friend status:', error);
      setShowFriendRequestModal(true);
    } else if (data) {
      console.log('フレンドステータス取得成功:', data);
      setIsFriend(true);
    } else {
      console.log('フレンドではないため、リクエストメッセージを表示');
      setShowFriendRequestModal(true);
    }
  } else {
    console.log('userIdまたはotherUserIdがnullです');
  }
};

// userIdとotherUserIdが設定された時にフレンド状態を確認
useEffect(() => {
  if (userId && otherUserId) {
    checkFriendStatus();
  }
}, [userId, otherUserId]);

  
const handleAllowFriendRequest = async () => {
  if (!userId || !otherUserId) return;

  try {
    // 友達関係が既に存在するか確認
    const { data, error: checkError } = await supabase
      .from('friends')
      .select('*')
      .or(`and(user_id.eq.${userId},friend_id.eq.${otherUserId}),and(user_id.eq.${otherUserId},friend_id.eq.${userId})`)
      .maybeSingle();

    if (checkError) {
      console.error('友達関係の確認中にエラーが発生しました:', checkError);
      return;
    }

    if (data) {
      // 既に友達関係が存在する場合は status を 1 に更新
      const { error: updateError } = await supabase
        .from('friends')
        .update({ status: 1 })
        .or(`and(user_id.eq.${userId},friend_id.eq.${otherUserId}),and(user_id.eq.${otherUserId},friend_id.eq.${userId})`);

      if (!updateError) {
        setIsFriend(true);
        setShowFriendRequestModal(false);  // モーダルを非表示
        console.log('友達関係のステータスを更新しました');
      } else {
        console.error('友達関係のステータス更新に失敗しました:', updateError);
      }
    } else {
      // 友達関係が存在しない場合は新規レコードを挿入
      const { error: insertError } = await supabase.from('friends').insert([
        { user_id: userId, friend_id: otherUserId, status: 1 },
        { user_id: otherUserId, friend_id: userId, status: 1 }
      ]);

      if (!insertError) {
        setIsFriend(true);
        setShowFriendRequestModal(false);  // モーダルを非表示
        console.log('友達関係を新規に作成しました');
      } else {
        console.error('友達追加に失敗しました:', insertError);
      }
    }
  } catch (error) {
    console.error('友達関係の処理中にエラーが発生しました:', error);
  }
};

  
  const handleDenyFriendRequest = () => {
    setShowFriendRequestModal(false);
    navigation.goBack();  // チャット画面から戻る
  };

  useEffect(() => {
    console.log("showFriendRequestModalの状態:", showFriendRequestModal);
  }, [showFriendRequestModal]);

// リクエスト送信者かどうかを確認
useEffect(() => {
  const checkIfRequestSender = async () => {
    if (userId && otherUserId) {
      const { data, error } = await supabase
        .from('friends') // フレンドリクエストを管理するテーブル
        .select('*')
        .eq('user_id', userId) // ログインユーザーIDを使用
        .eq('friend_id', otherUserId) // 他のユーザーIDと照合
        .single();

      if (!error && data) {
        setIsRequestSender(true);
      } else {
        setIsRequestSender(false);
      }
    }
  };
  checkIfRequestSender();
}, [userId, otherUserId]);

  
  // 入力欄の高さを調整
  const handleContentSizeChange = (contentWidth: number, contentHeight: number) => {
    const maxHeight = 40 * 8;
    setInputHeight(Math.min(contentHeight, maxHeight));
  };

  // モーダル表示切り替え
  const toggleModal = () => {
    setModalVisible(!isModalVisible);
  };

  // 参加者リスト表示（ホストには "(ホスト)" を付与）
  const renderParticipantItem = ({ item }: { item: Participant }) => (
    <View style={styles.participantItem}>
    <Image
      source={item.icon ? { uri: item.icon } : require('../../assets/user_default_icon.png')}
      // @ts-ignore
      style={styles.participantIcon}
    />
    <Text style={styles.participantText}>
      {item.username}{item.id === hostUserId ? ' (ホスト)' : ''}
    </Text>
  </View>
);

  // メッセージ表示処理
  const renderMessageItem = ({ item, index }: { item: Message, index: number }) => {
    if (!item.read_by_user_ids) {
      item.read_by_user_ids = [];
    }
    const currentDate = dayjs(item.created_at).format('YYYY-MM-DD');
    const previousDate = index > 0 ? dayjs(messages[index - 1].created_at).format('YYYY-MM-DD') : null;
    const isFirstMessageOfDay = currentDate !== previousDate;

    // ユーザーが参加したメッセージかどうかの判定
  const isJoinMessage = item.content && item.content.includes('が参加しました');
  const displayTime = isJoinMessage ? dayjs(item.created_at).format('HH:mm') : '';


    const handleLongPress = () => {
      const options = [
        {
          text: "コピー",
          onPress: () => {
            Clipboard.setString(item.content);  
            Alert.alert("コピーしました", "メッセージの内容をコピーしました。");
          },
        },
      ];

      // 自分のメッセージの場合「削除」オプションを追加
      if (item.user_id === userId) {
        options.push({
          text: "削除",
          onPress: () => handleDeleteMessage(item.id),
          // @ts-ignore
          style: "destructive" as "destructive",
        });
      }

      options.push({
        text: "キャンセル",
        onPress: () => {},
        // @ts-ignore
        style: "cancel" as "cancel",
      });

      Alert.alert(
        "メッセージアクション",
        undefined,
        options,
        { cancelable: true }
      );
    };

// システムメッセージまたは削除されたメッセージの処理
if (item.is_deleted || item.user_id === '' || item.user_id === null) {
  const isJoinMessage = item.content.includes('が参加しました');
  const displayTime = dayjs(item.created_at).format('HH:mm');

  return (
    <View style={[styles.messageWrapper, { alignSelf: 'center' }]}>
      {/* 日付表示（変更しない部分） */}
      {isFirstMessageOfDay && (
        <Text style={styles.dateHeader}>{dayjs(item.created_at).format('YYYY年MM月DD日')}</Text>
      )}
      {/* 時間と参加メッセージ部分 */}
      {item.user_id === '' || item.user_id === null ? (
        <View style={styles.joinMessageBox}>
          <Text style={styles.joinMessageTime}>{displayTime}</Text>
          <Text style={styles.joinMessageText}>{item.content}</Text>
        </View>
      ) : (
        <Text style={styles.deletedMessageText}>
          {item.is_deleted ? 'メッセージが削除されました' : item.content}
        </Text>
      )}
    </View>
  );  
}

    return (
      <View>
        {/* 日付表示 */}
        {isFirstMessageOfDay && (
          <Text style={styles.dateHeader}>{dayjs(item.created_at).format('YYYY年MM月DD日')}</Text>
        )}
        {/* 他ユーザーのメッセージにアイコンとユーザー名を表示 */}
        {item.user_id !== userId && (
      <View style={styles.messageHeader}>
        <Image
         source={item.icon ? { uri: `${item.icon}?timestamp=${new Date().getTime()}` } : require('../../assets/user_default_icon.png')}
          // @ts-ignore
          style={styles.userIcon}
        />
        <Text style={styles.username}>
          {item.username || '無名ユーザー'}
        </Text>
      </View>
    )}
        <TouchableOpacity onLongPress={handleLongPress} activeOpacity={1}>
          <View style={[styles.messageWrapper, item.user_id === userId ? styles.myMessageWrapper : styles.otherMessageWrapper]}>
            <View
              style={[
                styles.messageContainer,
                item.user_id === userId ? styles.myMessageContainer : styles.otherMessageContainer
              ]}
            >
              <View style={[styles.messageBubble, item.user_id === userId ? styles.myMessageBubble : styles.otherMessageBubble]}>
                <Text style={styles.messageContent}>{item.content}</Text>
              </View>

              <View style={styles.messageMeta}>
                  {item.user_id === userId && (
                    <View style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
                      {item.read_by_user_ids.length > 0 && (
                        <Text style={styles.readReceipt}>
                          {activeTab === 'personal' && item.read_by_user_ids.length === 1
                            ? '既読'
                            : `既読 ${item.read_by_user_ids.length}`}
                        </Text>
                      )}
                      <Text style={[styles.timestamp, styles.myTimestamp]}>{dayjs(item.created_at).format('HH:mm')}</Text>
                    </View>
                  )}
                {/* 相手のメッセージ */}
                {item.user_id !== userId && (
                  <View style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                    <Text style={[styles.timestamp, styles.otherTimestamp]}>{dayjs(item.created_at).format('HH:mm')}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.outerContainer}>
      {/* 参加者リストのモーダル */}
      <Modal
        visible={isModalVisible}
        transparent={false} 
        animationType={'slide'}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderText}>参加者リスト</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={32} color="#000" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={participants}
              keyExtractor={(item) => item.id}
              renderItem={renderParticipantItem}
            />
          </View>
        </View>
      </Modal>

      {/* ヘッダー */}
      <View style={[styles.header, Platform.OS === 'web' ? styles.fixedHeader : null]}>
        <Text style={styles.headerTitle}>{chatRoomTitle}</Text>
          {activeTab === 'group' && participants.length > 1 && (
            <TouchableOpacity onPress={toggleModal}>
              <Text style={styles.participantCount}>参加者: {participantCount}人</Text>
            </TouchableOpacity>
          )}
      </View>

 {/* フレンドリクエストメッセージの表示 */}
 {showFriendRequestModal && !isRequestSender && (
        <View style={styles.friendRequestContainer}>
          <Text style={styles.friendRequestText}>メッセージを送信するには許可が必要です。</Text>
          <View style={styles.friendRequestButtons}>
            <TouchableOpacity onPress={handleAllowFriendRequest} style={styles.allowButton}>
              <Text style={styles.buttonText}>許可</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDenyFriendRequest} style={styles.denyButton}>
              <Text style={styles.buttonText}>拒否</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        {/* メッセージリスト */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMessageItem}
          contentContainerStyle={[
            styles.flatListContainer,
            Platform.OS === 'web' ? { paddingTop: 60 } : { paddingTop: 0 },
          ]}
          onContentSizeChange={scrollToBottom}
          onLayout={scrollToBottom}
          // @ts-ignore
          style={{
            maxHeight: 'calc(100vh - 90px)',
            overflowY: 'auto',
          }}
        />

        {/* メッセージ入力欄 */}
          <View style={[styles.inputContainer, Platform.OS === 'web' ? styles.fixedInputContainer : null]}>
            <TextInput
              style={[styles.input, { height: inputHeight }]}
              value={message}
              onChangeText={setMessage}
              multiline
              textAlignVertical="center"
              onContentSizeChange={(e) =>
                setInputHeight(Math.min(e.nativeEvent.contentSize.height, 200))
              }
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
    
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    width: '100%',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  flatListContainer: {
    flexGrow: 1,
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    backgroundColor: '#fff',
    width: '100%',
  },
  input: {
    flex: 1,
    minHeight: Platform.OS === 'web' ? 70 : 30,
    maxHeight: Platform.OS === 'web' ? 200 : 100, 
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 13,
    marginRight: 10,
    backgroundColor: '#fff',
    textAlignVertical: 'center',
  },
  sendButton: {
    backgroundColor: '#0b93f6',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 20,
  },
  messageWrapper: {
    marginBottom: 10,
    maxWidth: '56%',
    marginHorizontal: '1%',
  },
  myMessageWrapper: {
    alignSelf: 'flex-end',
  },
  otherMessageWrapper: {
    alignSelf: 'flex-start',
  },
  messageContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  myMessageContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    marginRight: 5,
  },
  otherMessageContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginLeft: 5,
  },
  messageBubble: {
    padding: 10,
    borderRadius: 20,
    marginBottom: 5,
  },
  myMessageBubble: {
    backgroundColor: '#dcf8c6',
    borderTopRightRadius: 0,
    borderWidth: 1,
    borderColor: '#ccc',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  otherMessageBubble: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  messageContent: {
    fontSize: 16,
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deletedMessageText: {
    fontSize: 14,
    fontStyle: 'italic',  
    color: '#999',
    textAlign: 'center',
    marginVertical: 5,
    alignSelf: 'center',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  joinMessageBox: {
    backgroundColor: '#e0f2f1',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinMessageWrapper: {
    backgroundColor: '#f0f8ff', // 参加メッセージの背景色
    padding: 10,
    borderRadius: 10,
    marginVertical: 0, // 上下のマージンをなくして余白を調整
  },
  joinMessageText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#004d40', // 参加メッセージのテキスト色
    textAlign: 'center',
  },
  joinMessageTime: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#004d40', // 参加メッセージのテキスト色
    textAlign: 'center',
  },
  myTimestamp: {
    textAlign: 'right',
    alignSelf: 'flex-end', 
  },
  otherTimestamp: {
    textAlign: 'left',
    alignSelf: 'flex-start',
    marginLeft: 10,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4a4a4a', 
    marginBottom: 3,
    marginLeft: 5,
  },
  readReceipt: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  fixedHeader: {
    // @ts-ignore
    position: 'fixed',
    top: 0,
    width: '66%', // サイドバーの幅を考慮して狭める
    zIndex: 10,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  participantCount: {
    fontSize: 16,
    color: '#888',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    maxWidth: 800,
    height: '70%',
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
  },
  modalHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalHeaderText: {
    fontSize: 30,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  closeButton: {
    padding: 10,
    borderRadius: 5,
    backgroundColor: 'transparent',
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  participantIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  participantText: {
    fontSize: 18,
  },
  dateHeader: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginVertical: 10,
  },
  fixedInputContainer: {
    // @ts-ignore
    position: 'fixed',
    bottom: 0,
    width: '66%',
    zIndex: 10,
    backgroundColor: '#fff',
  },
  scrollableMessages: {
    paddingTop: 60,
    paddingBottom: 100,
    // @ts-ignore
    overflowY: 'scroll',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  userIcon: {
    width: 25,
    height: 25,
    borderRadius: 50,
  },
  joinLogBubble: {
    backgroundColor: '#f0f0f0',
    borderRadius: 15,
    padding: 10,
    marginVertical: 5,
    borderWidth: 1,
    borderColor: '#ccc',
    alignSelf: 'center',
  },

  joinLogTime: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
    textAlign: 'center',
  },
  friendRequestContainer: {
    padding: 10,
    top: Platform.OS === 'web' ? 60 : 0,
    backgroundColor: '#fff0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: Platform.OS === 'web' ? 20 : 0, 
    alignItems: 'center',
  },
  friendRequestText: {
    color: '#d9534f',
    fontSize: 16,
    flex: 1,
  },
  friendRequestButtons: {
    flexDirection: 'row',
  },
  allowButton: {
    backgroundColor: '#5cb85c',
    padding: 8,
    borderRadius: 5,
    marginLeft: 5,
  },
  denyButton: {
    backgroundColor: '#d9534f',
    padding: 8,
    borderRadius: 5,
    marginLeft: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
  },
  notFriendMessageContainer: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  notFriendText: {
    color: '#999',
    fontSize: 16,
  },
  
});

export default ChatRoom;
