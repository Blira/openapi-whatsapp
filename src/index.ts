import * as dotenv from 'dotenv'
import { create, Whatsapp } from 'venom-bot'
import { Configuration, OpenAIApi } from "openai"
import { getDalleResponse } from './dalle'
import { getDavinciResponse } from './davinci'
import { MongoDatabase } from './mongo'
import { AiContext } from './context'

import fs from 'fs'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { TranscribeClient, StartTranscriptionJobCommand, ListTranscriptionJobsCommand } from "@aws-sdk/client-transcribe"


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

const checkJob = async ({ transcribeClient, currentJobName }: { transcribeClient: TranscribeClient, currentJobName: string }) => {
    console.log('CHECKING...')
    const data = await transcribeClient.send(
        new ListTranscriptionJobsCommand({ JobNameContains: currentJobName })
    );
    const currentJob = data.TranscriptionJobSummaries?.find(x => x.TranscriptionJobName === currentJobName);
    if (!currentJob) {
        return
    }
    if (currentJob.TranscriptionJobStatus === 'COMPLETED') {
        console.log('DONE!')
        return
    }


    if (currentJob.TranscriptionJobStatus === 'FAILED') {
        console.log('TRANSCRIPTION FAILED!  :( ')
        return
    }
    setTimeout(() => {
        checkJob({ transcribeClient, currentJobName })
    }, 3000);
}


async function start(client: Whatsapp) {
    MongoDatabase.connect(process.env.MONGO_URI || 'mongodb://localhost:27017').then(() => {
        console.log('Connected to mongodb')


        const REGION = "us-east-1"

        const s3 = new S3Client({ region: REGION })
        console.log('S3 client created')

        const transcribeClient = new TranscribeClient({ region: REGION })
        console.log('Transcribe client created')

        client.onMessage(async (message: any) => {
            console.log(message)

            const phoneNumber = message.from.substring(0, 12)
            const user = await MongoDatabase.findPhoneNumber(phoneNumber)
            // console.log(user)
            if (!user) {
                client.sendText(message.from, 'Desculpe, esse número não está habilitado para interagir comigo.')
                return
            }
            console.log(`${phoneNumber} - ${message.notifyName}: ${message.text}`)
            // if (message.type === 'chat' && !message.isGroup) {
            //     commands(client, message)
            // }

            if (message.type === 'ptt' && !message.isGroup) {
                console.log('******* AUDIO *******')
                const audioFileName = `${phoneNumber}-${Date.now()}`
                const audioFileNameWithExtension = `${audioFileName}.wav`
                try {
                    const decryptedAudio = await client.decryptFile(message)
                    console.log('DECRYPTED')
                    fs.writeFileSync(audioFileNameWithExtension, decryptedAudio)
                    console.log('WROTE')

                    await s3.send(new PutObjectCommand({
                        Bucket: 'isa-audio',
                        Key: audioFileNameWithExtension,
                        Body: fs.readFileSync(audioFileNameWithExtension)

                    }))
                    console.log('File uploaded :)')
                } catch (error) {
                    console.log('ERROR: ')
                    console.log(error)
                }
                // Create an Amazon Transcribe service client object.
                // ----------------------- CLIENT END

                const currentJobName = audioFileName
                // Set the parameters
                const params = {
                    TranscriptionJobName: currentJobName,
                    LanguageCode: "pt-BR",
                    MediaFormat: "ogg",
                    Media: {
                        MediaFileUri: `https://isa-audio.s3.amazonaws.com/${audioFileNameWithExtension}`,
                    },
                    OutputBucketName: "isa-audio"
                };

                const data = await transcribeClient.send(
                    new StartTranscriptionJobCommand(params)
                );

                console.log("Success - put", data);

                checkJob({ currentJobName, transcribeClient })


                // commands(client, message)
            }
        })
    })
        .catch(e => {
            console.log('Could not connect to mongodb')
            console.error(e)
        })
}
