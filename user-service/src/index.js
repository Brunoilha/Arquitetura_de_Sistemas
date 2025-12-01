import express from 'express'
import { PrismaClient } from '@prisma/client'

const app = express()
const prisma = new PrismaClient()

app.use(express.json())

app.post('/users', async (req, res) => {
  try {
    const { name, email } = req.body
    if (!name || !email) return res.status(400).json({ error: 'name and email are required' })
    const user = await prisma.user.create({ data: { name, email } })
    res.status(201).json(user)
  } catch (err) {
    console.error('create user error:', err && err.message ? err.message : err)
    // Handle Prisma unique-constraint error (P2002) specifically and return 409 Conflict
    // err.code is present on PrismaClientKnownRequestError instances
    if (err && err.code === 'P2002') {
      return res.status(409).json({ error: 'Email already exists' })
    }
    // Fallback: return safe 500
    res.status(500).json({ error: 'Failed to create user' })
  }
})

app.get('/users', async (_req, res) => {
  const users = await prisma.user.findMany()
  res.json(users)
})

app.get('/users/:id', async (req, res) => {
  const { id } = req.params
  try {
    const user = await prisma.user.findUnique({ where: { id: Number(id) } })
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json(user)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})


app.listen(3005, () => console.log('Users service running on port 3005'))
