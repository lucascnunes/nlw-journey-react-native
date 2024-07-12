import { useEffect, useState } from "react";
import { Alert, FlatList, RefreshControl, Text, View } from "react-native";
import { ALargeSmall, Link, Plus } from "lucide-react-native";

import { colors } from "@/styles/colors";
import { validateInput } from "@/utils/validateInput";
import { linksServer } from "@/server/links-server";

import { Button } from "@/components/button";
import { Modal } from "@/components/modal";
import { Input } from "@/components/input";
import { TripLink, TripLinkProps } from "@/components/tripLink";
import { participantsServer } from "@/server/participants-server";
import { Participant, ParticipantProps } from "@/components/participant";

export function Details({ tripId }: { tripId: string }) {
  const [isCreatingLinkTrip, setIsCreatingLinkTrip] = useState(false)
  const [isGetttingTripLinks, setIsGetttingTripLinks] = useState(false)
  const [isGettingTripParticipants, setIsGettingTripParticipants] = useState(false)

  const [showNewLinkModal, setShowNewLinkModal] = useState(false)
  const [linkTitle, setLinkTitle] = useState('')
  const [linkURL, setLinkURL] = useState('')
  const [links, setLinks] = useState<TripLinkProps[]>([])
  const [participants, setPartitipants] = useState<ParticipantProps[]>([])

  function resetNewLinkFields() {
    setLinkTitle('')
    setLinkURL('')
    setShowNewLinkModal(false)
  }

  async function handleCreateTripLink() {
    try {
      if (!linkTitle.trim()) {
        return Alert.alert("Link", "Por favor, informe um título para o link.")
      }

      if (!validateInput.url(linkURL)) {
        return Alert.alert("Link", "Por favor, informe um link válido.")
      }

      setIsCreatingLinkTrip(true)
      await linksServer.create({
        tripId,
        title: linkTitle,
        url: linkURL
      })

      Alert.alert("Novo Link", "Link criado com sucesso!")
      await getTripLinks()
      resetNewLinkFields()
    } catch (error) {
      console.log(error)
    } finally {
      setIsCreatingLinkTrip(false)
    }
  }

  async function getTripLinks() {
    try {
      const links = await linksServer.getLinksByTripId(tripId)
      setLinks(links)
    } catch (error) {
      console.log(error)
    }
  }

  async function getTripParticipants() {
    try {
      const participants = await participantsServer.getByTripId(tripId)
      setPartitipants(participants)
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    getTripLinks()
    getTripParticipants()
  }, [])

  return <View className="flex-1 mt-5 mb-6">
      <Text className="text-zinc-50 text-2xl font-semibold mb-2">Links importantes</Text>

      <View className="flex-1">
        <FlatList
          data={links}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <TripLink data={item} />}
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gap-4"
          refreshControl={<RefreshControl tintColor={colors.zinc[400]} refreshing={isGetttingTripLinks} onRefresh={getTripLinks} />}
          
          ListEmptyComponent={() => (
            <View>
              <Text className="text-zinc-400 font-regular text-base mt-2 mb-6">Nenhum link adicionado</Text>
            </View>
          )}
        />
        
        <Button variant="secondary" onPress={() => setShowNewLinkModal(true)}>
          <Plus color={colors.zinc[200]} size={20} />
          <Button.Title>Cadastrar novo link</Button.Title>
        </Button>
      </View>

      <View className="flex-1 border-t border-zinc-800 mt-6">
        <Text className="text-zinc-50 text-2xl font-semibold my-6">Convidados</Text>
        
        <FlatList
          data={participants}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <Participant data={item} />}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl tintColor={colors.zinc[400]} refreshing={isGettingTripParticipants} onRefresh={getTripParticipants} />}
          contentContainerClassName="gap-4 pb-44"
          ListEmptyComponent={() => (
            <View>
              <Text className="text-zinc-400 font-regular text-base mt-2 mb-6">Nenhum convidado adicionado</Text>
            </View>
          )}
        />
      </View>

      <Modal
        title="Cadastrar link"
        subtitle="Todos os convidados podem visualizar os links importantes."
        visible={showNewLinkModal}
        onClose={() => setShowNewLinkModal(false)}
      >
        <View className="gap-2 mb-3">
          <Input variant="secondary">
            <ALargeSmall color={colors.zinc[200]} size={20} />
            <Input.Field placeholder="Título do link" onChangeText={setLinkTitle}/>
          </Input>
          <Input variant="secondary">
            <Link color={colors.zinc[200]} size={20} />
            <Input.Field placeholder="URL" onChangeText={setLinkURL}/>
          </Input>
        </View>

        <Button onPress={handleCreateTripLink}>
          <Button.Title>Salvar link</Button.Title>
        </Button>
      </Modal>
  </View> 
}