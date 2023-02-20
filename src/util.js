import { randomBytes } from 'crypto'
import { unlink, rm, mkdir as fsMkdir } from 'node:fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

export function delFile (file) {
  return unlink(file)
}

export function delFolder (f) {
  return rm(f, {
    recursive: true,
    force: true
  })
}

export function mkdir (f) {
  return fsMkdir(f, { recursive: true })
}

export function rnd () {
  return randomBytes(32).toString('hex')
}

export const __filename = () => {
  return fileURLToPath(import.meta.url)
}

export const __dirname = (fileName) => {
  return path.dirname(fileName);
}

