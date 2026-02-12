import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create or update SystemSettings (only one row should exist)
  const systemSettings = await prisma.systemSettings.upsert({
    where: { id: 'system-config' },
    update: {},
    create: {
      id: 'system-config',
      currencyName: 'Chips',
      startingBalance: 1000,
      dailyAllowanceBase: 100,
      weeklyBonusAmount: 500,
      transferMaxAmount: 1000,
      transferDailyLimit: 5000,
      defaultBetPresets: [50, 100, 250, 500],
      defaultPayoutRatios: [
        { position: 1, percentage: 60 },
        { position: 2, percentage: 30 },
        { position: 3, percentage: 10 }
      ],
      afkGracePeriodSec: 30,
      alertTransferLimit: 2000,
      alertBalanceDropPct: 50,
    },
  })

  console.log('SystemSettings created:', systemSettings)
}

main()
  .catch((e) => {
    console.error('Seeding error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
