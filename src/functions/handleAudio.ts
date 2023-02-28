import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { StartTranscriptionJobCommand, TranscribeClient } from "@aws-sdk/client-transcribe"
import { Message, Whatsapp } from "venom-bot"

import fs from 'fs'
import { checkJob } from "./checkJob"
import { OpenAIApi } from "openai"
import { PollyClient } from "@aws-sdk/client-polly"

export const handleAudio = async ({ phoneNumber, client, message, s3, bucket, transcribeClient, openAi, pollyClient }:
  {
    phoneNumber: string,
    client: Whatsapp,
    message: Message,
    s3: S3Client,
    transcribeClient: TranscribeClient,
    bucket: string,
    openAi: OpenAIApi,
    pollyClient: PollyClient
  }) => {
  const fileName = `${phoneNumber}-${Date.now()}`
  const audioFileName = `${fileName}.wav`
  const jsonFileName = `${fileName}.json`
  try {
    const decryptedAudio = await client.decryptFile(message)
    console.log('DECRYPTED')
    fs.writeFileSync(audioFileName, decryptedAudio)
    console.log('WROTE')

    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: audioFileName,
      Body: fs.readFileSync(audioFileName)

    }))
    fs.unlinkSync(audioFileName)
    console.log('File uploaded :)')
  } catch (error) {
    console.log('ERROR: ')
    console.log(error)
  }
  // ----------------------- CLIENT END

  // Set the parameters
  const params = {
    TranscriptionJobName: fileName,
    LanguageCode: "pt-BR",
    MediaFormat: "ogg",
    Media: {
      MediaFileUri: `https://isa-audio.s3.amazonaws.com/${audioFileName}`,
    },
    OutputBucketName: bucket
  };

  await transcribeClient.send(
    new StartTranscriptionJobCommand(params)
  );
  checkJob({ audioFileName, fileName, transcribeClient, bucket: bucket, jsonFileName, s3, whatsappPhoneNumber: message.from, client, openAi, pollyClient })
}