import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

const SALT_LENGTH = 64;
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return salt.toString("base64") + ":" + derivedKey.toString("base64");
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const parts = hash.split(":");
  if (parts.length !== 2) {
    return false;
  }

  const salt = Buffer.from(parts[0], "base64");
  const storedKey = Buffer.from(parts[1], "base64");

  if (salt.length !== SALT_LENGTH || storedKey.length !== KEY_LENGTH) {
    return false;
  }

  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;

  return timingSafeEqual(derivedKey, storedKey);
}
