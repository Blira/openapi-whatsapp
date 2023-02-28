import { PollyClient } from "@aws-sdk/client-polly";
import { S3Client } from "@aws-sdk/client-s3";
import { TranscribeClient, ListTranscriptionJobsCommand } from "@aws-sdk/client-transcribe";
import { OpenAIApi } from "openai";
import { Whatsapp } from "venom-bot";
import { commands } from "./commands";
import { deleteFromS3 } from "./deleteFromS3";
import { getTextFromS3 } from "./getTextFromS3";

export const checkJob = async ({ audioFileName, transcribeClient, fileName, s3, bucket, jsonFileName, client, whatsappPhoneNumber, openAi, pollyClient }:
  {
    transcribeClient: TranscribeClient,
    fileName: string,
    audioFileName: string,
    s3: S3Client,
    bucket: string,
    jsonFileName: string,
    client: Whatsapp,
    whatsappPhoneNumber: string,
    openAi: OpenAIApi,
    pollyClient: PollyClient
  }) => {
  console.log('CHECKING...')
  const data = await transcribeClient.send(
    new ListTranscriptionJobsCommand({ JobNameContains: fileName })
  );
  const currentJob = data.TranscriptionJobSummaries?.find(x => x.TranscriptionJobName === fileName);
  if (!currentJob) {
    console.log('JOB NOT FOUND')
    return
  }
  if (currentJob.TranscriptionJobStatus === 'COMPLETED') {
    console.log('DONE!')
    const text = await getTextFromS3({ s3, bucket, key: jsonFileName })
    commands({
      client,
      text,
      whatsappPhoneNumber,
      openAi,
      pollyClient
    })
    deleteFromS3({ s3, bucket, key: jsonFileName })
    deleteFromS3({ s3, bucket, key: audioFileName })
    return
  }


  if (currentJob.TranscriptionJobStatus === 'FAILED') {
    console.log('TRANSCRIPTION FAILED!  :( ')
    return
  }
  setTimeout(() => {
    checkJob({ audioFileName, transcribeClient, fileName, bucket, jsonFileName, s3, client, whatsappPhoneNumber, openAi, pollyClient })
  }, 3000);
}