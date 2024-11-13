import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import Icon from 'react-native-vector-icons/FontAwesome';

const NavigationBar: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.tab} onPress={() => navigation.navigate('Talk')}>
        <Icon name="comments" style={styles.icon} />
        <Text style={styles.tabText}>トーク</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.tab} onPress={() => navigation.navigate('Top')}>
        <Icon name="home" style={styles.icon} />
        <Text style={styles.tabText}>ホーム</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.tab} onPress={() => navigation.navigate('UserPage')}>
        <Icon name="user" style={styles.icon} />
        <Text style={styles.tabText}>マイページ</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    //@ts-ignore
    position: Platform.OS === 'web' ? 'fixed' : 'absolute', // Webの場合は固定位置にする
    bottom: 0,
    width: '100%',
    height: Platform.OS === 'web' ? 50 : 80, // Webの場合に高さを狭くする
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 5,
    backgroundColor: '#E5E7EB',
    zIndex: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
  },
  icon: {
    color: '#575757',
    fontSize: Platform.OS === 'web' ? 25 : Platform.OS === 'ios' ? 28 : 26, // Webの場合、iOS、Androidそれぞれ異なるアイコンサイズ
  },
  tabText: {
    color: '#000',
    fontSize: Platform.OS === 'web' ? 10 : Platform.OS === 'ios' ? 12 : 10, // Webの場合、iOS、Androidそれぞれ異なるテキストサイズ
  },
});

export default NavigationBar;
