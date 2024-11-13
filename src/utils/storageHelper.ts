import AsyncStorage from '@react-native-async-storage/async-storage';

// AsyncStorageにデータを保存する関数
export const saveToStorage = async (key: string, value: string) => {
  await AsyncStorage.setItem(key, value);
};

// AsyncStorageからデータを取得する関数
export const getFromStorage = async (key: string): Promise<string | null> => {
  return await AsyncStorage.getItem(key);
};
