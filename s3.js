import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import pdf from "pdf-poppler";
import sharp from "sharp";

async function convertPDFFile(file, fileName) {
  // Extract just the name without the .pdf extension to use as the prefix
  const originalName = path.parse(fileName).name;
  const prefix = "thumb+" + originalName;

  let opts = {
    format: "jpeg",
    out_dir: "./tmp",
    out_prefix: prefix,
    page: 1,
  };

  try {
    // pdf-poppler doesn't return the filename, we must reconstruct it.
    // It appends a page number (e.g. '-1') to your prefix and saves it as .jpg (based on format)
    await pdf.convert(file, opts);
    return `${prefix}-001.jpg`;
  } catch (err) {
    console.error("Error during PDF conversion:", err);
    throw err;
  }
}

export async function generateThumbnail(fileName) {
  const fileURL = await generateCatalogueDownloadURL(fileName);

  console.log("The download url is \n" + fileURL);

  // pdf-poppler requires a local file path, so we must download the file first
  // We'll save it to the existing ./tmp directory
  const tempPdfPath = path.join("./tmp", path.basename(fileName));

  try {
    // 1. Download the PDF from the presigned URL
    const response = await fetch(fileURL);
    if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }
    
    // We convert the network response to a Node Buffer and save it to disk
    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(tempPdfPath, Buffer.from(arrayBuffer));
    console.log(`Downloaded PDF temporarily to ${tempPdfPath}`);

    // 2. Pass the local file path to pdf-poppler
    const generatedImageName = await convertPDFFile(tempPdfPath, fileName);
    const imagePath = path.join("./tmp", generatedImageName);

    // 3. Process the image with sharp
    const thumbnailBuffer = fs.readFileSync(imagePath);  
    const thumbnail = await sharp(thumbnailBuffer).resize(300, 400, {
      fit: "cover"
    }).jpeg({ quality: 80 }).toBuffer();

    // 4. Upload the thumbnail to S3 as "thumb+originalfilename"
    const originalName = path.parse(fileName).name;
    const thumbnailKey = `thumbnails/thumb+${originalName}.jpg`;
    
    const uploadParams = {
      Bucket: "fyp-assets",
      Key: thumbnailKey,
      Body: thumbnail,
      ContentType: "image/jpeg",
      ACL: 'public-read'
    };

    await thumbnailClient.send(new PutObjectCommand(uploadParams));
    console.log(`Uploaded thumbnail to ${thumbnailKey}`);

    // Clean up local thumbnail image
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

  } catch (err) {
    console.error("Failed to generate thumbnail:", err);
  } finally {
    // Clean up the temporary PDF file so we don't clutter the server
    if (fs.existsSync(tempPdfPath)) {
      fs.unlinkSync(tempPdfPath);
    }
  }
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

export const thumbnailClient = new S3Client({
  forcePathStyle: false, // Configures to use subdomain/virtual calling format.
  endpoint: "https://lon1.digitaloceanspaces.com",
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.ASSET_SPACES_KEY,
    secretAccessKey: process.env.ASSET_SPACES_SECRET,
  },
});

export async function generateCatalogueUploadURL(fileName, fileType) {
  const catalogueParams = {
    Bucket: "cataloguefiles",
    Key: `ebooks/${fileName}`,
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

export async function generateCatalogueDownloadURL(fileName) {
  const s3Params = {
    Bucket: "cataloguefiles",
    Key: `ebooks/${fileName}`,

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

export async function deleteCatalogueFile(fileName) {
  const command = new DeleteObjectCommand({
    Bucket: "cataloguefiles",
    Key: `ebooks/${fileName}`,
  });

  try {
    await catalogueClient.send(command);
    console.log(`Successfully deleted ${fileName} from cataloguefiles`);
  } catch (err) {
    console.error("Failed to delete catalogue file:", err);
    throw err;
  }
}

export async function deleteThumbnailFile(fileName) {
  const originalName = path.parse(fileName).name;
  const thumbnailKey = `thumbnails/thumb+${originalName}.jpg`;

  const command = new DeleteObjectCommand({
    Bucket: "fyp-assets",
    Key: thumbnailKey,
  });

  try {
    await thumbnailClient.send(command);
    console.log(`Successfully deleted ${thumbnailKey} from fyp-assets`);
  } catch (err) {
    console.error("Failed to delete thumbnail file:", err);
    throw err;
  }
}
