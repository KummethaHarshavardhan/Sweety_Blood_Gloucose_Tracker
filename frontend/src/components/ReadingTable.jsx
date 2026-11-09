import { Pencil, Trash2 } from 'lucide-react';
import EmptyState from './EmptyState.jsx';
import { formatDisplayDate } from '../utils/dateUtils.js';

export default function ReadingTable({
  readings,
  showDate = false,
  onEdit,
  onDelete,
  emptyTitle = 'No readings yet',
  emptyText = 'Readings you add will appear here.',
}) {
  if (!readings.length) {
    return <EmptyState title={emptyTitle} text={emptyText} />;
  }

  const showActions = Boolean(onEdit || onDelete);

  return (
    <div className="table-wrap">
      <table className="reading-table">
        <thead>
          <tr>
            {showDate && <th>Date</th>}
            <th>Time slot</th>
            <th>Glucose (mg/dl)</th>
            {showActions && <th className="actions-col">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {readings.map((reading) => (
            <tr key={reading.id}>
              {showDate && <td data-label="Date">{formatDisplayDate(reading.readingDate)}</td>}
              <td data-label="Time slot">
                <span className="slot-pill">{reading.timeSlotLabel}</span>
              </td>
              <td data-label="Glucose">
                <strong className="glucose-value">{reading.glucoseValue}</strong>
              </td>
              {showActions && (
                <td className="actions-col" data-label="Actions">
                  {onEdit && (
                    <button className="icon-btn" onClick={() => onEdit(reading)} aria-label="Edit reading">
                      <Pencil size={16} />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      className="icon-btn icon-btn-danger"
                      onClick={() => onDelete(reading)}
                      aria-label="Delete reading"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
