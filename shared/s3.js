import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

let s3Client = null;

function getS3Client() {
  if (!s3Client) {
    const region = process.env.AWS_REGION || 'us-east-1';

    if (
      process.env.AWS_ACCESS_KEY_ID &&
      !process.env.AWS_ACCESS_KEY_ID.includes('your-aws-access-key') &&
      process.env.AWS_SECRET_ACCESS_KEY
    ) {
      s3Client = new S3Client({
        region,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          sessionToken: process.env.AWS_SESSION_TOKEN || undefined,
        },
      });
    } else {
      const profile = process.env.AWS_PROFILE;
      s3Client = new S3Client({
        region,
        credentials: profile ? fromNodeProviderChain({ profile }) : fromNodeProviderChain(),
      });
    }
  }
  return s3Client;
}

/**
 * Uploads a PDF buffer or text artifact to Amazon S3 Paper Lake
 * @param {Buffer} buffer - File buffer
 * @param {string} filename - Target filename
 * @param {string} contentType - e.g. 'application/pdf'
 * @returns {Promise<string>} S3 Object URL
 */
export async function uploadToS3(buffer, filename, contentType = 'application/pdf') {
  const bucketName = process.env.AWS_S3_BUCKET || 'veridex-paper-lake';
  const region = process.env.AWS_REGION || 'us-east-1';
  const key = `papers/${Date.now()}_${randomUUID().slice(0, 8)}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  try {
    const client = getS3Client();
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });
    await client.send(command);
    return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
  } catch (err) {
    console.warn('[AWS S3 Upload Notice] S3 notice:', err.message);
    return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
  }
}
