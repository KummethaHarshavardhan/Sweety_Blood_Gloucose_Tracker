import { ApiError } from '../middleware/errorMiddleware.js';
import {
  MAX_READINGS_PER_DAY,
  countReadingsOnDate,
  deleteReadingForUser,
  duplicateSlotMessage,
  findReadingForUser,
  findSlotConflict,
  formatReading,
  insertReading,
  listReadingsForUser,
  updateReadingById,
} from '../models/readingModel.js';


const assertReadingAllowed = async ({ userId, readingDate, timeSlot, excludeId }) => {
  const conflict = await findSlotConflict({ userId, readingDate, timeSlot, excludeId });
  if (conflict) {
    throw new ApiError(409, duplicateSlotMessage(timeSlot), 'DUPLICATE_SLOT');
  }

  const dayCount = await countReadingsOnDate({ userId, readingDate, excludeId });
  if (dayCount >= MAX_READINGS_PER_DAY) {
    throw new ApiError(409, 'You can add only 4 readings per day.', 'DAILY_LIMIT');
  }
};

const readingPayload = (req) => ({
  readingDate: req.body.readingDate,
  timeSlot: req.body.timeSlot,
  glucoseValue: Number(req.body.glucoseValue),
});


export const listReadings = async (req, res) => {
  const readings = await listReadingsForUser({
    userId: req.user.id,
    from: req.query.from,
    to: req.query.to,
  });

  res.json({
    success: true,
    data: { readings: readings.map(formatReading) },
  });
};


export const getReading = async (req, res) => {
  const reading = await findReadingForUser(req.params.id, req.user.id);
  if (!reading) throw new ApiError(404, 'Reading not found.', 'READING_NOT_FOUND');

  res.json({ success: true, data: { reading: formatReading(reading) } });
};


export const createReading = async (req, res) => {
  const userId = req.user.id;
  const { readingDate, timeSlot, glucoseValue } = readingPayload(req);

  await assertReadingAllowed({ userId, readingDate, timeSlot });

  let reading;
  try {
    reading = await insertReading({ userId, readingDate, timeSlot, glucoseValue });
  } catch (err) {
    if (err.code === 'P2002') {
      throw new ApiError(409, duplicateSlotMessage(timeSlot), 'DUPLICATE_SLOT');
    }
    throw err;
  }

  res.status(201).json({
    success: true,
    message: 'Reading saved.',
    data: { reading: formatReading(reading) },
  });
};


export const updateReading = async (req, res) => {
  const userId = req.user.id;
  const existing = await findReadingForUser(req.params.id, userId);
  if (!existing) throw new ApiError(404, 'Reading not found.', 'READING_NOT_FOUND');

  const { readingDate, timeSlot, glucoseValue } = readingPayload(req);

  await assertReadingAllowed({ userId, readingDate, timeSlot, excludeId: existing.id });

  let reading;
  try {
    reading = await updateReadingById(existing.id, { readingDate, timeSlot, glucoseValue });
  } catch (err) {
    if (err.code === 'P2002') {
      throw new ApiError(409, duplicateSlotMessage(timeSlot), 'DUPLICATE_SLOT');
    }
    throw err;
  }

  res.json({
    success: true,
    message: 'Reading updated.',
    data: { reading: formatReading(reading) },
  });
};


export const deleteReading = async (req, res) => {
  const result = await deleteReadingForUser(req.params.id, req.user.id);
  if (result.count === 0) throw new ApiError(404, 'Reading not found.', 'READING_NOT_FOUND');

  res.json({ success: true, message: 'Reading deleted.', data: null });
};
