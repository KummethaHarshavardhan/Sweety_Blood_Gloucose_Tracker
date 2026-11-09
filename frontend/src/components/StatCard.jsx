export default function StatCard({ icon: Icon, label, value, unit, hint, tone = 'primary' }) {
  return (
    <div className={`stat-card stat-${tone}`}>
      <div className="stat-icon">
        <Icon size={22} />
      </div>
      <div className="stat-body">
        <span className="stat-label">{label}</span>
        <strong className="stat-value">
          {value ?? '—'}
          {value !== null && value !== undefined && unit && <small> {unit}</small>}
        </strong>
        {hint && <span className="stat-hint">{hint}</span>}
      </div>
    </div>
  );
}
