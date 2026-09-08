import { FormEvent, useEffect, useRef, useState } from 'react';
import { Employee, Department } from '../types/employee';
import { createEmployee, updateEmployee, uploadEmployeePhoto } from '../services/employee.service';
import { resolveUploadUrl } from '../utils/uploadUrl';

interface Props {
  employee: Employee | null; // null = creating new
  departments: Department[];
  onClose: () => void;
  onSaved: () => void;
}

const emptyForm: any = {
  name: '', gender: 'MALE', dob: '', relativeName: '', mobile: '', email: '', address: '',
  joiningDate: '', departmentId: '', designation: '', employmentType: 'FULL_TIME', status: 'ACTIVE',
  bankName: '', branch: '', accountNo: '', ifsc: '', pan: '', aadhaar: '', pfNumber: '', esiNumber: '', uan: '',
  paymentMode: 'NEFT_RTGS',
  basic: 0, hra: 0, da: 0, specialAllow: 0, medicalAllow: 0, conveyance: 0, washingAllow: 0, otherAllow: 0, otRatePerHour: 0,
  pfDeduction: 0, esiApplicable: true, professionalTax: 0, canteenRatePerDay: 0, rentDeduction: 0, otherDeduction: 0,
  elBalance: 0, clBalance: 0,
};

function toDateInput(v?: string | null) {
  return v ? v.slice(0, 10) : '';
}

export default function EmployeeFormModal({ employee, departments, onClose, onSaved }: Props) {
  const [form, setForm] = useState<any>(emptyForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(employee?.photoUrl ?? null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoNotice, setPhotoNotice] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);

  async function handlePhotoSelected() {
    const file = photoInputRef.current?.files?.[0];
    if (!file || !employee) return; // new employees don't have a code yet — see notice in the UI
    setUploadingPhoto(true);
    setPhotoNotice('');
    try {
      const updated = await uploadEmployeePhoto(employee.code, file);
      setPhotoUrl(updated.photoUrl);
      setPhotoNotice('Photo uploaded.');
    } catch (err: any) {
      setPhotoNotice(err.response?.data?.error || 'Failed to upload photo.');
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  }

  useEffect(() => {
    if (employee) {
      setForm({
        ...emptyForm,
        ...employee,
        dob: toDateInput(employee.dob),
        joiningDate: toDateInput(employee.joiningDate),
        departmentId: employee.departmentId || '',
      });
      setPhotoUrl(employee.photoUrl ?? null);
    } else {
      setForm(emptyForm);
      setPhotoUrl(null);
    }
  }, [employee]);

  function set(field: string, value: any) {
    setForm((f: any) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        departmentId: form.departmentId ? Number(form.departmentId) : null,
        basic: Number(form.basic) || 0,
        hra: Number(form.hra) || 0,
        da: Number(form.da) || 0,
        specialAllow: Number(form.specialAllow) || 0,
        medicalAllow: Number(form.medicalAllow) || 0,
        conveyance: Number(form.conveyance) || 0,
        washingAllow: Number(form.washingAllow) || 0,
        otherAllow: Number(form.otherAllow) || 0,
        otRatePerHour: Number(form.otRatePerHour) || 0,
        pfDeduction: Number(form.pfDeduction) || 0,
        professionalTax: Number(form.professionalTax) || 0,
        canteenRatePerDay: Number(form.canteenRatePerDay) || 0,
        rentDeduction: Number(form.rentDeduction) || 0,
        otherDeduction: Number(form.otherDeduction) || 0,
        elBalance: Number(form.elBalance) || 0,
        clBalance: Number(form.clBalance) || 0,
      };
      if (employee) {
        await updateEmployee(employee.code, payload);
      } else {
        await createEmployee(payload);
      }
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save employee');
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100';
  const labelCls = 'block text-xs text-gray-500 dark:text-gray-400 mb-1';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center overflow-auto py-10 z-50" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl"
      >
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
          {employee ? `Edit Employee — ${employee.code}` : 'Add Employee'}
        </h3>

        <div className="flex items-center gap-4 mb-4 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="w-16 h-16 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 flex items-center justify-center bg-gray-50 dark:bg-gray-900 flex-shrink-0">
            {resolveUploadUrl(photoUrl) ? (
              <img src={resolveUploadUrl(photoUrl)!} alt={form.name || 'Employee'} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl text-gray-300 dark:text-gray-600">👤</span>
            )}
          </div>
          <div>
            <label className={labelCls}>Employee Photo</label>
            {employee ? (
              <>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handlePhotoSelected}
                  disabled={uploadingPhoto}
                  className="text-xs text-gray-600 dark:text-gray-300"
                />
                {photoNotice && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{photoNotice}</p>}
              </>
            ) : (
              <p className="text-xs text-gray-400 mt-1">Save this employee first, then reopen Edit to add a photo.</p>
            )}
          </div>
        </div>

        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-4">
          <legend className="text-xs text-gray-500 px-1">Basic Information</legend>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Full Name *</label>
              <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select className={inputCls} value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Gender</label>
              <select className={inputCls} value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Date of Birth</label>
              <input type="date" className={inputCls} value={form.dob} onChange={(e) => set('dob', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Father / Husband Name</label>
              <input className={inputCls} value={form.relativeName} onChange={(e) => set('relativeName', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Mobile Number</label>
              <input className={inputCls} placeholder="10-digit number" maxLength={10} value={form.mobile} onChange={(e) => set('mobile', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input className={inputCls} value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Joining Date</label>
              <input type="date" className={inputCls} value={form.joiningDate} onChange={(e) => set('joiningDate', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Address</label>
              <input className={inputCls} value={form.address} onChange={(e) => set('address', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Department</label>
              <select className={inputCls} value={form.departmentId} onChange={(e) => set('departmentId', e.target.value)}>
                <option value="">— None —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Designation</label>
              <input className={inputCls} value={form.designation} onChange={(e) => set('designation', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Employment Type</label>
              <select className={inputCls} value={form.employmentType} onChange={(e) => set('employmentType', e.target.value)}>
                <option value="FULL_TIME">Full-Time</option>
                <option value="PART_TIME">Part-Time</option>
                <option value="CONTRACT">Contract</option>
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-4">
          <legend className="text-xs text-gray-500 px-1">Bank &amp; Statutory Details</legend>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Bank Name</label><input className={inputCls} value={form.bankName} onChange={(e) => set('bankName', e.target.value)} /></div>
            <div><label className={labelCls}>Branch</label><input className={inputCls} value={form.branch} onChange={(e) => set('branch', e.target.value)} /></div>
            <div><label className={labelCls}>Account Number</label><input className={inputCls} value={form.accountNo} onChange={(e) => set('accountNo', e.target.value)} /></div>
            <div><label className={labelCls}>IFSC</label><input className={inputCls} placeholder="CNRB0001234" value={form.ifsc} onChange={(e) => set('ifsc', e.target.value)} /></div>
            <div><label className={labelCls}>PAN Number</label><input className={inputCls} placeholder="ABCDE1234F" value={form.pan} onChange={(e) => set('pan', e.target.value)} /></div>
            <div><label className={labelCls}>Aadhaar Number</label><input className={inputCls} placeholder="12 digits" maxLength={12} value={form.aadhaar} onChange={(e) => set('aadhaar', e.target.value)} /></div>
            <div><label className={labelCls}>PF Number</label><input className={inputCls} value={form.pfNumber} onChange={(e) => set('pfNumber', e.target.value)} /></div>
            <div><label className={labelCls}>ESI Number</label><input className={inputCls} value={form.esiNumber} onChange={(e) => set('esiNumber', e.target.value)} /></div>
            <div><label className={labelCls}>UAN Number</label><input className={inputCls} value={form.uan} onChange={(e) => set('uan', e.target.value)} /></div>
            <div>
              <label className={labelCls}>Payment Mode</label>
              <select className={inputCls} value={form.paymentMode} onChange={(e) => set('paymentMode', e.target.value)}>
                <option value="NEFT_RTGS">NEFT/RTGS</option>
                <option value="TRANSFER">Transfer</option>
                <option value="CASH_CHEQUE">Cash/Cheque</option>
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-4">
          <legend className="text-xs text-gray-500 px-1">Salary Details (Monthly ₹)</legend>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={labelCls}>Basic Salary</label><input type="number" className={inputCls} value={form.basic} onChange={(e) => set('basic', e.target.value)} /></div>
            <div><label className={labelCls}>HRA</label><input type="number" className={inputCls} value={form.hra} onChange={(e) => set('hra', e.target.value)} /></div>
            <div><label className={labelCls}>DA</label><input type="number" className={inputCls} value={form.da} onChange={(e) => set('da', e.target.value)} /></div>
            <div><label className={labelCls}>Special Allowance</label><input type="number" className={inputCls} value={form.specialAllow} onChange={(e) => set('specialAllow', e.target.value)} /></div>
            <div><label className={labelCls}>Medical Allowance</label><input type="number" className={inputCls} value={form.medicalAllow} onChange={(e) => set('medicalAllow', e.target.value)} /></div>
            <div><label className={labelCls}>Conveyance</label><input type="number" className={inputCls} value={form.conveyance} onChange={(e) => set('conveyance', e.target.value)} /></div>
            <div><label className={labelCls}>Washing Allowance</label><input type="number" className={inputCls} value={form.washingAllow} onChange={(e) => set('washingAllow', e.target.value)} /></div>
            <div><label className={labelCls}>Other Allowance</label><input type="number" className={inputCls} value={form.otherAllow} onChange={(e) => set('otherAllow', e.target.value)} /></div>
            <div><label className={labelCls}>OT Rate / Hour</label><input type="number" className={inputCls} value={form.otRatePerHour} onChange={(e) => set('otRatePerHour', e.target.value)} /></div>
            <div><label className={labelCls}>PF Deduction</label><input type="number" className={inputCls} value={form.pfDeduction} onChange={(e) => set('pfDeduction', e.target.value)} /></div>
            <div>
              <label className={labelCls}>ESI Applicable?</label>
              <select className={inputCls} value={form.esiApplicable ? 'yes' : 'no'} onChange={(e) => set('esiApplicable', e.target.value === 'yes')}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div><label className={labelCls}>Professional Tax</label><input type="number" className={inputCls} value={form.professionalTax} onChange={(e) => set('professionalTax', e.target.value)} /></div>
            <div><label className={labelCls}>Canteen Rate / Day</label><input type="number" className={inputCls} value={form.canteenRatePerDay} onChange={(e) => set('canteenRatePerDay', e.target.value)} /></div>
            <div><label className={labelCls}>Rent Deduction</label><input type="number" className={inputCls} value={form.rentDeduction} onChange={(e) => set('rentDeduction', e.target.value)} /></div>
            <div><label className={labelCls}>Other Deductions</label><input type="number" className={inputCls} value={form.otherDeduction} onChange={(e) => set('otherDeduction', e.target.value)} /></div>
            <div><label className={labelCls}>EL Balance</label><input type="number" className={inputCls} value={form.elBalance} onChange={(e) => set('elBalance', e.target.value)} /></div>
            <div><label className={labelCls}>CL Balance</label><input type="number" className={inputCls} value={form.clBalance} onChange={(e) => set('clBalance', e.target.value)} /></div>
          </div>
        </fieldset>

        {error && <p className="text-red-600 text-xs mb-3">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-50">
            {submitting ? 'Saving…' : employee ? 'Save Changes' : 'Add Employee'}
          </button>
        </div>
      </form>
    </div>
  );
}
