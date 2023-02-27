import * as dotenv from 'dotenv'
import { create, Whatsapp } from 'venom-bot'
import { Configuration, OpenAIApi } from "openai"
import { getDalleResponse } from './dalle'
import { getDavinciResponse } from './davinci'
import { MongoDatabase } from './mongo'
import { AiContext } from './context'

import fs from 'fs'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
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

const commands = ({ client, text, whatsappPhoneNumber }: { client: Whatsapp, text: string, whatsappPhoneNumber: string }) => {
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

const checkJob = async ({ transcribeClient, currentJobName, s3, bucket, key, client, whatsappPhoneNumber }:
    {
        transcribeClient: TranscribeClient,
        currentJobName: string,
        s3: S3Client,
        bucket: string,
        key: string,
        client: Whatsapp,
        whatsappPhoneNumber: string
    }) => {
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

        const text = await getTextFromS3({ s3, bucket, key })
        console.log('OPAAA: ', text)
        commands({
            client,
            text,
            whatsappPhoneNumber
        })
        return
    }


    if (currentJob.TranscriptionJobStatus === 'FAILED') {
        console.log('TRANSCRIPTION FAILED!  :( ')
        return
    }
    setTimeout(() => {
        checkJob({ transcribeClient, currentJobName, bucket, key, s3, client, whatsappPhoneNumber })
    }, 3000);
}

const getTextFromS3 = async ({ s3, bucket, key }: { s3: S3Client, bucket: string, key: string }) => {
    const data = await s3.send(new GetObjectCommand({
        Bucket: bucket,
        Key: key
    }))
    const stringJson = await data.Body?.transformToString()
    if (!stringJson) {
        console.log('STRING NOT FOUND')
        return
    }
    const json = JSON.parse(stringJson)
    const text = json.results.transcripts[0].transcript
    return text
}

async function start(client: Whatsapp) {
    MongoDatabase.connect(process.env.MONGO_URI || 'mongodb://localhost:27017').then(() => {
        console.log('Connected to mongodb')

        const REGION = "us-east-1"
        const BUCKET = 'isa-audio'

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
            if (message.type === 'chat' && !message.isGroup) {
                commands({ client, text: message.text, whatsappPhoneNumber: message.from })
            }

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
                        Bucket: BUCKET,
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
                    OutputBucketName: BUCKET
                };

                const data = await transcribeClient.send(
                    new StartTranscriptionJobCommand(params)
                );

                console.log("Success - put", data);

                const jsonFileName = `${currentJobName}.json`
                checkJob({ currentJobName, transcribeClient, bucket: BUCKET, key: jsonFileName, s3, whatsappPhoneNumber: message.from, client })


            }
        })
    })
        .catch(e => {
            console.log('Could not connect to mongodb')
            console.error(e)
        })
}
