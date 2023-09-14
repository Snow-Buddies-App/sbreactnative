import { Tabs } from 'expo-router';
import { Text } from 'react-native';

const AppLayout = () => {
    return (
        <Tabs>
            <Tabs.Screen
                name="home"
                options={{
                    title: "Home",
                    tabBarIcon: () => <Text>HOME</Text>,
                }}
            />
            <Tabs.Screen
                name="login"
                options={{
                    title: "Login",
                    tabBarIcon: () => <Text>LOGIN</Text>,
                }}
            />
        </Tabs>
    )
}

export default AppLayout;