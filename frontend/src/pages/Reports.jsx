import { useEffect, useState } from 'react';
import { Activity, Droplets, TrendingDown, TrendingUp } from 'lucide-react';
import Loading from '../components/Loading.jsx';
import StatCard from '../components/StatCard.jsx';
import ReportChart from '../components/ReportChart.jsx';
import ReadingTable from '../components/ReadingTable.jsx';
import { readingAPI } from '../services/readingAPI.js';
import { reportAPI } from '../services/reportAPI.js';
import { getErrorMessage } from '../services/api.js';
import { TIME_SLOTS } from '../utils/constants.js';
import { formatDisplayDate, formatMonthYear, toLocalDateString } from '../utils/dateUtils.js';
import { buildDailySeries } from '../utils/chartData.js';

const TABS = [
  { id: 'daily', label: 'Daily report' },
  { id: 'mtd', label: 'Month-to-date' },
  { id: 'monthly', label: 'Previous month' },
];

export default function Reports() {
  const today = toLocalDateString();
  const [tab, setTab] = useState('daily');
  const [date, setDate] = useState(today);
  const [report, setReport] = useState(null);
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const fetchReport = async () => {
      setLoading(true);
      setError('');
      try {
        if (tab === 'daily') {
          const data = await reportAPI.daily(date);
          if (!active) return;
          setReport(data);
          setSeries([]);
        } else {
          const data = tab === 'mtd' ? await reportAPI.monthToDate(date) : await reportAPI.monthly(date);
          // Trend points come from the same date range as the report
          const readings = await readingAPI.list({ from: data.from, to: data.to });
          if (!active) return;
          setReport(data);
          setSeries(buildDailySeries(readings, data.from, data.to));
        }
      } catch (err) {
        if (active) setError(getErrorMessage(err, 'Could not load this report.'));
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchReport();
    return () => {
      active = false;
    };
  }, [tab, date]);

  const periodLabel = () => {
    if (!report) return '';
    if (tab === 'monthly') return formatMonthYear(`${report.month}-01`);
    if (tab === 'daily') return formatDisplayDate(report.date);
    return `${formatDisplayDate(report.from)} to ${formatDisplayDate(report.to)}`;
  };

  const slotBars = report?.readings
    ? TIME_SLOTS.map((slot) => {
        const reading = report.readings.find((item) => item.timeSlot === slot.value);
        return { name: slot.short, value: reading ? reading.glucoseValue : 0 };
      })
    : [];

  return (
    <div className="page reports-page">
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p className="page-subtitle">Highest, lowest and average values for each period.</p>
        </div>
      </div>

      <div className="card report-controls">
        <div className="tabs" role="tablist">
          {TABS.map((item) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={tab === item.id}
              className={`tab ${tab === item.id ? 'active' : ''}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="form-field date-field">
          <label htmlFor="reportDate">Select date</label>
          <input id="reportDate" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      {loading && !report ? (
        <Loading message="Loading report..." />
      ) : report ? (
        <>
          <div className="report-period">
            <span>{periodLabel()}</span>
            {loading && <span className="muted">Updating...</span>}
          </div>

          <section className="stats-grid">
            <StatCard icon={Droplets} label="Total readings" value={report.totalReadings} tone="primary" />
            <StatCard icon={TrendingUp} label="Highest" value={report.highest} unit="mg/dl" tone="orange" />
            <StatCard icon={TrendingDown} label="Lowest" value={report.lowest} unit="mg/dl" tone="navy" />
            <StatCard icon={Activity} label="Average" value={report.average} unit="mg/dl" tone="green" />
          </section>

          {report.totalReadings === 0 && (
            <div className="alert alert-info">No readings were recorded for this period.</div>
          )}

          <section className="card">
            <div className="card-header">
              <h3>{tab === 'daily' ? 'Readings by time slot' : 'Daily average over the period'}</h3>
            </div>
            {tab === 'daily' ? (
              <ReportChart variant="bar" data={slotBars} height={280} />
            ) : (
              <ReportChart variant="area" data={series} height={280} />
            )}
          </section>

          {tab === 'daily' && (
            <section className="card">
              <div className="card-header">
                <h3>Every reading for this day</h3>
              </div>
              <ReadingTable
                readings={report.readings}
                emptyTitle="No readings for this day"
                emptyText="Choose another date to see its readings."
              />
            </section>
          )}
        </>
      ) : null}
    </div>
  );
}
