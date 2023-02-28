import * as dotenv from 'dotenv'
import { create, Whatsapp } from 'venom-bot'
import { Configuration, OpenAIApi } from "openai"
import { ContextDatabase } from './context/mongo'
import { S3Client } from '@aws-sdk/client-s3'
import { TranscribeClient } from "@aws-sdk/client-transcribe"
import { commands } from './functions/commands'
import { handleAudio } from './functions/handleAudio'

import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly'
import fs from 'fs'

dotenv.config()

const REGION = process.env.AWS_REGION || "us-east-1"
const BUCKET = process.env.S3_BUCKET || 'isa-audio'

const pollyClient = new PollyClient({ region: REGION })

// const foo = async () => {
// }
// foo()

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


            const voice = await pollyClient.send(new SynthesizeSpeechCommand({ Text: 'Olá, meu nome é isa!', OutputFormat: 'mp3', VoiceId: 'Camila', LanguageCode: 'pt-BR', Engine: 'neural' }))
            console.log(voice)
            const audio = await voice.AudioStream?.transformToByteArray()
            if (audio) {
                fs.writeFileSync('isa.mp3', audio)
                client.sendVoice('558197298151@c.us', 'isa.mp3').
                    then(() => {
                        console.log('yay')
                    })
                    .catch((e) => {
                        console.log(e)
                    })
                    .finally(() => {
                        fs.unlinkSync('isa.mp3')
                    })
            }


            // const s3 = new S3Client({ region: REGION })
            // console.log('S3 client created')

            // const transcribeClient = new TranscribeClient({ region: REGION })
            // console.log('Transcribe client created')

            // client.onMessage(async (message: any) => {
            //     const phoneNumber = message.from.substring(0, 12)
            //     const user = await ContextDatabase.findPhoneNumber(phoneNumber)
            //     if (!user) {
            //         client.sendText(message.from, 'Desculpe, esse número não está habilitado para interagir comigo.')
            //         return
            //     }
            //     console.log(`${phoneNumber} - ${message.notifyName}: ${message.text}`)

            //     if (!message.isGroup) {
            //         switch (message.type) {
            //             case 'chat':
            //                 commands({ client, text: message.text, whatsappPhoneNumber: message.from, openAi })
            //                 break;

            //             case 'ptt':
            //                 handleAudio({ bucket: BUCKET, client, message, openAi, phoneNumber, s3, transcribeClient })
            //                 break;

            //             default:
            //                 break;
            //         }
            //     }
            // })
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
