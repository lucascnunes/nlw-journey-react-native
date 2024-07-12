import { useEffect, useState } from "react";
import { Alert, Keyboard, RefreshControl, SectionList, Text, View } from "react-native";
import { Calendar as CalendarIcon, Clock, PlusIcon, Tag } from "lucide-react-native";
import dayjs from "dayjs";

import { TripData } from "./[id]"
import { colors } from "@/styles/colors";
import { activitiesServer } from "@/server/activities-server";
import { Activity, ActivityProps } from "@/components/activity";

import { Button } from "@/components/button";
import { Modal } from "@/components/modal";
import { Input } from "@/components/input";
import { Calendar } from "@/components/calendar";
import { Loading } from "@/components/loading";
import { isLoading } from "expo-font";
type Props = {
  data: TripData
}

type TripActivities = {
  title: {
    dayNumber: number
    dayName: string
  }
  data: ActivityProps[]
}

enum MODAL {
  NONE = 0,
  CALENDAR = 1,
  NEW_ACTIVITY = 2,
}

export function Activities({ data }: Props) {
  const [isCreatingActivity, setIsCreatingActivity] = useState(false)
  const [isLoadingActivities, setIsLoadingActivities] = useState(true)

  const [showModal, setShowModal] = useState(MODAL.NONE)
  const [activityTitle, setActivityTitle] = useState('')
  const [activityDate, setActivityDate] = useState('')
  const [activityHour, setActivityHour] = useState('')
  const [tripActivities, setTripActivities] = useState<TripActivities[]>([])

  function resetNewActivityFields() {
    setActivityTitle('')
    setActivityDate('')
    setActivityHour('')
    setShowModal(MODAL.NONE)
  }

  async function handleCreateTripActivity() {
    try {
      if (!activityTitle || !activityDate || !activityHour) {
        return Alert.alert("Atividade", "Por favor, preencha todos os dados da atividade para seguir.")
      }

      setIsCreatingActivity(true)
      await activitiesServer.create({
        tripId: data.id,
        occurs_at: dayjs(activityDate).add(Number(activityHour), "h").toISOString(),
        title: activityTitle
      })

      Alert.alert("Nova Atividade", "Atividade criada com sucesso!")
      await getTripActivities()
      resetNewActivityFields()
    } catch (error) {
      console.log(error)
    }
  }

  async function getTripActivities() {
    try {
      const activities = await activitiesServer.getActivitiesByTripId(data.id)
      const activitiesToSectionList = activities.map(dayActivity => ({
        title: {
          dayNumber: dayjs(dayActivity.date).date(),
          dayName: dayjs(dayActivity.date).format("dddd").replace("-feira", ""),
        },
         data: dayActivity.activities.map(activity => ({
           id: activity.id,
           title: activity.title,
           hour: dayjs(activity.occurs_at).format("hh[:]mm[h]"),
           isBefore: dayjs(activity.occurs_at).isBefore(dayjs())
         }))
      }))

      setTripActivities(activitiesToSectionList)
    } catch (error) {
      console.log(error)
    } finally {
      setIsLoadingActivities(false)
    }
  }

  useEffect(() => {
    getTripActivities()
  }, [])

  return (
    <View className="flex-1">
      <View className="w-full flex-row mt-5 mb-6 items-center">
        <Text className="text-zinc-50 text-2xl font-semibold flex-1">
          Atividades
        </Text>

        <Button onPress={() => setShowModal(MODAL.NEW_ACTIVITY)}>
          <PlusIcon color={colors.lime[950]} />
          <Button.Title>Nova atividade</Button.Title>
        </Button>
      </View>
      {
        isLoadingActivities ? (
          <Loading />
        ) : (
          <SectionList
            sections={tripActivities}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <Activity key={item.id} data={item} />}
            refreshControl={<RefreshControl tintColor={colors.lime[300]} refreshing={isLoadingActivities} onRefresh={getTripActivities} />}
            renderSectionHeader={({ section: { title, data } }) => (
              <View className="w-full">  
                <Text className="text-zinc-50 text-2xl font-semibold py-2">
                  Dia {title.dayNumber + " "}
                  <Text className="text-zinc-500 text-base font-regular capitalize">
                    {title.dayName}
                  </Text>
                </Text>

                {
                  data.length === 0 && (
                    <Text className="text-zinc-500 text-sm mb-8 font-regular">
                      Nenhuma atividade cadastrada nessa data.
                    </Text>
                  )
                }
              </View>
            )}

            contentContainerClassName="gap-3 pb-48"
            showsVerticalScrollIndicator={false}
            />  
          )
        }

      <Modal 
        visible={showModal === MODAL.NEW_ACTIVITY}
        title="Cadastrar atividade" 
        subtitle="Todos os convidados podem visualizar as atividades"
        onClose={() => setShowModal(MODAL.NONE)}
      >
        <View className="mt-4 mb-3">
          <Input variant="secondary">
            <Tag color={colors.zinc[400]} size={20} />
            <Input.Field placeholder="Qual atividade?" onChangeText={setActivityTitle} value={activityTitle} />
          </Input>
          <View className="w-full mt-2 flex-row gap-2">
          <Input variant="secondary" className="flex-1">
              <CalendarIcon color={colors.zinc[400]} size={20} />
              <Input.Field placeholder="Data?" onFocus={() => Keyboard.dismiss()} value={activityDate ? dayjs(activityDate).format("DD [de] MMM") : ""} showSoftInputOnFocus={false} onPressIn={() => setShowModal(MODAL.CALENDAR)}/>
            </Input>
            <Input variant="secondary" className="flex-1">
              <Clock color={colors.zinc[400]} size={20} />
              <Input.Field placeholder="Horário?" keyboardType="numeric" maxLength={2} onChangeText={(text) => setActivityHour(text.replace(".", "").replace("-", ""))} />
            </Input>
          </View>
        </View>

        <Button 
          onPress={handleCreateTripActivity}
          isLoading={isCreatingActivity}
        >
          <Button.Title>Salvar atividade</Button.Title>
        </Button>
      </Modal>

      <Modal title="Selecionar data" subtitle='Selecione a data da atividade' visible={showModal === MODAL.CALENDAR}
      onClose={() => setShowModal(MODAL.NEW_ACTIVITY)}>
        <View className='gap-4 mt-4'>
          <Calendar 
          onDayPress={(day) => setActivityDate(day.dateString)} 
          markedDates={{ [activityDate]: { selected: true } }}
          initialDate={data.starts_at.toString()}
          minDate={data.starts_at.toString()}
          maxDate={data.ends_at.toString()}
           />
          <Button onPress={() => setShowModal(MODAL.NEW_ACTIVITY)}>
            <Button.Title>Confirmar</Button.Title>
          </Button>
        </View>
      </Modal>
    </View>
  )
}