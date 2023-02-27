import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { StartTranscriptionJobCommand, TranscribeClient } from "@aws-sdk/client-transcribe"
import { Message, Whatsapp } from "venom-bot"

import fs from 'fs'
import { checkJob } from "./checkJob"
import { OpenAIApi } from "openai"

export const handleAudio = async ({ phoneNumber, client, message, s3, bucket, transcribeClient, openAi }:
  {
    phoneNumber: string,
    client: Whatsapp,
    message: Message,
    s3: S3Client,
    transcribeClient: TranscribeClient,
    bucket: string,
    openAi: OpenAIApi
  }) => {
  const audioFileName = `${phoneNumber}-${Date.now()}`
  const audioFileNameWithExtension = `${audioFileName}.wav`
  try {
    const decryptedAudio = await client.decryptFile(message)
    console.log('DECRYPTED')
    fs.writeFileSync(audioFileNameWithExtension, decryptedAudio)
    console.log('WROTE')

    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: audioFileNameWithExtension,
      Body: fs.readFileSync(audioFileNameWithExtension)

    }))
    fs.unlinkSync(audioFileNameWithExtension)
    console.log('File uploaded :)')
  } catch (error) {
    console.log('ERROR: ')
    console.log(error)
  }
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
    OutputBucketName: bucket
  };

  const data = await transcribeClient.send(
    new StartTranscriptionJobCommand(params)
  );

  console.log("Success - put", data);

  const jsonFileName = `${currentJobName}.json`
  checkJob({ currentJobName, transcribeClient, bucket: bucket, key: jsonFileName, s3, whatsappPhoneNumber: message.from, client, openAi })


}