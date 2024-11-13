import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const BlankScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>This is a blank page</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',  // 背景色を白に設定
    alignItems: 'center',        // 水平方向に中央寄せ
    justifyContent: 'center',     // 垂直方向に中央寄せ
  },
  text: {
    fontSize: 18,
    color: '#333',               // テキストの色を濃いグレーに設定
  },
});

export default BlankScreen;
