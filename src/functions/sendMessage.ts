import { PollyClient } from "@aws-sdk/client-polly"
import { Whatsapp } from "venom-bot"
import { voice } from "../context/voice"
import { sendAudio } from "./sendAudio"

export const sendMessage = ({ client, whatsappPhoneNumber, response, pollyClient }:
  {
    client: Whatsapp,
    whatsappPhoneNumber: string,
    response: string,
    pollyClient: PollyClient
  }) => {
  const useVoice = voice.get(whatsappPhoneNumber)
  if (useVoice) {
    sendAudio({
      client,
      whatsappPhoneNumber,
      pollyClient,
      response
    })
    return
  }
  client.sendText(whatsappPhoneNumber, response)
}