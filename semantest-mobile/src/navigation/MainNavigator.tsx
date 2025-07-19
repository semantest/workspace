/*
                      @semantest/mobile-app

  Copyright (C) 2025-today  Semantest Team

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

/**
 * @fileoverview Main Navigator for authenticated users
 * @author Semantest Team
 * @module navigation/MainNavigator
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Navigators
import { TestsNavigator } from './TestsNavigator';
import { ProjectsNavigator } from './ProjectsNavigator';
import { ReportsNavigator } from './ReportsNavigator';
import { SettingsNavigator } from './SettingsNavigator';

// Screens
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { SyncScreen } from '../screens/sync/SyncScreen';

// Components
import { CustomDrawerContent } from '../components/navigation/CustomDrawerContent';
import { CustomTabBar } from '../components/navigation/CustomTabBar';

// Types
export type MainTabParamList = {
  Dashboard: undefined;
  Tests: undefined;
  Projects: undefined;
  Reports: undefined;
  Settings: undefined;
};

export type MainDrawerParamList = {
  Tabs: undefined;
  Profile: undefined;
  Notifications: undefined;
  Sync: undefined;
};

export type MainStackParamList = {
  DrawerTabs: undefined;
  TestDetails: { testId: string };
  ProjectDetails: { projectId: string };
  ReportDetails: { reportId: string };
  CreateTest: { projectId?: string };
  EditTest: { testId: string };
  RunTest: { testId: string };
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Drawer = createDrawerNavigator<MainDrawerParamList>();
const Stack = createNativeStackNavigator<MainStackParamList>();

/**
 * Bottom Tab Navigator
 */
const TabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Tests':
              iconName = focused ? 'flask' : 'flask-outline';
              break;
            case 'Projects':
              iconName = focused ? 'folder' : 'folder-outline';
              break;
            case 'Reports':
              iconName = focused ? 'bar-chart' : 'bar-chart-outline';
              break;
            case 'Settings':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
            default:
              iconName = 'circle';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          paddingTop: 5,
          paddingBottom: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      })}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Home'
        }}
      />
      
      <Tab.Screen 
        name="Tests" 
        component={TestsNavigator}
        options={{
          title: 'Tests',
          tabBarLabel: 'Tests'
        }}
      />
      
      <Tab.Screen 
        name="Projects" 
        component={ProjectsNavigator}
        options={{
          title: 'Projects',
          tabBarLabel: 'Projects'
        }}
      />
      
      <Tab.Screen 
        name="Reports" 
        component={ReportsNavigator}
        options={{
          title: 'Reports',
          tabBarLabel: 'Reports'
        }}
      />
      
      <Tab.Screen 
        name="Settings" 
        component={SettingsNavigator}
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings'
        }}
      />
    </Tab.Navigator>
  );
};

/**
 * Drawer Navigator
 */
const DrawerNavigator: React.FC = () => {
  const dimensions = useWindowDimensions();
  const isLargeScreen = dimensions.width >= 768;

  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerType: isLargeScreen ? 'permanent' : 'front',
        drawerStyle: {
          backgroundColor: '#f9fafb',
          width: isLargeScreen ? 280 : 280,
        },
        drawerActiveTintColor: '#2563eb',
        drawerInactiveTintColor: '#6b7280',
        drawerLabelStyle: {
          fontSize: 16,
          fontWeight: '500',
        },
        overlayColor: 'rgba(0, 0, 0, 0.5)',
      }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen 
        name="Tabs" 
        component={TabNavigator}
        options={{
          title: 'Dashboard',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      
      <Drawer.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          title: 'Profile',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      
      <Drawer.Screen 
        name="Notifications" 
        component={NotificationsScreen}
        options={{
          title: 'Notifications',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={size} color={color} />
          ),
        }}
      />
      
      <Drawer.Screen 
        name="Sync" 
        component={SyncScreen}
        options={{
          title: 'Sync',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="sync-outline" size={size} color={color} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
};

/**
 * Main Stack Navigator
 */
export const MainNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen 
        name="DrawerTabs" 
        component={DrawerNavigator}
        options={{ gestureEnabled: false }}
      />
      
      {/* Modal Screens */}
      <Stack.Group screenOptions={{ presentation: 'modal' }}>
        <Stack.Screen 
          name="TestDetails" 
          component={TestsNavigator}
          options={{
            headerShown: true,
            title: 'Test Details',
          }}
        />
        
        <Stack.Screen 
          name="ProjectDetails" 
          component={ProjectsNavigator}
          options={{
            headerShown: true,
            title: 'Project Details',
          }}
        />
        
        <Stack.Screen 
          name="ReportDetails" 
          component={ReportsNavigator}
          options={{
            headerShown: true,
            title: 'Report Details',
          }}
        />
      </Stack.Group>
      
      {/* Full Screen Modals */}
      <Stack.Group screenOptions={{ presentation: 'fullScreenModal' }}>
        <Stack.Screen 
          name="CreateTest" 
          component={TestsNavigator}
          options={{
            headerShown: true,
            title: 'Create Test',
          }}
        />
        
        <Stack.Screen 
          name="EditTest" 
          component={TestsNavigator}
          options={{
            headerShown: true,
            title: 'Edit Test',
          }}
        />
        
        <Stack.Screen 
          name="RunTest" 
          component={TestsNavigator}
          options={{
            headerShown: true,
            title: 'Run Test',
          }}
        />
      </Stack.Group>
    </Stack.Navigator>
  );
};

export default MainNavigator;