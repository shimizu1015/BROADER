import React, { useState, forwardRef, useImperativeHandle, useEffect } from 'react';
import { View, Image, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons'; // アイコンを表示するためのライブラリ
import { supabase } from '../supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ImageUploadPage = forwardRef((_, ref) => {
  const [profileImage, setProfileImage] = useState<string | null>(null); // プロフィール画像の状態
  const [loading, setLoading] = useState(false); // ローディング状態
  const [timestamp, setTimestamp] = useState(Date.now()); // キャッシュ回避のためのタイムスタンプ

  // ユーザーの元のアイコン画像を取得して設定するuseEffectフック
  useEffect(() => {
    const loadUserIcon = async () => {
      const userId = await AsyncStorage.getItem('supabase_user_id');
      if (userId) {
        const { data } = await supabase
          .from('users')
          .select('icon')
          .eq('id', userId)
          .single();
        if (data?.icon) {
          // 画像にタイムスタンプを付与してキャッシュを回避
          setProfileImage(`${data.icon}?timestamp=${timestamp}`);
        } else {
          setProfileImage(null); // デフォルト値に戻す
        }
      }
    };

    loadUserIcon();
  }, [timestamp]); // タイムスタンプが更新されるたびに画像を再取得

  // ファイル選択処理
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        resizeImage(reader.result as string, file.type);
      };
      reader.readAsDataURL(file);
      event.target.value = ''; // 選択後にinputの値をリセットして再度選択できるようにする
    }
  };

  // 画像をリサイズする関数
  const resizeImage = (imageDataUrl: string, mimeType: string) => {
    const image = new window.Image();
    image.src = imageDataUrl;
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const maxWidth = 400; // 最大幅
      const maxHeight = 400; // 最大高さ
      let width = image.width;
      let height = image.height;

      // アスペクト比を維持してリサイズ
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      // canvasにリサイズした画像を描画
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(image, 0, 0, width, height);

      const resizedImageDataUrl = canvas.toDataURL(mimeType); // リサイズ後の画像データURLを生成
      setProfileImage(resizedImageDataUrl); // プロフィール画像の状態を更新
    };
  };

  // 親から呼び出せるようにする
  useImperativeHandle(ref, () => ({
    async saveImage() {
      if (!profileImage) {
        Alert.alert('エラー', '画像を選択してください');
        return;
      }

      setLoading(true); // ローディング状態をtrueに設定
      console.log("画像の保存処理を開始");

      try {
        const userId = await AsyncStorage.getItem('supabase_user_id');
        const fileExtension = profileImage.split(';')[0].split('/')[1]; // 画像の拡張子を取得
        const fileName = `${userId}`; // ファイル名をユーザーIDに設定

        // 既存のファイルを削除する処理
        const { data: existingFiles, error: listError } = await supabase.storage
          .from('profilse')
          .list('icon', {
            search: fileName,
          });

        if (listError) {
          console.error('ファイルリストの取得に失敗しました:', listError.message);
          throw new Error(listError.message);
        }

        if (existingFiles.length > 0) {
          const filesToDelete = existingFiles.map(file => `icon/${file.name}`);
          await supabase.storage.from('profilse').remove(filesToDelete); // 既存のファイルを削除
          console.log('既存ファイルを削除しました:', filesToDelete);
        }

        const base64Response = await fetch(profileImage); // Base64画像をBlobに変換
        const blob = await base64Response.blob();
        console.log("Blob オブジェクト: ", blob);

        // Supabase Storageに画像をアップロード
        const { error: uploadError } = await supabase.storage
          .from('profilse')
          .upload(`icon/${fileName}.${fileExtension}`, blob, {
            contentType: `image/${fileExtension}`,
            upsert: true, // ファイルを上書き可能にする
          });

        if (uploadError) {
          console.error("アップロードエラー: ", uploadError.message);
          throw new Error(uploadError.message);
        }

        // アップロードした画像のPublic URLを取得
        const { data } = supabase
          .storage
          .from('profilse')
          .getPublicUrl(`icon/${fileName}.${fileExtension}`);

        if (!data) {
          throw new Error('Public URLの取得に失敗しました');
        }

        const publicURL = data.publicUrl; // Public URLを取得

        // usersテーブルに画像のURLを保存
        const { error: updateError } = await supabase
          .from('users')
          .update({ icon: publicURL }) // アイコンのURLを更新
          .eq('id', userId);

        if (updateError) {
          throw new Error(updateError.message);
        }

        console.log("画像のアップロードと保存が成功しました");
        Alert.alert('成功', '画像がアップロードされ、プロフィールに反映されました');

        // タイムスタンプを更新してキャッシュを回避
        setTimestamp(Date.now());
      } catch (error) {
        console.error("エラー: ", error);
        Alert.alert('エラー', `画像アップロードに失敗しました: ${(error as Error).message}`);
      } finally {
        setLoading(false); // ローディング状態をfalseに戻す
        console.log("画像保存処理が完了しました");
      }
    }
  }));

  return (
    <View style={styles.container}>
      {/* ファイル選択ボタンと画像を重ねて表示 */}
      <div style={{ position: 'relative' }}>
        {/* アイコンが設定されていない場合デフォルトの画像を表示 */}
        <Image
          source={profileImage ? { uri: profileImage } : require('../../assets/user_default_icon.png')} // ローカル画像をデフォルトとして使用
          style={styles.image}
        />
        {/* アイコンの右下に写真アイコンを表示 */}
        <FontAwesome
          name="image"  // アイコンを "image" に変更
          size={24}
          color="gray"
          style={styles.cameraIcon}
        />
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange} // 画像を選択した際にhandleFileChangeが呼び出される
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0, // inputを透明にして背景の画像が見えるようにする
            cursor: 'pointer', // カーソルをポインタに変更
          }}
        />
      </div>

      {loading && <ActivityIndicator size="large" />} {/* ローディング中の場合、インジケーターを表示 */}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
  },
  cameraIcon: {
    position: 'absolute',
    right: 5,   // アイコンを右下に配置
    bottom: 5,  // アイコンを右下に配置
    backgroundColor: '#fff',
    borderRadius: 50,
    padding: 4,
  },
});

export default ImageUploadPage;
