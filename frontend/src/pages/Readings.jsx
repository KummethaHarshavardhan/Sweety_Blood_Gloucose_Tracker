import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import Loading from '../components/Loading.jsx';
import ReadingTable from '../components/ReadingTable.jsx';
import ReadingForm from '../components/ReadingForm.jsx';
import Modal, { ConfirmDialog } from '../components/Modal.jsx';
import { readingAPI } from '../services/readingAPI.js';
import { getErrorMessage } from '../services/api.js';
import { shiftDays, toLocalDateString } from '../utils/dateUtils.js';

export default function Readings() {
  const today = toLocalDateString();
  const [range, setRange] = useState({ from: shiftDays(today, -29), to: today });
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const rangeIsValid = range.from <= range.to;

  const load = useCallback(async () => {
    if (range.from > range.to) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setReadings(await readingAPI.list({ from: range.from, to: range.to }));
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load readings.'));
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRangeChange = (event) => {
    const { name, value } = event.target;
    setRange((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaved = async (message) => {
    setFormOpen(false);
    setEditing(null);
    setNotice(message);
    await load();
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await readingAPI.remove(toDelete.id);
      setToDelete(null);
      setNotice('Reading deleted.');
      await load();
    } catch (err) {
      setToDelete(null);
      setError(getErrorMessage(err, 'Could not delete the reading.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page readings-page">
      <div className="page-header">
        <div>
          <h1>Readings</h1>
          <p className="page-subtitle">Add, edit and delete your glucose readings.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setFormOpen(true)}>
          <Plus size={18} /> Add reading
        </button>
      </div>

      <div className="card filter-card">
        <div className="form-field">
          <label htmlFor="from">From</label>
          <input id="from" name="from" type="date" max={range.to} value={range.from} onChange={handleRangeChange} />
        </div>
        <div className="form-field">
          <label htmlFor="to">To</label>
          <input id="to" name="to" type="date" max={today} value={range.to} onChange={handleRangeChange} />
        </div>
        <div className="quick-ranges">
          <button className="btn btn-outline btn-small" onClick={() => setRange({ from: shiftDays(today, -6), to: today })}>
            Last 7 days
          </button>
          <button className="btn btn-outline btn-small" onClick={() => setRange({ from: shiftDays(today, -29), to: today })}>
            Last 30 days
          </button>
        </div>
      </div>

      {!rangeIsValid && (
        <div className="alert alert-error" role="alert">
          The start date must be on or before the end date.
        </div>
      )}
      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="alert alert-success" role="status">
          {notice}
        </div>
      )}

      <section className="card">
        <div className="card-header">
          <h3>{readings.length} reading{readings.length === 1 ? '' : 's'} in this range</h3>
        </div>
        {loading ? (
          <Loading message="Loading readings..." />
        ) : (
          <ReadingTable
            readings={readings}
            showDate
            onEdit={(reading) => setEditing(reading)}
            onDelete={(reading) => setToDelete(reading)}
            emptyTitle="No readings in this range"
            emptyText="Change the dates above or add a new reading."
          />
        )}
      </section>

      <Modal open={formOpen} title="Add reading" onClose={() => setFormOpen(false)}>
        <ReadingForm defaultDate={today} onSaved={handleSaved} onCancel={() => setFormOpen(false)} />
      </Modal>

      <Modal open={Boolean(editing)} title="Edit reading" onClose={() => setEditing(null)}>
        {editing && (
          <ReadingForm reading={editing} onSaved={handleSaved} onCancel={() => setEditing(null)} />
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete reading?"
        message={
          toDelete
            ? `Delete the ${toDelete.glucoseValue} mg/dl reading for ${toDelete.timeSlotLabel} on this date? This cannot be undone.`
            : ''
        }
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
