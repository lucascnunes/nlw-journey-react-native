import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Keyboard, Text, TouchableOpacity, View } from "react-native";
import { Calendar as CalendarIcon, CalendarRange, Info, MapPin, Settings2 } from "lucide-react-native";
import dayjs from "dayjs";
import { DateData } from "react-native-calendars";

import { TripDetails, tripServer } from "@/server/trip-server";
import { colors } from "@/styles/colors";
import { calendarUtils, DatesSelected } from "@/utils/calendarUtils";

import { Input } from "@/components/input";
import { Loading } from "@/components/loading";
import { Button } from "@/components/button";
import { Modal } from "@/components/modal";
import { Calendar } from "@/components/calendar";

import { Details } from "./details";
import { Activities } from "./activities";

export type TripData = TripDetails & { where: string }

enum MODAL {
  NONE = 0,
  UPDATE_TRIP = 1,
  CALENDAR = 2
}

export default function Trip() {
  const [isLoadingTrip, setIsLoadingTrip] = useState(true)
  const [isUpdatingTrip, setIsUpdatingTrip] = useState(false)
  const [tripDetails, setTripDetails] = useState({} as TripData)
  const [option, setOption] = useState<"activity" | "details">("activity")
  const [showModal, setShowModal] = useState(MODAL.NONE)

  // Update Trip Details
  const [destination, setDestination] = useState('')
  const [selectedDates, setSelectedDates] = useState({} as DatesSelected)

  const tripId = useLocalSearchParams<{ id: string }>().id

  async function getTripDetails() {
    try {
      setIsLoadingTrip(true)
      if (!tripId) return router.back()

      const { trip } = await tripServer.getById(tripId)
      const maxLengthDestinationChar = 14
      const destination = trip.destination.length > maxLengthDestinationChar ? trip.destination.slice(0, maxLengthDestinationChar) + '...' : trip.destination
      const starts_at = dayjs(trip.starts_at).format("DD")
      const ends_at = dayjs(trip.ends_at).format("DD")
      const month = dayjs(trip.starts_at).format("MMM")
      setDestination(trip.destination)

      setTripDetails({
        ...trip,
        where: `${destination} de ${starts_at} a ${ends_at} de ${month}`,
      })
    } catch (error) {
      console.log(error)
    } finally {
      setIsLoadingTrip(false)
    }
  }

  function handleSelectDate(selectedDay: DateData) {
    const dates = calendarUtils.orderStartsAtAndEndsAt({
      startsAt: selectedDates.startsAt,
      endsAt: undefined,
      selectedDay
    })
    setSelectedDates(dates)
  }

  async function handleUpdateTrip() {
    try {
      if (!tripId) return

      if (!destination || !selectedDates.startsAt || !selectedDates.endsAt) {
        return Alert.alert("Detalhes da viagem", "Por favor, preencha todos os dados da viagem para seguir.")
      }
      setIsUpdatingTrip(true)
      await tripServer.update({
        id: tripId,
        destination,
        starts_at: dayjs(selectedDates.startsAt?.dateString).toString(),
        ends_at: dayjs(selectedDates.endsAt?.dateString).toString()
      })

      Alert.alert("Viagem atualizada", "Viagem atualizada com sucesso!", [
        {
          text: "Ok",
          onPress: () => { 
            getTripDetails()
            setShowModal(MODAL.NONE)
          }
        }
      ])
    } catch (error) {
      console.log(error)
    } finally {
      setIsUpdatingTrip(false)
    }
  }

  useEffect(() => {
    getTripDetails()
  }, [])

  if (isLoadingTrip) {
    return <Loading />
  }

  return <View className="flex-1 px-5 pt-16">
    <Input variant="tertiary">
      <MapPin color={colors.zinc[400]} size={20} />
      <Input.Field value={tripDetails.where} readOnly />

      <TouchableOpacity activeOpacity={0.7} className="w-9 h-9 bg-zinc-800 items-center justify-center rounded" onPress={() => setShowModal(MODAL.UPDATE_TRIP)}>
        <Settings2 color={colors.zinc[400]} size={20} />
      </TouchableOpacity>
    </Input>

    {option === "activity" ? <Activities data={tripDetails} /> : <Details tripId={tripDetails.id} />}

    <View className="w-full absolute -bottom-1 self-center justify-end pb-5 z-10 bg-zinc-950">
      <View className="w-full flex-row bg-zinc-900 p-4 rounded-lg border border-zinc-800 gap-2">
        <Button className="flex-1" onPress={() => setOption("activity")} variant={option === "activity" ? "primary" : "secondary"}>
          <CalendarRange color={option === "activity" ? colors.lime[950] : colors.zinc[200]} size={20} />
          <Button.Title>Atividades</Button.Title>
        </Button>
        <Button className="flex-1" onPress={() => setOption("details")} variant={option === "details" ? "primary" : "secondary"}>
          <Info color={option === "details" ? colors.lime[950] : colors.zinc[200]} size={20} />
          <Button.Title>Detalhes</Button.Title>
        </Button>
      </View>
    </View>

    <Modal title="Editar viagem" subtitle="Somente quem criou a viagem pode editar" visible={showModal === MODAL.UPDATE_TRIP} onClose={() => setShowModal(MODAL.NONE)}>
      <View className="gap-2 my-4">
        <Input variant="secondary">
          <MapPin color={colors.zinc[400]} size={20} />
          <Input.Field placeholder="Para onde?" onChangeText={setDestination} value={destination} />
        </Input>
        <Input variant="secondary">
          <CalendarIcon color={colors.zinc[400]} size={20} />
          <Input.Field placeholder="Quando?" onPressIn={() => setShowModal(MODAL.CALENDAR)} onFocus={() => Keyboard.dismiss()} value={selectedDates.formatDatesInText} />
        </Input>
      </View>
      <Button onPress={handleUpdateTrip} isLoading={isUpdatingTrip}>
        <Button.Title>Atualizar</Button.Title>
      </Button>
    </Modal>

    <Modal title="Selecionar datas" subtitle='Selecione a data de ida e volta da viagem' visible={showModal === MODAL.CALENDAR}
      onClose={() => setShowModal(MODAL.UPDATE_TRIP)}>
        <View className='gap-4 mt-4'>
          <Calendar 
          onDayPress={handleSelectDate} 
          markedDates={selectedDates.dates}
          minDate={dayjs().toISOString()}
           />
          <Button onPress={() => setShowModal(MODAL.UPDATE_TRIP)}>
            <Button.Title>Confirmar</Button.Title>
          </Button>
        </View>
      </Modal>
  </View>
}