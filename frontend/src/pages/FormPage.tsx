import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import tcsIonLogo from '../assets/logos/tcs-ion.png'
import infosysLogo from '../assets/logos/infosys.jpg'
import wiproLogo from '../assets/logos/wipro.png'
import techMahindraLogo from '../assets/logos/tech-mahindra.png'
import hclTechLogo from '../assets/logos/hcltech.jpg'
import mclLogo from '../assets/logos/mcl.jpg'
import sailLogo from '../assets/logos/sail.jpg'
import ntpcLogo from '../assets/logos/ntpc.png'
import jindalLogo from '../assets/logos/jindal.png'

const COMPANIES = [
  { name: 'TCS iON', logo: tcsIonLogo },
  { name: 'Infosys', logo: infosysLogo },
  { name: 'Wipro', logo: wiproLogo },
  { name: 'Tech Mahindra', logo: techMahindraLogo },
  { name: 'HCLTech', logo: hclTechLogo },
  { name: 'MCL', logo: mclLogo },
  { name: 'SAIL', logo: sailLogo },
  { name: 'NTPC', logo: ntpcLogo },
  { name: 'Jindal', logo: jindalLogo },
]

const API_URL = import.meta.env.VITE_API_URL
const MAX_FILE_SIZE_MB = 5

function FormPage() {
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    name: '', gender: '', branch: '', year: '', skills: '', projects: '',
    sem1: '', sem2: '', sem3: '', sem4: '', sem5: '',
  })

  const [targetCompany, setTargetCompany] = useState('')
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [resumeText, setResumeText] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      setUploadError(`File is too large (${fileSizeMB.toFixed(1)} MB). Please upload a PDF under ${MAX_FILE_SIZE_MB} MB.`)
      setResumeFile(null)
      setResumeText('')
      e.target.value = ''
      return
    }

    setResumeFile(file)
    setUploading(true)
    setUploadError('')
    setResumeText('')

    const uploadData = new FormData()
    uploadData.append('file', file)

    try {
      const response = await fetch(`${API_URL}/api/resume/parse`, { method: 'POST', body: uploadData })
      const rawText = await response.text()

      if (!response.ok) {
        try {
          const err = JSON.parse(rawText)
          throw new Error(err.detail || 'Upload failed')
        } catch {
          throw new Error(rawText || `Upload failed (status ${response.status})`)
        }
      }

      const data = JSON.parse(rawText)
      setResumeText(data.text)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Something went wrong')
      setResumeText('')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    navigate('/emotion-check', { state: { ...formData, targetCompany, resumeText } })
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-6 py-10">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">Your Details</h1>

        <form onSubmit={handleSubmit} className="space-y-6">

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input type="text" required value={formData.name} onChange={e => handleChange('name', e.target.value)}
                className="w-full p-2 rounded border dark:bg-gray-800 dark:border-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Gender</label>
              <select required value={formData.gender} onChange={e => handleChange('gender', e.target.value)}
                className="w-full p-2 rounded border dark:bg-gray-800 dark:border-gray-700">
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Branch</label>
              <input type="text" required placeholder="e.g. Information Technology" value={formData.branch}
                onChange={e => handleChange('branch', e.target.value)}
                className="w-full p-2 rounded border dark:bg-gray-800 dark:border-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Year / Semester</label>
              <input type="text" required placeholder="e.g. 4th Semester" value={formData.year}
                onChange={e => handleChange('year', e.target.value)}
                className="w-full p-2 rounded border dark:bg-gray-800 dark:border-gray-700" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Skills</label>
            <textarea required placeholder="e.g. Python, React, FastAPI" value={formData.skills}
              onChange={e => handleChange('skills', e.target.value)}
              className="w-full p-2 rounded border dark:bg-gray-800 dark:border-gray-700" rows={2} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Projects</label>
            <textarea placeholder="Briefly describe your projects" value={formData.projects}
              onChange={e => handleChange('projects', e.target.value)}
              className="w-full p-2 rounded border dark:bg-gray-800 dark:border-gray-700" rows={3} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Semester Percentages</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map(sem => (
                <input key={sem} type="number" min={0} max={100} placeholder={`Sem ${sem}`}
                  value={formData[`sem${sem}` as keyof typeof formData]}
                  onChange={e => handleChange(`sem${sem}`, e.target.value)}
                  className="w-full p-2 rounded border dark:bg-gray-800 dark:border-gray-700 text-sm" />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Target Company</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {COMPANIES.map(company => (
                <button type="button" key={company.name} onClick={() => setTargetCompany(company.name)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border text-sm font-medium transition
                    ${targetCompany === company.name
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-700 hover:border-blue-400'}`}>
                  <span className="bg-white rounded-md p-1.5 w-full flex items-center justify-center h-10">
                    <img src={company.logo} alt={company.name} className="max-h-7 max-w-full object-contain" />
                  </span>
                  {company.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Resume (PDF) <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-3 flex-wrap">
              <label htmlFor="resume-upload"
                className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition
                  ${uploading ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                📄 Choose Resume (PDF)
              </label>
              <input id="resume-upload" type="file" accept="application/pdf" onChange={handleResumeUpload}
                disabled={uploading} className="hidden" />
              <span className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[220px]">
                {resumeFile ? resumeFile.name : 'No file chosen'}
              </span>
            </div>

            {uploading && <p className="text-sm text-blue-500 mt-2">Reading your resume...</p>}
            {uploadError && <p className="text-sm text-red-500 mt-2">{uploadError}</p>}
            {resumeText && !uploading && (
              <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                ✓ Resume read successfully ({resumeFile?.name})
              </p>
            )}
          </div>

          <button type="submit" disabled={!targetCompany || !resumeText}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 rounded-lg transition">
            Continue
          </button>
          {(!targetCompany || !resumeText) && (
            <p className="text-sm text-gray-500 text-center">
              {!resumeText ? 'Please upload your resume to continue' : 'Please select a target company to continue'}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}

export default FormPage