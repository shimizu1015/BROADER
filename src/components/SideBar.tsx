import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Platform, useWindowDimensions, Image, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { useNavigation, NavigationProp, useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { RootStackParamList } from '../types';

interface SideBarProps {
  /**
   * スタイルを外部から適用できるようにするためのプロパティ。
   * 外部のコンポーネントから `style` を受け取り、`ViewStyle` 型であることを指定しています。
   * オプショナルプロパティなので、スタイルが指定されなくても問題なく動作します。
   */
  style?: ViewStyle;
  onNavigate?: () => void; 
}

const SideBar: React.FC<SideBarProps> = ({ style,onNavigate }) => {
  const { width: windowWidth } = useWindowDimensions(); // ウィンドウの幅を取得してレスポンシブデザインに対応
  const [hideText, setHideText] = React.useState(false); // 
  const navigation = useNavigation<NavigationProp<RootStackParamList>>(); // ナビゲーション用のフック
  const route = useRoute<RouteProp<RootStackParamList, keyof RootStackParamList>>(); // 現在のルートを取得

  // サイドバーの幅をテキストが表示されるかどうかで変更
  const sidebarWidth = hideText ? 60 : 250;

  // ウィンドウ幅が748px未満の場合にテキストを非表示にするロジック
  React.useEffect(() => {
    if (windowWidth < 748) {
      setHideText(true); // 小さい画面ではテキストを隠す
    } else {
      setHideText(false); // 大きい画面ではテキストを表示する
    }
  }, [windowWidth]); // ウィンドウ幅が変更されたときにのみ実行

  // 現在の画面に基づいてクラスを設定
  const isActive = (screenName: keyof RootStackParamList) => {
    return route.name === screenName;
  };

  return (
    <View style={[styles.container, { backgroundColor: '#42083A', width: sidebarWidth }, style]}>
      <View style={[styles.logoContainer, { marginBottom: hideText ? 30 : 50 }]}>
        {/* hideText の状態に応じてロゴを切り替える */}
        {hideText ? (
          <Image source={require('../../assets/logo2.png')} style={styles.logoSmall} />
        ) : (
          <Image source={require('../../assets/logo.png')} style={styles.logo} />
        )}
      </View>
      {/* メニュー項目の表示部分 */}
      <View style={[styles.menuContainer, { marginTop: hideText ? 20 : 50 }]}>
        {/* 各メニュー項目にナビゲーションを設定 */}
        <TouchableOpacity 
          style={[styles.iconButton, isActive('Top') && styles.activeButton]}
          onPress={() => {
            if (onNavigate) onNavigate(); // コールバックを呼び出す
            navigation.navigate('Top');
          }}
        >
          <Icon name="home" size={24} color="#FFFFFF" />
          {!hideText && <Text style={styles.iconText}>ホーム</Text>}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.iconButton, isActive('Social') && styles.activeButton]} 
          // @ts-ignore
          onPress={() => {
            if (onNavigate) onNavigate();
            // @ts-ignore
          navigation.navigate('Social')}
          }
        >
          <Icon name="users" size={24} color="#FFFFFF" />
          {!hideText && <Text style={styles.iconText}>ソーシャル</Text>}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.iconButton, isActive('ChatList') && styles.activeButton]} 
          onPress={() => {
            if (onNavigate) onNavigate();
             navigation.navigate('ChatList')}
            }
        >
          <Icon name="mail" size={24} color="#FFFFFF" />
          {!hideText && <Text style={styles.iconText}>メッセージ</Text>}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.iconButton, isActive('UserPage') && styles.activeButton]} 
          onPress={() => {
            if (onNavigate) onNavigate();
            navigation.navigate('UserPage')}
          }
        >
          <Icon name="user" size={24} color="#FFFFFF" />
          {!hideText && <Text style={styles.iconText}>プロフィール</Text>}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.iconButton, isActive('CreateArticleScreen') && styles.activeButton]} 
          onPress={() => {
            if (onNavigate) onNavigate();
            navigation.navigate('CreateArticleScreen')}
          }
        >
          <Icon name="plus" size={24} color="#FFFFFF" />
          {!hideText && <Text style={styles.iconText}>イベント作成</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute', 
    left: 0,
    top: 0,
    bottom: 0,
    borderRightWidth: 1,
    borderRightColor: '#000',
  } as ViewStyle,
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    marginTop: 20, 
    width: 233,
    height: 83,
    resizeMode: 'contain',
  } as ImageStyle,
  logoSmall: {
    marginTop: 20,
    width: 50,
    height: 50,
    resizeMode: 'contain',
  } as ImageStyle,
  menuContainer: {
    justifyContent: 'flex-start',
  } as ViewStyle,
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    justifyContent: 'flex-start',
    width: '100%',
    minHeight: 80,
  } as ViewStyle,
  activeButton: {
    backgroundColor: '#0056b3',
  } as ViewStyle,
  iconText: {
    marginLeft: 10,
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 24,
  } as TextStyle,
});

export default SideBar;
