import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Briefcase,
  Building2,
  DollarSign,
  History,
  Home,
  IdCard,
  Phone,
  Plus,
  Trash2,
  User,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import FormSection, { Field } from '@/components/employees/FormSection.jsx'
import { inputClass, selectClass } from '@/components/employees/formStyles.js'
import {
  calculateContractReleaseDate,
  calculateLaborReleaseDate,
  formatCNIC,
  formatPhone,
  isValidCNIC,
  isValidPhone,
  parseMoney,
} from '@/lib/employeeForm.js'

const defaultHistory = () => [
  { company: '', period_from: '', period_to: '', is_current: false },
]

const defaultSalaryForm = () => ({
  id: null,
  effective_from: new Date().toISOString().split('T')[0],
  effective_to: '',
  basic_salary: '',
  house_rent_allowance: '0',
  transport_allowance: '0',
  medical_allowance: '0',
  special_allowance: '0',
})

const defaultFormData = () => ({
  employee_type: '',
  name: '',
  father_husband_name: '',
  gender: '',
  marital_status: '',
  religion: '',
  blood_group: '',
  date_of_birth: '',
  cnic_number: '',
  cnic_issue_date: '',
  cnic_expiry_date: '',
  phone_number: '',
  punch_code: '',
  emergency_contact: '',
  address_street: '',
  address_city: '',
  employment_history: defaultHistory(),
  area_id: '',
  department_id: '',
  joining_date: '',
  release_date: '',
  photo_url: '',
})

export default function EmployeeForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [loading, setLoading] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [areas, setAreas] = useState([])
  const [departments, setDepartments] = useState([])
  const [errors, setErrors] = useState({})
  const [formData, setFormData] = useState(defaultFormData)
  const [salaryForm, setSalaryForm] = useState(defaultSalaryForm)
  const [expanded, setExpanded] = useState({
    employeeType: true,
    personalInfo: true,
    cnicInfo: true,
    contactInfo: true,
    address: true,
    employmentHistory: false,
    posting: false,
    salaryStructure: true,
  })

  const toggle = (key) => setExpanded((s) => ({ ...s, [key]: !s[key] }))

  useEffect(() => {
    ;(async () => {
      try {
        const [a, d] = await Promise.all([
          window.electron.getAreas(),
          window.electron.getDepartments(),
        ])
        setAreas(a)
        setDepartments(d)
      } catch {
        /* ignore */
      }
    })()
  }, [])

  useEffect(() => {
    if (!isEdit) return
    ;(async () => {
      setLoading(true)
      try {
        const detail = await window.electron.getEmployee(Number(id))
        const emp = detail.employee
        const posting = detail.posting
        const salary = detail.salary_structure
        const history = detail.employment_history

        setFormData({
          ...defaultFormData(),
          employee_type: emp.employee_type || '',
          name: emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
          father_husband_name: emp.father_husband_name || '',
          gender: emp.gender || '',
          marital_status: emp.marital_status || '',
          religion: emp.religion || '',
          blood_group: emp.blood_group || '',
          date_of_birth: emp.date_of_birth ? String(emp.date_of_birth).slice(0, 10) : '',
          cnic_number: emp.cnic_number || emp.cnic || '',
          cnic_issue_date: emp.cnic_issue_date ? String(emp.cnic_issue_date).slice(0, 10) : '',
          cnic_expiry_date: emp.cnic_expiry_date ? String(emp.cnic_expiry_date).slice(0, 10) : '',
          phone_number: emp.phone_number || emp.phone || '',
          punch_code: emp.punch_code || '',
          emergency_contact: emp.emergency_contact || emp.emergency_contact_phone || '',
          address_street: emp.address_street || '',
          address_city: emp.address_city || '',
          photo_url: emp.photo_url || '',
          area_id: posting?.area_id ? String(posting.area_id) : '',
          department_id: posting?.department_id ? String(posting.department_id) : '',
          joining_date: posting?.joining_date
            ? String(posting.joining_date).slice(0, 10)
            : emp.date_of_joining
              ? String(emp.date_of_joining).slice(0, 10)
              : '',
          release_date: posting?.release_date
            ? String(posting.release_date).slice(0, 10)
            : emp.release_date
              ? String(emp.release_date).slice(0, 10)
              : '',
          employment_history:
            history?.length > 0
              ? history.map((h) => ({
                  company: h.company,
                  period_from: h.period_from ? String(h.period_from).slice(0, 10) : '',
                  period_to: h.period_to ? String(h.period_to).slice(0, 10) : '',
                  is_current: Boolean(h.is_current),
                }))
              : defaultHistory(),
        })

        if (salary) {
          setSalaryForm({
            id: salary.id,
            effective_from: salary.effective_from
              ? String(salary.effective_from).slice(0, 10)
              : defaultSalaryForm().effective_from,
            effective_to: salary.effective_to ? String(salary.effective_to).slice(0, 10) : '',
            basic_salary: salary.basic_salary != null ? String(salary.basic_salary) : '',
            house_rent_allowance: String(salary.house_rent_allowance ?? '0'),
            transport_allowance: String(salary.transport_allowance ?? '0'),
            medical_allowance: String(salary.medical_allowance ?? '0'),
            special_allowance: String(salary.special_allowance ?? '0'),
          })
        }

        if (emp.photo_url) setPhotoPreview(emp.photo_url)
      } catch (e) {
        toast.error(e?.message || 'Could not load employee')
        navigate('/employees')
      } finally {
        setLoading(false)
      }
    })()
  }, [id, isEdit, navigate])

  const grossPreview =
    parseMoney(salaryForm.basic_salary) +
    parseMoney(salaryForm.house_rent_allowance) +
    parseMoney(salaryForm.transport_allowance) +
    parseMoney(salaryForm.medical_allowance) +
    parseMoney(salaryForm.special_allowance)

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'cnic_number') {
      setFormData((prev) => ({ ...prev, cnic_number: formatCNIC(value) }))
      return
    }
    if (name === 'phone_number') {
      setFormData((prev) => ({ ...prev, phone_number: formatPhone(value) }))
      return
    }
    if (name === 'employee_type' || name === 'joining_date') {
      setFormData((prev) => {
        const next = { ...prev, [name]: value }
        const type = name === 'employee_type' ? value : prev.employee_type
        const joining = name === 'joining_date' ? value : prev.joining_date
        if (type === 'Labor' && joining) {
          next.release_date = calculateLaborReleaseDate(joining)
        } else if (type === 'Contract' && joining) {
          next.release_date = calculateContractReleaseDate(joining)
        } else if (name === 'employee_type' && type === 'Permanent') {
          next.release_date = ''
        }
        return next
      })
      return
    }
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleHistoryChange = (index, field, value) => {
    setFormData((prev) => {
      const rows = [...prev.employment_history]
      rows[index] = { ...rows[index], [field]: value }
      return { ...prev, employment_history: rows }
    })
  }

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB')
      return
    }
    const reader = new FileReader()
    reader.onloadend = async () => {
      const base64 = reader.result
      setPhotoPreview(base64)
      setUploadingPhoto(true)
      try {
        const res = await window.electron.uploadEmployeePhoto(base64, file.name)
        setFormData((prev) => ({ ...prev, photo_url: res.photo_url }))
        toast.success('Photo saved')
      } catch (err) {
        toast.error(err?.message || 'Photo upload failed')
      } finally {
        setUploadingPhoto(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const validate = () => {
    const next = {}
    if (!formData.employee_type) next.employee_type = 'Employee type is required'
    if (!formData.name?.trim()) next.name = 'Name is required'
    if (!formData.cnic_number?.trim()) next.cnic_number = 'CNIC is required'
    else if (!isValidCNIC(formData.cnic_number)) {
      next.cnic_number = 'Use format 12345-123456-1'
    }
    if (!formData.phone_number?.trim()) next.phone_number = 'Phone is required'
    else if (!isValidPhone(formData.phone_number)) {
      next.phone_number = 'Use format 0300-1234567'
    }
    if (!formData.punch_code?.trim()) next.punch_code = 'Punch code is required for attendance'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) {
      toast.error('Fix the highlighted fields')
      return
    }

    if (!isEdit) {
      try {
        const dup = await window.electron.checkEmployeeCnic(formData.cnic_number)
        if (dup.exists) {
          setErrors({
            cnic_number: `CNIC already used by ${dup.employee?.employee_code || dup.employee?.name}`,
          })
          return
        }
      } catch {
        /* continue — DB will enforce */
      }
    }

    setLoading(true)
    try {
      const payload = {
        form: formData,
        employment_history: formData.employment_history,
        salaryForm,
      }
      if (isEdit) {
        await window.electron.updateEmployee(Number(id), payload)
        toast.success('Employee updated')
        navigate(`/employees/${id}`)
      } else {
        const res = await window.electron.createEmployee(payload)
        toast.success(`Employee ${res.employee_code} created`)
        navigate(`/employees/${res.id}`)
      }
    } catch (err) {
      toast.error(err?.message || 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  if (loading && isEdit && !formData.name) {
    return <div className="py-12 text-center text-muted">Loading employee…</div>
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to={isEdit ? `/employees/${id}` : '/employees'}
          className="rounded-md border border-border p-2 text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {isEdit ? 'Edit employee' : 'Add employee'}
          </h1>
          <p className="text-sm text-muted">
            Same sections as your web HRM — type, personal info, posting, and salary.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <FormSection
          title="Employee type"
          icon={Briefcase}
          required
          expanded={expanded.employeeType}
          onToggle={() => toggle('employeeType')}
        >
          <Field label="Employee type" required error={errors.employee_type} htmlFor="employee_type">
            <select
              id="employee_type"
              name="employee_type"
              value={formData.employee_type}
              onChange={handleChange}
              className={selectClass(errors.employee_type)}
            >
              <option value="">Select type</option>
              <option value="Labor">Labor (3 months — code L-)</option>
              <option value="Contract">Contract (1 year — code C-)</option>
              <option value="Permanent">Permanent (code P-)</option>
            </select>
          </Field>
        </FormSection>

        <FormSection
          title="Personal information"
          icon={User}
          expanded={expanded.personalInfo}
          onToggle={() => toggle('personalInfo')}
        >
          <div className="flex flex-wrap items-start gap-4">
            {photoPreview ? (
              <div className="relative h-28 w-28 overflow-hidden rounded-lg border border-border">
                <img src={photoPreview} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white"
                  onClick={() => {
                    setPhotoPreview(null)
                    setFormData((p) => ({ ...p, photo_url: '' }))
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="rounded-md border border-dashed border-border px-4 py-8 text-sm text-muted hover:border-accent"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? 'Uploading…' : 'Add photo (max 5MB)'}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoSelect}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Full name" required error={errors.name} htmlFor="name">
              <input id="name" name="name" value={formData.name} onChange={handleChange} className={inputClass(errors.name)} />
            </Field>
            <Field label="Father / husband name" htmlFor="father_husband_name">
              <input id="father_husband_name" name="father_husband_name" value={formData.father_husband_name} onChange={handleChange} className={inputClass()} />
            </Field>
            <Field label="Gender" htmlFor="gender">
              <select id="gender" name="gender" value={formData.gender} onChange={handleChange} className={selectClass()}>
                <option value="">—</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </Field>
            <Field label="Marital status" htmlFor="marital_status">
              <select id="marital_status" name="marital_status" value={formData.marital_status} onChange={handleChange} className={selectClass()}>
                <option value="">—</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
              </select>
            </Field>
            <Field label="Religion" htmlFor="religion">
              <input id="religion" name="religion" value={formData.religion} onChange={handleChange} className={inputClass()} />
            </Field>
            <Field label="Blood group" htmlFor="blood_group">
              <select id="blood_group" name="blood_group" value={formData.blood_group} onChange={handleChange} className={selectClass()}>
                <option value="">—</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </Field>
            <Field label="Date of birth" htmlFor="date_of_birth">
              <input type="date" id="date_of_birth" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} max={new Date().toISOString().split('T')[0]} className={inputClass()} />
            </Field>
          </div>
        </FormSection>

        <FormSection title="CNIC" icon={IdCard} expanded={expanded.cnicInfo} onToggle={() => toggle('cnicInfo')}>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="CNIC number" required error={errors.cnic_number} htmlFor="cnic_number">
              <input id="cnic_number" name="cnic_number" value={formData.cnic_number} onChange={handleChange} maxLength={14} placeholder="12345-123456-1" className={inputClass(errors.cnic_number)} />
            </Field>
            <Field label="Issue date" htmlFor="cnic_issue_date">
              <input type="date" id="cnic_issue_date" name="cnic_issue_date" value={formData.cnic_issue_date} onChange={handleChange} className={inputClass()} />
            </Field>
            <Field label="Expiry date" htmlFor="cnic_expiry_date">
              <input type="date" id="cnic_expiry_date" name="cnic_expiry_date" value={formData.cnic_expiry_date} onChange={handleChange} min={formData.cnic_issue_date || undefined} className={inputClass()} />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Contact" icon={Phone} expanded={expanded.contactInfo} onToggle={() => toggle('contactInfo')}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Punch code (device ID)" required error={errors.punch_code} htmlFor="punch_code">
              <input id="punch_code" name="punch_code" value={formData.punch_code} onChange={handleChange} placeholder="e.g. 101" className={inputClass(errors.punch_code)} />
            </Field>
            <Field label="Phone" required error={errors.phone_number} htmlFor="phone_number">
              <input id="phone_number" name="phone_number" value={formData.phone_number} onChange={handleChange} placeholder="0300-1234567" maxLength={12} className={inputClass(errors.phone_number)} />
            </Field>
            <Field label="Emergency contact" htmlFor="emergency_contact">
              <input id="emergency_contact" name="emergency_contact" value={formData.emergency_contact} onChange={handleChange} className={inputClass()} />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Address" icon={Home} expanded={expanded.address} onToggle={() => toggle('address')}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Street" htmlFor="address_street">
              <input id="address_street" name="address_street" value={formData.address_street} onChange={handleChange} className={inputClass()} />
            </Field>
            <Field label="City" htmlFor="address_city">
              <input id="address_city" name="address_city" value={formData.address_city} onChange={handleChange} className={inputClass()} />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Employment history" icon={History} expanded={expanded.employmentHistory} onToggle={() => toggle('employmentHistory')}>
          <div className="space-y-3">
            {formData.employment_history.map((row, idx) => (
              <div key={idx} className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-4">
                <input placeholder="Company" value={row.company} onChange={(e) => handleHistoryChange(idx, 'company', e.target.value)} className={inputClass()} />
                <input type="date" value={row.period_from} onChange={(e) => handleHistoryChange(idx, 'period_from', e.target.value)} className={inputClass()} />
                <input type="date" value={row.period_to} onChange={(e) => handleHistoryChange(idx, 'period_to', e.target.value)} className={inputClass()} />
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-xs text-muted">
                    <input type="checkbox" checked={row.is_current} onChange={(e) => handleHistoryChange(idx, 'is_current', e.target.checked)} />
                    Current
                  </label>
                  {formData.employment_history.length > 1 ? (
                    <button type="button" className="ml-auto text-danger" onClick={() => setFormData((p) => ({ ...p, employment_history: p.employment_history.filter((_, i) => i !== idx) }))}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
            <button type="button" className="inline-flex items-center gap-1 text-sm text-accent" onClick={() => setFormData((p) => ({ ...p, employment_history: [...p.employment_history, ...defaultHistory()] }))}>
              <Plus className="h-4 w-4" /> Add row
            </button>
          </div>
        </FormSection>

        <FormSection title="Posting" icon={Building2} expanded={expanded.posting} onToggle={() => toggle('posting')}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Site / area" htmlFor="area_id">
              <select id="area_id" name="area_id" value={formData.area_id} onChange={handleChange} className={selectClass()}>
                <option value="">—</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Department" htmlFor="department_id">
              <select id="department_id" name="department_id" value={formData.department_id} onChange={handleChange} className={selectClass()}>
                <option value="">—</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Joining date" htmlFor="joining_date">
              <input type="date" id="joining_date" name="joining_date" value={formData.joining_date} onChange={handleChange} className={inputClass()} />
            </Field>
            <Field label="Release / contract end" htmlFor="release_date">
              <input
                type="date"
                id="release_date"
                name="release_date"
                value={formData.release_date}
                onChange={handleChange}
                disabled={formData.employee_type === 'Labor'}
                className={inputClass()}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Salary structure" icon={DollarSign} expanded={expanded.salaryStructure} onToggle={() => toggle('salaryStructure')}>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Effective from" htmlFor="effective_from">
              <input type="date" id="effective_from" name="effective_from" value={salaryForm.effective_from} onChange={(e) => setSalaryForm((s) => ({ ...s, effective_from: e.target.value }))} className={inputClass()} />
            </Field>
            <Field label="Effective to" htmlFor="effective_to">
              <input type="date" id="effective_to" name="effective_to" value={salaryForm.effective_to} onChange={(e) => setSalaryForm((s) => ({ ...s, effective_to: e.target.value }))} className={inputClass()} />
            </Field>
            <Field label="Basic salary" htmlFor="basic_salary">
              <input type="number" min="0" step="0.01" id="basic_salary" name="basic_salary" value={salaryForm.basic_salary} onChange={(e) => setSalaryForm((s) => ({ ...s, basic_salary: e.target.value }))} className={inputClass()} />
            </Field>
            {['house_rent_allowance', 'transport_allowance', 'medical_allowance', 'special_allowance'].map((key) => (
              <Field key={key} label={key.replace(/_/g, ' ')} htmlFor={key}>
                <input type="number" min="0" step="0.01" id={key} name={key} value={salaryForm[key]} onChange={(e) => setSalaryForm((s) => ({ ...s, [key]: e.target.value }))} className={inputClass()} />
              </Field>
            ))}
          </div>
          <p className="text-sm text-muted">
            Gross preview: <span className="font-semibold text-foreground">PKR {grossPreview.toLocaleString()}</span>
          </p>
        </FormSection>

        <div className="flex justify-end gap-3 pt-2">
          <Link to={isEdit ? `/employees/${id}` : '/employees'} className="rounded-md border border-border px-4 py-2 text-sm text-muted hover:text-foreground">
            Cancel
          </Link>
          <button type="submit" disabled={loading} className="btn-primary px-6 py-2">
            {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Create employee'}
          </button>
        </div>
      </form>
    </div>
  )
}
