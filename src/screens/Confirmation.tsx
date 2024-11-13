import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { saveCurrentRoute } from '../navigationHelper';

type ConfirmationProps = {
  navigation: StackNavigationProp<RootStackParamList, 'Confirmation'>;
};

// 確認画面のコンポーネント
export default function Confirmation() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  // 確認ボタンが押された際の処理
  const handleConfirm = () => {
    navigation.navigate('Top'); // Top画面に遷移する
  };

  return (
    <View style={styles.container}>
      {/* 確認画面のタイトル */}
      <Text style={styles.title}>Confirmation</Text>
      {/* 確認ボタン */}
      <Button title="Confirm" onPress={handleConfirm} />
    </View>
  );
}

// スタイルシート
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    marginBottom: 20,
  },
});
