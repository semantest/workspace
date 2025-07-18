import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '../contexts/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Import screens
import { DashboardScreen } from '../screens/Dashboard/DashboardScreen';
import { TestsNavigator } from './TestsNavigator';
import { ProjectsNavigator } from './ProjectsNavigator';
import { ResultsScreen } from '../screens/Results/ResultsScreen';
import { ProfileScreen } from '../screens/Profile/ProfileScreen';

export type MainTabParamList = {
  Dashboard: undefined;
  Tests: undefined;
  Projects: undefined;
  Results: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

function MainNavigator() {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          paddingBottom: 5,
          height: 60,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: theme.colors.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="view-dashboard" size={size} color={color} />
          ),
          headerTitle: 'Dashboard',
        }}
      />
      <Tab.Screen
        name="Tests"
        component={TestsNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="test-tube" size={size} color={color} />
          ),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Projects"
        component={ProjectsNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="folder-multiple" size={size} color={color} />
          ),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Results"
        component={ResultsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="chart-line" size={size} color={color} />
          ),
          headerTitle: 'Results',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="account" size={size} color={color} />
          ),
          headerTitle: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}

export default MainNavigator;