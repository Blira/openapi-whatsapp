import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3"

export const deleteFromS3 = async ({ s3, bucket, key }: { s3: S3Client, bucket: string, key: string }) => {
  s3.send(new DeleteObjectCommand({
    Bucket: bucket,
    Key: key
  }))
    .then(() => {
      console.log(`${key} deleted from bucket ${bucket}`)
    })
    .catch(() => {
      console.log(`Could not delete ${key} from bucket ${bucket}`)
    })
}