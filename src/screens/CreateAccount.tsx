import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, TouchableOpacity, Platform, ScrollView, KeyboardAvoidingView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import ModalSelector from 'react-native-modal-selector';
import { CheckBox } from 'react-native-elements';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../supabaseClient';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import TermsOfServiceModal from './TermsOfServiceModal';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Signin from './Signin';
import { useNavigation } from '@react-navigation/native';

// CreateAccountコンポーネントのプロパティの型定義
type CreateAccountProps = {
  navigation?: StackNavigationProp<RootStackParamList, 'CreateAccount'>;
};

// フォームデータの型定義
type FormData = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export default function CreateAccount({ navigation }: CreateAccountProps) {
  const defaultNavigation = useNavigation<StackNavigationProp<RootStackParamList, 'CreateAccount'>>();
  const activeNavigation = navigation || defaultNavigation;
  const { control, handleSubmit, formState: { errors }, getValues, setError } = useForm<FormData>();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isTermsAccepted, setTermsAccepted] = useState(false);
  const [isTermsModalVisible, setTermsModalVisible] = useState(false);
  const [year, setYear] = useState<string | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const scrollViewRef = useRef<KeyboardAwareScrollView>(null);
  const [showSigninForm, setShowSigninForm] = useState(false); // Signinフォーム表示用の状態
  const [isAccountCreated, setIsAccountCreated] = useState(false);
  const [birthdateError, setBirthdateError] = useState<string | null>(null);

  // 生年月日の年、月、日オプションの生成
  const yearOptions = Array.from({ length: 100 }, (_, i) => ({ key: i + 1, label: `${2024 - i}` }));
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({ key: i + 1, label: `${i + 1}` }));
  const dayOptions = Array.from({ length: 31 }, (_, i) => ({ key: i + 1, label: `${i + 1}` }));
  
  // フォーム送信時の処理
  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setSubmitError(null);
    setBirthdateError(null);  // バリデーション前にリセット
  
     // 生年月日が選択されているかの確認
    if (!year || !month || !day) {
      setBirthdateError("生年月日は必須です");
      setLoading(false);
      return;
    }
  
    // 生年月日を文字列に変換
    const birthdateString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    const birthdate = new Date(birthdateString);
    const today = new Date();
    const age = today.getFullYear() - birthdate.getFullYear();
    const monthDiff = today.getMonth() - birthdate.getMonth();
    const dayDiff = today.getDate() - birthdate.getDate();
  
    // 13歳未満のユーザーに対するバリデーション
    if (age < 13 || (age === 13 && (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)))) {
      setBirthdateError("13歳未満のユーザーはアカウントを作成できません");
      setLoading(false);
      return;
    }
  
    // パスワードと確認パスワードの一致チェック
    if (data.password !== data.confirmPassword) {
      setSubmitError("パスワードが一致しません");
      setLoading(false);
      return;
    }

    // 利用規約の同意チェック
    if (!isTermsAccepted) {
      setSubmitError("利用規約に同意してください");
      setLoading(false);
      return;
    }

    // サインアップ処理
    try {
      // Supabaseでの既存アカウント確認
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (!signInError) {
        setSubmitError("このメールアドレスは既に使用されています");
        setLoading(false);
        return;
      }

      // サインアップ処理
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            username: data.username,
            birthdate: birthdateString,
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      // サインアップ成功時のデータベースへの挿入
      if (authData && authData.user) {
        const { error } = await supabase
          .from('users')
          .insert([
            {
              id: authData.user.id,
              username: data.username,
              birthdate: birthdateString,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]);

        if (error) {
          throw new Error("データベースへの挿入に失敗しました: " + error.message);
        }

       // アカウント作成完了後の処理
        if (Platform.OS === 'web') {
          // Webの場合はメッセージを表示する
          setIsAccountCreated(true); 
        } else {
          activeNavigation.navigate('AccountCreated');  // モバイルの場合はAccountCreated画面に遷移
        }
      }

    } catch (error: unknown) {
      if (error instanceof Error) {
        setSubmitError("アカウント作成に失敗しました: " + error.message);
      } else {
        setSubmitError("予期しないエラーが発生しました");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // サインインフォーム表示状態を監視
  }, [showSigninForm]);

  const handleSigninPress = () => {
    if (Platform.OS === 'web') {
      setShowSigninForm(true); // Webではサインインフォームを表示
    } else {
      activeNavigation.navigate('Signin'); // モバイルの場合はサインイン画面へ
    }
  };

  // Webでアカウント作成完了メッセージを表示
  const renderFormContent = () => {
    if (showSigninForm) {
      return <Signin />; // サインインフォームを表示
    }

    if (isAccountCreated) {
      // Webの場合にアカウント作成完了メッセージを表示
      return (
        <View style={styles.thankYouContainer}>
          <Text style={styles.thankYou}>登録ありがとうございます。</Text>
          <Text style={styles.message}>
            ご入力いただいたメールアドレスに、{'\n'}確認メールを送信いたしました。{'\n\n'}
            メールに記載のURLへアクセス後、{'\n'}ご登録完了となります。
          </Text>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => {
              setShowSigninForm(true); // サインインフォームを表示するために状態を変更
            }}
          >
            <Text style={styles.backButtonText}>サインイン画面に戻る</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <>
        <Text style={styles.title}>アカウント作成</Text>
        <View style={styles.form}>
          <View style={styles.formField}>
            <Text style={styles.label}>ユーザー名</Text>
            <Controller
              control={control}
              rules={{ required: 'ユーザー名は必須です' }}
              render={({ field: { onChange, onBlur, value = "" } }) => (
                <TextInput
                  style={styles.input}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  placeholder="ユーザー名を入力"
                />
              )}
              name="username"
              defaultValue=""
            />
            {errors.username && <Text style={styles.errorMsg}>{errors.username.message}</Text>}
          </View>

          <View style={styles.formField}>
            <Text style={styles.label}>メールアドレス</Text>
            <Controller
              control={control}
              rules={{
                required: 'メールアドレスは必須です',
                validate: value => value.includes('@') || '有効なメールアドレスを入力してください'
              }}
              render={({ field: { onChange, onBlur, value = "" } }) => (
                <TextInput
                  style={styles.input}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  placeholder="メールアドレスを入力"
                  keyboardType="email-address"
                />
              )}
              name="email"
              defaultValue=""
            />
            {errors.email && <Text style={styles.errorMsg}>{errors.email.message}</Text>}
          </View>

          <View style={styles.formField}>
            <Text style={styles.label}>生年月日 ※一度登録すると変更できません</Text>
            <View style={styles.dateRow}>
              <ModalSelector
                data={yearOptions}
                initValue="年"
                onChange={(option) => setYear(option.label)}
                style={styles.selector}
                optionContainerStyle={styles.optionContainer}
                optionTextStyle={styles.optionText}
                cancelText="キャンセル"
                cancelStyle={styles.cancelStyle}
                cancelTextStyle={styles.cancelText}
                overlayStyle={styles.overlayStyle}
              >
                <TouchableOpacity style={styles.customSelector}>
                  <Text style={styles.customSelectorText}>{year || '年'}</Text>
                </TouchableOpacity>
              </ModalSelector>
              <ModalSelector
                data={monthOptions}
                initValue="月"
                onChange={(option) => setMonth(option.label)}
                style={styles.selector}
                optionContainerStyle={styles.optionContainer}
                optionTextStyle={styles.optionText}
                cancelText="キャンセル"
                cancelStyle={styles.cancelStyle}
                cancelTextStyle={styles.cancelText}
                overlayStyle={styles.overlayStyle}
              >
                <TouchableOpacity style={styles.customSelector}>
                  <Text style={styles.customSelectorText}>{month || '月'}</Text>
                </TouchableOpacity>
              </ModalSelector>
              <ModalSelector
                data={dayOptions}
                initValue="日"
                onChange={(option) => setDay(option.label)}
                style={styles.selector}
                optionContainerStyle={styles.optionContainer}
                optionTextStyle={styles.optionText}
                cancelText="キャンセル"
                cancelStyle={styles.cancelStyle}
                cancelTextStyle={styles.cancelText}
                overlayStyle={styles.overlayStyle}
              >
                <TouchableOpacity style={styles.customSelector}>
                  <Text style={styles.customSelectorText}>{day || '日'}</Text>
                </TouchableOpacity>
              </ModalSelector>
            </View>
            {birthdateError && <Text style={styles.errorMsg}>{birthdateError}</Text>}
          </View>

          <View style={styles.formField}>
            <Text style={styles.label}>パスワード</Text>
            <Controller
              control={control}
              rules={{
                required: 'パスワードは必須です',
                minLength: {
                  value: 6,
                  message: 'パスワードは6文字以上である必要があります'
                }
              }}
              render={({ field: { onChange, onBlur, value = "" } }) => (
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

          <View style={styles.formField}>
            <Text style={styles.label}>パスワード確認</Text>
            <Controller
              control={control}
              rules={{
                required: 'パスワード確認は必須です',
                validate: value =>
                  value === getValues('password') || 'パスワードが一致しません'
              }}
              render={({ field: { onChange, onBlur, value = "" } }) => (
                <TextInput
                  style={styles.input}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  secureTextEntry
                  placeholder="パスワードを再入力"
                />
              )}
              name="confirmPassword"
              defaultValue=""
            />
            {errors.confirmPassword && <Text style={styles.errorMsg}>{errors.confirmPassword.message}</Text>}
          </View>
          <View style={styles.checkboxContainer}>
        <CheckBox
          title="利用規約に同意します"
          checked={isTermsAccepted}
          onPress={() => setTermsAccepted(!isTermsAccepted)}
          containerStyle={{ backgroundColor: 'transparent', borderWidth: 0 }}
          textStyle={{ color: Platform.OS === 'web' ? '#000' : '#fff' }}
        />
        <TouchableOpacity onPress={() => setTermsModalVisible(true)}>
          <Text style={styles.link}>利用規約</Text>
        </TouchableOpacity>
        </View>
          {/* エラーメッセージとボタン */}
          {submitError && <Text style={styles.errorMsg}>{submitError}</Text>}
          {loading ? (
            <ActivityIndicator size="large" color="#0000ff" />
          ) : (
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit(onSubmit)}>
              <Text style={styles.buttonText}>アカウントを作成</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleSigninPress}>
              <Text style={styles.link}>すでにアカウントをお持ちの場合はこちら</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      {Platform.OS !== 'web' ? (
        <LinearGradient
          colors={['#040045', '#ff00a1']}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <KeyboardAwareScrollView contentContainerStyle={styles.container} ref={scrollViewRef}>
            {renderFormContent()}
            <TermsOfServiceModal
              visible={isTermsModalVisible}
              onClose={() => setTermsModalVisible(false)}
            />
          </KeyboardAwareScrollView>
        </LinearGradient>
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          {renderFormContent()}
          <TermsOfServiceModal
            visible={isTermsModalVisible}
            onClose={() => setTermsModalVisible(false)}
          />
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}


const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  backButton: {
    backgroundColor: '#000',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    opacity: 0.8,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    width: '100%',
  },
  title: {
    fontSize: 24,
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
    borderColor: '#ccc',
    borderWidth: 1,
    padding: 12,
    borderRadius: 4,
    opacity: 0.8,
  },
  errorMsg: {
    color: 'red',
    marginTop: 10,
    fontWeight: 'bold',
    textAlign: Platform.OS === 'web' ? 'left' : 'center',
  },
  selector: {
    flex: 1,
    marginHorizontal: 5,
    opacity: 0.8,
  },
  customSelector: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  customSelectorText: {
    color: 'black',
  },
  thankYouContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  thankYou: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
  },
  termsLink: {
    marginLeft: 10, // チェックボックスとの間にスペースを追加
  },
  link: {
    color: Platform.OS === 'web' ? '#000' : '#fff',
    marginTop: 25,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  submitButton: {
    backgroundColor: Platform.OS === 'web' ? '#800080' : 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 2,
    borderColor: Platform.OS === 'web' ? 'transparent' : 'rgba(255, 255, 255, 0.2)',
  },
  buttonText: {
    color: Platform.OS === 'web' ? '#fff' : '#fff',
    fontSize: 18,
    textAlign: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  optionContainer: {
    borderRadius: 10,
    padding: 5,
    backgroundColor: 'white',
    maxHeight: 400,
  },
  optionText: {
    color: 'black',
  },
  cancelStyle: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  cancelText: {
    color: 'black',
    textAlign: 'center',
    fontSize: 18,
  },
  overlayStyle: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
    margin: 0,
  },
});