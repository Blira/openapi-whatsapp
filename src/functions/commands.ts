import { OpenAIApi } from "openai";
import { Whatsapp } from "venom-bot";
import { AiContext } from "../context";
import { getDalleResponse } from "../ai-models/dalle";
import { getDavinciResponse } from "../ai-models/davinci";

export const commands = ({ client, text, whatsappPhoneNumber, openAi }: { client: Whatsapp, text: string, whatsappPhoneNumber: string, openAi: OpenAIApi }) => {
  const textPrefix = text.substring(0, 5)
  switch (textPrefix) {
    case '/cc':
      AiContext.delete(whatsappPhoneNumber)
      client.sendText(whatsappPhoneNumber, 'Context deleted :)')
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
        client.sendText(whatsappPhoneNumber, response)
      })
      break;
  }
}