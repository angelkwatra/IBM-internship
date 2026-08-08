/**
 * awsService.ts — Core client configuration and SDK wrappers for AWS integrations.
 *
 * Implements Cognito (Auth), S3 (File storage), DynamoDB (Metadata Database),
 * Lambda (Malware Scanner), and SES (Share Notification emails).
 */

import { S3Client, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Upload } from "@aws-sdk/lib-storage";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand,
  ConfirmSignUpCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  ResendConfirmationCodeCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

// ── Types ────────────────────────────────────────────────────────

export interface AWSConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  s3Bucket: string;
  cognitoUserPoolId: string;
  cognitoClientId: string;
  dynamoTable: string;
  lambdaFunctionName?: string;
}

// Default/fallback configuration if not specified in UI
const DEFAULT_CONFIG: AWSConfig = {
  region: import.meta.env.VITE_AWS_REGION || "us-east-1",
  accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID || "",
  secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || "",
  s3Bucket: import.meta.env.VITE_AWS_S3_BUCKET || "",
  cognitoUserPoolId: import.meta.env.VITE_AWS_COGNITO_USER_POOL_ID || "",
  cognitoClientId: import.meta.env.VITE_AWS_COGNITO_CLIENT_ID || "",
  dynamoTable: import.meta.env.VITE_AWS_DYNAMO_TABLE || "cloudvault-metadata",
  lambdaFunctionName: import.meta.env.VITE_AWS_LAMBDA_FUNCTION_NAME || "cloudvault-security-scanner",
};

// ── Configuration State ──────────────────────────────────────────

export function getAWSConfig(): AWSConfig {
  try {
    const stored = localStorage.getItem("cv_aws_config");
    if (stored) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error("Failed to read AWS config from local storage", e);
  }
  return DEFAULT_CONFIG;
}

export function saveAWSConfig(config: AWSConfig): void {
  localStorage.setItem("cv_aws_config", JSON.stringify(config));
  clearClients(); // Force client re-initialization with new credentials
}

export function isAWSEnabled(): boolean {
  const enabled = localStorage.getItem("cv_aws_enabled") === "true";
  const config = getAWSConfig();
  return (
    enabled &&
    !!config.region &&
    !!config.accessKeyId &&
    !!config.secretAccessKey &&
    !!config.s3Bucket &&
    !!config.dynamoTable &&
    !!config.cognitoUserPoolId &&
    !!config.cognitoClientId
  );
}

export function setAWSEnabled(enabled: boolean): void {
  localStorage.setItem("cv_aws_enabled", enabled ? "true" : "false");
}

// ── Client Cache (Singletons) ────────────────────────────────────

let s3Client: S3Client | null = null;
let ddbClient: DynamoDBDocumentClient | null = null;
let cognitoClient: CognitoIdentityProviderClient | null = null;
let lambdaClient: LambdaClient | null = null;

function clearClients() {
  s3Client = null;
  ddbClient = null;
  cognitoClient = null;
  lambdaClient = null;
}

function getCredentials(config: AWSConfig) {
  return {
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
  };
}

export function getS3Client(): S3Client {
  if (!s3Client) {
    const config = getAWSConfig();
    s3Client = new S3Client({
      region: config.region,
      credentials: getCredentials(config),
    });
  }
  return s3Client;
}

export function getDynamoClient(): DynamoDBDocumentClient {
  if (!ddbClient) {
    const config = getAWSConfig();
    const client = new DynamoDBClient({
      region: config.region,
      credentials: getCredentials(config),
    });
    ddbClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }
  return ddbClient;
}

export function getCognitoClient(): CognitoIdentityProviderClient {
  if (!cognitoClient) {
    const config = getAWSConfig();
    cognitoClient = new CognitoIdentityProviderClient({
      region: config.region,
      credentials: getCredentials(config),
    });
  }
  return cognitoClient;
}

export function getLambdaClient(): LambdaClient {
  if (!lambdaClient) {
    const config = getAWSConfig();
    lambdaClient = new LambdaClient({
      region: config.region,
      credentials: getCredentials(config),
    });
  }
  return lambdaClient;
}



// ── S3 Service Wrapper ───────────────────────────────────────────

export async function uploadFileToS3(
  fileId: string,
  file: File,
  onProgress: (progress: number) => void
): Promise<string> {
  const config = getAWSConfig();
  const client = getS3Client();

  const key = `files/${fileId}-${file.name}`;
  const upload = new Upload({
    client,
    params: {
      Bucket: config.s3Bucket,
      Key: key,
      Body: file,
      ContentType: file.type,
    },
  });

  upload.on("httpUploadProgress", (progress) => {
    if (progress.loaded && progress.total) {
      const percentage = Math.round((progress.loaded / progress.total) * 100);
      onProgress(percentage);
    }
  });

  await upload.done();
  return key; // Return S3 object key
}

export async function getS3DownloadUrl(fileId: string, fileName: string): Promise<string> {
  const config = getAWSConfig();
  const client = getS3Client();
  const key = `files/${fileId}-${fileName}`;

  const command = new GetObjectCommand({
    Bucket: config.s3Bucket,
    Key: key,
  });

  // Generate a presigned URL valid for 1 hour (3600 seconds)
  return await getSignedUrl(client, command, { expiresIn: 3600 });
}

export async function deleteFileFromS3(fileId: string, fileName: string): Promise<void> {
  const config = getAWSConfig();
  const client = getS3Client();
  const key = `files/${fileId}-${fileName}`;

  const command = new DeleteObjectCommand({
    Bucket: config.s3Bucket,
    Key: key,
  });

  await client.send(command);
}

// ── DynamoDB Service Wrapper ──────────────────────────────────────

export async function putDdbItem(partitionKey: string, sortKey: string, data: any): Promise<void> {
  const config = getAWSConfig();
  const client = getDynamoClient();

  const command = new PutCommand({
    TableName: config.dynamoTable,
    Item: {
      partitionKey,
      sortKey,
      ...data,
      updatedAt: new Date().toISOString(),
    },
  });

  await client.send(command);
}

export async function getDdbItem(partitionKey: string, sortKey: string): Promise<any | null> {
  const config = getAWSConfig();
  const client = getDynamoClient();

  const command = new GetCommand({
    TableName: config.dynamoTable,
    Key: { partitionKey, sortKey },
  });

  const res = await client.send(command);
  return res.Item || null;
}

export async function deleteDdbItem(partitionKey: string, sortKey: string): Promise<void> {
  const config = getAWSConfig();
  const client = getDynamoClient();

  const command = new DeleteCommand({
    TableName: config.dynamoTable,
    Key: { partitionKey, sortKey },
  });

  await client.send(command);
}

export async function queryDdbItems(partitionKey: string): Promise<any[]> {
  const config = getAWSConfig();
  const client = getDynamoClient();

  const command = new QueryCommand({
    TableName: config.dynamoTable,
    KeyConditionExpression: "partitionKey = :pk",
    ExpressionAttributeValues: {
      ":pk": partitionKey,
    },
  });

  const res = await client.send(command);
  return res.Items || [];
}

export async function scanDdbItems(): Promise<any[]> {
  const config = getAWSConfig();
  const client = getDynamoClient();

  const command = new ScanCommand({
    TableName: config.dynamoTable,
  });

  const res = await client.send(command);
  return res.Items || [];
}

// ── Lambda Security Scan Wrapper ─────────────────────────────────

export interface LambdaScanResult {
  scanResult: "CLEAN" | "INFECTED";
  scanScore: number;
  threatsFound: string[];
  scannedAt: string;
}

export async function invokeSecurityScan(fileName: string, fileSize: number): Promise<LambdaScanResult> {
  const config = getAWSConfig();
  const client = getLambdaClient();

  const functionName = config.lambdaFunctionName || "cloudvault-security-scanner";
  const payload = JSON.stringify({ fileName, fileSize });

  const command = new InvokeCommand({
    FunctionName: functionName,
    Payload: new TextEncoder().encode(payload),
  });

  const response = await client.send(command);
  if (response.Payload) {
    const rawResult = JSON.parse(new TextDecoder().decode(response.Payload));
    // Support either direct return or lambda proxy body wrapper
    const body = typeof rawResult.body === "string" ? JSON.parse(rawResult.body) : rawResult.body || rawResult;
    return {
      scanResult: body.scanResult || "CLEAN",
      scanScore: body.scanScore || 0,
      threatsFound: body.threatsFound || [],
      scannedAt: body.scannedAt || new Date().toISOString(),
    };
  }

  throw new Error("Empty payload from security scan Lambda");
}



// ── Cognito Authentication Service Wrappers ──────────────────────

export async function cognitoSignUp(
  email: string,
  password: string,
  name: string
): Promise<{ userSub: string }> {
  const config = getAWSConfig();
  const client = getCognitoClient();

  const command = new SignUpCommand({
    ClientId: config.cognitoClientId,
    Username: email,
    Password: password,
    UserAttributes: [
      { Name: "name", Value: name },
    ],
  });

  const res = await client.send(command);
  return { userSub: res.UserSub || "" };
}

export interface CognitoSignInResult {
  accessToken: string;
  idToken: string;
  name: string;
  email: string;
}

export async function cognitoSignIn(
  email: string,
  password: string
): Promise<CognitoSignInResult> {
  const config = getAWSConfig();
  const client = getCognitoClient();

  const command = new InitiateAuthCommand({
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: config.cognitoClientId,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  });

  const res = await client.send(command);
  const authResult = res.AuthenticationResult;
  if (!authResult || !authResult.AccessToken || !authResult.IdToken) {
    throw new Error("Cognito authentication failed. Access or Id token is missing.");
  }

  // To retrieve user attributes like name, we would normally use GetUserCommand.
  // For client efficiency, we can parse the name attribute from the ID Token JWT payload!
  let name = "Cognito User";
  try {
    const idTokenPayload = JSON.parse(atob(authResult.IdToken.split(".")[1]));
    name = idTokenPayload.name || idTokenPayload["custom:name"] || "Cognito User";
  } catch (e) {
    console.error("Failed to parse name from Cognito ID token:", e);
  }

  return {
    accessToken: authResult.AccessToken,
    idToken: authResult.IdToken,
    name,
    email,
  };
}

export async function cognitoConfirmSignUp(email: string, code: string): Promise<void> {
  const config = getAWSConfig();
  const client = getCognitoClient();

  const command = new ConfirmSignUpCommand({
    ClientId: config.cognitoClientId,
    Username: email,
    ConfirmationCode: code,
  });

  await client.send(command);
}

export async function cognitoForgotPassword(email: string): Promise<void> {
  const config = getAWSConfig();
  const client = getCognitoClient();

  const command = new ForgotPasswordCommand({
    ClientId: config.cognitoClientId,
    Username: email,
  });

  await client.send(command);
}

export async function cognitoConfirmForgotPassword(
  email: string,
  code: string,
  password: any
): Promise<void> {
  const config = getAWSConfig();
  const client = getCognitoClient();

  const command = new ConfirmForgotPasswordCommand({
    ClientId: config.cognitoClientId,
    Username: email,
    ConfirmationCode: code,
    Password: password,
  });

  await client.send(command);
}

export async function cognitoResendConfirmationCode(email: string): Promise<void> {
  const config = getAWSConfig();
  const client = getCognitoClient();

  const command = new ResendConfirmationCodeCommand({
    ClientId: config.cognitoClientId,
    Username: email,
  });

  await client.send(command);
}
