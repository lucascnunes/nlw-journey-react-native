import { Text, View } from "react-native";
import { TripData } from "./[id]"
type Props = {
  data: TripData
}
export function Activities({ data }: Props) {
  return <View className="flex-1">
      <Text className="text-zinc-100">Activities</Text>
  </View>
}