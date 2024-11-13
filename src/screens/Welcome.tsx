import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Modal, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import Signin from './Signin';
import CreateAccount from './CreateAccount';
import TermsOfServiceModal from './TermsOfServiceModal';

const Welcome: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList, 'CreateAccount'>>();
  const [isModalVisible, setModalVisible] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);  // ログインフォームの表示状態を管理
  const [showCreateAccountForm, setShowCreateAccountForm] = useState(false); // アカウント作成フォームの表示状態を管理

  // モーダル表示・非表示の切り替え関数
  const toggleModal = () => {
    setModalVisible(!isModalVisible);
  };

  // ログインボタンが押された時の処理
  const handleLoginPress = () => {
    if (Platform.OS === 'web') {
      setShowLoginForm(true);// Web版ではログインフォームを表示
    } else {
      navigation.navigate('Signin');// Web版ではログインフォームを表示
    }
  };
  
  // アカウント作成ボタンが押された時の処理
  const handleCreateAccountPress = () => {
    if (Platform.OS === 'web') {
      setShowCreateAccountForm(true);// Web版ではアカウント作成フォームを表示
    } else {
      navigation.navigate('CreateAccount');// Web版ではアカウント作成フォームを表示
    }
  };

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? (
        // ウェブ版のレイアウト
        <>
          <LinearGradient
            colors={['#ff00a1', '#040045']}
            style={styles.leftHalf}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/logo.png')}
                //@ts-ignore
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          </LinearGradient>
          <View style={styles.rightHalf}>
            {showLoginForm ? (
              <Signin />
            ) : showCreateAccountForm ? (
              <CreateAccount navigation={navigation} /> 
            ) : (
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={[styles.button, styles.loginButton]} onPress={handleLoginPress}>
                  <Text style={styles.loginButtonText}>ログイン</Text> 
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.createAccountButton]} onPress={handleCreateAccountPress}>
                  <Text style={styles.createAccountButtonText}>アカウント作成</Text> 
                </TouchableOpacity>
                <TouchableOpacity onPress={toggleModal}>
                  <Text style={styles.link}>利用規約</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </>
      ) : (
        // スマホ版のレイアウト
        <LinearGradient
          colors={['#ff00a1', '#040045']}
          style={styles.mobileContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Image source={require('../../assets/logo.png')} 
          //@ts-ignore
          style={styles.mobileLogo} 
          />

          <Text style={styles.title}>ようこそ</Text>
          <View style={styles.bottomContainer}>
            <TouchableOpacity style={[styles.button, styles.loginButton]} onPress={handleLoginPress}>
              <Text style={styles.buttonText}>ログイン</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.createAccountButton]} onPress={handleCreateAccountPress}>
              <Text style={styles.buttonText}>アカウント作成</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleModal}>
              <Text style={styles.link}>利用規約</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      )}

      {/* モーダル共通 */}
      <Modal
        transparent={true}
        visible={isModalVisible}
        onRequestClose={toggleModal}
      >
        <TermsOfServiceModal visible={isModalVisible} onClose={toggleModal} />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
    //@ts-ignore
    minHeight: '100vh', // ウェブ版で画面全体をカバーするために minHeight を使用
  },
  leftHalf: {
    flex: Platform.OS === 'web' ? 7 : 1, // ウェブの場合70%、他のプラットフォームでは50%
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  rightHalf: {
    flex: Platform.OS === 'web' ? 3 : 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    //@ts-ignore
    width: Platform.OS === 'web' ? '40vw' : '80%',  // ウェブ時にビューポート幅の40%を使用
    height: Platform.OS === 'web' ? 'auto' : undefined,  // ウェブ版で高さを自動調整
    aspectRatio: 597 / 89,  // アスペクト比を保持
  },
  buttonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginBottom: 16,
    width: 200,
    alignItems: 'center',
  },
  loginButton: {
    backgroundColor: Platform.OS === 'web' ? '#800080' : 'rgba(0, 0, 0, 0.6)',
  },
  createAccountButton: {
    backgroundColor: Platform.OS === 'web' ? '#fff' : 'rgba(255, 255, 255, 0.6)',
    borderWidth: Platform.OS === 'web' ? 2 : 0,
    borderColor: Platform.OS === 'web' ? '#800080' : 'transparent',
  },
  buttonText: {
    color: Platform.OS === 'web' ? '#fff' : '#fff',
    fontSize: 18,
    textAlign: 'center',
  },
  loginButtonText: {
    color: Platform.OS === 'web' ? '#fff' : '#fff', // ログインボタンの文字色（Webは白）
  },
  createAccountButtonText: {
    color: Platform.OS === 'web' ? '#800080' : '#fff', // アカウント作成ボタンの文字色（Webは紫）
  },
  link: {
    color:Platform.OS === 'web'?'#000':'#fff',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  mobileContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  mobileLogo: {
    width: '100%',
    height: undefined,
    aspectRatio: 597 / 89,
    marginBottom: 80,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    maxHeight: '80%',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalText: {
    fontSize: 16,
    marginBottom: 16,
  },
  closeButton: {
    backgroundColor: '#DDDDDD',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#333333',
  },
});

export default Welcome;
