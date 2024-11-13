import React, { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Feather from 'react-native-vector-icons/Feather';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import FontAwesome6 from 'react-native-vector-icons/FontAwesome6';
import TopScreen from '../screens/Top';
import UserPage from './UserPage';
import ChatList from './ChatList';
import EventList from './EventList';
import alert from './alert';
import Social from './Social';
import { View, StyleSheet, TouchableOpacity } from 'react-native';

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const [isOwnProfile, setIsOwnProfile] = useState(true);

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        headerTitle: '',
        tabBarIcon: ({ focused }) => {
          let iconName = '';
          let IconComponent = Feather;
          let iconSize = focused ? 28 : 20;

          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'ChatList') {
            iconName = 'message-circle';
          } else if (route.name === 'UserPage') {
            iconName = 'user';
            iconSize = focused && isOwnProfile ? 28 : 20; // 自分以外のユーザーが表示されている場合、サイズを28にしない
          } else if (route.name === 'EventList') {
            iconName = 'event-note';
            IconComponent = MaterialIcons;
          } else if (route.name === 'Social') {
            iconName = 'users';
            IconComponent = FontAwesome6;
          }

          return (
            <View style={styles.iconContainer}>
              <IconComponent name={iconName} size={iconSize} color={focused ? '#800080' : '#8e8e8f'} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="ChatList" component={ChatList} />
      <Tab.Screen name="EventList" component={EventList} />
      <Tab.Screen
        name="Home"
        component={TopScreen}
        options={({ navigation }) => ({
          tabBarIcon: ({ focused }) => (
            <Feather name="home" size={focused ? 28 : 20} color={focused ? '#800080' : '#8e8e8f'} />
          ),
          headerShown: true,
          headerTitle: '',
          headerRight: () => (
            <TouchableOpacity
              style={{ marginRight: 16 }}
              onPress={() => navigation.navigate('alert')}
            >
              <FontAwesome name="bell" size={24} color="#000" />
            </TouchableOpacity>
          ),
        })}
      />
      <Tab.Screen name="Social" component={Social} />
      <Tab.Screen
        name="UserPage"
        component={UserPage}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            if (isOwnProfile) {
              // 通常の動作
              navigation.navigate('UserPage');
            } else {
              // 他のユーザーのプロフィールを表示中なら自分のプロフィールに戻る
              setIsOwnProfile(true);
              navigation.navigate('UserPage', { userId: '自分のユーザーID' });
            }
          },
        })}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    borderTopWidth: 0.5,
    borderTopColor: '#d1d1d1',
    height: 70,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
  },
});

export default TabNavigator;
