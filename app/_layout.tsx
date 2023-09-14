import { Stack } from 'expo-router';

const HomeLayout = () => {
    // template for the layout of navigation  -- renders elements 
    return (
        <Stack 
            screenOptions={{
                headerStyle: {
                    backgroundColor: '#fff',
                },
                headerTintColor: '#000',
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
            }}
        >
            <Stack.Screen name="index"
                options={{
                    title: 'Snow Buddies',
                }}
            />
        </Stack>
    )
}

export default HomeLayout;