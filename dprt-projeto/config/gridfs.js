import mongoose from "mongoose";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const bucket = (bucketName = "radiografias") =>
  new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName });

export async function salvarImagem(buffer, { nome, contentType, metadata, bucketName }) {
  const upload = bucket(bucketName).openUploadStream(nome, { contentType, metadata });
  await pipeline(Readable.from(buffer), upload);
  return upload.id;
}

export const removerImagem = (id, bucketName) => bucket(bucketName).delete(id);
export const abrirImagem = (id, bucketName) => bucket(bucketName).openDownloadStream(id);
