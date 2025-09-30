import * as React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import Login from '../screens/Login';
import Dashboard from '../screens/Dashboard';
import Sales from '../screens/Sales';
import Inventory from '../screens/Inventory';
import Reports from '../screens/Reports';
import Outlets from '../screens/Outlets';
import OutletDetail from '../screens/OutletDetail';
import StockTransfer from '../screens/StockTransfer';
import Support from '../screens/Support';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Reports: undefined;
  Outlets: undefined;
  OutletDetail: { id: string; name: string } | undefined;
  StockTransfer: undefined;
  Support: undefined;
};

type MainTabsParamList = {
  Dashboard: undefined;
  Sales: undefined;
  Inventory: undefined;
  Reports?: undefined;
  Outlets?: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabsParamList>();

function MainTabs({ route }: { route: any }) {
  const role: 'master' | 'admin' | 'distributor' | undefined = route?.params?.role;
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6366f1',
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={Dashboard}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Sales"
        component={Sales}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cash-register" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Inventory"
        component={Inventory}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="warehouse" color={color} size={size} />
          ),
        }}
      />
      {role === 'master' && (
        <Tab.Screen
          name="Reports"
          component={Reports}
          options={{
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="file-chart-outline" color={color} size={size} />
            ),
          }}
        />
      )}
      {role === 'master' && (
        <Tab.Screen
          name="Outlets"
          component={Outlets}
          options={{
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="store-outline" color={color} size={size} />
            ),
          }}
        />
      )}
    </Tab.Navigator>
  );
}

function AuthStack() {
  const AuthNavigator = createNativeStackNavigator();
  return (
    <AuthNavigator.Navigator screenOptions={{ headerShown: false }}>
      <AuthNavigator.Screen name="Login" component={Login} />
    </AuthNavigator.Navigator>
  );
}

export default function RootNavigator() {
  const [token] = React.useState<string | null>(null);

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={token ? 'Main' : 'Auth'}
    >
      <Stack.Screen name="Auth" component={AuthStack} />
      <Stack.Screen name="Main" component={MainTabs} />
      {/* Additional feature screens */}
      <Stack.Screen name="Reports" component={Reports} />
      <Stack.Screen name="Outlets" component={Outlets} />
      <Stack.Screen name="OutletDetail" component={OutletDetail} />
      <Stack.Screen name="StockTransfer" component={StockTransfer} />
      <Stack.Screen name="Support" component={Support} />
    </Stack.Navigator>
  );
}
