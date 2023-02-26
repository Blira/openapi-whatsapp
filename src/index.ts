import * as dotenv from 'dotenv'
import { create, Whatsapp } from 'venom-bot'
import { Configuration, OpenAIApi } from "openai"
import { getDalleResponse } from './dalle'
import { getDavinciResponse } from './davinci'
import { MongoDatabase } from './mongo'
import { AiContext } from './context'
dotenv.config()



create({
    session: `${process.env.SESSION || 'Local-AI'}`,
    multidevice: true
})
    .then((client) => start(client))
    .catch((erro) => {
        console.log(erro)
    })

const configuration = new Configuration({
    organization: process.env.ORGANIZATION_ID,
    apiKey: process.env.OPENAI_KEY,
})

const openAi = new OpenAIApi(configuration)

const commands = (client: Whatsapp, message: any) => {
    const phoneNumber: string = message.from
    const textPrefix = message.text.substring(0, 5)
    switch (textPrefix) {
        case '/cc':
            AiContext.delete(phoneNumber)
            client.sendText(phoneNumber, 'Context deleted :)')
            break;
        case '/img ':
            const imgDescription: string = message.text.substring(5)
            getDalleResponse({
                clientText: imgDescription,
                openAi
            }).then((imgUrl) => {
                if (!imgUrl) {
                    client.sendText(phoneNumber, 'Could not generate image :(')
                    return
                }
                client.sendImage(
                    phoneNumber,
                    imgUrl,
                    imgDescription,
                )
            })
            break;
        default:
            getDavinciResponse({
                clientText: message.text,
                openAi, phoneNumber
            }).then((response) => {
                client.sendText(phoneNumber, response)
            })
            break;
    }
}

async function start(client: Whatsapp) {
    MongoDatabase.connect(process.env.MONGO_URI || 'mongodb://localhost:27017').then(() => {
        console.log('Connected to mongodb')
        client.onMessage(async (message: any) => {
            console.log(message)
            const phoneNumber = message.from.substring(0, 12)
            const user = await MongoDatabase.findPhoneNumber(phoneNumber)
            console.log(user)
            if (!user) {
                client.sendText(message.from, 'Olá, esse número não está habilitado para interagir comigo.')
                return
            }
            console.log(`${phoneNumber} - ${message.notifyName}: ${message.text}`)
            if (message.type === 'chat' && !message.isGroup) {
                commands(client, message)
            }
        })
    })
        .catch(e => {
            console.log('Could not connect to mongodb')
            console.error(e)
        })
}
