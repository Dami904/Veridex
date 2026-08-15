import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { S3Client, CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { fromIni, fromNodeProviderChain } from '@aws-sdk/credential-providers';
import dotenv from 'dotenv';

dotenv.config();

async function probeAws() {
  console.log('\n======================================================');
  console.log('  🔍 ACTIVE AWS PROBE & S3 BUCKET INITIALIZER');
  console.log('======================================================\n');

  const region = process.env.AWS_REGION || 'us-east-1';

  // 1. Test STS Caller Identity
  console.log('[1/3] Checking AWS Identity via STS...');
  let stsCreds = null;

  try {
    const sts = new STSClient({
      region,
      credentials: fromIni({ profile: 'matcher-worker' }),
    });
    const res = await sts.send(new GetCallerIdentityCommand({}));
    console.log('  ✅ Successfully authenticated with profile [matcher-worker]!');
    console.log(`     Account ID : ${res.Account}`);
    console.log(`     User / ARN : ${res.Arn}`);
    stsCreds = fromIni({ profile: 'matcher-worker' });
  } catch (err1) {
    console.log('  ⚠️  Could not authenticate with profile [matcher-worker]:', err1.message);
    try {
      const stsDefault = new STSClient({
        region,
        credentials: fromNodeProviderChain(),
      });
      const res2 = await stsDefault.send(new GetCallerIdentityCommand({}));
      console.log('  ✅ Successfully authenticated with default credential provider chain!');
      console.log(`     Account ID : ${res2.Account}`);
      console.log(`     User / ARN : ${res2.Arn}`);
      stsCreds = fromNodeProviderChain();
    } catch (err2) {
      console.error('  ❌ AWS Authentication Failed:', err2.message);
      return;
    }
  }

  // 2. Test / Create S3 Bucket
  const bucketName = process.env.AWS_S3_BUCKET || `veridex-paper-lake-${Math.floor(Math.random() * 89999 + 10000)}`;
  console.log(`\n[2/3] Checking S3 Bucket [${bucketName}] in region [${region}]...`);
  const s3 = new S3Client({ region, credentials: stsCreds });

  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucketName }));
    console.log(`  ✅ S3 Bucket "${bucketName}" exists and is accessible!`);
  } catch (headErr) {
    if (headErr.name === 'NotFound' || headErr.$metadata?.httpStatusCode === 404) {
      console.log(`  Bucket "${bucketName}" not found. Creating bucket now...`);
      try {
        await s3.send(new CreateBucketCommand({
          Bucket: bucketName,
          CreateBucketConfiguration: region === 'us-east-1' ? undefined : { LocationConstraint: region },
        }));
        console.log(`  🎉 S3 Bucket "${bucketName}" created successfully on AWS!`);
      } catch (createErr) {
        console.warn(`  ⚠️ Could not create S3 bucket "${bucketName}":`, createErr.message);
      }
    } else {
      console.log(`  ℹ️  S3 Bucket Notice: ${headErr.message}`);
    }
  }

  // 3. Test Live Bedrock Titan V2
  console.log(`\n[3/3] Executing Live Call to Amazon Bedrock Titan V2 in [${region}]...`);
  const bedrock = new BedrockRuntimeClient({ region, credentials: stsCreds });

  try {
    const payload = {
      inputText: 'Veridex scientific consensus vector embedding initialization probe.',
      dimensions: 1024,
      normalize: true,
    };
    const bedrockCmd = new InvokeModelCommand({
      modelId: 'amazon.titan-embed-text-v2:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    });

    const bedrockRes = await bedrock.send(bedrockCmd);
    const body = JSON.parse(new TextDecoder().decode(bedrockRes.body));
    console.log(`  🎉 Amazon Bedrock Titan V2 Call Succeeded on AWS! (Returned ${body.embedding?.length || 1024}-dim vector)`);
  } catch (bedrockErr) {
    console.warn(`  ⚠️ Amazon Bedrock Titan V2 Notice:`, bedrockErr.message);
    if (bedrockErr.name === 'AccessDeniedException') {
      console.log('     👉 Hint: Ensure Titan Text Embeddings V2 model access is enabled in the AWS Bedrock Console (Bedrock > Model access).');
    }
  }

  console.log('\n======================================================\n');
}

probeAws();
