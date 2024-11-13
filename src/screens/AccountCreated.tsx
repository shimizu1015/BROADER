import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../types';
import { saveCurrentRoute } from '../navigationHelper';

type AccountCreatedProps = {
  navigation: StackNavigationProp<RootStackParamList, 'AccountCreated'>;
};

// アカウント作成完了画面のコンポーネント
export default function AccountCreated({ navigation }: AccountCreatedProps) {
  return (
    <LinearGradient
        colors={['#040045', '#ff00a1']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
    <View style={styles.container}>
      {/* アカウント作成完了のメッセージ */}
      <Text style={styles.thankYou}>登録ありがとうございます。</Text>
      <Text style={styles.message}>ご入力いただいたメールアドレスに、
        {'\n'}確認メールを送信いたしました。
        
        {'\n\n'}メールに記載のURLへアクセス後
        {'\n'}ご登録完了となります。
        </Text>
    <TouchableOpacity style={styles.ButtonContainer} onPress={() => navigation.navigate('Welcome')}>
      <Text style={styles.ButtonText}>トップページへ</Text>
    </TouchableOpacity>
    </View>
    </LinearGradient>
  );
}

// スタイルシート
const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },

  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  thankYou: {
    fontSize: 30, 
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: 'white', 
  },
  message: {
    fontSize: 18,
    marginBottom: 24,
    textAlign: 'center',
    color: 'white',
  },

  ButtonContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 16,
  },
  
  ButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});
