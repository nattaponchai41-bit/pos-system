import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

async function main() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { user: { select: { name: true } } },
  })
  console.log(JSON.stringify(logs, null, 2))
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
