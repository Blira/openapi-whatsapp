import { S3Client } from "@aws-sdk/client-s3";
import { TranscribeClient, ListTranscriptionJobsCommand } from "@aws-sdk/client-transcribe";
import { OpenAIApi } from "openai";
import { Whatsapp } from "venom-bot";
import { commands } from "./commands";
import { getTextFromS3 } from "./getTextFromS3";

export const checkJob = async ({ transcribeClient, currentJobName, s3, bucket, key, client, whatsappPhoneNumber, openAi }:
  {
    transcribeClient: TranscribeClient,
    currentJobName: string,
    s3: S3Client,
    bucket: string,
    key: string,
    client: Whatsapp,
    whatsappPhoneNumber: string,
    openAi: OpenAIApi
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
      whatsappPhoneNumber,
      openAi
    })
    return
  }


  if (currentJob.TranscriptionJobStatus === 'FAILED') {
    console.log('TRANSCRIPTION FAILED!  :( ')
    return
  }
  setTimeout(() => {
    checkJob({ transcribeClient, currentJobName, bucket, key, s3, client, whatsappPhoneNumber, openAi })
  }, 3000);
}