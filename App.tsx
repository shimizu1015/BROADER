import { useState, useEffect, useRef } from 'react';
import { Text,  Button, Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, StyleSheet, StatusBar} from 'react-native';
import { HeaderBackButton } from '@react-navigation/elements';
import * as Notifications from 'expo-notifications';
import * as Permissions from 'expo-permissions';
import * as SplashScreen from 'expo-splash-screen';
import Welcome from './src/screens/Welcome';
import TermsOfServiceModal from './src/screens/TermsOfServiceModal';
import ProfileSetup from './src/screens/ProfileSetup';
import Signin from './src/screens/Signin';
import Top from './src/screens/Top';
import ChatList from './src/components/ChatList';
import EventList from './src/components/EventList';
import alert from './src/components/alert';
import ChatRoom from './src/components/ChatRoom';
import Social from './src/components/Social';
import QRCodeComponent from './src/components/QRCodeComponent';
import SearchUser from './src/components/SearchUser';
import UserPage from './src/components/UserPage';
import ProfileEdit from './src/screens/ProfileEdit';
import ImageUploadPage from './src/components/ImageUploadPage';
import CreateAccount from './src/screens/CreateAccount';
import CreateArticleScreen from './src/screens/CreateArticleScreen';
import AccountCreated from './src/screens/AccountCreated';
import Confirmation from './src/screens/Confirmation';
import SetHobbies from './src/components/SetHobbies';
import Calendar from './src/components/Calendar';
import ArticleDetail from './src/components/ArticleDetail';
import TabNavigator from './src/components/TabNavigator';
import { RootStackParamList } from './src/types';
import { getToken } from './src/utils/tokenUtils';
import {  registerForPushNotificationsAsync as registerForPushNotifications  } from './src/utils/getExpoPushToken';
import { supabase } from './src/supabaseClient';
import 'react-native-gesture-handler';

const Stack = createStackNavigator<RootStackParamList>();

const defaultScreenOptions = {
  headerStyle: {
    backgroundColor: 'white',
  },
  headerTintColor: '#000',
  headerTitle: '',
  headerBackTitleVisible: false,
  gestureEnabled: false,
};


//通知の動作を制御するハンドラー
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});


//プッシュ通知送信の関数　トークン引数に （デバック用　後で消す）
async function sendPushNotification(expoPushToken: string) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title: 'BROADER',
    body: 'ようこそ！！',
    data: { someData: 'goes here' },
  };
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
}



export default function App() {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState<Notifications.Notification | undefined>(
    undefined
  );
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

     SplashScreen.preventAutoHideAsync(); // スプラッシュスクリーンの非表示を遅らせる


         //関数を呼び出し、Expoのプッシュ通知トークンを取得
         registerForPushNotifications()
           .then(token => setExpoPushToken(token ?? ''))
           .catch((error: any) => setExpoPushToken(`${error}`));

      

    //ここはこの部分は、プッシュ通知がデバイスに届いたときに呼び出されるリスナー（通知イベントリスナー）を設定しています。

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    //デバック用　この部分は、ユーザーが通知に対して何らかの操作（クリックやタップなど）を行ったときに呼び出されるリスナーを設定しています。
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log(response);
    });

    //useEffectフックがクリーンアップフェーズに入ったとき（例：コンポーネントがアンマウントされるとき）、登録されたリスナーを削除するための処理がここに書かれています。
    // return () => {
    //   notificationListener.current &&
    //     Notifications.removeNotificationSubscription(notificationListener.current);
    //   responseListener.current &&
    //     Notifications.removeNotificationSubscription(responseListener.current);
    // };

    const checkLoginStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('auth_token');
        const userId = await AsyncStorage.getItem('supabase_user_id');
        


        if (token && userId) {
          //console.log('Token and User ID found:', token, userId);
          setInitialRoute('Top');
        } else {
          //console.warn('No token or user ID found');
          setInitialRoute('Welcome');
        }
      } catch (error) {
       // console.error('Error checking login status:', error);
        setInitialRoute('Welcome'); // エラーが発生した場合はWelcome画面に遷移
      } finally {
        setLoading(false);
        await SplashScreen.hideAsync(); // スプラッシュスクリーンを非表示
      }
    };


    checkLoginStatus();




    
  }, []);

  if (loading) {
    return (
      <View >
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }



  return (
    <>
     <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <NavigationContainer>
        <Stack.Navigator initialRouteName={initialRoute || 'Welcome'} screenOptions={defaultScreenOptions}>
        <Stack.Screen 
            name="TermsOfServiceModal" 
            // @ts-ignore
            component={TermsOfServiceModal} 
            options={{
              presentation: 'modal',
            }}
          />
          <Stack.Screen name="Welcome" component={Welcome} options={{ headerShown: false }} />
          <Stack.Screen 
            name="Signin" 
            component={Signin}
            initialParams={{ expoPushToken: expoPushToken ?? '' }}
            options={({ navigation }) => ({
              headerLeft: () => (
                <HeaderBackButton onPress={() => navigation.navigate('Welcome')} labelVisible={false} />
              ),
            })}
          />
          <Stack.Screen name="CreateAccount" component={CreateAccount} />
          <Stack.Screen name="ImageUploadPage" component={ImageUploadPage} />
          <Stack.Screen name="AccountCreated" component={AccountCreated} />
          <Stack.Screen name="Top" component={Platform.OS === 'web' ? Top : TabNavigator} options={{ headerShown: false }}/>
          <Stack.Screen name="ChatList" component={ChatList} options={{ headerShown: false }} />
          <Stack.Screen name="ChatRoom" component={ChatRoom}/>
          <Stack.Screen name="Social" component={Social} options={{ headerShown: false }}/>
          <Stack.Screen name="EventList" component={EventList} options={{ headerShown: false }} />
          <Stack.Screen name="alert" component={alert} options={{ headerShown: false }} />
          <Stack.Screen 
            name="QRCodeComponent" 
            // @ts-ignore
            component={QRCodeComponent} 
            options={{
              presentation: 'transparentModal',
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="SearchUser" 
            // @ts-ignore
            component={SearchUser} 
            options={{
              presentation: 'modal',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="UserPage"
            component={UserPage}
            options={{
              headerShown: Platform.OS !== 'web',
            }}
          />
          <Stack.Screen name="CreateArticleScreen" component={CreateArticleScreen} options={({ navigation }) => ({
              headerLeft: () => (
                <HeaderBackButton onPress={() => navigation.navigate('Top')} labelVisible={false} />
              ),
            })}/>
          <Stack.Screen name="ProfileSetup" component={ProfileSetup} options={{ headerLeft: () => null }} />
          <Stack.Screen 
            name="ProfileEdit" 
            // @ts-ignore
            component={ProfileEdit} 
            options={{
              presentation: 'modal',
            }}
          />
         <Stack.Screen 
            name="ArticleDetail" 
            component={ArticleDetail} 
            options={({ navigation }) => ({
              headerShown: Platform.OS !== 'web',
              headerLeft: Platform.OS !== 'web' ? () => (
                <HeaderBackButton onPress={() => navigation.goBack()} labelVisible={false} />
              ) : undefined,
              headerBackTitleVisible: false,
            })}
          />
          <Stack.Screen name="SetHobbies" component={SetHobbies} options={({ navigation }) => ({
              headerLeft: () => (
                <HeaderBackButton onPress={() => navigation.navigate('ProfileEdit')} labelVisible={false} />
              ),
            })} />
        </Stack.Navigator>
      </NavigationContainer>

     {/* ↓これはデバック用　後ほど消す */}
      {/* <Button
        title="Press to Send Notification"
        onPress={async () => {
          await sendPushNotification(expoPushToken);
        }}
      /> */}
      {/* ↑これはデバック用　後ほど消す */}
    </>
  );
}
