import 'dotenv/config';
import bcrypt from 'bcrypt';
import prisma from '../config/db.js';
import { TIME_SLOTS, toDateObject, todayInAppTimezone } from '../models/readingModel.js';

const DEMO_USER = {
  name: 'Sweety Demo',
  email: 'demo@sweety.com',
  password: 'Sweety@123',
};

const DAYS_OF_DATA = 30;

// Typical value range for each slot (mg/dl)
const BASE_VALUES = { MORNING: 95, AFTER_BREAKFAST: 150, AFTER_LUNCH: 135, AFTER_DINNER: 120 };

// Moves a YYYY-MM-DD string back by a number of days
const shiftDate = (dateString, days) => {
  const date = toDateObject(dateString);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Demo seed is disabled in production. Never create the public demo account in a production database.');
  }

  const passwordHash = await bcrypt.hash(DEMO_USER.password, 10);

  // upsert makes the seed safe to run more than once
  const user = await prisma.user.upsert({
    where: { email: DEMO_USER.email },
    update: { name: DEMO_USER.name, password: passwordHash },
    create: { name: DEMO_USER.name, email: DEMO_USER.email, password: passwordHash },
  });

  const today = todayInAppTimezone();
  let saved = 0;

  for (let dayOffset = 0; dayOffset < DAYS_OF_DATA; dayOffset++) {
    const readingDate = shiftDate(today, -dayOffset); // never a future date

    for (let slotIndex = 0; slotIndex < TIME_SLOTS.length; slotIndex++) {
      const timeSlot = TIME_SLOTS[slotIndex];
      // Deterministic variation so the chart looks realistic and reruns produce the same data
      const glucoseValue = BASE_VALUES[timeSlot] + ((dayOffset * 7 + slotIndex * 13) % 35) - 12;

      await prisma.reading.upsert({
        where: {
          userId_readingDate_timeSlot: {
            userId: user.id,
            readingDate: toDateObject(readingDate),
            timeSlot,
          },
        },
        update: { glucoseValue },
        create: {
          userId: user.id,
          readingDate: toDateObject(readingDate),
          timeSlot,
          glucoseValue,
        },
      });
      saved++;
    }
  }

  console.log(`Seed complete. Demo user: ${DEMO_USER.email} / ${DEMO_USER.password}`);
  console.log(`Readings upserted: ${saved} (${DAYS_OF_DATA} days x 4 slots)`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
