import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export default function ReportIssueButton() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const tzToCountry = (tz?: string) => {
    if (!tz) return 'Unknown';
    const mapping: Record<string, string> = {
      'Europe/Bucharest': 'Romania',
      'Europe/London': 'United Kingdom',
      'Europe/Paris': 'France',
      'Europe/Berlin': 'Germany',
      'Europe/Madrid': 'Spain',
      'Europe/Rome': 'Italy',
      'America/New_York': 'United States',
      'America/Los_Angeles': 'United States',
      'America/Chicago': 'United States',
      'America/Denver': 'United States',
      'America/Toronto': 'Canada',
      'Asia/Tokyo': 'Japan',
      'Asia/Seoul': 'South Korea',
      'Asia/Shanghai': 'China',
      'Asia/Hong_Kong': 'Hong Kong',
      'Australia/Sydney': 'Australia',
      'Asia/Kolkata': 'India',
    };
    if (mapping[tz]) return mapping[tz];
    const parts = tz.split('/');
    if (parts.length >= 2) return parts[1].replace('_', ' ');
    return parts[0];
  };

  const submit = async () => {
    if (!message.trim()) return alert('Please describe the issue before submitting.');
    setSubmitting(true);
    try {
      const createdAt = new Date();
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const country = tzToCountry(timezone);
      const pageUrl = typeof window !== 'undefined' ? window.location.href : null;
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null;

      const payload: any = {
        message: message.trim(),
        created_at: createdAt.toISOString(),
        timezone,
        country,
        page_url: pageUrl,
        user_agent: userAgent,
        user_id: user?.id ?? null,
        user_email: user?.email ?? null,
      };

      const { error } = await supabase.from('issues').insert(payload);
      if (error) {
        console.error('report issue error', error);
        alert('Failed to submit issue: ' + (error.message || 'Unknown error'));
      } else {
        alert('Thank you — your issue has been submitted.');
        setOpen(false);
        setMessage('');
      }
    } catch (err) {
      console.error(err);
      alert('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating button: hidden on small screens */}
      <button
        onClick={() => setOpen(true)}
        className="hidden md:block fixed bottom-6 right-6 z-50 bg-brand-600 text-white px-4 py-3 rounded-full shadow-lg hover:opacity-95"
        aria-label="Report an issue"
      >
        Report an issue
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold">Report an issue</h3>
            <p className="text-sm text-gray-500 mt-2">Please describe the issue you encountered. We'll capture your environment automatically.</p>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="mt-4 w-full rounded-xl border border-gray-200 dark:border-neutral-800 p-3 bg-white dark:bg-neutral-900 text-sm"
              placeholder="Describe the bug or issue..."
            />

            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-xl border">Cancel</button>
              <button
                onClick={submit}
                disabled={submitting}
                className={`px-4 py-2 rounded-xl text-white ${submitting ? 'bg-gray-400' : 'bg-brand-600 hover:opacity-95'}`}
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
