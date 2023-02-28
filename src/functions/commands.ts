import { OpenAIApi } from "openai";
import { Whatsapp } from "venom-bot";
import { AiContext } from "../context/context";
import { getDalleResponse } from "../ai-models/dalle";
import { getDavinciResponse } from "../ai-models/davinci";
import { sendMessage } from "./sendMessage";
import { PollyClient } from "@aws-sdk/client-polly";
import { voice } from "../context/voice";

export const commands = ({ client, text, whatsappPhoneNumber, openAi, pollyClient }:
  { client: Whatsapp, text: string, whatsappPhoneNumber: string, openAi: OpenAIApi, pollyClient: PollyClient }) => {
  const textPrefix = text.substring(0, 5)
  switch (textPrefix) {
    case '/vc':
      voice.set(whatsappPhoneNumber)
      client.sendText(whatsappPhoneNumber, 'VOICE RESPONSE ENABLED')
      break;
    case '/txt':
      voice.delete(whatsappPhoneNumber)
      client.sendText(whatsappPhoneNumber, 'TEXT RESPONSE ENABLED')
      break;
    case '/cc':
      AiContext.delete(whatsappPhoneNumber)
      client.sendText(whatsappPhoneNumber, 'CONTEXT DELETED')
      break;
    case '/img ':
      const imgDescription: string = text.substring(5)
      getDalleResponse({
        clientText: imgDescription,
        openAi
      }).then((imgUrl) => {
        if (!imgUrl) {
          client.sendText(whatsappPhoneNumber, 'Could not generate image :(')
          return
        }
        client.sendImage(
          whatsappPhoneNumber,
          imgUrl,
          imgDescription,
        )
      })
      break;
    default:
      getDavinciResponse({
        clientText: text,
        openAi,
        phoneNumber: whatsappPhoneNumber
      }).then((response) => {
        sendMessage({ client, response, whatsappPhoneNumber, pollyClient })
      })
      break;
  }
}