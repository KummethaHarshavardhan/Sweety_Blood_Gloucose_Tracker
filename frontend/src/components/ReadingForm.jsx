import { useState } from 'react';
import { readingAPI } from '../services/readingAPI.js';
import { getErrorMessage } from '../services/api.js';
import { MAX_READINGS_PER_DAY, SLOT_BY_VALUE, TIME_SLOTS } from '../utils/constants.js';
import { toLocalDateString } from '../utils/dateUtils.js';
import { validateReading } from '../utils/validators.js';

// Used for both "add" (reading = null) and "edit" (reading = existing reading)
export default function ReadingForm({ reading = null, defaultDate, onSaved, onCancel }) {
  const today = toLocalDateString();
  const isEdit = Boolean(reading);

  const [values, setValues] = useState({
    readingDate: reading?.readingDate || defaultDate || today,
    timeSlot: reading?.timeSlot || 'MORNING',
    glucoseValue: reading ? String(reading.glucoseValue) : '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    setFormError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    const errors = validateReading({ ...values, today });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const payload = {
      readingDate: values.readingDate,
      timeSlot: values.timeSlot,
      glucoseValue: Number(values.glucoseValue),
    };

    setSubmitting(true);
    try {
      // Check the same day first, so the user sees the slot and limit rules before the server call
      const sameDay = await readingAPI.list({ from: payload.readingDate, to: payload.readingDate });
      const others = sameDay.filter((item) => item.id !== reading?.id);

      if (others.some((item) => item.timeSlot === payload.timeSlot)) {
        setFormError(`You already have ${SLOT_BY_VALUE[payload.timeSlot].phrase} reading for this date.`);
        return;
      }
      if (others.length >= MAX_READINGS_PER_DAY) {
        setFormError(`You can add only ${MAX_READINGS_PER_DAY} readings per day.`);
        return;
      }

      if (isEdit) {
        await readingAPI.update(reading.id, payload);
        onSaved('Reading updated successfully.');
      } else {
        await readingAPI.create(payload);
        onSaved('Reading saved successfully.');
      }
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="reading-form" onSubmit={handleSubmit} noValidate>
      <div className="form-field">
        <label htmlFor="readingDate">Date</label>
        <input
          id="readingDate"
          name="readingDate"
          type="date"
          max={today}
          value={values.readingDate}
          onChange={handleChange}
          aria-invalid={Boolean(fieldErrors.readingDate)}
        />
        {fieldErrors.readingDate && <span className="field-error">{fieldErrors.readingDate}</span>}
      </div>

      <div className="form-field">
        <label htmlFor="timeSlot">Time slot</label>
        <select id="timeSlot" name="timeSlot" value={values.timeSlot} onChange={handleChange}>
          {TIME_SLOTS.map((slot) => (
            <option key={slot.value} value={slot.value}>
              {slot.label}
            </option>
          ))}
        </select>
        {fieldErrors.timeSlot && <span className="field-error">{fieldErrors.timeSlot}</span>}
      </div>

      <div className="form-field">
        <label htmlFor="glucoseValue">Glucose value (mg/dl)</label>
        <input
          id="glucoseValue"
          name="glucoseValue"
          type="number"
          inputMode="numeric"
          placeholder="e.g. 120"
          min="40"
          max="600"
          step="1"
          value={values.glucoseValue}
          onChange={handleChange}
          aria-invalid={Boolean(fieldErrors.glucoseValue)}
        />
        {fieldErrors.glucoseValue && <span className="field-error">{fieldErrors.glucoseValue}</span>}
      </div>

      {formError && (
        <div className="alert alert-error" role="alert">
          {formError}
        </div>
      )}

      <div className="modal-actions">
        <button type="button" className="btn btn-outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Saving...' : isEdit ? 'Update reading' : 'Save reading'}
        </button>
      </div>
    </form>
  );
}
