import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly'
import { Whatsapp } from 'venom-bot'

import fs from 'fs'

export const sendAudio = async ({ pollyClient, client, whatsappPhoneNumber, response }:
  { pollyClient: PollyClient, client: Whatsapp, whatsappPhoneNumber: string, response: string }) => {

  const voice = await pollyClient.send(new SynthesizeSpeechCommand({ Text: response, OutputFormat: 'mp3', VoiceId: 'Camila', LanguageCode: 'pt-BR', Engine: 'neural' }))
  const audio = await voice.AudioStream?.transformToByteArray()
  if (audio) {
    const audioFileName = `${whatsappPhoneNumber}-${Date.now()}.mp3`
    fs.writeFileSync(audioFileName, audio)
    client.sendVoice(whatsappPhoneNumber, audioFileName)
      .catch((e) => {
        console.log(e)
      })
      .finally(() => {
        fs.unlinkSync(audioFileName)
      })
  }
}