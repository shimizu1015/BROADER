import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, Alert, StyleSheet, ScrollView, Button, TouchableOpacity, Linking, Platform, useWindowDimensions } from 'react-native';
import { RouteProp, useRoute, useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { supabase } from '../supabaseClient';
import prefecturesArray from '../pref_city.json';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RealtimeChannel } from '@supabase/supabase-js';
import SideBar from '../components/SideBar';
import {  sendPushNotification  } from '../utils/sendPushNotification';

type ArticleDetailScreenRouteProp = RouteProp<RootStackParamList, 'ArticleDetail'>;

const ArticleDetail: React.FC = () => {
  const route = useRoute<ArticleDetailScreenRouteProp>();
  const { articleId } = route.params || {};
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);

  // ウィンドウの幅を取得してサイドバーの幅を決定
  const { width } = useWindowDimensions();
  const sidebarWidth = Platform.OS === 'web' ? (width < 748 ? 60 : 250) : 0; // Webでサイドバーの幅を設定

  // 都道府県データの取得
  const prefecturesData = prefecturesArray[0] as { [key: string]: any };

  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  useEffect(() => {
    const fetchUserId = async () => {
      const storedUserId = await AsyncStorage.getItem('supabase_user_id');
      if (storedUserId) {
        setUserId(storedUserId);
      } else {
        console.error('ユーザーIDが取得できませんでした');
      }
    };
    fetchUserId();
  }, []);

  // Google Mapsで住所を検索する関数
  const openGoogleMaps = (address: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}&hl=ja`;
    Linking.openURL(url).catch((err) => console.error('Google Mapsの起動に失敗しました', err));
  };

  const fetchArticle = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!articleId || typeof articleId !== 'number') {
      setError('有効な記事IDが指定されていません。');
      return;
    }

    const { data, error } = await supabase
      .from('articles')
      .select('*, users(id, username)')
      .eq('id', articleId)
      .single();

    if (error) {
      console.error('記事の取得に失敗しました:', error);
      setError('記事の取得に失敗しました');
    } else if (!data) {
      setError('記事が見つかりませんでした');
    } else {
      setArticle(data);
    }
    setLoading(false);
  }, [articleId]);

  // リアルタイムで募集人数や参加者リストを更新する
  useEffect(() => {
    const channel: RealtimeChannel = supabase
      .channel(`public:articles:id=eq.${articleId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'articles', filter: `id=eq.${articleId}` }, (payload: any) => {
        console.log('リアルタイム更新:', payload.new);
        setArticle((prevArticle: any) => ({
          ...prevArticle,
          ...payload.new,
        }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [articleId]);

  const fetchParticipants = useCallback(async (participantIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username')
        .in('id', participantIds);

      if (error) {
        console.error('参加者の取得に失敗しました:', error);
      } else {
        setParticipants(data || []);
      }
    } catch (error) {
      console.error('参加者の取得に失敗しました', error);
    }
  }, []);

  useEffect(() => {
    fetchArticle();
  }, [fetchArticle]);

  useEffect(() => {
    if (article?.participant_ids) {
      fetchParticipants(article.participant_ids);
    }
  }, [article, fetchParticipants]);

  // 残り人数を計算する関数
  const remainingSpots = article?.participant_limit && Array.isArray(article.participant_ids)
    ? Math.max(article.participant_limit - (article.participant_ids?.length || 0), 0)
    : article?.participant_limit;


    //保存ボタン
  const handleParticipation = async () => {


  // ホストUUID取得関数
  async function getHostUserId(articleId: string) {
    try {
      const { data, error } = await supabase
        .from('articles') // 正しいテーブル名に変更
        .select('host_user_id')
        .eq('id', articleId)
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return data.host_user_id;
    } catch (error) {
      console.error('Error fetching host_user_id:', error);
    }
  }

  // トークン取得関数
  async function getPushNotificationTokenByUserId(userId: string) {
    try {
      const { data, error } = await supabase
        .from('users') // usersテーブルを指定
        .select('pushNotificationToken')
        .eq('id', userId)
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return data.pushNotificationToken;
    } catch (error) {
      console.error('Error fetching pushNotificationToken:', error);
    }
  }

  // 参加者のユーザー名を取得
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('username')
    .eq('id', userId)
    .single();
  if (userError) {
    console.error('参加者のユーザー名の取得に失敗しました:', userError);
    return;
  }

  // ホストのユーザーID取得とトークンの取得
  const hostUserId = await getHostUserId(articleId);
  if (!hostUserId) {
    console.error('ホストユーザーIDの取得に失敗しました');
    return;
  }

  const pushNotificationToken = await getPushNotificationTokenByUserId(hostUserId);
  console.log('Push Notification Token:', pushNotificationToken);

  if (!pushNotificationToken) {
    console.error('プッシュ通知トークンの取得に失敗しました');
    return;
  }

  // タイトルと内容
  const title = "BROADER";
  const body = `${userData?.username|| 'Unknown'}さんがあなたのイベントに参加しました。`;

  console.log("プッシュ関数に引数受け渡し直前： " + pushNotificationToken + " : " + title + " : " + body);
  sendPushNotification(pushNotificationToken, body); // プッシュ通知の送信

  if (!userId) {
    Alert.alert('エラー', 'ユーザー情報が見つかりません。ログインしてください。');
    return;
  }

  if (article?.participant_ids?.includes(userId)) {
    Alert.alert('参加済み', 'すでにこのイベントに参加しています。');
    return;
  }

  if (remainingSpots <= 0) {
    Alert.alert('満員', 'このイベントは満員です。');
    return;
  }

  const updatedParticipants = article.participant_ids ? [...article.participant_ids, userId] : [userId];

  const { data, error } = await supabase
    .from('articles')
    .update({
      participant_ids: updatedParticipants,
    })
    .eq('id', articleId)
    .single();

  if (error) {
    Alert.alert('エラー', '参加処理に失敗しました。');
    console.error('参加処理に失敗しました', error);
  } else {
    Alert.alert('参加完了', 'イベントに参加し、チャットルームにも追加されました！');


    // 参加したユーザーのユーザー名を取得
    const { data: userData, error: userError } = await supabase
    .from('users')
    .select('username')
    .eq('id', userId)
    .single();
  if (userError) {
    console.error('参加者のユーザー名の取得に失敗しました:', userError);
    return;
  }

    // 参加通知メッセージを作成
    const joinMessage = {
      chat_room_id: article.chat_room_id,
      user_id: null, // システムメッセージのためnullに設定
      content: `${userData?.username || 'Unknown'}が参加しました`,
      created_at: new Date(),
    };

    // 通知メッセージを保存
    const { error: messageError } = await supabase
      .from('messages')
      .insert([joinMessage]);

    if (messageError) {
      console.error('参加通知メッセージの保存に失敗しました:', messageError);
      Alert.alert('エラー', `参加通知メッセージの保存に失敗しました: ${messageError.message}`);
    } else {
      console.log('参加通知メッセージが保存されました');
    }
  }
};

  if (loading) {
    return (
      <View style={styles.centeredView}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centeredView}>
        <Text style={styles.errorText}>{error}</Text>
        <Button title="再試行" onPress={fetchArticle} />
      </View>
    );
  }

  if (!article) {
    return (
      <View style={styles.centeredView}>
        <Text style={styles.errorText}>記事が見つかりませんでした。</Text>
        <Button title="再試行" onPress={fetchArticle} />
      </View>
    );
  }

  // 選択された都道府県と市区町村のデータを取得
  const selectedPrefecture = article.prefecture_id !== null ? (prefecturesData[article.prefecture_id.toString().padStart(2, '0')] || {}) : {};
  const cityId = article.city_id !== null ? article.city_id.toString().padStart(7, '0') : null;
  const selectedCity = selectedPrefecture.city ? selectedPrefecture.city.find((city: any) => city.citycode === cityId) : null;
  const location = `${selectedPrefecture.name || '未設定'} ${selectedCity?.city || '未設定'}`;
  const meetingTime = article.meeting_time ? article.meeting_time.replace(/:00$/, '') : '';
  
  // 作成日時をフォーマットする関数
  const formatCreatedAt = (timestamp: string) => {
    const date = new Date(timestamp);
    return `${date.toLocaleDateString('ja-JP')} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const isHost = userId === article.host_user_id;
  const isParticipating = article.participant_ids?.includes(userId);

  return (
  <View style={{ flexDirection: 'row', flex: 1 }}>
      {/* Web環境の場合にサイドバーを表示 */}
      {Platform.OS === 'web' && <SideBar style={{ zIndex: 2, width: sidebarWidth }} />}

      <LinearGradient
        colors={['#ff00a1', '#040045']}
        //@ts-ignore
        style={[styles.container, { marginLeft: sidebarWidth, minHeight: '100vh' }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        >
      <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scrollView}>
        <View style={styles.card}>
          <Text style={styles.title}>{article.title}</Text>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>作成者</Text>
            <TouchableOpacity
              onPress={() => {
                if (article.users?.id && article.users?.username !== 'Unknown') {
                  //@ts-ignore
                  navigation.navigate('UserPage', { userId: article.users.id });
                } else {
                  Alert.alert('エラー', 'ユーザーが存在しません。');
                }
              }}
            >
              <Text style={[styles.value, styles.link]}>
                {article.users?.username || 'Unknown'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>作成日時</Text>
            <Text style={styles.value}>{formatCreatedAt(article.created_at)}</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.content}>{article.content}</Text>

          <View style={styles.detailsSection}>
            <View style={styles.row}>
              <Text style={styles.label}>地域</Text>
              <Text style={styles.value}>{location}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>集合場所</Text>
              <TouchableOpacity onPress={() => openGoogleMaps(`${location} ${article.meeting_place}`)}>
                <Text style={[styles.value, styles.link]}>{article.meeting_place}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>予算</Text>
              <Text style={styles.value}>{article.cost} 円</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>募集人数</Text>
              <Text style={styles.value}>{remainingSpots > 0 ? `残り ${remainingSpots} 人` : '満員です'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

        <View style={styles.participantsSection}>
          <Text style={styles.label}>参加者一覧</Text>
          {participants.length > 0 ? (
            participants.map((participant) => (
              <Text key={participant.id} style={styles.value}>{participant.username}</Text>
            ))
          ) : (
            <Text style={styles.value}>参加者はいません</Text>
          )}
        </View>

          
        {!isHost && (
            isParticipating ? (
              <TouchableOpacity style={[styles.participationButton, { backgroundColor: '#ddd' }]} disabled={true}>
                <Text style={[styles.participationButtonText, { color: '#888' }]}>参加済みです</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.participationButton}
                onPress={handleParticipation}
                disabled={remainingSpots <= 0} // 残り人数が0の時ボタンを無効化
              >
                <Text style={styles.participationButtonText}>
                  {remainingSpots > 0 ? '参加する' : '満員です'}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>
      </ScrollView>
    </LinearGradient>
  </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  card: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
    marginBottom: 16,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: 'red',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  content: {
    fontSize: 18,
    color: '#ddd',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  infoSection: {
    marginBottom: 16,
  },
  detailsSection: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginVertical: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ddd',
  },
  value: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginVertical: 16,
    width: '100%',
  },
  participantsSection: {
    marginBottom: 16,
  },
  participationButton: {
    backgroundColor: '#007bff',
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  participationButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  link: {
    color: '#fff',
    textDecorationLine: 'underline',
  },
});

export default ArticleDetail;
