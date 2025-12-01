import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const MAX_RETRIES = Number(process.env.MIGRATE_RETRIES ?? 12)
const RETRY_DELAY_MS = Number(process.env.MIGRATE_RETRY_DELAY_MS ?? 5000)

async function runMigrations() {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Running prisma migrate deploy (attempt ${attempt}/${MAX_RETRIES})`)
      const { stdout, stderr } = await execAsync('npx prisma migrate deploy', { env: process.env })
      if (stdout) console.log(stdout)
      if (stderr) console.error(stderr)
      console.log('Migrations applied successfully')
      return
    } catch (err) {
      console.error(`Migration attempt ${attempt} failed:`, err && err.message ? err.message : err)
      if (attempt < MAX_RETRIES) {
        console.log(`Waiting ${RETRY_DELAY_MS}ms before retrying...`)
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
      } else {
        throw err
      }
    }
  }
}

async function runDbPush() {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Running prisma db push for users (attempt ${attempt}/${MAX_RETRIES})`)
      const { stdout, stderr } = await execAsync('npx prisma db push --accept-data-loss', { env: process.env })
      if (stdout) console.log(stdout)
      if (stderr) console.error(stderr)
      console.log('Users schema pushed successfully (db push)')
      return
    } catch (err) {
      console.error(`db push attempt ${attempt} failed:`, err && err.message ? err.message : err)
      if (attempt < MAX_RETRIES) {
        console.log(`Waiting ${RETRY_DELAY_MS}ms before retrying db push...`)
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
      } else {
        throw err
      }
    }
  }
}

(async () => {
  try {
    await runMigrations()
  } catch (err) {
    console.error('Migrations failed after retries, attempting prisma db push as fallback.', err)
    try {
      await runDbPush()
    } catch (err2) {
      console.error('db push fallback also failed, exiting.', err2)
      process.exit(1)
    }
  }

  try {
    // Start the actual application (index.js performs app.listen)
    await import('./index.js')
  } catch (err) {
    console.error('Failed to start app after migrations:', err)
    process.exit(1)
  }
})()
