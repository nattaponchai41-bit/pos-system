import { PrismaClient } from '@/generated/prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

function parseDatabaseUrl(url: string) {
  try {
    const parsed = new URL(url)
    return {
      host: parsed.hostname || 'localhost',
      port: parsed.port ? Number(parsed.port) : 3306,
      user: decodeURIComponent(parsed.username) || 'root',
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\//, '') || undefined,
    }
  } catch {
    return null
  }
}

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not defined')
  }

  const parsed = parseDatabaseUrl(databaseUrl)
  if (!parsed) {
    throw new Error('DATABASE_URL is not a valid URL')
  }

  // Limit the connection pool to avoid exhausting MySQL max_connections.
  // A small fixed pool is shared across all API requests in one process.
  const adapter = new PrismaMariaDb({
    host: parsed.host,
    port: parsed.port,
    user: parsed.user,
    password: parsed.password,
    database: parsed.database,
    connectionLimit: 20,
    minimumIdle: 5,
    idleTimeout: 300,
    acquireTimeout: 10000,
  })

  const client = new PrismaClient({ adapter })

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client
  }

  return client
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()
