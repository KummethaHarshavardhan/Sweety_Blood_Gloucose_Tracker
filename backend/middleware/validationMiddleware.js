import { body, param, query, validationResult } from 'express-validator';
import { ApiError } from './errorMiddleware.js';
import {
  GLUCOSE_MAX,
  GLUCOSE_MIN,
  TIME_SLOTS,
  isValidDateString,
  todayInAppTimezone,
} from '../models/readingModel.js';


export const validate = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result.array().map((err) => ({ field: err.path, message: err.msg }));
  return next(new ApiError(400, errors[0].message, 'VALIDATION_ERROR', errors));
};

const isEmptyValue = (value) =>
  value === undefined || value === null || String(value).trim() === '';

export const registerRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required.')
    .isLength({ max: 100 }).withMessage('Name must be 100 characters or fewer.'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please enter a valid email address.')
    .isLength({ max: 150 }).withMessage('Email must be 150 characters or fewer.'),
  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .matches(/[A-Za-z]/).withMessage('Password must contain at least one letter.')
    .matches(/\d/).withMessage('Password must contain at least one number.'),
];

export const loginRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please enter a valid email address.'),
  body('password').notEmpty().withMessage('Password is required.'),
];

export const readingRules = [
  body('readingDate').custom((value) => {
    if (isEmptyValue(value)) throw new Error('Please select a date.');
    if (!isValidDateString(value)) throw new Error('Please enter a valid date.');
    if (value > todayInAppTimezone()) throw new Error('Date cannot be in the future.');
    return true;
  }),
  body('timeSlot')
    .isIn(TIME_SLOTS).withMessage('Please select a valid time slot.'),
  body('glucoseValue').custom((value) => {
    if (isEmptyValue(value)) throw new Error('Please enter a glucose value.');
    const number = Number(value);
    if (!Number.isInteger(number) || number < GLUCOSE_MIN || number > GLUCOSE_MAX) {
      throw new Error(`Value must be between ${GLUCOSE_MIN} and ${GLUCOSE_MAX} mg/dl.`);
    }
    return true;
  }),
];

export const idParamRules = [
  param('id').isUUID().withMessage('Invalid reading id.'),
];

export const optionalDateQueryRule = (name) =>
  query(name)
    .optional()
    .custom((value) => {
      if (!isValidDateString(value)) throw new Error('Date must be in YYYY-MM-DD format.');
      return true;
    });

export const readingListQueryRules = [
  optionalDateQueryRule('from'),
  optionalDateQueryRule('to'),
];

export const reportDateQueryRules = [optionalDateQueryRule('date')];
