import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

async function main() {
  const counts = await prisma.auditLog.groupBy({
    by: ['action'],
    _count: { action: true },
    where: {
      action: {
        in: ['DEBT_PAYMENT', 'SALE_CREATE', 'CUSTOMER_CREATE', 'SESSION_OPEN'],
      },
    },
  })
  for (const c of counts) {
    console.log(`${c.action}: ${c._count.action}`)
  }
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
