import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

export function openDb(dir) {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const db = new Database(join(dir, 'app.sqlite'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'patient' CHECK(role IN ('patient','doctor','admin')), created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, csrf TEXT NOT NULL, expires_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS doctor_profiles (user_id TEXT PRIMARY KEY REFERENCES users(id), specialty TEXT NOT NULL, license_number TEXT NOT NULL, bio TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','verified','rejected')), reviewed_at TEXT, reviewed_by TEXT REFERENCES users(id));
    CREATE TABLE IF NOT EXISTS slots (id TEXT PRIMARY KEY, doctor_id TEXT NOT NULL REFERENCES users(id), starts_at TEXT NOT NULL, ends_at TEXT NOT NULL, UNIQUE(doctor_id, starts_at));
    CREATE TABLE IF NOT EXISTS appointments (id TEXT PRIMARY KEY, patient_id TEXT NOT NULL REFERENCES users(id), doctor_id TEXT NOT NULL REFERENCES users(id), slot_id TEXT NOT NULL UNIQUE REFERENCES slots(id), status TEXT NOT NULL DEFAULT 'booked' CHECK(status IN ('booked','completed','cancelled')), video_room TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, appointment_id TEXT NOT NULL REFERENCES appointments(id), author_id TEXT NOT NULL REFERENCES users(id), body_enc TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS clinical_notes (appointment_id TEXT PRIMARY KEY REFERENCES appointments(id), body_enc TEXT NOT NULL, updated_at TEXT NOT NULL, author_id TEXT NOT NULL REFERENCES users(id));
    CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, appointment_id TEXT NOT NULL REFERENCES appointments(id), uploaded_by TEXT NOT NULL REFERENCES users(id), name TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL, path TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS consent (appointment_id TEXT NOT NULL REFERENCES appointments(id), patient_id TEXT NOT NULL REFERENCES users(id), purpose TEXT NOT NULL CHECK(purpose IN ('ai_assist','recording')), granted INTEGER NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(appointment_id,purpose));
    CREATE TABLE IF NOT EXISTS organizations (id TEXT PRIMARY KEY, name TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS memberships (user_id TEXT PRIMARY KEY REFERENCES users(id), plan TEXT NOT NULL CHECK(plan IN ('none','individual','family','enterprise')), organization_id TEXT REFERENCES organizations(id), status TEXT NOT NULL CHECK(status IN ('inactive','active')), updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY AUTOINCREMENT, actor_id TEXT, action TEXT NOT NULL, target_type TEXT NOT NULL, target_id TEXT, created_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_slots_date ON slots(starts_at);
    CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
    CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
    CREATE INDEX IF NOT EXISTS idx_audit_time ON audit(created_at);
  `);
  return db;
}
