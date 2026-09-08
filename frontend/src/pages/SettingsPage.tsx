import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { fetchSettings, updateSettings, uploadCompanyLogo, fetchNotificationConfigStatus } from '../services/settings.service';
import { invalidateCompanyBrandingCache } from '../services/companyBranding.service';
import { resolveUploadUrl } from '../utils/uploadUrl';

export default function SettingsPage() {
  const [companyName, setCompanyName] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [workingDaysMonth, setWorkingDaysMonth] = useState(24);
  const [paidHolidays, setPaidHolidays] = useState(7);
  const [paidLeaveDefault, setPaidLeaveDefault] = useState(0);
  const [esiRate, setEsiRate] = useState(0.0075);
  const [pfRate, setPfRate] = useState(0.12);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(false);
  const [smsNotificationsEnabled, setSmsNotificationsEnabled] = useState(false);
  const [birthdayRemindersEnabled, setBirthdayRemindersEnabled] = useState(false);
  const [birthdayReminderHour, setBirthdayReminderHour] = useState(9);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [smsConfigured, setSmsConfigured] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([fetchSettings(), fetchNotificationConfigStatus()])
      .then(([s, status]) => {
        setCompanyName(s.companyName);
        setAddressLine(s.addressLine || '');
        setWorkingDaysMonth(s.workingDaysMonth);
        setPaidHolidays(s.paidHolidays);
        setPaidLeaveDefault(s.paidLeaveDefault);
        setEsiRate(Number(s.esiRate));
        setPfRate(Number(s.pfRate));
        setLogoUrl(s.logoUrl);
        setEmailNotificationsEnabled(s.emailNotificationsEnabled);
        setSmsNotificationsEnabled(s.smsNotificationsEnabled);
        setBirthdayRemindersEnabled(s.birthdayRemindersEnabled);
        setBirthdayReminderHour(s.birthdayReminderHour);
        setEmailConfigured(status.emailConfigured);
        setSmsConfigured(status.smsConfigured);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setWarnings([]);
    try {
      const result = await updateSettings({
        companyName,
        addressLine: addressLine || null,
        workingDaysMonth,
        paidHolidays,
        paidLeaveDefault,
        esiRate,
        pfRate,
        emailNotificationsEnabled,
        smsNotificationsEnabled,
        birthdayRemindersEnabled,
        birthdayReminderHour,
      });
      setMessage('Settings saved.');
      setWarnings(result.warnings || []);
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const updated = await uploadCompanyLogo(file);
      setLogoUrl(updated.logoUrl);
      invalidateCompanyBrandingCache();
      setMessage('Logo uploaded — it now appears in the sidebar and on salary slips.');
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'Failed to upload logo.');
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  if (loading) return <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Settings</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4">Company Details</h3>

          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-900">
              {resolveUploadUrl(logoUrl) ? (
                <img src={resolveUploadUrl(logoUrl)!} alt="Company logo" className="w-full h-full object-contain" />
              ) : (
                <span className="text-xs text-gray-400">No logo</span>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Company Logo</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleLogoChange}
                disabled={uploadingLogo}
                className="text-xs text-gray-600 dark:text-gray-300"
              />
              <p className="text-xs text-gray-400 mt-1">
                {uploadingLogo ? 'Uploading…' : 'Appears in the sidebar and on salary slips.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Company Name</label>
              <input
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Company Address</label>
              <input
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100"
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">Payroll Constants</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            These apply to every payroll run and appear on the salary slip as NOWD / NOPH / NOPL.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                NOWD — Working Days / Month
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100"
                value={workingDaysMonth}
                onChange={(e) => setWorkingDaysMonth(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">NOPH — Paid Holidays</label>
              <input
                type="number"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100"
                value={paidHolidays}
                onChange={(e) => setPaidHolidays(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">NOPL — Paid Leaves</label>
              <input
                type="number"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100"
                value={paidLeaveDefault}
                onChange={(e) => setPaidLeaveDefault(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">ESI Rate (e.g. 0.0075 = 0.75%)</label>
              <input
                type="number"
                step="0.0001"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100"
                value={esiRate}
                onChange={(e) => setEsiRate(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">PF Rate (e.g. 0.12 = 12%)</label>
              <input
                type="number"
                step="0.01"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100"
                value={pfRate}
                onChange={(e) => setPfRate(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">Notifications</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Payslip emailing and birthday greetings. Requires SMTP/SMS credentials in the backend's <code>.env</code> file — see the README.
          </p>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm text-gray-700 dark:text-gray-200">Email notifications</label>
                <p className="text-xs text-gray-400">
                  {emailConfigured ? 'SMTP is configured on the server.' : 'SMTP is not configured yet — see .env.'}
                </p>
              </div>
              <input
                type="checkbox"
                checked={emailNotificationsEnabled}
                onChange={(e) => setEmailNotificationsEnabled(e.target.checked)}
                className="w-4 h-4"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm text-gray-700 dark:text-gray-200">SMS notifications</label>
                <p className="text-xs text-gray-400">
                  {smsConfigured ? 'MSG91 is configured on the server.' : 'MSG91 is not configured yet — see .env.'}
                </p>
              </div>
              <input
                type="checkbox"
                checked={smsNotificationsEnabled}
                onChange={(e) => setSmsNotificationsEnabled(e.target.checked)}
                className="w-4 h-4"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm text-gray-700 dark:text-gray-200">Birthday reminders</label>
                <p className="text-xs text-gray-400">Sends a greeting automatically via email/SMS (whichever is enabled above) on each active employee's birthday.</p>
              </div>
              <input
                type="checkbox"
                checked={birthdayRemindersEnabled}
                onChange={(e) => setBirthdayRemindersEnabled(e.target.checked)}
                className="w-4 h-4"
              />
            </div>

            {birthdayRemindersEnabled && (
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Send hour (24-hour, server time)</label>
                <input
                  type="number"
                  min={0}
                  max={23}
                  className="w-24 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100"
                  value={birthdayReminderHour}
                  onChange={(e) => setBirthdayReminderHour(Number(e.target.value))}
                />
              </div>
            )}
          </div>
        </div>

        {message && <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>}
        {warnings.map((w, i) => (
          <p key={i} className="text-sm text-orange-600">{w}</p>
        ))}

        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
