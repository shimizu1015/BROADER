import AsyncStorage from '@react-native-async-storage/async-storage';

export const saveCurrentRoute = async (routeName: string) => {
  try {
    await AsyncStorage.setItem('currentRoute', routeName);
  } catch (error) {
    console.error("Error saving current route: ", error);
  }
};

export const getCurrentRoute = async () => {
  try {
    const routeName = await AsyncStorage.getItem('currentRoute');
    return routeName;
  } catch (error) {
    console.error("Error getting current route: ", error);
    return null;
  }
};
