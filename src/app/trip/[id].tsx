import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Keyboard, Text, TouchableOpacity, View } from "react-native";
import { Calendar as CalendarIcon, CalendarRange, Info, Mail, MapPin, Settings2, User } from "lucide-react-native";
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
import { validateInput } from "@/utils/validateInput";
import { participantsServer } from "@/server/participants-server";
import { tripStorage } from "@/storage/trip";

export type TripData = TripDetails & { where: string }

enum MODAL {
  NONE = 0,
  UPDATE_TRIP = 1,
  CALENDAR = 2,
  CONFIRM_ATTENDANCE = 3
}

export default function Trip() {
  const [isLoadingTrip, setIsLoadingTrip] = useState(true)
  const [isUpdatingTrip, setIsUpdatingTrip] = useState(false)
  const [isConfirmingAttendance, setIsConfirmingAttendance] = useState(false)

  const [tripDetails, setTripDetails] = useState({} as TripData)
  const [option, setOption] = useState<"activity" | "details">("activity")
  const [showModal, setShowModal] = useState(MODAL.NONE)

  // Update Trip Details
  const [destination, setDestination] = useState('')
  const [selectedDates, setSelectedDates] = useState({} as DatesSelected)

  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')

  const tripParams = useLocalSearchParams<{ id: string, participant?: string }>()

  async function getTripDetails() {
    try {
      setIsLoadingTrip(true)
      if (tripParams.participant) {
        setShowModal(MODAL.CONFIRM_ATTENDANCE)
      }

      if (!tripParams.id) return router.back()

      const { trip } = await tripServer.getById(tripParams.id)
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
      if (!tripParams.id) return

      if (!destination || !selectedDates.startsAt || !selectedDates.endsAt) {
        return Alert.alert("Detalhes da viagem", "Por favor, preencha todos os dados da viagem para seguir.")
      }
      setIsUpdatingTrip(true)
      await tripServer.update({
        id: tripParams.id,
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

  async function handleConfirmAttendance() {
    try {
      if (!tripParams.id || !tripParams.participant) return

      if (!guestName.trim() || !guestEmail.trim()) {
        return Alert.alert("Confirmar presença", "Por favor, preencha todos os dados da presença para seguir.")
      }

      if (!validateInput.email(guestEmail.trim())) {
        return Alert.alert("Confirmar presença", "Por favor, informe um e-mail válido.")
      }

      setIsConfirmingAttendance(true)
      await participantsServer.confirmTripByParticipantId({
        participantId: tripParams.participant,
        name: guestName,
        email: guestEmail.trim()
      })

      Alert.alert("Confirmado", "Presença confirmada com sucesso!")
      await tripStorage.save(tripParams.id)
      setShowModal(MODAL.NONE)

    } catch (error) {
      console.log(error)
      Alert.alert("Confirmar presença", "Por favor, preencha todos os dados da presença para seguir.")
    } finally {
      setIsConfirmingAttendance(false)
    }
  }

  async function handleRemoveTrip() {
    try {
      Alert.alert("Remover viagem", "Tem certeza que deseja remover esta viagem?", [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Excluir",
          onPress: async () => {
            if (!tripParams.id) return
            await tripStorage.remove()
            router.navigate("/")
          }
        }
      ])
    } catch (error) {
      console.log(error)
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
      <TouchableOpacity activeOpacity={0.7} onPress={handleRemoveTrip}>
        <Text className="text-red-400 text-center mt-6">Remover viagem</Text>
      </TouchableOpacity>
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

      <Modal title="Confirmar presença" visible={showModal === MODAL.CONFIRM_ATTENDANCE}>
        <View className="gap-4 mt-4">
          <Text className="text-zinc-400 font-regular leading-6 my-2">
            Você foi convidado(a) para participar de uma viagem para <Text className="font-semibold text-zinc-100">{" "}{tripDetails.destination}{" "}</Text>
          nas datas de <Text className="font-semibold text-zinc-100">{" "}{dayjs(tripDetails.starts_at).date()} a{" "} {dayjs(tripDetails.ends_at).date()} de {dayjs(tripDetails.ends_at).format("MMMM")}. {"\n\n"}</Text>
          Para confirmar sua presença na viagem, preencha os dados abaixo:
          </Text>

          <Input variant="secondary">
            <User color={colors.zinc[400]} size={20} />
            <Input.Field placeholder="Seu nome completo" onChangeText={setGuestName} />
          </Input>

          <Input variant="secondary">
            <Mail color={colors.zinc[400]} size={20} />
            <Input.Field placeholder="Seu e-mail de confirmação" keyboardType="email-address" autoCapitalize="none" onChangeText={setGuestEmail} />
          </Input>

          <Button onPress={handleConfirmAttendance} isLoading={isConfirmingAttendance}>
            <Button.Title>Confirmar minha presença</Button.Title>
          </Button>
        </View>
      </Modal>
  </View>
}