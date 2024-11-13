import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import RNPickerSelect from 'react-native-picker-select';
import { supabase } from '../supabaseClient';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

// フォームデータの型定義
type FormData = {
  firstName: string;
  lastName: string;
  username: string;
  gender: string;
  bio: string;
};

const ProfileSetup: React.FC = () => {
  // React Hook Formのフックを使用してフォームの管理を行う
  const { control, handleSubmit, setValue, formState: { errors } } = useForm<FormData>();

  // ローディング状態やエラーメッセージを管理するためのステート
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // React Navigationのフックを使用してナビゲーションを行う
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  // コンポーネントがマウントされたときにユーザーデータを取得する
  useEffect(() => {
    const fetchUserData = async () => {
      // AsyncStorageからユーザーIDを取得
      const userId = await AsyncStorage.getItem('supabase_user_id');
      if (!userId) {
        setSubmitError('ユーザーIDが見つかりません');
        setInitialLoading(false);
        return;
      }

      // Supabaseからユーザーデータを取得
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        setSubmitError('ユーザーデータの取得に失敗しました。');
      } else {
        setUser(data);
        // フォームの初期値を設定
        setValue('firstName', data.first_name || '');
        setValue('lastName', data.last_name || '');
        setValue('username', data.username || '');
        setValue('gender', data.gender !== null ? String(data.gender) : '');
        setValue('bio', data.bio || '');
      }

      setInitialLoading(false);
    };

    fetchUserData();
  }, [setValue]);

  // フォーム送信時の処理
  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setSubmitError(null);

    // ユーザーデータが存在しない場合のエラーハンドリング
    if (!user || !user.id) {
      setSubmitError('ユーザー情報が取得できません。');
      setLoading(false);
      return;
    }

    // 性別が選択されていない場合のエラーハンドリング
    if (data.gender === '') {
      setSubmitError('性別を設定してください。');
      setLoading(false);
      return;
    }

    // 更新データの設定
    const updateData = {
      first_name: data.firstName,
      last_name: data.lastName,
      username: data.username,
      gender: parseInt(data.gender, 10),
      bio: data.bio,
    };

    // Supabaseでユーザーデータを更新
    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user.id);

    setLoading(false);

    if (error) {
      setSubmitError("プロフィールの更新に失敗しました: " + (error.message || ''));
    } else {
      navigation.navigate('Top');
    }
  };

  // 初期データの読み込み中はローディングスピナーを表示
  if (initialLoading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>プロフィール設定</Text>
        <View style={styles.form}>
          <View style={styles.formField}>
            <Text style={styles.label}>名字</Text>
            <Controller
              control={control}
              rules={{ required: '名字は必須です' }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={styles.input}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  placeholder="名字を入力"
                />
              )}
              name="lastName"
            />
            {errors.lastName && <Text style={styles.errorMsg}>{errors.lastName.message}</Text>}
          </View>
          <View style={styles.formField}>
            <Text style={styles.label}>名</Text>
            <Controller
              control={control}
              rules={{ required: '名は必須です' }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={styles.input}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  placeholder="名を入力"
                />
              )}
              name="firstName"
            />
            {errors.firstName && <Text style={styles.errorMsg}>{errors.firstName.message}</Text>}
          </View>
          <View style={styles.formField}>
            <Text style={styles.label}>ユーザー名</Text>
            <Controller
              control={control}
              rules={{ required: 'ユーザー名は必須です' }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={styles.input}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  placeholder="ユーザー名を入力"
                />
              )}
              name="username"
            />
            {errors.username && <Text style={styles.errorMsg}>{errors.username.message}</Text>}
          </View>
          <View style={styles.formField}>
            <Text style={styles.label}>生年月日</Text>
            <TextInput
              style={styles.input}
              value={user?.birthdate || ''}
              editable={false}
              placeholder="生年月日を入力"
            />
          </View>
          <View style={styles.formField}>
            <Text style={styles.label}>性別</Text>
            <Controller
              control={control}
              rules={{ validate: value => value !== '' || 'この項目は必須項目です' }}
              render={({ field: { onChange, value } }) => (
                <RNPickerSelect
                  onValueChange={onChange}
                  items={[
                    { label: '男', value: '0' },
                    { label: '女', value: '1' },
                    { label: 'その他', value: '2' },
                  ]}
                  style={{
                    inputIOS: styles.picker,
                    inputAndroid: styles.picker,
                    placeholder: {
                      color: '#999',
                      fontSize: 16,
                    },
                  }}
                  value={value}
                  placeholder={{ label: '選択してください', value: '' }}
                />
              )}
              name="gender"
            />
            {errors.gender && <Text style={styles.errorMsg}>{errors.gender.message}</Text>}
          </View>
          <View style={styles.formField}>
            <Text style={styles.label}>自己紹介</Text>
            <Controller
              control={control}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, styles.bioInput]}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  placeholder="自己紹介を入力"
                  multiline={true}
                  numberOfLines={6}
                />
              )}
              name="bio"
            />
          </View>
          {submitError && <Text style={styles.errorMsg}>{submitError}</Text>}
          <Button title="保存" onPress={handleSubmit(onSubmit)} disabled={loading} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// スタイル定義
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f7f7f7',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: '#333',
  },
  form: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  formField: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#666',
  },
  input: {
    backgroundColor: '#fff',
    borderColor: '#ddd',
    borderWidth: 1,
    padding: 12,
    borderRadius: 4,
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  picker: {
    backgroundColor: '#fff',
    borderColor: '#ddd',
    borderWidth: 1,
    padding: 12,
    borderRadius: 4,
  },
  errorMsg: {
    color: 'red',
    marginTop: 4,
  },
  link: {
    color: 'blue',
    marginTop: 16,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});

export default ProfileSetup;
