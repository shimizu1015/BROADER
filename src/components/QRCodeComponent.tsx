import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Clipboard, Dimensions } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useNavigation } from '@react-navigation/native';
import Modal from 'react-native-modal';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';

const screenHeight = Dimensions.get('window').height;

type QRCodeScreenProps = {
  route: {
    params: {
      userId: string;
    };
  };
};

const QRCodeComponent: React.FC<QRCodeScreenProps> = ({ route }) => {
  const { userId } = route.params;
  const userPageUrl = `https://example.com/UserPage/${userId}`; // 実際のユーザーページURLに変更してください
  const navigation = useNavigation();
  const [isModalVisible, setModalVisible] = useState(true);

  // モーダルを閉じて戻る
  const closeModal = () => {
    setModalVisible(false);
    setTimeout(() => {
      navigation.goBack();
    }, 300);  
  };

  // URLをクリップボードにコピーする関数
  const copyToClipboard = () => {
    Clipboard.setString(userPageUrl);
    showToast(); // コピー完了時にToastを表示
  };

  // Toastメッセージの表示
  const showToast = () => {
    Toast.show({
      type: 'success',
      text1: 'URLをコピーしました',
      position: 'bottom',
    });
  };

  return (
    <Modal
      isVisible={isModalVisible}
      onBackdropPress={closeModal}
      onSwipeComplete={closeModal}
      swipeDirection="down"
      style={styles.modal}
      backdropOpacity={0.5}
      animationIn="slideInUp"
      animationOut="slideOutDown"
    >
      <View style={styles.halfModalContainer}>
        {/* 右上のバツボタン */}
        <TouchableOpacity style={styles.closeIcon} onPress={closeModal}>
          <MaterialCommunityIcons name="close" size={30} color="#000" />
        </TouchableOpacity>

        <QRCode
          value={userPageUrl}
          size={200}
          logo={require('../../assets/logo2_qr.png')}
          logoSize={40}
          logoBackgroundColor="transparent"
        />

        {/* 記号と文字の「URLをコピー」ボタン */}
        <TouchableOpacity style={styles.copyButton} onPress={copyToClipboard}>
          <MaterialCommunityIcons name="content-copy" size={20} color="#000" style={styles.icon} />
          <Text style={styles.copyButtonText}>URLをコピー</Text>
        </TouchableOpacity>
        <Toast />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  halfModalContainer: {
    height: screenHeight * 0.5,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
  copyButton: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D3D3D3',
  },
  copyButtonText: {
    color: '#000000',
    fontSize: 16,
    marginLeft: 5,
  },
  icon: {
    marginRight: 5,
  },
});

export default QRCodeComponent;
