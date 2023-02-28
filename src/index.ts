import * as dotenv from 'dotenv'
import { create, Whatsapp } from 'venom-bot'
import { Configuration, OpenAIApi } from "openai"
import { ContextDatabase } from './context/mongo'
import { S3Client } from '@aws-sdk/client-s3'
import { TranscribeClient } from '@aws-sdk/client-transcribe'
import { commands } from './functions/commands'
import { handleAudio } from './functions/handleAudio'
import { PollyClient } from '@aws-sdk/client-polly'

dotenv.config()

const REGION = process.env.AWS_REGION || "us-east-1"
const BUCKET = process.env.S3_BUCKET || 'isa-audio'
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

async function start(client: Whatsapp) {
    ContextDatabase.connect(process.env.MONGO_URI || 'mongodb://localhost:27017').then(async () => {
        console.log('Connected to database')
        try {
            const s3 = new S3Client({ region: REGION })
            console.log('S3 client created')

            const transcribeClient = new TranscribeClient({ region: REGION })
            console.log('Transcribe client created')


            const pollyClient = new PollyClient({ region: REGION })
            console.log('Polly client created')

            client.onMessage(async (message: any) => {
                const phoneNumber = message.from.substring(0, 12)
                const user = await ContextDatabase.findPhoneNumber(phoneNumber)
                if (!user) {
                    client.sendText(message.from, 'Desculpe, esse número não está habilitado para interagir comigo.')
                    return
                }
                // console.log(`${phoneNumber} - ${message.notifyName}: ${message.text}`)

                if (!message.isGroup) {
                    switch (message.type) {
                        case 'chat':
                            commands({ client, text: message.text, whatsappPhoneNumber: message.from, openAi, pollyClient })
                            break;

                        case 'ptt':
                            handleAudio({ bucket: BUCKET, client, message, openAi, phoneNumber, s3, transcribeClient, pollyClient })
                            break;

                        default:
                            break;
                    }
                }
            })
        } catch (error) {
            console.log('ERROR')
            console.error(error)
        }
    })
        .catch(e => {
            console.log('Could not connect to context database')
            console.error(e)
        })
}
