import { Redirect } from "expo-router";
import "expo-router/entry";

const Index = () => {
  return <Redirect href="/home" />;
};
export default Index;