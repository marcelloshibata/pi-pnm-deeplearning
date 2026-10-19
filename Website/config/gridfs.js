import mongoose from "mongoose";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const bucket = () =>
  new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: "radiografias",
  });

export async function salvarImagem(buffer, { nome, contentType, metadata }) {
  const upload = bucket().openUploadStream(nome, { contentType, metadata });
  await pipeline(Readable.from(buffer), upload);
  return upload.id;
}

export const removerImagem = (id) => bucket().delete(id);
export const abrirImagem = (id) => bucket().openDownloadStream(id);
