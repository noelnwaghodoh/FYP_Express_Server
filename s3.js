import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import dotenv from "dotenv";
dotenv.config();

const path = require("path");
const pdf = require("pdf-poppler");

function convertPDFFile(file) {
  let opts = {
    format: "jpeg",
    out_dir: path.dirname(file),
    out_prefix: path.basename(file, path.extname(file)),
    page: null,
  };

  pdf
    .convert(file, opts)
    .then((res) => {
      console.log("Successfully converted");
    })
    .catch((error) => {
      console.error(error);
    });
}

export const catalogueClient = new S3Client({
  forcePathStyle: false, // Configures to use subdomain/virtual calling format.
  endpoint: "https://lon1.digitaloceanspaces.com",
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.SPACES_KEY,
    secretAccessKey: process.env.SPACES_SECRET,
  },
});

export async function generateCatalogueUploadURL(fileName, fileType) {
  const catalogueParams = {
    Bucket: "cataloguefiles",
    Key: fileName,
    ContentType: fileType,
    // ACL: 'bucket-owner-full-control'
  };

  const command = new PutObjectCommand(catalogueParams);

  try {
    const signedUrl = await getSignedUrl(catalogueClient, command, {
      expiresIn: 3600,
    });
    return signedUrl;
  } catch (err) {
    console.error(err);
  }
}

export async function generateDownloadURL(fileName) {
  const s3Params = {
    Bucket: "cataloguefiles",
    Key: fileName,

    // ACL: 'bucket-owner-full-control'
  };

  const command = new GetObjectCommand(s3Params);

  try {
    const signedUrl = await getSignedUrl(catalogueClient, command, {
      expiresIn: 3600,
    });
    return signedUrl;
  } catch (err) {
    console.error(err);
  }
}
