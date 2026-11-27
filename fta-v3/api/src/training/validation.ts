import {UnprocessableEntityException} from '@nestjs/common';
import {TrainingStatus, Prisma} from '@prisma/client';
export function invalid(field:string):never {throw new UnprocessableEntityException({error:'Invalid input',field});}
export function record(x:unknown):Record<string,unknown> {if(!x||typeof x!=='object'||Array.isArray(x))invalid('body');return x as Record<string,unknown>;}
export function str(x:unknown,field:string,max:number,min=1):string {if(typeof x!=='string'||x.trim().length<min||x.length>max)invalid(field);return x.trim();}
export function password(x:unknown,min=12):string {if(typeof x!=='string'||x.length<min||x.length>128)invalid('password');return x;}
export function email(x:unknown):string {const e=str(x,'email',190).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))invalid('email');return e;}
export function phone(x:unknown):string {const p=str(x,'phone',25).replace(/[۰-۹٠-٩]/g,c=>String(c.charCodeAt(0)-(c.charCodeAt(0)>=1776?1776:1632))).replace(/^(?:\+98|0098)/,'0');if(!/^09[0-9]{9}$/.test(p))invalid('phone');return p;}
export function date(x:unknown,field:string):Date {if(typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x))invalid(field);const d=new Date(x+'T00:00:00.000Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==x)invalid(field);return d;}
export function optionalDate(x:unknown,field:string):Date|null {return x==null||x===''?null:date(x,field);}
export function optionalText(x:unknown,field:string,max:number):string|null {return x==null||x===''?null:str(x,field,max);}
export function today():string {const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const g=(s:string)=>p.find(x=>x.type===s)!.value;return g('year')+'-'+g('month')+'-'+g('day');}
export function planBody(x:unknown) {
 const b=record(x);const athleteId=str(b.athlete_id,'athlete_id',80),title=str(b.title,'title',180);
 const startsOn=optionalDate(b.starts_on,'starts_on'),endsOn=optionalDate(b.ends_on,'ends_on');
 if(startsOn&&endsOn&&startsOn>endsOn)invalid('ends_on');
 const status=({draft:'DRAFT',published:'PUBLISHED',archived:'ARCHIVED'} as const)[String(b.status) as 'draft'|'published'|'archived'];
 if(!Object.values(TrainingStatus).includes(status))invalid('status');
 if(!Array.isArray(b.sessions)||b.sessions.length<1||b.sessions.length>30)invalid('sessions');
 const days=new Set<string>();
 const sessions=b.sessions.map(raw=>{const s=record(raw),day=str(s.day,'day',80);if(days.has(day))invalid('duplicate_day');days.add(day);if(!Array.isArray(s.exercises)||s.exercises.length<1||s.exercises.length>40)invalid('exercises');
 return {day,exercises:s.exercises.map(raw=>{const e=record(raw);if(e.sets!=null&&(!Number.isInteger(e.sets)||Number(e.sets)<1||Number(e.sets)>30))invalid('sets');return {name:str(e.name,'name',180),sets:e.sets==null?null:Number(e.sets),reps:optionalText(e.reps,'reps',60)};})};});
 return {athleteId,title,description:optionalText(b.description,'description',10000),startsOn,endsOn,status,sessions:sessions as Prisma.InputJsonValue};
}
