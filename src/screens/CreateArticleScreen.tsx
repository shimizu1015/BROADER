import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, Platform, SafeAreaView, TouchableOpacity, } from 'react-native';
import RNPickerSelect, { PickerStyle } from 'react-native-picker-select';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { supabase } from '../supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PrefectureCityPicker from '../components/PrefectureCityPicker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import {  sendPushNotification  } from '../utils/sendPushNotification';

const CreateArticleScreen: React.FC = () => {
  // 各入力フィールドの状態管理
  const [title, setTitle] = useState('');
  const [meetingYear, setMeetingYear] = useState<number | undefined>(undefined);
  const [meetingMonthDay, setMeetingMonthDay] = useState<string | undefined>(undefined);
  const [meetingHour, setMeetingHour] = useState<string | undefined>(undefined);
  const [gatheringTime, setGatheringTime] = useState<string | undefined>(undefined);
  const [deadlineYear, setDeadlineYear] = useState<number | undefined>(undefined);
  const [deadlineMonthDay, setDeadlineMonthDay] = useState<string | undefined>(undefined);
  const [deadlineHour, setDeadlineHour] = useState<string | undefined>(undefined);
  const [budget, setBudget] = useState('');
  const [meetingLocationVisible, setMeetingLocationVisible] = useState(true);
  const [location, setLocation] = useState('');
  const [meetingLocation, setMeetingLocation] = useState('');
  const [description, setDescription] = useState('');
  const [recruitmentNumber, setRecruitmentNumber] = useState<number | undefined>(undefined);
  const [yearOptions, setYearOptions] = useState<any[]>([]);
  const [monthDayOptions, setMonthDayOptions] = useState<any[]>([]);
  const [timeOptions, setTimeOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 各入力フィールドのエラーメッセージを保持する状態
  const [titleError, setTitleError] = useState<string | null>(null);
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [recruitmentNumberError, setRecruitmentNumberError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [meetingLocationError, setMeetingLocationError] = useState<string | null>(null);
  const [selectedPrefectureId, setSelectedPrefectureId] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [deadlineDateError, setDeadlineDateError] = useState<string | null>(null);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  // scrollRef を作成
  const scrollRef = useRef<KeyboardAwareScrollView>(null);
  const [lastFocusedInput, setLastFocusedInput] = useState<string | null>(null);

  // const fetchFriends = async () => {
  //   try {
  //     const userId = await AsyncStorage.getItem('supabase_user_id');
  //     if (!userId) {
  //       console.error('ユーザーIDが見つかりません');
  //       return;
  //     }
      
  //     const { data: friendsData, error: friendsError } = await supabase
  //       .from('friends')
  //       .select('user_id, friend_id')
  //       .or(`user_id.eq.${userId}, friend_id.eq.${userId}`)
  //       .eq('status', 1); // Only retrieve accepted friends
  
  //     if (friendsError) {
  //       console.error('フレンドの取得に失敗しました:', friendsError);
  //     } else {
  //       // Process to include unique friend IDs only
  //       const uniqueFriendIds = friendsData.map(item => 
  //         item.user_id === userId ? item.friend_id : item.user_id
  //       );
  //       console.log("フレンドデータの全内容:", uniqueFriendIds);
  //     }
  //   } catch (error) {
  //     console.error('フレンド一覧取得エラー:', error);
  //   }  
  // };

  useEffect(() => {
    // 初期値を設定するために現在の日付と時間を取得
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();
    const currentHour = today.getHours();
    const currentMinute = today.getMinutes();

    // 年の選択肢を設定
    const years = [
      { label: `${currentYear}年`, value: currentYear },
      { label: `${currentYear + 1}年`, value: currentYear + 1 },
    ];
    setYearOptions(years);

    // 月日（MM-DD）の選択肢を設定
    const monthDays = [];
    for (let month = 1; month <= 12; month++) {
      const daysInMonth = new Date(currentYear, month, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        monthDays.push({ label: `${month}月${day}日`, value: `${month}-${day}` });
      }
    }
    setMonthDayOptions(monthDays);
    //fetchFriends();

    // 時間（HH:MM）の選択肢を設定
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 5) {
        const label = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        times.push({ label, value: label });
      }
    }
    setTimeOptions(times);

  // 初期値を設定 (現在の時間に最も近い5分単位の時間を設定)
    const nearestFiveMinutes = Math.floor(currentMinute / 5) * 5;
    const formattedTime = `${currentHour.toString().padStart(2, '0')}:${nearestFiveMinutes.toString().padStart(2, '0')}`;
    setMeetingYear(currentYear);
    setMeetingMonthDay(`${currentMonth}-${currentDay}`);
    setMeetingHour(formattedTime);

    setGatheringTime(formattedTime);

    // 締切日の初期値設定（集合日時と同じ値）
    setDeadlineYear(currentYear);
    setDeadlineMonthDay(`${currentMonth}-${currentDay}`);
    setDeadlineHour(formattedTime);
    
  }, []);

  // 年の変更を処理
  const handleYearChange = (value: number) => {
    setMeetingYear(value);
  };

  // 月日（MM-DD）の変更を処理
  const handleMonthDayChange = (value: string) => {
    setMeetingMonthDay(value);
  };

  // 時間（HH:MM）の変更を処理
  const handleHourChange = (value: string) => {
    setMeetingHour(value);
  };

  // 締切日の変更処理追加
  const handleDeadlineYearChange = (value: number) => {
    setDeadlineYear(value);
  };
  const handleDeadlineMonthDayChange = (value: string) => {
    setDeadlineMonthDay(value);
  };
  const handleDeadlineHourChange = (value: string) => {
    setDeadlineHour(value);
  };
  

  // フォームのバリデーション
const validateForm = () => {
  let isValid = true;

 // 現在の日時を取得
 const now = new Date();
 const [meetingMonth, meetingDay] = meetingMonthDay ? meetingMonthDay.split('-').map(Number) : [undefined, undefined];
 const meetingDate = new Date(meetingYear!, meetingMonth! - 1, meetingDay!);
 const [meetingHourStr, meetingMinuteStr] = meetingHour ? meetingHour.split(':') : ['', ''];
 const meetingTime = new Date(meetingYear!, meetingMonth! - 1, meetingDay!, parseInt(meetingHourStr), parseInt(meetingMinuteStr));

 // 締切日のバリデーション
 const [deadlineMonth, deadlineDay] = deadlineMonthDay ? deadlineMonthDay.split('-').map(Number) : [undefined, undefined];
 const deadlineDate = new Date(deadlineYear!, deadlineMonth! - 1, deadlineDay!);
 const [deadlineHourStr, deadlineMinuteStr] = deadlineHour ? deadlineHour.split(':') : ['', ''];
 const deadlineTime = new Date(deadlineYear!, deadlineMonth! - 1, deadlineDay!, parseInt(deadlineHourStr), parseInt(deadlineMinuteStr));

 const [gatheringHourStr, gatheringMinuteStr] = gatheringTime ? gatheringTime.split(':') : ['', ''];
  if (title.trim() === '') {
    setTitleError('タイトルを入力してください');
    isValid = false;
  } else {
    setTitleError(null);
  }

  if (budget.trim() === '' || isNaN(Number(budget))) {
    setBudgetError('予算を正しく入力してください');
    isValid = false;
  } else {
    setBudgetError(null);
  }

  if (location.trim() === '') {
    setLocationError('場所を入力してください');
    isValid = false;
  } else {
    setLocationError(null);
  }

  if (description.trim() === '') {
    setDescriptionError('内容を入力してください');
    isValid = false;
  } else {
    setDescriptionError(null);
  }

  if (recruitmentNumber === undefined || recruitmentNumber <= 0) {
    setRecruitmentNumberError('募集人数を選択してください');
    isValid = false;
  } else {
    setRecruitmentNumberError(null);
  }

  // 日付のバリデーション
  if (meetingYear === undefined || meetingMonthDay === undefined) {
    setDateError('集合日付を選択してください');
    isValid = false;
  } else if (meetingDate < now && meetingDate.toDateString() !== now.toDateString()) {
    // 現在の日付より前で、同じ日ではない場合エラー
    setDateError('集合日付は現在の日付以降に設定してください');
    isValid = false;
  } else {
    setDateError(null);
  }

// 時間のバリデーション
if (meetingHour === undefined || meetingHour.trim() === '') {
  setTimeError('集合時間を選択してください');
  isValid = false;
} else if (meetingDate.toDateString() === now.toDateString() && meetingTime < now) {
  // 同じ日の場合、時間が現在より前かをチェック
  setTimeError('集合時間は現在の時刻以降に設定してください');
  isValid = false;
} else {
  setTimeError(null);
}

  if (meetingHour === undefined || meetingHour.trim() === '') {
    setTimeError('集合時間を選択してください');
    isValid = false;
  } else {
    // 日付が今日の場合、時間が現在の時刻より前かをチェック
    const isToday = meetingDate.toDateString() === now.toDateString();
    if (isToday && (parseInt(meetingHourStr) < now.getHours() || 
       (parseInt(meetingHourStr) === now.getHours() && parseInt(meetingMinuteStr) < now.getMinutes()))) {
      setTimeError('集合時間は現在の時刻以降に設定してください');
      isValid = false;
    } else {
      setTimeError(null);
    }
  }

  
  // gatheringTimeのバリデーション
  if (gatheringTime === undefined || gatheringTime.trim() === '') {
    setTimeError('集合時間を入力してください');
    isValid = false;
  } else {
    const meetingTotalMinutes = parseInt(meetingHourStr) * 60 + parseInt(meetingMinuteStr);
    const gatheringTotalMinutes = parseInt(gatheringHourStr) * 60 + parseInt(gatheringMinuteStr);

    if (gatheringTotalMinutes > meetingTotalMinutes) {
      // gatheringTime が meetingHour より後であればエラー
      setTimeError('集合時間は実施時間と同じかそれより前に設定してください');
      isValid = false;
    } else {
      setTimeError(null);
    }
  }

// 締切日のバリデーション
if (deadlineYear === undefined || deadlineMonthDay === undefined) {
  setDeadlineDateError('締切日を選択してください');
  isValid = false;
} else {
  const now = new Date();
  const isSameDayAsMeeting = deadlineDate.toDateString() === meetingDate.toDateString();
  const isSameDayAsToday = deadlineDate.toDateString() === now.toDateString();

  if (deadlineDate > meetingDate) {
    setDeadlineDateError('締切日は集合日と同じか、それより前の日付に設定してください');
    isValid = false;
  } else if (isSameDayAsMeeting && deadlineTime >= meetingTime) {
    // 締切日が集合日と同じ場合、締切時間が集合時間より前であることを確認
    setDeadlineDateError('締切時間は集合時間より前に設定してください');
    isValid = false;
  } else if (isSameDayAsToday && deadlineTime < now) {
    // 締切日が今日の場合、締切時間が現在の時刻以降であることを確認
    setDeadlineDateError('締切時間は現在の時刻以降に設定してください');
    isValid = false;
  } else {
    setDeadlineDateError(null);
  }
}

// 集合場所のバリデーション
if (meetingLocationVisible && meetingLocation.trim() === '') {
  setMeetingLocationError('集合場所を入力してください');
  isValid = false;
} else {
  setMeetingLocationError(null);
}

  return isValid;
};
  
const sendNotificationsToAllFriends = async () => {
  try {
    const userId = await AsyncStorage.getItem('supabase_user_id');
    if (!userId) {
      console.error('ユーザーIDが見つかりません');
      return;
    }
     // ホストのユーザー名を取得
     const { data: userData, error: userError } = await supabase
     .from('users')
     .select('username')
     .eq('id', userId)
     .single();

   if (userError || !userData) {
     console.error('ホストのユーザー名の取得に失敗しました:', userError);
     return;
   }

   const hostUsername = userData.username;


    const { data: friendsData, error: friendsError } = await supabase
      .from('friends')
      .select('user_id, friend_id')
      .or(`user_id.eq.${userId}, friend_id.eq.${userId}`)
      .eq('status', 1); // ステータス1でフレンド関係を確認

    if (friendsError) {
      console.error('フレンドの取得に失敗しました:', friendsError);
      return;
    }

    // 自分のユーザーIDに基づいて friend_id または user_id を取得
    const friendIds = friendsData.map(friend => 
      friend.user_id === userId ? friend.friend_id : friend.user_id
    );

    console.log("取得されたフレンドID一覧:", friendIds);

    for (let friendId of friendIds) {
      const { data: tokenData, error: tokenError } = await supabase
         .from('users')
         .select('pushNotificationToken')
         .eq('id', friendId)
         .single();
   
      if (tokenError) {
         console.error('プッシュ通知トークンの取得に失敗しました:', tokenError);
         continue;
      }
   
      const pushNotificationToken = tokenData?.pushNotificationToken;
      if (pushNotificationToken) {
         const title = "新しいイベント";
         const body = `${hostUsername}さんが新しいイベントを作成しました！`;
   
         console.log(`プッシュ通知を送信中: ${friendId}, トークン: ${pushNotificationToken}`);
         await sendPushNotification(pushNotificationToken, body);
      }
    }
   
  } catch (error) {
    console.error('プッシュ通知送信中にエラーが発生しました:', error);
  }
};



  // フォーム送信時の処理
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
  
    setLoading(true);
    setSubmitError(null);
  
    const userId = await AsyncStorage.getItem('supabase_user_id');
    
    if (!userId) {
      setLoading(false);
      setSubmitError('ユーザーIDが取得できませんでした。再度ログインしてください。');
      return;
    }
  
     // 各日付と時間を文字列形式に変換
      const [meetingMonth, meetingDay] = meetingMonthDay ? meetingMonthDay.split('-').map(Number) : [undefined, undefined];
      const eventDate = meetingYear && meetingMonth && meetingDay
        ? `${meetingYear}-${String(meetingMonth).padStart(2, '0')}-${String(meetingDay).padStart(2, '0')}`
        : null;
      const meetingTime = meetingHour ? `${meetingHour}:00` : null;
      const gatheringTimeFormatted = gatheringTime ? `${gatheringTime}:00` : null;

      const [deadlineMonth, deadlineDay] = deadlineMonthDay ? deadlineMonthDay.split('-').map(Number) : [undefined, undefined];
      const deadlineDate = deadlineYear && deadlineMonth && deadlineDay
        ? `${deadlineYear}-${String(deadlineMonth).padStart(2, '0')}-${String(deadlineDay).padStart(2, '0')}`
        : null;
      const deadlineTime = deadlineHour ? `${deadlineHour}:00` : null;
      
      const meetingLocationToSave = meetingLocationVisible ? meetingLocation : '';
    
      try {
        const { data: articleData, error: articleError } = await supabase
          .from('articles')
          .insert([
            {
              title,
              content: description,
              meeting_place: location,
              meeting_location: meetingLocationToSave,
              meeting_time: meetingTime,
              gathering_time: gatheringTimeFormatted,
              cost: parseInt(budget, 10),
              participant_limit: recruitmentNumber,
              event_date: eventDate,
              deadline_date: deadlineDate,
              deadline_time: deadlineTime,
              host_user_id: userId,
              prefecture_id: parseInt(selectedPrefectureId ?? "0"),
              city_id: parseInt(selectedCity ?? "0"),
              },
          ])
          .select()
          .single();
  
      if (articleError) {
        throw new Error('記事の作成に失敗しました: ' + articleError.message);
      }
  
      // 記事の作成に成功した場合、作成した記事のIDを使ってチャットルームを作成する
      const { data: chatRoomData, error: chatRoomError } = await supabase
        .from('chat_rooms')
        .insert([{ 
          title, 
          article_id: articleData.id
        }])
        .select()
        .single();
  
      if (chatRoomError) {
        throw new Error('チャットルームの作成に失敗しました: ' + chatRoomError.message);
      }
  
      //記事にチャットルームIDを追加する
      const { error: updateArticleError } = await supabase
        .from('articles')
        .update({ chat_room_id: chatRoomData.id })
        .eq('id', articleData.id);
  
      if (updateArticleError) {
        throw new Error('記事の更新に失敗しました: ' + updateArticleError.message);
      }

       // **友達へのプッシュ通知の送信**
    const { data: friendsData, error: friendsError } = await supabase
    .from('friends')
    .select('friend_id')
    .eq('user_id', userId);

  if (friendsError) {
    console.error('友達リストの取得に失敗しました:', friendsError);
  } else {
    for (let friend of friendsData) {
      const { data: tokenData, error: tokenError } = await supabase
        .from('users')
        .select('pushNotificationToken')
        .eq('id', friend.friend_id)
        .single();

      if (tokenError) {
        console.error('プッシュ通知トークンの取得に失敗しました:', tokenError);
        continue;
      }

      const pushNotificationToken = tokenData?.pushNotificationToken;
      if (pushNotificationToken) {
        const title = "新しいイベント";
        const body = "あなたの友達が新しいイベントを作成しました！";

        console.log("プッシュ通知を送信中:", pushNotificationToken, title, body);
        await sendPushNotification(pushNotificationToken, body);
      }
    }
  }
  // イベント投稿後に通知送信を実行
await sendNotificationsToAllFriends();
  
      setLoading(false);
      console.log('記事とチャットルームの作成に成功しました');
      navigation.navigate('Top');
    } catch (error) {
      setLoading(false);
      // エラーが Error 型の場合、メッセージを取得
      if (error instanceof Error) {
        setSubmitError(error.message);
      } else {
        setSubmitError('不明なエラーが発生しました。');
      }
    }
  };

  const recruitmentOptions = [...Array(31).keys()].slice(1).map(num => ({ label: `${num} 人`, value: num }));

  // フォーカス時のスクロール制御
  const handleFocus = (inputName: string, scrollY: number) => {
    if (lastFocusedInput !== inputName) {
      scrollRef.current?.scrollToPosition(0, scrollY, true);
      setLastFocusedInput(inputName);
    }
  };

  const toggleMeetingLocation = () => {
    setMeetingLocationVisible(prevState => !prevState);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContainer}
        enableOnAndroid={true}
        keyboardShouldPersistTaps="handled"
        ref={scrollRef}
      >
        <View style={[styles.container, Platform.OS === 'web' && styles.containerWeb]}>
          <Text style={[styles.label, styles.marginTop]}>タイトル</Text>
          <TextInput
            style={[styles.titleInput, titleError ? styles.errorInput : null]}
            value={title}
            onChangeText={setTitle}
            maxLength={30}
            placeholder="タイトル"
          />
          {titleError && <Text style={styles.error}>{titleError}</Text>}
  
          {/* 日付と募集人数の横並び配置 */}
          <View style={styles.dateAndRecruitmentRow}>
            {/* 日付フィールド */}
            <View style={styles.dateContainer}>
              <Text style={styles.label}>日付</Text>
              <View style={styles.pickerRow}>
                <View style={styles.pickerContainer}>
                  <RNPickerSelect
                    onValueChange={handleYearChange}
                    items={yearOptions}
                    placeholder={{ label: '年', value: null }}
                    value={meetingYear}
                    style={pickerSelectStyles.year}
                  />
                </View>
                <View style={styles.pickerContainer}>
                  <RNPickerSelect
                    onValueChange={handleMonthDayChange}
                    items={monthDayOptions}
                    placeholder={{ label: '月日', value: null }}
                    value={meetingMonthDay}
                    style={pickerSelectStyles.monthDay}
                  />
                  {dateError && <Text style={styles.error}>{dateError}</Text>}
                </View>
                <View style={styles.pickerContainer}>
                  <RNPickerSelect
                    onValueChange={handleHourChange}
                    items={timeOptions}
                    placeholder={{ label: '時間', value: null }}
                    value={meetingHour}
                    style={pickerSelectStyles.time}
                  />
                    {dateError && <Text style={styles.error}>{dateError}</Text>}
                    {timeError && <Text style={styles.error}>{timeError}</Text>}
                </View>
              </View>
            </View>
  
            {/* 募集人数フィールド */}
            <View style={styles.recruitmentContainer}>
              <Text style={styles.label}>募集人数</Text>
              <RNPickerSelect
                onValueChange={setRecruitmentNumber}
                items={recruitmentOptions}
                placeholder={{ label: '人数', value: null }}
                value={recruitmentNumber}
                style={pickerSelectStyles.recruitment}
              />
              {recruitmentNumberError && <Text style={styles.error}>{recruitmentNumberError}</Text>}
            </View>
          </View>
            {/* 都道府県と市区町村の入力フィールド */}
            <View style={styles.prefectureCityContainer}>
              <PrefectureCityPicker
                onPrefectureChange={setSelectedPrefectureId}
                onCityChange={setSelectedCity}
              />
            </View>
            {/* 開催地の入力フィールド */}
            <Text style={[styles.label, styles.marginTop]}>開催地</Text>
            <TextInput
              style={[styles.locationInput, locationError ? styles.errorInput : null]}
              value={location}
              onChangeText={setLocation}
              placeholder="開催地"
              onFocus={() => handleFocus('location', 250)}
            />
            {locationError && <Text style={styles.error}>{locationError}</Text>}

            <Text style={[styles.label, styles.marginTop]}>詳細</Text>
          <TextInput
            style={[styles.textarea, descriptionError ? styles.errorInput : null]}
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="内容"
            onFocus={() => handleFocus('description', 300)}
          />
          {descriptionError && <Text style={styles.error}>{descriptionError}</Text>}
  
          {submitError && <Text style={styles.error}>{submitError}</Text>}

  {/* 集合時間と表示切替ラベル */}
  <View style={styles.dateAndRecruitmentRow}>
            <Text style={styles.label}>集合時間</Text>
            <Text style={styles.label}>集合場所の表示切替</Text>
          </View>

          <View style={styles.dateAndRecruitmentRow}>
            <View style={styles.narrowPickerContainer}>
              <RNPickerSelect
                onValueChange={setGatheringTime}
                items={timeOptions}
                placeholder={{ label: '時間を選択してください', value: null }}
                value={gatheringTime}
                style={pickerSelectStyles.time}
              />
            </View>
            <TouchableOpacity style={styles.toggleButton} onPress={toggleMeetingLocation}>
              <Ionicons
                name={meetingLocationVisible ? 'eye-off' : 'eye'}
                size={24}
                color="#fff"
              />
            </TouchableOpacity>
          </View>
          {timeError && <Text style={styles.error}>{timeError}</Text>}

          {/* Conditionally rendered 集合場所フィールド */}
          {meetingLocationVisible && (
            <View>
              <Text style={[styles.label, styles.marginTop]}>集合場所</Text>
              <TextInput
                style={[styles.locationInput, meetingLocationError ? styles.errorInput : null]}
                value={meetingLocation}
                onChangeText={setMeetingLocation}
                placeholder="集合場所"
                onFocus={() => handleFocus('meetingLocation', 350)} 
              />
              {meetingLocationError && <Text style={styles.error}>{meetingLocationError}</Text>}
            </View>
          )}

          <View style={styles.budgetAndDeadlineRow}>
  {/* 予算 Field */}
  <View style={styles.budgetContainer}>
    <Text style={styles.label}>予算</Text>
    <TextInput
      style={[styles.budgetInput, budgetError ? styles.errorInput : null]}
      value={budget}
      onChangeText={setBudget}
      keyboardType="numeric"
      placeholder="予算(円)"
      onFocus={() => handleFocus('budget', 450)}
    />
    {budgetError && <Text style={styles.error}>{budgetError}</Text>}
  </View>

  {/* 締切日 Field */}
  <View style={styles.deadlineContainer}>
    <Text style={styles.label}>締切日</Text>
    <View style={styles.pickerRow}>
      <View style={styles.pickerContainer}>
        <RNPickerSelect
          onValueChange={handleDeadlineYearChange}
          items={yearOptions}
          placeholder={{ label: '年', value: null }}
          value={deadlineYear}
          style={pickerSelectStyles.year}
        />
      </View>
      <View style={styles.pickerContainer}>
        <RNPickerSelect
          onValueChange={handleDeadlineMonthDayChange}
          items={monthDayOptions}
          placeholder={{ label: '月日', value: null }}
          value={deadlineMonthDay}
          style={pickerSelectStyles.monthDay}
        />
      </View>
      <View style={styles.pickerContainer}>
        <RNPickerSelect
          onValueChange={handleDeadlineHourChange}
          items={timeOptions}
          placeholder={{ label: '時間', value: null }}
          value={deadlineHour}
          style={pickerSelectStyles.time}
        />
      </View>
    </View>
    {deadlineDateError && <Text style={styles.error}>{deadlineDateError}</Text>}
  </View>
</View>

  
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>投稿</Text>
            </TouchableOpacity>
          </View>
  
          {loading && <ActivityIndicator size="large" color="#0000ff" />}
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};  

const pickerSelectStyles: { [key: string]: PickerStyle } = {
  year: {
    inputIOS: {
      height: 40,
      borderColor: '#ddd',
      borderWidth: 1,
      borderRadius: 4,
      paddingHorizontal: 8,
      backgroundColor: '#fff',
      width: '100%',
    },
    inputAndroid: {
      height: 40,
      borderColor: '#ddd',
      borderWidth: 1,
      borderRadius: 4,
      paddingHorizontal: 8,
      backgroundColor: '#fff',
      width: '100%',
    },
  },
  monthDay: {
    inputIOS: {
      height: 40,
      borderColor: '#ddd',
      borderWidth: 1,
      borderRadius: 4,
      paddingHorizontal: 8,
      backgroundColor: '#fff',
      width: '100%',
    },
    inputAndroid: {
      height: 40,
      borderColor: '#ddd',
      borderWidth: 1,
      borderRadius: 4,
      paddingHorizontal: 8,
      backgroundColor: '#f8f8f8',
      width: '100%',
    },
  },
  time: {
    inputIOS: {
      height: 40,
      borderColor: '#ddd',
      borderWidth: 1,
      borderRadius: 4,
      paddingHorizontal: 8,
      backgroundColor: '#fff',
      width: '100%',
    },
    inputAndroid: {
      height: 40,
      borderColor: '#ddd',
      borderWidth: 1,
      borderRadius: 4,
      paddingHorizontal: 8,
      backgroundColor: '#d8d8d8',
      width: '100%',
    },
  },
  recruitment: {
    inputIOS: {
      height: 40,
      borderColor: '#ddd',
      borderWidth: 1,
      borderRadius: 4,
      paddingHorizontal: 8,
      backgroundColor: '#fff',
      width: '100%',
    },
    inputAndroid: {
      height: 40,
      borderColor: '#ddd',
      borderWidth: 1,
      borderRadius: 4,
      paddingHorizontal: 8,
      backgroundColor: '#fff',
      width: '100%',
    },
  },
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    flex: 1,
    width: '100%',
  },
  containerWeb: {
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  toggleContainer: {
    width: '40%',
    alignItems: 'center',
  },
  titleInput: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    marginBottom: 18,
    width: '70%',
    textAlign: 'left',
  },
  dateAndRecruitmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', // Align items in the center
    width: '100%',
  },
  pickerContainer: {
    flex: 1,
    marginHorizontal: 4,
  },
  budgetInput: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    marginBottom: 16,
    width: '100%',
  },
  locationInput: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    marginBottom: 8,
    width: '100%',
  },
  textarea: {
    height: 100,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    textAlignVertical: 'top',
    marginBottom: 8,
    width: '100%',
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  narrowPickerContainer: {
    width: '30%',
  },
  toggleButton: {
    backgroundColor: 'green',
    padding: 6,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginRight: 50,
  },
  toggleButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  error: {
    color: 'red',
    marginBottom: 8,
  },
  errorInput: {
    borderColor: 'red',
  },
  marginTop: {
    marginTop: 16,
  },
  buttonContainer: {
    marginTop: 50,
    width: '100%',
    alignItems: 'center',
  },
  dateContainer: {
    width: '70%',
    paddingRight: 8,
  },
  recruitmentContainer: {
    width: '30%',
    paddingLeft: 8,
  },
  submitButton: {
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '80%',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  prefectureCityContainer: {
    marginTop: 16,
  },
  budgetAndDeadlineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    width: '100%',
  },
  budgetContainer: {
    width: '30%',
    paddingRight: 8,
    justifyContent: 'center',
  },
  deadlineContainer: {
    width: '70%',
    paddingLeft: 8,
  },
});

export default CreateArticleScreen;
