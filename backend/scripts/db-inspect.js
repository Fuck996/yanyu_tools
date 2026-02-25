import sqlite3 from 'sqlite3'
import { join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const dbPath = process.env.DB_PATH || join(__dirname, '..', 'data', 'yanyu_tools.db')
const db = new sqlite3.Database(dbPath, (err)=>{ if(err) { console.error('DB open error', err); process.exit(1)} })

function q(sql){ return new Promise((res, rej)=> db.all(sql, (e, rows)=> e?rej(e):res(rows))) }

(async()=>{
  try{
    console.log('DB PATH:', dbPath)
    const users = await q("SELECT id, github_id, username FROM users")
    console.log('USERS:', users)
    const recs = await q("SELECT id, user_id, equipment_type, location, equipment_name, created_at FROM equipment_records ORDER BY created_at DESC LIMIT 100")
    console.log('RECORDS_COUNT:', recs.length)
    if(recs.length>0) console.log(recs.slice(0,20))
    process.exit(0)
  }catch(err){ console.error(err); process.exit(2) }
})()
