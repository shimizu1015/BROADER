import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Platform, useWindowDimensions,Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabaseClient';
import ChatRoom from './ChatRoom';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import SideBar from '../components/SideBar';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { useFocusEffect } from '@react-navigation/native';


const ChatList: React.FC = () => {
  const [chatRooms, setChatRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedChatRoomId, setSelectedChatRoomId] = useState<string | null>(null);
  const [selectedChatRoomTitle, setSelectedChatRoomTitle] = useState<string | null>(null);
  const [openChatRoomUsers, setOpenChatRoomUsers] = useState<Record<string, string[]>>({});
  const [activeTab, setActiveTab] = useState<'group' | 'personal'>('group');
  const [index, setIndex] = useState(0);
  const [hostUserId, setHostUserId] = useState<string | null>(null);
  const [receiverUserId, setReceiverUserId] = useState<string | null>(null);
  const [disableButtons, setDisableButtons] = useState<boolean>(false);
  const [routes] = useState([
    { key: 'group', title: 'グループチャット' },
    { key: 'personal', title: '個人チャット' },
  ]);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList, 'ChatRoom'>>();
  const { width } = useWindowDimensions();
  const userCache = useRef(new Map<string, { username: string; icon: string | null }>());

  // サイドバーの幅を決定
  const sidebarWidth = Platform.OS === 'web' ? (width < 748 ? 60 : 250) : 0;

  // ユーザーIDをAsyncStorageから取得
  useEffect(() => {
    const fetchUserId = async () => {
      const storedUserId = await AsyncStorage.getItem('supabase_user_id');
      if (storedUserId) {
        setUserId(storedUserId);
      }
    };
    fetchUserId();
  }, []);
    // Web用のダミーデータ生成
    useEffect(() => {
      const generateDummyData = () => {
        const dummyChatRooms = [];
        for (let i = 1; i <= 100; i++) {
          dummyChatRooms.push({
            id: i.toString(),
            title: `チャットルーム ${i}`,
            chat_room_id: `room_${i}`,
            lastMessage: `これはダミーメッセージ ${i} です`,
            lastMessageTime: new Date().toISOString(),
            unreadCount: Math.floor(Math.random() * 10),
          });
        }
        setChatRooms(dummyChatRooms);
      };
  
      // Web用のダミーデータ生成を有効化
      if (Platform.OS === 'web') {
        generateDummyData();
      }
    }, []);
    useEffect(() => {
      console.log('chatRoomsの状態:', chatRooms); // デバッグ用にコンソールログを追加
    }, [chatRooms]);

  // チャットルームのステータスを監視する関数
  const monitorChatRoomStatus = async () => {
    try {
      if (Platform.OS !== 'web') return;
  
      // リアルタイムで`chat_room_status`テーブルを監視
      const channel = supabase
        .channel('realtime:chat_room_status')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'chat_room_status' },
          (payload) => {
            if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
              const { chat_room_id, user_id, is_open } = payload.new;
              
              // 他のユーザーが開いている場合は無視する
              if (user_id !== userId) return;
              
              setOpenChatRoomUsers((prev) => {
                const updated = { ...prev };
                if (is_open) {
                  if (!updated[chat_room_id]) {
                    updated[chat_room_id] = [];
                  }
                  if (!updated[chat_room_id].includes(user_id)) {
                    updated[chat_room_id].push(user_id);
                  }
                } else {
                  if (updated[chat_room_id]) {
                    updated[chat_room_id] = updated[chat_room_id].filter((id) => id !== user_id);
                    if (updated[chat_room_id].length === 0) {
                      delete updated[chat_room_id];
                    }
                  }
                }
                return updated;
              });
            }
          }
        )
        .subscribe();
  
      return () => {
        supabase.removeChannel(channel);
      };
    } catch (error) {
      console.error('チャットルームのステータス監視中にエラーが発生しました:', error);
    }
  };
  
  // Webバージョンの監視を開始
  useEffect(() => {
    if (Platform.OS === 'web') {
      monitorChatRoomStatus();
    }
  }, [userId]);
  

// チャットルームとメッセージを取得し、未読数を計算
useEffect(() => {
  const fetchChatRooms = async () => {
    setLoading(true);

    if (!userId) {
      console.error('ユーザーIDが取得できませんでした');
      setLoading(false);
      return;
    }

    try {
      // グループチャットデータを取得
      const { data: chatRoomsData, error: chatRoomsError } = await supabase
        .from('articles')
        .select('id, title, chat_room_id, event_date, meeting_time')
        .or(`participant_ids.cs.{${userId}},host_user_id.eq.${userId}`)
        .not('chat_room_id', 'is', null);

      if (chatRoomsError) {
        throw chatRoomsError;
      }

      // 現在の日付と時刻を取得
      const now = new Date();

    /*　//フィルターを適用させる場合ここのコメントアウトを解除
     // event_date と meeting_time を結合し、過去24時間以内のイベントまたは未来のイベントのみ表示
        const filteredGroupChats = (chatRoomsData || []).filter((room) => {
          const eventDateTime = new Date(`${room.event_date}T${room.meeting_time}`);
          const timeDifference = now.getTime() - eventDateTime.getTime();

          // 過去24時間以内のイベントまたは未来のイベントのみ表示
          return timeDifference <= 24 * 60 * 60 * 1000;
        });
        */ //ここまで

      // フィルタリングなしで直接データを使用
        const groupChats = chatRoomsData || [];//フィルターを適用しない場合ここのコメントアウト解除

      // 個人チャットデータを取得
      const { data: personalChatRooms, error: personalChatRoomsError } = await supabase
      .from('personal_chats')
      .select(`
        id,
        host_user_id,
        receiver_user_id,
        host_user:host_user_id (username,icon),
        receiver_user:receiver_user_id (username,icon)
      `)
      .or(`host_user_id.eq.${userId},receiver_user_id.eq.${userId}`);
    
      if (personalChatRoomsError) {
        throw personalChatRoomsError;
      }

      // 取得したデータを結合
      const combinedRooms = [
        ...groupChats.map(room => ({ //フィルターを適用させない場合ここのコメントアウトを解除
         //...filteredGroupChats.map(room => ({　//フィルターを適用する場合はここのコメントアウトを解除
          ...room,
          chatType: 'group',
        })),
        ...(personalChatRooms || []).map(room => {
          // アイコンとユーザー名のキャッシュを利用
          const otherUserId = room.host_user_id === userId ? room.receiver_user_id : room.host_user_id;
          let userInfo = userCache.current.get(otherUserId);
  
          if (!userInfo) {
            const userData = room.host_user_id === userId ? room.receiver_user : room.host_user;
            // @ts-ignore
            userInfo = { username: userData?.username || '無名ユーザー', icon: userData?.icon || null };
            userCache.current.set(otherUserId, userInfo);
          }
  
          return {
            id: room.id,
            chat_room_id: room.id,
            title: userInfo.username,
            icon: userInfo.icon,
            chatType: 'personal',
            lastMessage: '',
            lastMessageTime: '',
            unreadCount: 0,
          };
        }),
      ];


     // メッセージデータを取得
const chatRoomIds = combinedRooms.map(room => room.chat_room_id);
const { data: messagesData, error: messagesError } = await supabase
  .from('messages')
  .select('chat_room_id, user_id, content, created_at, read_by_user_ids, is_deleted')
  .in('chat_room_id', chatRoomIds)
  .eq('is_deleted', false)
  .order('created_at', { ascending: false }); // 日付で降順にソートして最新のメッセージが最初に来るように

if (messagesError) {
  throw messagesError;
}

// チャットルームデータにメッセージデータを統合し、未読数を計算
const chatRoomsWithMessages = combinedRooms.map(room => {
  // 各チャットルームの最新メッセージを取得
  const lastMessage = messagesData.find(
    msg => msg.chat_room_id === room.chat_room_id && !msg.is_deleted
  );

  const unreadMessages = messagesData.filter(
    (msg) =>
      msg.chat_room_id === room.chat_room_id &&
      msg.user_id !== userId &&
      msg.read_by_user_ids &&
      !msg.read_by_user_ids.includes(userId!) &&
      !msg.is_deleted
  );

  const unreadCount = unreadMessages.length;

  return {
    ...room,
    lastMessage: lastMessage ? lastMessage.content : '',
    lastMessageTime: lastMessage ? lastMessage.created_at : '',
    unreadCount,
  };
});


      // チャットルームを最終メッセージの時間順にソート
      const sortedChatRooms = chatRoomsWithMessages.sort((a, b) => {
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
      });

      // キャッシュ保存
      //AsyncStorage.setItem('chatRooms', JSON.stringify(sortedChatRooms));


      setChatRooms(sortedChatRooms);
    } catch (error) {
      console.error('チャットルームの取得に失敗しました:', error);
    }

    setLoading(false);
  };

  if (userId) {
    fetchChatRooms();
  }
}, [userId]);

useEffect(() => {
  const subscribeToMessages = () => {
    const channel = supabase
      .channel('realtime:messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMessage = payload.new;
  
          setChatRooms((prevChatRooms) => {
            const updatedChatRooms = prevChatRooms.map((room) => {
              if (room.chat_room_id === newMessage.chat_room_id && !newMessage.is_deleted) {
                const isUnread = newMessage.user_id !== userId && !newMessage.read_by_user_ids.includes(userId!);
                const newUnreadCount = isUnread ? room.unreadCount + 1 : room.unreadCount;
  
                return {
                  ...room,
                  lastMessage: newMessage.content,
                  lastMessageTime: newMessage.created_at,
                  unreadCount: newUnreadCount,
                };
              }
              return room;
            });
            return updatedChatRooms.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
          });
        }
      )
      .subscribe();
  
    return () => supabase.removeChannel(channel);
  };

  if (Platform.OS === 'web' && userId) {
    subscribeToMessages();
  }
}, [userId]);

// ローカルでチャットルームを定期的にチェックして24時間経過したイベントを非表示にする
useEffect(() => {
  const checkAndUpdateChatRooms = () => {
    const now = new Date();

    const updatedChatRooms = chatRooms.filter((room) => {
      if (room.chatType === 'group' && room.event_date && room.meeting_time) {
        const eventDateTime = new Date(`${room.event_date}T${room.meeting_time}`);
        const timeDifference = now.getTime() - eventDateTime.getTime();

        // 24時間以内または未来のイベントのみを表示
        //return timeDifference <= 24 * 60 * 60 * 1000; //フィルターを外したい場合ここをコメントアウト
      }
      return true; // 個人チャットはそのまま表示
    });

    setChatRooms(updatedChatRooms);
  };

  // 1分ごとにチェック
  //const intervalId = setInterval(checkAndUpdateChatRooms, 60000);

  //return () => clearInterval(intervalId); // クリーンアップ
}, [chatRooms]);


/*
useEffect(() => {
  console.log('モバイル側でのchatRooms更新:', chatRooms);
}, [chatRooms]);
*/
  
const handleChatRoomPress = async (chatRoomId: string, chatRoomTitle: string, chatType: 'group' | 'personal') => {
  setDisableButtons(true); // ボタンを無効化する

  // チャットルームのデータから必要な情報を取得
  const selectedRoom = chatRooms.find(room => room.chat_room_id === chatRoomId);
  console.log('選択されたチャットルーム:', selectedRoom);

  const hostUserId = chatType === 'personal' ? selectedRoom?.host_user_id ?? undefined : undefined;
  const receiverUserId = chatType === 'personal' ? selectedRoom?.receiver_user_id ?? undefined : undefined;

  if (Platform.OS === 'web') {
    setSelectedChatRoomId(chatRoomId);
    setSelectedChatRoomTitle(chatRoomTitle);
    setHostUserId(hostUserId);
    setReceiverUserId(receiverUserId);
    await markMessagesAsRead(chatRoomId);

    // 個人チャットとグループチャットで分岐して処理
    if (chatType === 'personal') {
      try {
        // 個人チャットの場合にステータス更新
        await supabase
          .from('chat_room_status')
          .upsert({
            chat_room_id: chatRoomId,
            user_id: userId,
            is_open: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'chat_room_id, user_id' });
        console.log('個人チャットのステータスが更新されました');
      } catch (error) {
        console.error('個人チャットのステータス更新中にエラー:', error);
      }
    } else {
      try {
        // グループチャットのステータスを更新
        await supabase
          .from('chat_room_status')
          .update({ is_open: true, updated_at: new Date().toISOString() })
          .eq('chat_room_id', chatRoomId)
          .eq('user_id', userId);
        console.log('グループチャットのステータスが更新されました');
      } catch (error) {
        console.error('グループチャットのステータス更新中にエラー:', error);
      }
    }

    // 既存の既読処理を共通で呼び出す
    await markMessagesAsRead(chatRoomId);
  } else {
    // モバイル用の処理
    // @ts-ignore
    navigation.navigate('ChatRoom', { 
      chatRoomId, 
      chatRoomTitle, 
      hostUserId, 
      receiverUserId,
      activeTab
    });
    await markMessagesAsRead(chatRoomId);
  }

  setDisableButtons(false); // ボタンの無効化を解除
};


// 既読処理を関数として分離
// @ts-ignore
const markMessagesAsRead = async (chatRoomId: string) => {
  try {
    const { data: unreadMessages, error } = await supabase
      .from('messages')
      .select('id, user_id, read_by_user_ids')
      .eq('chat_room_id', chatRoomId)
      .not('read_by_user_ids', 'cs', `{${userId}}`);

    if (error) {
      console.error('未読メッセージの取得中にエラーが発生しました:', error);
      return;
    }

    if (unreadMessages && unreadMessages.length > 0) {
      for (const message of unreadMessages) {
        const readByUserIds = message.read_by_user_ids || []; 
        // 自分のメッセージでない場合のみ、自分のIDをread_by_user_idsに追加
        if (message.user_id !== userId) {
          const updatedReadByUserIds = [...message.read_by_user_ids, userId];
          await supabase
            .from('messages')
            .update({ read_by_user_ids: updatedReadByUserIds })
            .eq('id', message.id);
        }
      }
    }

    // 未読バッジをリセット
    setChatRooms((prevChatRooms) =>
      prevChatRooms.map((room) => {
        if (room.chat_room_id === chatRoomId) {
          return { ...room, unreadCount: 0 };
        }
        return room;
      })
    );
  } catch (error) {
    console.error('既読処理中にエラーが発生しました:', error);
  }
};


  // ウィンドウが非アクティブになったときに監視処理を無効化
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (Platform.OS !== 'web' || !userId) return;
  
      if (document.hidden) {
        // ウィンドウが非アクティブになったとき
        if (selectedChatRoomId) {
          try {
            // 現在開いているチャットルームを非アクティブにする
            await supabase
              .from('chat_room_status')
              .update({ is_open: false, updated_at: new Date().toISOString() })
              .eq('chat_room_id', selectedChatRoomId)
              .eq('user_id', userId);
          } catch (error) {
            console.error('ウィンドウが非アクティブ時にチャットルームのステータスをFALSEに更新できませんでした:', error);
          }
        }
      } else {
        // ウィンドウがアクティブになったとき
        if (selectedChatRoomId) {
          try {
            // 現在開いているチャットルームだけをアクティブにする
            await supabase
              .from('chat_room_status')
              .upsert({
                chat_room_id: selectedChatRoomId,
                user_id: userId,
                is_open: true,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'chat_room_id, user_id' });
          } catch (error) {
            console.error('ウィンドウがアクティブ時にチャットルームのステータスをTRUEに更新できませんでした:', error);
          }
        }
      }
    };
  
    if (Platform.OS === 'web') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
  
    return () => {
      if (Platform.OS === 'web') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [selectedChatRoomId, userId]);
  
  useEffect(() => {
    const handleWindowClose = async () => {
      if (Platform.OS === 'web' && userId) {
        try {
          // 全てのチャットルームのis_openをFALSEに更新
          await supabase
            .from('chat_room_status')
            .update({ is_open: false, updated_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('is_open', true);
        } catch (error) {
          console.error('ウィンドウを閉じる際に全てのチャットルームのステータスをFALSEに更新できませんでした:', error);
        }
      }
    };
  
    if (Platform.OS === 'web') {
      window.addEventListener('beforeunload', handleWindowClose);
    }
  
    return () => {
      if (Platform.OS === 'web') {
        window.removeEventListener('beforeunload', handleWindowClose);
      }
    };
  }, [userId]);

    // ページがアンマウントされるときの処理
    useFocusEffect(
      React.useCallback(() => {
        // フォーカス時の処理（特に何もしない）
        return () => {
          // ページから離れるときの処理
          if (selectedChatRoomId && userId) {
            try {
              // 現在開いているチャットルームを非アクティブにする
              supabase
                .from('chat_room_status')
                .update({ is_open: false, updated_at: new Date().toISOString() })
                .eq('chat_room_id', selectedChatRoomId)
                .eq('user_id', userId);
            } catch (error) {
              console.error('ページ遷移時にチャットルームのステータスをFALSEに更新できませんでした:', error);
            }
          }
        };
      }, [selectedChatRoomId, userId])
    );

// タブを変更する際に現在のチャットルームのステータスを非アクティブ化する
const handleTabChange = async (newTab: 'group' | 'personal') => {
  console.log('タブが変更されました:', newTab); // デバッグ用
  // 既存のチャットルームがあればそのステータスを非アクティブにする
  if (selectedChatRoomId && userId) {
    try {
      await supabase
        .from('chat_room_status')
        .update({ is_open: false, updated_at: new Date().toISOString() })
        .eq('chat_room_id', selectedChatRoomId)
        .eq('user_id', userId);
    } catch (error) {
      console.error('タブ変更時にチャットルームのステータスをFALSEに更新できませんでした:', error);
    }
  }

  // タブを変更し、新しいタブをアクティブに設定
  setActiveTab(newTab);

  // 選択中のチャットルームをリセット
  setSelectedChatRoomId(null);
  setSelectedChatRoomTitle(null);
};


  

  // メッセージの時間をフォーマットする関数
const formatMessageTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();

  // 当日の場合、時間だけを表示、それ以外は年月日を表示
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else {
    return date.toLocaleDateString();
  }
};

// テキストを指定した長さに切り詰める関数
const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};


// グループチャットと個人チャットのコンテンツをそれぞれのタブで表示
const renderChatRooms = (type: 'group' | 'personal') => (
  <FlatList
    data={chatRooms.filter(room => room.chatType === type)}
    keyExtractor={(item) => item?.id?.toString() || item.chat_room_id}
    renderItem={({ item }) => (
      <TouchableOpacity
        style={[
          styles.chatRoomItem,
          disableButtons && { opacity: 0.5 },
          selectedChatRoomId === item.chat_room_id && styles.activeChatRoomItem,
        ]}
        // @ts-ignore
        onPress={() => handleChatRoomPress(item.chat_room_id, item.title, item.chatType, activeTab)} // activeTabを渡す
        disabled={disableButtons}
      >
        <View style={styles.chatRoomHeader}>
          {item.chatType === 'personal' && (
            <Image
              source={item.icon ? { uri: item.icon } : require('../../assets/user_default_icon.png')}
              // @ts-ignore
              style={styles.chatRoomIcon}
            />
          )}
          <View style={styles.chatRoomInfo}>
            <Text style={styles.chatRoomTitle} numberOfLines={1} ellipsizeMode="tail">
              {item.title}
            </Text>
            {item.lastMessage && (
              <Text style={[styles.lastMessage, { paddingRight: 30 }]} numberOfLines={1} ellipsizeMode="tail">
                {item.lastMessage}
              </Text>
            )}
          </View>
        </View>
        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    )}
    ListEmptyComponent={<Text style={styles.emptyText}>{type === 'group' ? 'グループチャットがありません。' : '個人チャットがありません。'}</Text>}
    contentContainerStyle={{ paddingHorizontal: 20 }}
  />
);


  // モバイル用のタブビューのシーン定義
  const renderScene = SceneMap({
    group: () => renderChatRooms('group'),
    personal: () => renderChatRooms('personal'),
  });

  // Web用のUI
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
       <SideBar style={{ zIndex: 2 }} onNavigate={() => handleTabChange(activeTab)} />

        <View style={[styles.chatListContainer, { marginLeft: sidebarWidth, width: '15%' }]}>
          {/* タブボタンの表示 */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'group' && styles.activeTab]}
              onPress={() => {
                console.log('グループチャットが選択されました');
                handleTabChange('group');
              }}
            >
              <Text style={styles.tabText}>グループチャット</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'personal' && styles.activeTab]}
              onPress={() => {
                console.log('個人チャットが選択されました');
                handleTabChange('personal');
              }}
            >
              <Text style={styles.tabText}>個人チャット</Text>
            </TouchableOpacity>
          </View>
          {/* チャットルームの表示 */}
          {renderChatRooms(activeTab)}
        </View>

        <View style={[styles.chatRoomContainer, { width: '60%' }]}>
          {selectedChatRoomId ? (
            // @ts-ignore
            <ChatRoom
            route={{
              params: {
                chatRoomId: selectedChatRoomId!,
                chatRoomTitle: selectedChatRoomTitle!,
                activeTab: activeTab,
                // @ts-ignore
                hostUserId: hostUserId,
                // @ts-ignore
                receiverUserId: receiverUserId,
              },
            }}
          />

          ) : (
            <Text> </Text>
          )}
        </View>
      </View>
    );
  } else {
// モバイル用のスワイプ可能なタブビュー
return (
  <View style={styles.container}>
    <TabView
      navigationState={{ index, routes }}
      renderScene={({ route }) => {
        switch (route.key) {
          case 'group':
            return renderChatRooms('group'); // グループチャットを表示
          case 'personal':
            return renderChatRooms('personal'); // 個人チャットを表示
          default:
            return null;
        }
      }}
      onIndexChange={(i) => {
        setIndex(i);
        const newTab = routes[i].key as 'group' | 'personal';
        setActiveTab(newTab); 
        handleTabChange(newTab);
      }}
      initialLayout={{ width }}
      renderTabBar={(props) => (
        <TabBar
          {...props}
          indicatorStyle={{ backgroundColor: '#d400ff' }}
          style={{ backgroundColor: '#f7f7f7', marginBottom: 10 }}
          labelStyle={{ color: '#000' }}
        />
      )}
    />
  </View>
    );
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    borderBottomWidth: 0,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#d400ff',
  },
  chatRoomIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  chatRoomInfo: {
    flex: 1,
    marginLeft: 10,
  },
  tabText: {
    color: '#000',
    fontWeight: 'bold',
  },
  webContainer: {
    flex: 1,
    flexDirection: 'row',
    // @ts-ignore
    height: '100vh',
  },
  activeChatRoomItem: {
    backgroundColor: '#e0f7fa',
    borderColor: '#00796b',
  },
  chatListContainer: {
    backgroundColor: '#f7f7f7',
    flexGrow: 1,
    overflowY: 'auto',
    // @ts-ignore
    height: '100vh', 
    padding: 16,
  },
  chatRoomContainer: {
    backgroundColor: '#fff',
    flexGrow: 1,
    overflowY: 'auto',
    // @ts-ignore
    height: '100vh',
  },
  chatRoomItem: {
    padding: 16,
    height: 85,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    marginBottom: 10,
  },
  chatRoomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chatRoomTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  lastMessage: {
    fontSize: 18,
    color: '#888',
    marginTop: 5,
  },
  messageTime: {
    fontSize: 14,
    color: '#888',
  },
  unreadBadge: {
    backgroundColor: 'red',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    right: 20,
    top: 40,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default ChatList;
