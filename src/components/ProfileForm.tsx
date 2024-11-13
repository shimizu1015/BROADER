import React, { useState, useEffect,useRef } from 'react';
import { View, Text, TextInput, Button, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet, Switch, TouchableOpacity, Image, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import RNPickerSelect from 'react-native-picker-select';
import { supabase } from '../supabaseClient';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import ImageUploadPage from './ImageUploadPage';

moment.locale('ja');

type FormData = {
  username: string;
  gender: string;
  bio: string;
};

interface ProfileFormProps {
  isEdit: boolean;
  initialData?: any;
  userId: string;
  onLogout: () => void;
  onClose?: () => void;
}

const ProfileForm: React.FC<ProfileFormProps> = ({ isEdit, initialData, userId, onLogout,  onClose}) => {
  const { control, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: initialData || {
      username: '',
      gender: '',
      bio: '',
    },
  });

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const imageUploadRef = useRef<any>(null);

  useEffect(() => {
    const fetchUserData = async () => {
  
      if (!userId) {
        setSubmitError('ユーザーIDが見つかりません');
        setInitialLoading(false);
        return;
      }
  
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
  
      if (error) {
        setSubmitError('ユーザーデータの取得に失敗しました。');
      } else {
        setUser(data);
        setValue('username', data.username || '');
        setValue('gender', data.gender !== null ? String(data.gender) : '');
        setValue('bio', data.bio || '');
        setProfileImage(data['icon'] || null);
      }
  
      setInitialLoading(false);
    };
  
    if (isEdit) {
      fetchUserData();
    } else {
      setInitialLoading(false);
    }
  }, [setValue, isEdit]);
  

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setSubmitError(null);
  
    if (!user && isEdit) {
      setSubmitError('ユーザー情報が取得できません。');
      setLoading(false);
      return;
    }
  
    if (data.gender === '') {
      setSubmitError('性別を設定してください。');
      setLoading(false);
      return;
    }
  
    const updateData = {
      username: data.username,
      gender: parseInt(data.gender, 10),
      bio: data.bio,
      updated_at: new Date().toISOString(),
    };
  
    console.log('Submitting data:', updateData);
  
    try {
      // Webの場合は画像保存処理をImageUploadPage内に任せる
      if (Platform.OS === 'web' && imageUploadRef.current) {
        await imageUploadRef.current.saveImage();
      } else if (profileImage) { // モバイルの場合にのみ画像保存処理を実行
        const userId = user.id; // ユーザーIDを取得
        const fileName = `${userId}`; // ファイル名（拡張子を除く）
  
        // 既存の同名ファイルをすべてリストして削除
        const { data: existingFiles, error: listError } = await supabase.storage
          .from('profilse') // バケット名
          .list('icon');    // ディレクトリ名
  
        if (listError) {
          console.error('ファイルリストの取得に失敗しました:', listError.message);
          setLoading(false);
          return;
        }
  
        // 同じファイル名を持つファイルを削除
        const filesToDelete = existingFiles
          .filter(file => file.name.startsWith(fileName)) // ファイル名が一致するものをフィルタ
          .map(file => `icon/${file.name}`); // パスを作成
  
        if (filesToDelete.length > 0) {
          const { error: deleteError } = await supabase.storage
            .from('profilse')
            .remove(filesToDelete);
  
          if (deleteError) {
            console.error('ファイル削除エラー:', deleteError.message);
            Alert.alert('エラー', `ファイル削除に失敗しました: ${deleteError.message}`);
            setLoading(false);
            return;
          }
          console.log('既存のファイルを削除しました:', filesToDelete);
        }
  
        // 画像を400x400ピクセルにリサイズ
        const resizedImage = await ImageManipulator.manipulateAsync(
          profileImage,
          [{ resize: { width: 400, height: 400 } }],
          { compress: 0.7 } // 圧縮率を設定
        );
  
        console.log('Resized Image URI:', resizedImage.uri); // リサイズ後のURIをログに出力
  
        // Supabase Storageに画像をアップロード
        const fileExtension = profileImage.split('.').pop(); // 新しい拡張子
        const { error: uploadError } = await supabase.storage
          .from('profilse')
          .upload(`icon/${fileName}.${fileExtension}`, {
            //@ts-ignore
            uri: resizedImage.uri,
            name: fileName,
            type: `image/${fileExtension}`, // 必要に応じてコンテンツタイプを設定
          });
  
        if (uploadError) {
          console.error('アップロードエラー:', uploadError.message);
          Alert.alert('エラー', `画像のアップロードに失敗しました: ${uploadError.message}`);
          setLoading(false);
          return;
        }
  
        // アップロードした画像のURLを取得
        const { data: publicData } = supabase.storage
          .from('profilse')
          .getPublicUrl(`icon/${fileName}.${fileExtension}`);
  
        if (!publicData || !publicData.publicUrl) {
          console.error('Public URLの取得に失敗しました');
          Alert.alert('エラー', 'Public URLの取得に失敗しました。');
          setLoading(false);
          return;
        }
  
        const publicURL = publicData.publicUrl;
  
        // usersテーブルにURLを保存する
        const { error: updateError } = await supabase
          .from('users')
          .update({ 'icon': publicURL }) // iconにURLを保存
          .eq('id', userId);
  
        if (updateError) {
          console.error('ユーザーデータの更新エラー:', updateError.message);
          Alert.alert('エラー', `ユーザーデータの更新に失敗しました: ${updateError.message}`);
          setLoading(false);
          return;
        }
      }
  
      // ユーザー情報の更新処理
      if (isEdit) {
        const { error } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', user.id);
  
        if (error) {
          console.error('Error updating user:', error);
          throw error;
        }
      } else {
        const { error } = await supabase
          .from('users')
          .insert([updateData]);
  
        if (error) {
          console.error('Error inserting user:', error);
          throw error;
        }
      }
  
      if (Platform.OS === 'web') {
        if (onClose) {
          onClose(); // Web版でモーダルを閉じる処理を呼び出す
        }
      } else {
        navigation.navigate('Top'); // スマホ版はTopに戻る
      }
    } catch (error) {
      if (error instanceof Error) {
        setSubmitError("プロフィールの更新に失敗しました: " + (error.message || ''));
      } else {
        setSubmitError("プロフィールの更新に失敗しました。");
      }
    } finally {
      setLoading(false);
    }
  };
  

  const handlePickImage = async () => {
    const userId = await AsyncStorage.getItem('supabase_user_id');
  
    if (!user) {
      console.error('ユーザーが認証されていません');
      Alert.alert('エラー', 'ユーザーが認証されていません');
      return; // 認証されていない場合、処理を中断
    }
  
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
  
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedImageUri = result.assets[0].uri; // 選択された画像のURIを取得
  
      // 選択された画像のURIを状態に保存
      setProfileImage(selectedImageUri); // 画像のURIを保存する
    }
  };
  
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formContainer}>
          <View style={styles.form}>
          <View style={styles.iconContainer}>
              {/* Webの場合はImageUploadPageコンポーネント*/}
              {Platform.OS === 'web' ? (
                <ImageUploadPage ref={imageUploadRef} />
              ) : (
                <TouchableOpacity onPress={handlePickImage}>
                  {profileImage ? (
                    <Image source={{ uri: `${profileImage}?t=${new Date().getTime()}` }} style={styles.icon} />
                  ) : (
                    <Image source={require('../../assets/user_default_icon.png')} style={styles.icon} />
                  )}
                </TouchableOpacity>
              )}
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
            <TouchableOpacity 
              style={[styles.saveButton, { marginBottom: 80 }]}
              onPress={handleSubmit(onSubmit)}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
              <Text style={styles.buttonText}>{loading ? '読み込み中...' : isEdit ? '保存' : '次へ'}</Text>
            )}
              </TouchableOpacity>
            {isEdit && (
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={onLogout}
              >
                <Text style={styles.logoutButtonText}>ログアウト</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );  
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
    width: '100%',
    backgroundColor: '#fff',
  },
  scrollContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  formContainer: {
    width: '90%',
    maxWidth: 800,
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
  },
  form: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 10,
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
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  logoutButton: {
    backgroundColor: '#ff0000',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 20,
  },
  logoutButtonText: {
    color: '#fff',
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 40,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
  },
});

export default ProfileForm;
