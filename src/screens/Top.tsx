//名前はtopであるが、投稿一覧ページであり、別途homuページを作成予定

import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, RefreshControl, Animated, StyleSheet, Platform, useWindowDimensions, Image } from 'react-native';
import { useNavigation, NavigationProp, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { supabase } from '../supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { LinearGradient } from 'expo-linear-gradient';
import prefecturesData from '../pref_city.json';
import SideBar from '../components/SideBar';


// RoutePropの型を定義
type TopScreenRouteProp = RouteProp<RootStackParamList, 'Top'>;

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

const Top: React.FC = () => {
  const route = useRoute<TopScreenRouteProp>(); // useRouteを使用してrouteを取得
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [userId, setUserId] = useState<string | null>(null);
  const [ownUserId, setOwnUserId] = useState<string | null>(null); // ownUserIdを追加
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useState(new Animated.Value(0))[0];
  const { width } = useWindowDimensions(); // ウィンドウの幅を取得

  // サイドバーの幅を決定
  const sidebarWidth = Platform.OS === 'web' ? (width < 748 ? 60 : 250) : 0;

  // ユーザーIDを取得するためのエフェクト
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem('supabase_user_id');
        console.log('AsyncStorageから取得したuserId:', storedUserId);
  
        if (storedUserId) {
          setUserId(storedUserId);
          setOwnUserId(storedUserId);
          fetchArticles();  // ユーザーID取得後にfetchArticlesを呼び出す
        } else {
          console.warn('ユーザーIDが取得できませんでした');
        }
      } catch (error) {
        console.error('ユーザーIDの取得に失敗しました', error);
      }
      setLoading(false);
    };
  
    fetchUserId();
  }, [route.params?.userId]);
  
  
  useEffect(() => {
    // userIdが設定されていればfetchArticlesを実行
    if (userId) {
      fetchArticles();
    }
  
    const articleSubscription = supabase
      .channel('custom-all-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'articles' }, () => {
        fetchArticles();
      })
      .subscribe();
  
    return () => {
      supabase.removeChannel(articleSubscription);
    };
  }, [userId]); // userIdが変更されたらfetchArticlesが実行されるようにする
  
  


// 記事データを取得するためのエフェクト
const fetchArticles = async () => {
  try {
    // ユーザーIDが取得されているか確認
    if (!userId) {
      return;
    }

    // フレンドのIDリストを取得（statusが1のフレンドのみ、user_idとfriend_idの両方のケースを考慮）
    const { data: friendData, error: friendError } = await supabase
      .from('friends')
      .select('user_id, friend_id')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)  // user_idまたはfriend_idが現在のユーザーIDに一致
      .eq('status', 1);  // フレンドのステータスが1（承認済み）のみを取得

    if (friendError) {
      console.error('フレンドデータの取得に失敗しました', friendError);
      return;
    }

    // フレンドIDを配列として抽出（双方向を考慮）
    const friendIds = friendData ? friendData.map(friend => 
      friend.user_id === userId ? friend.friend_id : friend.user_id
    ) : [];

    // フレンドがいない場合は空のリストを表示
    if (friendIds.length === 0) {
      setArticles([]);  // 空のリストを表示
      return;
    }

    // 現在の日時を取得
    const now = new Date().toISOString();

    // フレンドIDを使用して記事を取得
    const { data, error } = await supabase
      .from('articles')
      .select('*, users(username,icon)')
      .in('host_user_id', friendIds)  // フレンドIDでフィルタリング
      //.gt('event_date', now)          // 現在の日付より後のイベントのみを取得
      .order('event_date', { ascending: true })  // 日付が早い順に並び替え
      .order('meeting_time', { ascending: true }); // meeting_timeも早い順に並び替え

    if (error) {
      console.error('記事の取得に失敗しました', error);
    } else {
      setArticles(data);
    }
  } catch (e) {
    console.error('データ取得エラー:', e);
  }
};



  useEffect(() => {
    fetchArticles();

    const articleSubscription = supabase
      .channel('custom-all-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'articles' }, () => {
        fetchArticles();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(articleSubscription);
    };
  }, []);

  // リフレッシュ時に呼び出される関数
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchArticles(); // データを再取得
    setRefreshing(false);
  };

  // ローディング中のインジケータを表示
  if (loading) {
    return <ActivityIndicator size="large" color="#fff" />;
  }

  // meeting_time の下二桁を非表示にする関数
  const formatTime = (time: string) => {
    return time.replace(/:00$/, '');
  };

  // 透明度をアニメーションするためのスタイル
  const floatingButtonOpacity = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [1, 0.5],
    extrapolate: 'clamp',
  });

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    let prefectureName = '未設定';
    let prefectureStyle = styles.articlePrefectureMissing;

    if (item.prefecture_id !== null) {
      const prefectureId = String(item.prefecture_id).padStart(2, '0');
      prefectureName = prefecturesObject[prefectureId]?.name || '不明';
      prefectureStyle = styles.articlePrefecture;
    }

    // 募集人数の残りを計算
    const totalParticipants = item.participant_ids ? item.participant_ids.length : 0;
    const remainingSpots = (item.participant_limit || 0) - totalParticipants;
    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.articleContainer,
          Platform.OS === 'web' && styles.articleContainerWeb,
          index === 0 && styles.firstArticleContainer,
        ]}
        onPress={() => navigation.navigate('ArticleDetail', { articleId: item.id })}
      >
        <View style={styles.articleContent}>
          {/* 左上にアイコンとユーザー名を配置 */}
          <View style={styles.authorContainer}>
            {item.users?.icon ? (
              <Image
              source={{ uri: `${item.users.icon}?${new Date().getTime()}` }}
              //@ts-ignore
              style={styles.userIcon}
            />
            ) : (
              <Image
                source={require('../../assets/user_default_icon.png')}
                 //@ts-ignore
                style={styles.userIcon}
              />
            )}
            <Text style={styles.articleAuthor} numberOfLines={1} adjustsFontSizeToFit={true} minimumFontScale={0.8}>
              {item.users?.username || '無効ユーザー'}
            </Text>
          </View>
  
          {/* ユーザー名の直下にタイトルを表示 */}
          <Text style={styles.articleTitle} numberOfLines={1} adjustsFontSizeToFit={true} minimumFontScale={0.5}>
            {item.title}
          </Text>
  
          {/* 記事の内容表示 */}
          <Text style={styles.articleContentText} numberOfLines={3}>
            {item.content || '内容がありません'}
          </Text>
  
          {/* コストと募集人数の残りを表示 */}
          <View style={styles.costAndRecruitmentContainer}>
            <Text style={styles.articleCost}>
              予算: {item.cost}円
            </Text>
            <Text style={styles.articleRecruitment}>
              {remainingSpots > 0 ? `募集人数: ${remainingSpots}人` : '満員'}
            </Text>
          </View>
  
          <Text style={styles.articleDate}>
            {new Date(item.event_date).toLocaleDateString()} {formatTime(item.meeting_time)}
          </Text>
          <View style={styles.iconTextContainer}>
            <Icon name="map-marker-alt" size={16} color="#ddd" style={styles.icon} />
            <Text style={prefectureStyle}>{prefectureName}</Text>
          </View>
          <View style={styles.iconTextContainer}>
            <Icon name="map-marked-alt" size={16} color="#ddd" style={styles.icon} />
            <Text style={styles.articleLocation}>{item.meeting_place}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  
  

return (
  <View style={{ flexDirection: 'row', flex: 1 }}>
    {/* Webの場合にのみサイドバーを表示 */}
    {Platform.OS === 'web' && <SideBar style={{ zIndex: 2, width: sidebarWidth }} />}

  <LinearGradient
    colors={['#ff00a1', '#040045']}
    style={[styles.container, { marginLeft: sidebarWidth }]} // サイドバー分のマージンを設定
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
  >
    <Animated.ScrollView
      contentContainerStyle={styles.scrollContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
      scrollEventThrottle={16}
    >
      {articles.map((article, index) => renderItem({ item: article, index }))}
    </Animated.ScrollView>

    {(Platform.OS === 'ios' || Platform.OS === 'android') && (
    <Animated.View style={[styles.floatingButton, { opacity: floatingButtonOpacity }]}>
      <TouchableOpacity onPress={() => navigation.navigate('CreateArticleScreen')}>
        <Icon name="plus" style={styles.floatingButtonIcon} />
      </TouchableOpacity>
    </Animated.View>
      )}
  </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    paddingTop: Platform.OS === 'web' ? 40 : 0,
    paddingBottom: Platform.OS === 'web' ? 60 : 0,
    paddingHorizontal: 16,
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userIconLarge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
  },
  articleAuthorLarge: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  articleTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    maxWidth: '70%',
    lineHeight: 36,
  },
  articlePrefectureMissing: {
    fontSize: 16,
    color: '#ddd',
  },
  articlePrefecture: {
    fontSize: 16,
    color: '#ddd',
  },
  articleDate: {
    color: '#ccc',
    fontSize: 15,
    marginTop: 8,
  },
  articleLocation: {
    color: '#ddd',
    fontSize: 17,
    marginTop: 4,
  },
  iconTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  icon: {
    marginRight: 4,
  },
   userIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 8,
    backgroundColor: '#0A6D91',
    justifyContent: 'center',
    alignItems: 'center',
  },
  articleContainer: {
    width: '100%',
    padding: 16,
    marginBottom: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  authorPrefectureContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    maxWidth: '30%',
  },
  articleAuthor: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  articleContentText: {
    color: '#fff',
    fontSize: 16,
  },
  articleRecruitment: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  articleFull: {
    color: '#ff0000', 
    fontWeight: 'bold',
  },
  articleCost: {
    color: '#fff',
    fontSize: 16,
  },
  costAndRecruitmentContainer: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  floatingButton: {
    //@ts-ignore
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    bottom: Platform.OS === 'web' ? 60 : 10,
    right: 20,
    backgroundColor: '#3b82f6',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingButtonIcon: {
    color: '#fff',
    fontSize: 24,
  },
});

export default Top;