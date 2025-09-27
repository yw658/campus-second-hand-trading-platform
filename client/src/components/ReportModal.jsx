import { useState } from 'react';
import './report-modal.css';

export default function ReportModal({ open, onClose, onSubmit }) {
    const [reason, setReason] = useState('');

    if (!open) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!reason.trim()) return;
        await onSubmit(reason.trim());
        setReason('');
    };

    return (
        <div className="report-modal__backdrop" onClick={onClose}>
            <div className="report-modal__panel" onClick={(e) => e.stopPropagation()}>
                <h3 className="report-modal__title">Report this item</h3>
                <p className="report-modal__hint">Tell us what is wrong with this listing.</p>
                <form onSubmit={handleSubmit}>
          <textarea
              className="report-modal__textarea"
              rows={5}
              placeholder="Scam, counterfeit, inappropriate, wrong info..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
          />
                    <div className="report-modal__actions">
                        <button type="button" className="btn" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn--primary">Submit Report</button>
                    </div>
                </form>
            </div>
        </div>
    );
}