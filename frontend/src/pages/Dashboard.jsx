import { useCallback, useEffect, useState } from 'react';
import { Activity, CalendarDays, Plus, TrendingDown, TrendingUp, Droplets } from 'lucide-react';
import Loading from '../components/Loading.jsx';
import StatCard from '../components/StatCard.jsx';
import ReportChart from '../components/ReportChart.jsx';
import ReadingTable from '../components/ReadingTable.jsx';
import ReadingForm from '../components/ReadingForm.jsx';
import Modal, { ConfirmDialog } from '../components/Modal.jsx';
import useAuth from '../hooks/useAuth.js';
import { readingAPI } from '../services/readingAPI.js';
import { reportAPI } from '../services/reportAPI.js';
import { getErrorMessage } from '../services/api.js';
import { MAX_READINGS_PER_DAY, TIME_SLOTS } from '../utils/constants.js';
import { formatDisplayDate, shiftDays, toLocalDateString } from '../utils/dateUtils.js';
import { buildDailySeries } from '../utils/chartData.js';

export default function Dashboard() {
  const { user } = useAuth();
  const today = toLocalDateString();

  const [daily, setDaily] = useState(null);
  const [weekSeries, setWeekSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const [dailyData, weekReadings] = await Promise.all([
        reportAPI.daily(today),
        readingAPI.list({ from: shiftDays(today, -6), to: today }),
      ]);
      setDaily(dailyData);
      setWeekSeries(buildDailySeries(weekReadings, shiftDays(today, -6), today));
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load your dashboard.'));
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    load();
  }, [load]);

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

  if (loading && !daily) return <Loading message="Loading your dashboard..." />;

  const readings = daily?.readings || [];
  const count = daily?.totalReadings ?? 0;
  const coverage = Math.round((count / MAX_READINGS_PER_DAY) * 100);

  const slotBars = TIME_SLOTS.map((slot) => {
    const reading = readings.find((item) => item.timeSlot === slot.value);
    return { name: slot.short, value: reading ? reading.glucoseValue : 0 };
  });

  const coverageData = [
    { name: 'Recorded', value: count },
    { name: 'Remaining', value: MAX_READINGS_PER_DAY - count },
  ];

  const greetingName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="page dashboard-page">
      <div className="page-header">
        <div>
          <h1>Welcome back, {greetingName}</h1>
          <p className="page-subtitle">
            <CalendarDays size={16} /> {formatDisplayDate(today)}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setFormOpen(true)}>
          <Plus size={18} /> Add reading
        </button>
      </div>

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

      <section className="stats-grid">
        <StatCard
          icon={Droplets}
          label="Today's readings"
          value={`${count} / ${MAX_READINGS_PER_DAY}`}
          hint={`${coverage}% of daily slots recorded`}
          tone="primary"
        />
        <StatCard icon={TrendingUp} label="Highest" value={daily?.highest} unit="mg/dl" hint="Today" tone="orange" />
        <StatCard icon={TrendingDown} label="Lowest" value={daily?.lowest} unit="mg/dl" hint="Today" tone="navy" />
        <StatCard icon={Activity} label="Average" value={daily?.average} unit="mg/dl" hint="Today" tone="green" />
      </section>

      <section className="chart-grid">
        <div className="card">
          <div className="card-header">
            <h3>Today by time slot</h3>
            <span className="muted">mg/dl</span>
          </div>
          <ReportChart variant="bar" data={slotBars} height={240} />
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Daily coverage</h3>
          </div>
          <ReportChart variant="donut" data={coverageData} centerLabel={`${coverage}%`} height={240} />
          <div className="legend-row">
            <span><i className="dot dot-primary" /> Recorded</span>
            <span><i className="dot dot-light" /> Remaining</span>
          </div>
        </div>

        <div className="card card-wide">
          <div className="card-header">
            <h3>Last 7 days, daily average</h3>
          </div>
          <ReportChart variant="area" data={weekSeries} height={260} />
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <h3>Today's readings</h3>
        </div>
        <ReadingTable
          readings={readings}
          onEdit={(reading) => setEditing(reading)}
          onDelete={(reading) => setToDelete(reading)}
          emptyTitle="No readings for today"
          emptyText="Use Add reading to record your first value of the day."
        />
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
            ? `Delete the ${toDelete.glucoseValue} mg/dl reading for ${toDelete.timeSlotLabel}? This cannot be undone.`
            : ''
        }
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
