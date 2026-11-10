// Isolated local demonstration. Never point this process at production data.
import express from 'express';
import { randomBytes, scryptSync } from 'node:crypto';
import { resolve } from 'node:path';
import { createApp } from './index.js';
if (process.env.NODE_ENV === 'production') throw new Error('Demo disabled in production');
const port=Number(process.env.DEMO_PORT||3001);
const password='Demo-Salud-2026!';
const {app,db}=createApp({dataDir:resolve('data/demo'),secret:'isolated-demo-key-not-for-real-patient-data',origin:`http://localhost:${port}`});
const people=[['demo-patient','paciente@example.test','Ana · Paciente ficticia','patient'],['demo-doctor','medico@example.test','Dr. Rivera · Médico ficticio','doctor'],['demo-admin','admin@example.test','Administración · Demo','admin']];
const now=new Date().toISOString();
for (const [id,email,name,role] of people){const salt=randomBytes(16).toString('hex');const hash=`${salt}:${scryptSync(password,salt,64).toString('hex')}`;db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET password_hash=excluded.password_hash').run(id,email,name,hash,role,now);db.prepare('INSERT OR IGNORE INTO memberships VALUES(?,?,?,?,?)').run(id,'individual',null,'active',now)}
db.prepare("INSERT OR IGNORE INTO doctor_profiles(user_id,specialty,license_number,bio,status) VALUES(?,?,?,?,?)").run('demo-doctor','Medicina general','FICTICIO-NO-VALIDO','Perfil ficticio para explorar el producto. No ofrece atención médica.','verified');
for(let i=1;i<=6;i++){const start=new Date(Date.now()+i*86400000);start.setUTCHours(15,0,0,0);const end=new Date(+start+1800000);db.prepare('INSERT INTO slots VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET starts_at=excluded.starts_at,ends_at=excluded.ends_at').run(`demo-slot-${i}`,'demo-doctor',start.toISOString(),end.toISOString())}
db.prepare('INSERT OR IGNORE INTO appointments VALUES(?,?,?,?,?,?,?)').run('demo-consultation','demo-patient','demo-doctor','demo-slot-1','booked','demo-video-disabled',now);
const wrapper=express();
wrapper.get('/api/demo',(req,res)=>res.json({password,accounts:people.map(([,email,name,role])=>({email,name,role}))}));
wrapper.use(app);
wrapper.listen(port,'127.0.0.1',()=>console.log(`Demo local con datos ficticios: http://localhost:${port}`));
