import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"

export const getTextFromS3 = async ({ s3, bucket, key }: { s3: S3Client, bucket: string, key: string }) => {
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