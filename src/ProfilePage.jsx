import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ChevronDown, Download, FileText, Trash2, Upload, X } from 'lucide-react'
import { downloadApiFile, requestApiJson, uploadApiFile } from './api.js'
import './ProfilePage.css'

const maxCvBytes = 5 * 1024 * 1024
const allowedExtensions = ['.pdf', '.doc', '.docx']
const universities = [
  'Đại học Bách khoa Hà Nội',
  'Đại học Công nghệ - ĐHQGHN',
  'Đại học Kinh tế Quốc dân',
  'Đại học Ngoại thương',
  'Đại học Kinh tế TP. Hồ Chí Minh',
  'Đại học Bách khoa - ĐHQG TP. Hồ Chí Minh',
  'Đại học FPT',
  'Đại học RMIT Việt Nam',
]
const majors = [
  'Công nghệ thông tin',
  'Marketing',
  'Hệ thống thông tin',
  'Kinh doanh',
  'Thiết kế sáng tạo',
  'Tài chính - Kế toán',
  'Khoa học dữ liệu',
  'Truyền thông',
  'Quản trị nhân lực',
]
const skillsByMajor = {
  'Công nghệ thông tin': ['ReactJS', 'JavaScript', 'HTML/CSS', 'Node.js', 'SQL', 'REST API', 'Git', 'Kiểm thử phần mềm', 'Giao tiếp'],
  Marketing: ['Marketing nội dung', 'SEO', 'Google Analytics', 'Social Media', 'Copywriting', 'Canva', 'Excel', 'Giao tiếp'],
  'Hệ thống thông tin': ['Excel', 'SQL', 'Phân tích dữ liệu', 'Power BI', 'Quy trình nghiệp vụ', 'Giao tiếp', 'PowerPoint'],
  'Kinh doanh': ['Excel', 'Giao tiếp', 'Đàm phán', 'Phân tích dữ liệu', 'PowerPoint', 'Chăm sóc khách hàng'],
  'Thiết kế sáng tạo': ['Figma', 'UI/UX', 'Photoshop', 'Illustrator', 'Canva', 'Typography', 'Giao tiếp'],
  'Tài chính - Kế toán': ['Excel', 'Phân tích dữ liệu', 'Kế toán', 'Power BI', 'Cẩn thận', 'Giao tiếp'],
  'Khoa học dữ liệu': ['Python', 'SQL', 'Excel', 'Phân tích dữ liệu', 'Power BI', 'Machine Learning'],
  'Truyền thông': ['Copywriting', 'Social Media', 'Canva', 'Quay dựng video', 'Giao tiếp', 'Lên kế hoạch nội dung'],
  'Quản trị nhân lực': ['Giao tiếp', 'Excel', 'Tuyển dụng', 'Làm việc nhóm', 'PowerPoint'],
}

function parseSkills(value) {
  return [...new Set(String(value || '').split(',').map((skill) => skill.trim()).filter(Boolean))]
}

function ProfilePage({ accessToken, onBack, onProfileSaved, onNotice }) {
  const [profile, setProfile] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [cvError, setCvError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)
  const [university, setUniversity] = useState('')
  const [universityOptionsOpen, setUniversityOptionsOpen] = useState(false)
  const [manualUniversity, setManualUniversity] = useState(false)
  const [major, setMajor] = useState('')
  const [skillTags, setSkillTags] = useState([])
  const [skillDraft, setSkillDraft] = useState('')
  const [skillSuggestionsOpen, setSkillSuggestionsOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [cvBusy, setCvBusy] = useState(false)
  const fileInput = useRef(null)

  useEffect(() => {
    let cancelled = false
    requestApiJson('/api/profile', { accessToken })
      .then((result) => {
        if (cancelled) return
        setProfile(result.profile)
        setUniversity(result.profile.university || '')
        setManualUniversity(Boolean(result.profile.university && !universities.includes(result.profile.university)))
        setMajor(result.profile.major || '')
        setSkillTags(parseSkills(result.profile.skills))
      })
      .catch((requestError) => { if (!cancelled) setLoadError(requestError.message) })
    return () => { cancelled = true }
  }, [accessToken])

  const handleSave = async (event) => {
    event.preventDefault()
    setAttemptedSubmit(true)
    setError('')
    if (skillTags.length === 0) {
      setFieldErrors((current) => ({ ...current, skills: 'Vui lòng thêm ít nhất một kỹ năng.' }))
      return
    }
    setSaving(true)
    const values = Object.fromEntries(new FormData(event.currentTarget).entries())
    values.university = university.trim()
    values.major = major
    values.skills = skillTags.join(', ')
    try {
      const result = await requestApiJson('/api/profile', { method: 'PUT', body: values, accessToken })
      setProfile(result.profile)
      onProfileSaved(result.profile)
      onNotice('Đã cập nhật hồ sơ.')
    } catch (saveError) {
      setError(saveError.message || 'Không thể cập nhật hồ sơ. Vui lòng thử lại.')
    } finally {
      setSaving(false)
    }
  }

  const addSkill = (value = skillDraft) => {
    const skill = value.trim()
    if (!skill) return
    if (skillTags.some((tag) => tag.toLocaleLowerCase('vi') === skill.toLocaleLowerCase('vi'))) {
      setSkillDraft('')
      setSkillSuggestionsOpen(false)
      return
    }
    if (`${skillTags.join(', ')}${skillTags.length ? ', ' : ''}${skill}`.length > 300) {
      setFieldErrors((current) => ({ ...current, skills: 'Tổng độ dài kỹ năng tối đa 300 ký tự.' }))
      return
    }
    setSkillTags((current) => [...current, skill])
    setSkillDraft('')
    setFieldErrors((current) => ({ ...current, skills: '' }))
    setSkillSuggestionsOpen(false)
  }

  const removeSkill = (skillToRemove) => {
    setSkillTags((current) => current.filter((skill) => skill !== skillToRemove))
  }

  const skillOptions = skillsByMajor[major] || [...new Set(Object.values(skillsByMajor).flat())]
  const filteredSkillOptions = skillOptions
    .filter((skill) => !skillTags.includes(skill) && skill.toLocaleLowerCase('vi').includes(skillDraft.trim().toLocaleLowerCase('vi')))
    .slice(0, 7)
  const filteredUniversities = universities.filter((school) => (
    school.toLocaleLowerCase('vi').includes(university.trim().toLocaleLowerCase('vi'))
  ))

  const handleCvChange = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setCvError('')
    const lowerName = file.name.toLowerCase()
    if (!allowedExtensions.some((extension) => lowerName.endsWith(extension))) {
      setCvError('CV chỉ hỗ trợ định dạng PDF, DOC hoặc DOCX.')
      return
    }
    if (file.size > maxCvBytes) {
      setCvError('File quá lớn. CV tối đa 5 MB.')
      return
    }
    setCvBusy(true)
    try {
      const result = await uploadApiFile('/api/profile/cv', file, accessToken)
      setProfile(result.profile)
      onNotice('Đã tải CV lên.')
    } catch (uploadError) {
      setCvError(uploadError.message || 'Không thể tải CV lên. Vui lòng thử lại.')
    } finally {
      setCvBusy(false)
    }
  }

  const handleCvDownload = async () => {
    setCvError('')
    try {
      await downloadApiFile('/api/profile/cv', accessToken, profile.cv.name)
    } catch (downloadError) {
      setCvError(downloadError.message || 'Không thể tải CV về.')
    }
  }

  const handleCvDelete = async () => {
    setCvError('')
    setCvBusy(true)
    try {
      const result = await requestApiJson('/api/profile/cv', { method: 'DELETE', accessToken })
      setProfile(result.profile)
      onNotice('Đã xóa CV.')
    } catch (deleteError) {
      setCvError(deleteError.message || 'Không thể xóa CV.')
    } finally {
      setCvBusy(false)
    }
  }

  return (
    <main className="section profile-page">
      <div className="page-shell">
        <button className="back-link" type="button" onClick={onBack}>
          <ArrowLeft size={16} /> Quay lại
        </button>
        <h1 className="profile-title">Cập nhật hồ sơ</h1>

        {loadError && <p className="contact-form-error" role="alert">{loadError}</p>}
        {!profile && !loadError && <p className="profile-loading">Đang tải hồ sơ...</p>}

        {profile && (
          <div className="profile-layout">
            <form
              className={`contact-form profile-card profile-edit-form${attemptedSubmit ? ' profile-edit-form-attempted' : ''}`}
              onSubmit={handleSave}
              onInvalidCapture={() => setAttemptedSubmit(true)}
            >
              <h2>Thông tin cá nhân</h2>
              <div className="contact-form-fields">
                <label className="profile-field">
                  <span>Họ và tên</span>
                  <input name="name" type="text" defaultValue={profile.name} minLength="2" maxLength="80" required />
                </label>
                <label className="profile-field">
                  <span>Số điện thoại</span>
                  <input name="phone" type="tel" defaultValue={profile.phone} required />
                </label>
                <label className="contact-form-subject profile-field">
                  <span>Email (không thể thay đổi)</span>
                  <input type="email" value={profile.email} readOnly disabled />
                </label>
                <div className="profile-field profile-university-field">
                  <label htmlFor="profile-university">Trường đại học</label>
                  <div
                    className="profile-combobox"
                    onBlur={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget)) setUniversityOptionsOpen(false)
                    }}
                  >
                    <div className="profile-combobox-input-wrap">
                      <input
                        id="profile-university"
                        name="university"
                        type="text"
                        role="combobox"
                        aria-expanded={universityOptionsOpen && !manualUniversity}
                        aria-controls="profile-university-options"
                        aria-autocomplete="list"
                        autoComplete="off"
                        value={university}
                        placeholder={manualUniversity ? 'Nhập tên trường của bạn' : 'Tìm trường đại học...'}
                        maxLength="120"
                        onFocus={() => { if (!manualUniversity) setUniversityOptionsOpen(true) }}
                        onChange={(event) => {
                          setUniversity(event.target.value)
                          setManualUniversity(false)
                          setUniversityOptionsOpen(true)
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Escape') setUniversityOptionsOpen(false)
                        }}
                      />
                      {!manualUniversity && (
                        <button
                          type="button"
                          aria-label="Mở danh sách trường"
                          onClick={() => setUniversityOptionsOpen((open) => !open)}
                        >
                          <ChevronDown size={16} />
                        </button>
                      )}
                    </div>
                    {!manualUniversity && universityOptionsOpen && (
                      <div className="profile-combobox-options" id="profile-university-options" role="listbox" aria-label="Trường đại học">
                        {filteredUniversities.map((school) => (
                          <button
                            key={school}
                            type="button"
                            role="option"
                            aria-selected={university === school}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setUniversity(school)
                              setUniversityOptionsOpen(false)
                            }}
                          >
                            {school}
                          </button>
                        ))}
                        <button
                          className="profile-combobox-other"
                          type="button"
                          role="option"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setUniversity('')
                            setManualUniversity(true)
                            setUniversityOptionsOpen(false)
                          }}
                        >
                          Khác - Nhập tay
                        </button>
                      </div>
                    )}
                    {manualUniversity && (
                      <button className="profile-combobox-switch" type="button" onClick={() => {
                        setManualUniversity(false)
                        setUniversityOptionsOpen(true)
                        setUniversity('')
                      }}>
                        Chọn trường trong danh sách
                      </button>
                    )}
                  </div>
                </div>
                <label className={`profile-field${fieldErrors.major || (attemptedSubmit && !major) ? ' profile-field-invalid' : ''}`}>
                  <span>Ngành học <b>*</b></span>
                  <select
                    name="major"
                    value={major}
                    required
                    aria-invalid={Boolean(fieldErrors.major || (attemptedSubmit && !major))}
                    onChange={(event) => {
                      setMajor(event.target.value)
                      setFieldErrors((current) => ({ ...current, major: '' }))
                    }}
                  >
                    <option value="" disabled>Chọn ngành học</option>
                    {majors.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label className="profile-field">
                  <span>Năm tốt nghiệp</span>
                  <input name="graduationYear" type="number" defaultValue={profile.graduationYear} min="2000" max="2100" />
                </label>
                <div className={`profile-field profile-skills-field${fieldErrors.skills ? ' profile-field-invalid' : ''}`}>
                  <label htmlFor="profile-skills-input">Kỹ năng <b>*</b></label>
                  <div
                    className="profile-skill-combobox"
                    onBlur={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget)) setSkillSuggestionsOpen(false)
                    }}
                  >
                    <div className="profile-skill-tags">
                      {skillTags.map((skill) => (
                        <span className="profile-skill-tag" key={skill}>
                          {skill}
                          <button type="button" aria-label={`Xóa kỹ năng ${skill}`} onClick={() => removeSkill(skill)}>
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                      <input
                        id="profile-skills-input"
                        type="text"
                        value={skillDraft}
                        maxLength="45"
                        placeholder={skillTags.length ? 'Thêm kỹ năng...' : 'Gõ kỹ năng, nhấn Enter...'}
                        aria-invalid={Boolean(fieldErrors.skills)}
                        aria-describedby={fieldErrors.skills ? 'profile-skills-error' : undefined}
                        autoComplete="off"
                        onFocus={() => setSkillSuggestionsOpen(true)}
                        onChange={(event) => setSkillDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            addSkill()
                          }
                          if (event.key === 'Escape') setSkillSuggestionsOpen(false)
                        }}
                      />
                    </div>
                    {skillSuggestionsOpen && filteredSkillOptions.length > 0 && (
                      <div className="profile-skill-suggestions" role="listbox" aria-label="Kỹ năng gợi ý">
                        {filteredSkillOptions.map((skill) => (
                          <button
                            type="button"
                            role="option"
                            key={skill}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => addSkill(skill)}
                          >
                            {skill}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input type="hidden" name="skills" value={skillTags.join(', ')} />
                  {fieldErrors.skills && <small id="profile-skills-error" className="profile-inline-error" role="alert">{fieldErrors.skills}</small>}
                  {!fieldErrors.skills && <small className="profile-field-hint">Gợi ý được cá nhân hóa theo ngành học.</small>}
                </div>
                <label className="contact-form-message profile-field">
                  <span>Giới thiệu bản thân</span>
                  <textarea name="bio" rows="4" defaultValue={profile.bio} maxLength="1000" />
                </label>
              </div>
              {error && <p className="contact-form-error" role="alert">{error}</p>}
              <button className="button button-primary contact-submit" type="submit" disabled={saving}>
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </form>

            <section className="profile-card cv-card" aria-label="CV của bạn">
              <h2>CV của bạn</h2>
              {profile.cv ? (
                <div className="cv-file">
                  <FileText size={22} />
                  <div>
                    <strong title={profile.cv.name}>{profile.cv.name}</strong>
                    <small>Tải lên lúc {profile.cv.uploadedAt}</small>
                  </div>
                </div>
              ) : (
                <div className="application-history-empty">
                  <FileText size={24} />
                  <p>Bạn chưa tải CV lên. Cần có CV để ứng tuyển.</p>
                </div>
              )}
              <input
                ref={fileInput}
                className="cv-input"
                type="file"
                accept=".pdf,.doc,.docx,application/pdf"
                onChange={handleCvChange}
                hidden
              />
              <div className="cv-actions">
                <button className="button button-primary" type="button" disabled={cvBusy} onClick={() => fileInput.current?.click()}>
                  <Upload size={14} /> {profile.cv ? 'Thay CV' : 'Tải CV lên'}
                </button>
                {profile.cv && (
                  <>
                    <button className="button button-outline" type="button" disabled={cvBusy} onClick={handleCvDownload}>
                      <Download size={14} /> Tải về
                    </button>
                    <button className="button button-outline" type="button" disabled={cvBusy} onClick={handleCvDelete}>
                      <Trash2 size={14} /> Xóa
                    </button>
                  </>
                )}
              </div>
              <small className="cv-hint">Hỗ trợ PDF, DOC, DOCX — tối đa 5 MB.</small>
              {cvError && <p className="contact-form-error" role="alert">{cvError}</p>}
            </section>
          </div>
        )}
      </div>
    </main>
  )
}

export default ProfilePage
