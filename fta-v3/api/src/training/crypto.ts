import {randomBytes, scrypt, timingSafeEqual, createHash} from 'node:crypto';
import {promisify} from 'node:util';
const derive=promisify(scrypt);
const dummySalt='00000000000000000000000000000000';
export const digest=(x:string)=>createHash('sha256').update(x).digest('hex');
export const token=()=>randomBytes(32).toString('hex');
export async function hashPassword(value:string){const salt=randomBytes(16).toString('hex');const key=await derive(value,salt,64) as Buffer;return salt+':'+key.toString('hex');}
export async function checkPassword(value:string,stored?:string|null){const parts=stored?.split(':')??[];const valid=parts.length===2&&/^[a-f0-9]{32}$/.test(parts[0])&&/^[a-f0-9]{128}$/.test(parts[1]);const key=await derive(value,valid?parts[0]:dummySalt,64) as Buffer;const target=valid?Buffer.from(parts[1],'hex'):Buffer.alloc(64);return timingSafeEqual(key,target)&&valid;}
