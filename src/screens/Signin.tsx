import React, { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { View, Text, TextInput, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../supabaseClient';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CreateAccount from './CreateAccount';
import { RouteProp, useRoute } from '@react-navigation/native'; 


type SigninProps = {
  navigation?: StackNavigationProp<RootStackParamList, 'Signin'>;
  expoPushToken?: string;
};

// フォームデータの型定義
type FormData = {
  email: string;
  password: string;
};

export default function Signin({ expoPushToken }: SigninProps) {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList, 'Signin'>>();
  const { control, handleSubmit, formState: { errors }, reset } = useForm<FormData>();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateAccountForm, setShowCreateAccountForm] = useState(false);

//トークンをappから受け取る
  const route = useRoute<RouteProp<RootStackParamList, 'Signin'>>();



  // フォーム送信時の処理
  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setSubmitError(null);
  
    // Supabase でのサインイン処理
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
  
    setLoading(false);
  
    if (signInError || !authData?.user) {
      setSubmitError("ログインに失敗しました: メールアドレスまたはパスワードが間違っています");
    } else if (!authData.user.email_confirmed_at) {
      // 認証されていない場合の処理
      setSubmitError("メールアドレスが認証されていません。確認メールを確認してください。");
    } else {
      const user = authData.user;
      await AsyncStorage.setItem('auth_token', authData.session?.access_token || '');
      await AsyncStorage.setItem('supabase_user_id', user.id);

      //データベースにpushtoken追加
      const updatePushNotificationToken = async () => {
        // const token = route.params.expoPushToken.replace('ExponentPushToken[', '').replace(']', ''); // トークン部分を取り出す
        const token = route.params.expoPushToken
        try {
          const { data, error } = await supabase
          .from('users') // あなたのテーブル名をここに
          .update({ pushNotificationToken: token }) // 更新するカラムと値
          .eq('id', user.id); // 指定された id の行を更新

          if (error) {
            console.error('Error updating token:', error);
          } else {
            console.log('Push notification token updated:', data);
          }
        } catch (err) {
          console.error('Error:', err);
        }
      };
      updatePushNotificationToken();
      // ログイン後、Top画面に遷移
      navigation.reset({
        index: 0,
        routes: [{ name: 'Top' }],
      });
    }
  };
  

  // アカウント作成フォームの状態変更があった場合の処理
  useEffect(() => {
    //console.log("showCreateAccountFormの状態:", showCreateAccountForm);
  }, [showCreateAccountForm]);

  // アカウント作成ボタンが押されたときの処理
  const handleCreateAccountPress = () => {
    if (Platform.OS === 'web') {
      setShowCreateAccountForm(true);// Web版ではフォームを表示
    } else {
      navigation.navigate('CreateAccount');// スマホ版ではアカウント作成画面に遷移
    }
  };

   // フォームのレンダリング処理
  const renderFormContent = () => {
    if (showCreateAccountForm) {
      return <CreateAccount />;// アカウント作成フォームを表示
    }

    return (
      <>
        <Text style={styles.title}>ログイン</Text>
        <View style={styles.form}>
          <View style={styles.formField}>
            <Text style={styles.label}>メールアドレス</Text>
            <Controller
              control={control}
              rules={{
                required: 'メールアドレスは必須です',
                pattern: {
                  value: /^\S+@\S+$/i,
                  message: '有効なメールアドレスを入力してください',
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={styles.input}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  placeholder="メールアドレスを入力"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              )}
              name="email"
              defaultValue=""
            />
            {errors.email && <Text style={styles.errorMsg}>{errors.email.message}</Text>}
          </View>
          <View style={styles.formField}>
            <Text style={styles.label}>パスワード</Text>
            <Controller
              control={control}
              rules={{ required: 'パスワードは必須です' }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={styles.input}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  secureTextEntry
                  placeholder="パスワードを入力"
                />
              )}
              name="password"
              defaultValue=""
            />
            {errors.password && <Text style={styles.errorMsg}>{errors.password.message}</Text>}
          </View>
          {submitError && <Text style={styles.errorMsg}>{submitError}</Text>}
          {loading ? (
            <ActivityIndicator size="large" color="#0000ff" />
          ) : (
            <TouchableOpacity style={styles.loginButton} onPress={handleSubmit(onSubmit)}>
              <Text style={styles.buttonText}>ログイン</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleCreateAccountPress}>
            <Text style={styles.link}>アカウントがない場合はこちら</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Platform.OS === 'web' ? '#fff' : 'transparent' }} 
    >
      {Platform.OS !== 'web' ? (
        <LinearGradient
          colors={['#040045', '#ff00a1']}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <ScrollView contentContainerStyle={styles.container}>
            {renderFormContent()}
          </ScrollView>
        </LinearGradient>
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          {renderFormContent()}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? '#000' : 'transparent',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: Platform.OS === 'web' ? '#000' : '#fff',
  },
  form: {
    width: Platform.OS === 'web' ? '100%' : '100%',
    padding: 20,
    alignSelf: 'center',
  },
  formField: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: Platform.OS === 'web' ? '#000' : '#fff',
  },
  input: {
    backgroundColor: '#fff',
    borderColor: '#ddd',
    borderWidth: 1,
    padding: 12,
    borderRadius: 4,
    opacity: 0.8,
  },
  errorMsg: {
    color: 'red',
    marginTop: 4,
  },
  loginButton: {
    backgroundColor: Platform.OS === 'web' ? '#800080' : 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Platform.OS === 'web' ? 'transparent' : 'rgba(255, 255, 255, 0.2)',
  },
  buttonText: {
    color: Platform.OS === 'web' ? '#fff' : '#fff',
    fontSize: 18,
    textAlign: 'center',
  },
  link: {
    color: Platform.OS === 'web' ? '#000' : '#fff',
    marginTop: 16,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
