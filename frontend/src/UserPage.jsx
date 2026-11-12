import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { 
  User, 
  Clock, 
  RotateCcw, 
  ArrowLeft, 
  Edit3, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  KeyRound,
  Wrench,
  Sprout,
  XCircle,
  PlayCircle,
  Clock3,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon
} from 'lucide-react'
import logoImage from './assets/GardenBookingLogo.png'

const THEME = {
  primary: '#556B2F',
  accent: '#8FA31E',
  textDark: '#1e293b',
  textMuted: '#64748b',
  white: '#ffffff',
  bgSoft: '#f8fafc',
  borderDefault: '#cbd5e1',
  borderHover: '#475569',
  borderDivider: '#e2e8f0'
}

const MONTH_NAMES = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
]
const DAY_NAMES = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz']

function isServiceReservation(res) {
  const name = (res.itemName || '').toLowerCase()
  return (
    name.includes('usługa') ||
    name.includes('koszenie') ||
    name.includes('aeracja') ||
    name.includes('wertykulacja') ||
    name.includes('cięcie') ||
    name.includes('wycinka') ||
    name.includes('zakładanie') ||
    name.includes('karczowanie')
  )
}

function getStatusConfig(status, isService) {
  switch (status) {
    case 'COMPLETED':
      return {
        label: isService ? 'Ukończone' : 'Zakończone',
        Icon: CheckCircle2,
        bg: '#f0fdf4',
        color: '#15803d',
        border: '#bbf7d0'
      }
    case 'CANCELLED':
      return {
        label: 'Anulowane',
        Icon: XCircle,
        bg: '#fef2f2',
        color: '#b91c1c',
        border: '#fecaca'
      }
    case 'CONFIRMED':
    case 'IN_PROGRESS':
      return {
        label: 'W trakcie',
        Icon: PlayCircle,
        bg: '#f1f5f9',
        color: '#334155',
        border: '#cbd5e1'
      }
    case 'PENDING':
    default:
      return {
        label: 'Oczekujące',
        Icon: Clock3,
        bg: '#f1f5f9',
        color: '#475569',
        border: '#cbd5e1'
      }
  }
}

const formatDateShort = (val) => {
  if (!val) return '-'
  return new Date(val).toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

const toDateOnly = (val) => {
  if (!val) return ''
  return String(val).slice(0, 10)
}

const getDeliveryLabel = (r, service) => {
  if (service) return 'Dojazd ekipy'
  return r.deliveryType === 'DELIVERY' ? 'Dostawa pod adres' : 'Odbiór osobisty'
}

const getPaymentLabel = (r) => {
  if (r.paymentType === 'BLIK') return 'BLIK'
  if (r.paymentType === 'CARD') return 'Karta płatnicza'
  if (r.paymentType === 'CASH') return 'Gotówka'
  return r.status === 'PENDING' ? 'Przy odbiorze' : 'Opłacone'
}

export default function UserPage({ currentUser, onUserUpdate, onRebookItem }) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const isEmployee = currentUser?.role === 'EMPLOYEE'

  useEffect(() => {
    if (!currentUser) {
      navigate('/auth')
    }
  }, [currentUser, navigate])

  const tabFromUrl = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(
    tabFromUrl === 'RESERVATIONS' ? 'RESERVATIONS' : 'PROFILE'
  )

  useEffect(() => {
    const t = searchParams.get('tab')
    if (t === 'RESERVATIONS' || t === 'PROFILE') {
      setActiveTab(t)
    }
  }, [searchParams])

  const handleTabSwitch = (tab) => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  const [reservationCategory, setReservationCategory] = useState('ALL')
  const [employeeTaskFilter, setEmployeeTaskFilter] = useState('ALL')

  const [openCurrentSection, setOpenCurrentSection] = useState(true)
  const [openHistorySection, setOpenHistorySection] = useState(true)

  const [editingField, setEditingField] = useState(null)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const [formData, setFormData] = useState({
    firstName: currentUser?.firstName || '',
    lastName: currentUser?.lastName || '',
    phoneNumber: currentUser?.phoneNumber || '',
    currentPassword: '',
    password: ''
  })
  const [profileMsg, setProfileMsg] = useState(null)
  const [loading, setLoading] = useState(false)

  const [reservations, setReservations] = useState([])
  const [resLoading, setResLoading] = useState(false)

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedScheduleDay, setSelectedScheduleDay] = useState(() => {
    return new Date().toISOString().slice(0, 10)
  })

  const fetchReservationsOrSchedule = () => {
    const uid = currentUser?.userId || currentUser?.id
    if (!uid) return
    setResLoading(true)
    const url = isEmployee
      ? `http://localhost:8080/api/reservations/schedule/${uid}`
      : `http://localhost:8080/api/reservations/user/${uid}`

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('Błąd pobierania')
        return res.json()
      })
      .then((data) => {
        setReservations(Array.isArray(data) ? data : [])
        setResLoading(false)
      })
      .catch(() => {
        setReservations([])
        setResLoading(false)
      })
  }

  useEffect(() => {
    if (activeTab === 'RESERVATIONS') {
      fetchReservationsOrSchedule()
    }
  }, [activeTab, currentUser, isEmployee])

  // Obsługa checkboxa pracownika (oznaczenie zadania jako wykonane / cofnięcie)
  const handleToggleTaskCheckbox = async (task, checked) => {
    const resId = task.id || task.reservationId
    let nextStatus = 'PENDING'

    if (task.taskType === 'HANDOVER_OUT') {
      // Wydanie sprzętu: zaznaczenie = CONFIRMED (w trakcie wynajmu), odznaczenie = PENDING
      nextStatus = checked ? 'CONFIRMED' : 'PENDING'
    } else {
      // Odbiór sprzętu lub Usługa: zaznaczenie = COMPLETED (zakończone), odznaczenie = CONFIRMED/PENDING
      nextStatus = checked ? 'COMPLETED' : (task.taskType === 'HANDOVER_IN' ? 'CONFIRMED' : 'PENDING')
    }

    try {
      const res = await fetch(
        `http://localhost:8080/api/reservations/${resId}/status?status=${nextStatus}`,
        { method: 'PATCH' }
      )
      if (res.ok) {
        fetchReservationsOrSchedule()
      }
    } catch {
      // ignoruj
    }
  }

  const handleSave = async (e) => {
    if (e) e.preventDefault()
    setLoading(true)
    setProfileMsg(null)

    if (isChangingPassword && (!formData.currentPassword || !formData.password)) {
      setProfileMsg({ type: 'error', text: 'Wpisz obecne oraz nowe hasło.' })
      setLoading(false)
      return
    }

    const uid = currentUser?.userId || currentUser?.id
    try {
      const res = await fetch(`http://localhost:8080/api/auth/profile/${uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()
      if (res.ok) {
        setProfileMsg({ type: 'success', text: 'Zaktualizowano pomyślnie.' })
        setEditingField(null)
        setIsChangingPassword(false)
        setFormData((prev) => ({ ...prev, currentPassword: '', password: '' }))
        if (onUserUpdate) onUserUpdate(data)
      } else {
        setProfileMsg({ type: 'error', text: data.message || 'Błąd zapisu.' })
      }
    } catch {
      setProfileMsg({ type: 'error', text: 'Błąd połączenia z serwerem.' })
    } finally {
      setLoading(false)
    }
  }

  const now = new Date()

  const filteredClientReservations = useMemo(() => {
    return reservations.filter((r) => {
      if (reservationCategory === 'ALL') return true
      const isService = isServiceReservation(r)
      if (reservationCategory === 'SERVICE') return isService
      if (reservationCategory === 'EQUIPMENT') return !isService
      return true
    })
  }, [reservations, reservationCategory])

  const activeReservations = useMemo(() => {
    return filteredClientReservations.filter((r) => {
      const end = new Date(r.endDate || r.endTime)
      return (isNaN(end) || end >= now) && r.status !== 'CANCELLED' && r.status !== 'COMPLETED'
    })
  }, [filteredClientReservations, now])

  const historyReservations = useMemo(() => {
    return filteredClientReservations.filter((r) => {
      const end = new Date(r.endDate || r.endTime)
      return (!isNaN(end) && end < now) || r.status === 'CANCELLED' || r.status === 'COMPLETED'
    })
  }, [filteredClientReservations, now])

  const employeeDailyTasks = useMemo(() => {
    const tasks = []

    for (const r of reservations) {
      const service = isServiceReservation(r)
      const startDay = toDateOnly(r.startDate || r.startTime)
      const endDay = toDateOnly(r.endDate || r.endTime)

      if (service) {
        tasks.push({
          ...r,
          taskUniqueId: `${r.id || r.reservationId}-SERVICE`,
          taskDate: startDay,
          taskType: 'SERVICE',
          taskTypeLabel: 'Usługa',
          isDone: r.status === 'COMPLETED'
        })
      } else {
        if (startDay) {
          tasks.push({
            ...r,
            taskUniqueId: `${r.id || r.reservationId}-OUT`,
            taskDate: startDay,
            taskType: 'HANDOVER_OUT',
            taskTypeLabel: 'Wydanie',
            isDone: r.status === 'CONFIRMED' || r.status === 'COMPLETED'
          })
        }
        if (endDay) {
          tasks.push({
            ...r,
            taskUniqueId: `${r.id || r.reservationId}-IN`,
            taskDate: endDay,
            taskType: 'HANDOVER_IN',
            taskTypeLabel: 'Odbiór',
            isDone: r.status === 'COMPLETED'
          })
        }
      }
    }

    return tasks.filter((t) => {
      if (employeeTaskFilter === 'ALL') return true
      return t.taskType === employeeTaskFilter
    })
  }, [reservations, employeeTaskFilter])

  const getTasksForDay = (dateStr) => {
    return employeeDailyTasks.filter((t) => t.taskDate === dateStr)
  }

  const formatDayCellSummary = (tasks) => {
    if (!tasks || tasks.length === 0) return 'brak'
    const outCount = tasks.filter((t) => t.taskType === 'HANDOVER_OUT').length
    const inCount = tasks.filter((t) => t.taskType === 'HANDOVER_IN').length
    const srvCount = tasks.filter((t) => t.taskType === 'SERVICE').length

    const parts = []
    if (outCount > 0) parts.push(`${outCount} wyd.`)
    if (inCount > 0) parts.push(`${inCount} odb.`)
    if (srvCount > 0) parts.push(`${srvCount} usł.`)
    return parts.join(', ')
  }

  const scheduleCalendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)

    const startOffset = (firstDayOfMonth.getDay() + 6) % 7
    const totalDays = lastDayOfMonth.getDate()

    const days = []
    for (let i = 0; i < startOffset; i++) {
      days.push(null)
    }

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const tasks = getTasksForDay(dateStr)
      days.push({
        day,
        dateStr,
        tasks
      })
    }
    return days
  }, [currentMonth, employeeDailyTasks])

  const selectedDayTasks = useMemo(() => {
    if (!selectedScheduleDay) return []
    return getTasksForDay(selectedScheduleDay)
  }, [selectedScheduleDay, employeeDailyTasks])

  const handleRebook = (res) => {
    if (onRebookItem) {
      onRebookItem({ id: res.itemId, name: res.itemName })
    }
    navigate('/')
  }

  if (!currentUser) return null

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      backgroundColor: '#f1f5f9',
      color: THEME.textDark,
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <style>{`
        .res-table-wrapper { display: block; width: 100%; }
        .res-mobile-cards { display: none; }
        @media (max-width: 768px) {
          .res-table-wrapper { display: none; }
          .res-mobile-cards { display: flex; flex-direction: column; gap: 0.75rem; }
          .user-page-pad { padding: 1rem !important; }
        }
      `}</style>

      <nav style={{
        height: '65px',
        backgroundColor: THEME.white,
        padding: '0 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${THEME.borderDivider}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
            <img src={logoImage} alt="GardenBooking" style={{ height: '38px', objectFit: 'contain' }} />
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: THEME.primary }}>
              Garden<span style={{ color: THEME.accent }}>Booking</span>
            </span>
          </Link>
          <span style={{ fontSize: '0.85rem', color: THEME.textMuted }}>
            / {isEmployee ? 'Panel pracownika' : 'Panel klienta'}
          </span>
        </div>

        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            textDecoration: 'none',
            color: THEME.textDark,
            fontWeight: 600,
            fontSize: '0.85rem',
            padding: '7px 12px',
            borderRadius: '4px',
            border: `1px solid ${THEME.borderDefault}`,
            backgroundColor: THEME.bgSoft
          }}
        >
          <ArrowLeft size={16} />
          Wróć
        </Link>
      </nav>

      <main style={{ maxWidth: '1040px', margin: '2rem auto', padding: '0 1rem' }}>
        <div style={{
          backgroundColor: THEME.white,
          borderRadius: '4px',
          border: `1px solid ${THEME.borderDefault}`,
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', backgroundColor: '#f8fafc', borderBottom: `1px solid ${THEME.borderDivider}` }}>
            <button
              onClick={() => handleTabSwitch('PROFILE')}
              style={{
                flex: 1,
                padding: '14px',
                border: 'none',
                borderBottom: activeTab === 'PROFILE' ? `2px solid ${THEME.borderHover}` : '2px solid transparent',
                backgroundColor: activeTab === 'PROFILE' ? THEME.white : 'transparent',
                color: activeTab === 'PROFILE' ? THEME.textDark : THEME.textMuted,
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <User size={16} />
              Dane profilu
            </button>
            <button
              onClick={() => handleTabSwitch('RESERVATIONS')}
              style={{
                flex: 1,
                padding: '14px',
                border: 'none',
                borderBottom: activeTab === 'RESERVATIONS' ? `2px solid ${THEME.borderHover}` : '2px solid transparent',
                backgroundColor: activeTab === 'RESERVATIONS' ? THEME.white : 'transparent',
                color: activeTab === 'RESERVATIONS' ? THEME.textDark : THEME.textMuted,
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {isEmployee ? <CalendarIcon size={16} /> : <Clock size={16} />}
              {isEmployee ? 'Grafik pracy' : 'Rezerwacje i historia'}
            </button>
          </div>

          <div className="user-page-pad" style={{ padding: '1.75rem' }}>
            {profileMsg && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '4px',
                marginBottom: '1.5rem',
                backgroundColor: profileMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
                color: profileMsg.type === 'success' ? '#15803d' : '#b91c1c',
                border: `1px solid ${profileMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {profileMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                {profileMsg.text}
              </div>
            )}

            {activeTab === 'PROFILE' && (
              <div>
                <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.15rem', color: THEME.textDark }}>
                  Twoje dane osobowe ({isEmployee ? 'Pracownik' : 'Klient'})
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{
                    padding: '1rem',
                    backgroundColor: THEME.bgSoft,
                    border: `1px solid ${THEME.borderDefault}`,
                    borderRadius: '4px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: THEME.textMuted, display: 'block' }}>
                          Imię i nazwisko
                        </span>
                        {editingField !== 'NAME' && (
                          <span style={{ fontSize: '1rem', fontWeight: 700, color: THEME.textDark }}>
                            {formData.firstName || formData.lastName
                              ? `${formData.firstName} ${formData.lastName}`.trim()
                              : 'Brak danych'}
                          </span>
                        )}
                      </div>

                      {editingField !== 'NAME' ? (
                        <button
                          onClick={() => { setEditingField('NAME'); setProfileMsg(null) }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '6px 14px',
                            borderRadius: '4px',
                            border: `1px solid ${THEME.borderDefault}`,
                            backgroundColor: THEME.white,
                            color: THEME.textDark,
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          <Edit3 size={14} /> Edytuj
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={handleSave}
                            disabled={loading}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '4px',
                              border: `1px solid ${THEME.borderDefault}`,
                              backgroundColor: THEME.primary,
                              color: THEME.white,
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            {loading ? 'Zapis...' : 'Zapisz'}
                          </button>
                          <button
                            onClick={() => setEditingField(null)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '4px',
                              border: `1px solid ${THEME.borderDefault}`,
                              backgroundColor: THEME.white,
                              color: THEME.textDark,
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Anuluj
                          </button>
                        </div>
                      )}
                    </div>

                    {editingField === 'NAME' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginTop: '0.8rem' }}>
                        <input
                          type="text"
                          placeholder="Imię"
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '4px',
                            border: `1px solid ${THEME.borderDefault}`,
                            backgroundColor: THEME.white,
                            fontSize: '0.9rem'
                          }}
                        />
                        <input
                          type="text"
                          placeholder="Nazwisko"
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '4px',
                            border: `1px solid ${THEME.borderDefault}`,
                            backgroundColor: THEME.white,
                            fontSize: '0.9rem'
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div style={{
                    padding: '1rem',
                    backgroundColor: THEME.bgSoft,
                    border: `1px solid ${THEME.borderDefault}`,
                    borderRadius: '4px'
                  }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: THEME.textMuted, display: 'block' }}>
                      Adres e-mail
                    </span>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: THEME.textDark }}>
                      {currentUser.email}
                    </span>
                  </div>

                  <div style={{
                    padding: '1rem',
                    backgroundColor: THEME.bgSoft,
                    border: `1px solid ${THEME.borderDefault}`,
                    borderRadius: '4px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: THEME.textMuted, display: 'block' }}>
                          Numer telefonu
                        </span>
                        {editingField !== 'PHONE' && (
                          <span style={{ fontSize: '1rem', fontWeight: 700, color: formData.phoneNumber ? THEME.textDark : THEME.textMuted }}>
                            {formData.phoneNumber || 'Brak numeru telefonu'}
                          </span>
                        )}
                      </div>

                      {editingField !== 'PHONE' ? (
                        <button
                          onClick={() => { setEditingField('PHONE'); setProfileMsg(null) }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '6px 14px',
                            borderRadius: '4px',
                            border: `1px solid ${THEME.borderDefault}`,
                            backgroundColor: THEME.white,
                            color: THEME.textDark,
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {formData.phoneNumber ? <><Edit3 size={14} /> Edytuj</> : <><Plus size={14} /> Dodaj</>}
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={handleSave}
                            disabled={loading}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '4px',
                              border: `1px solid ${THEME.borderDefault}`,
                              backgroundColor: THEME.primary,
                              color: THEME.white,
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            {loading ? 'Zapis...' : 'Zapisz'}
                          </button>
                          <button
                            onClick={() => setEditingField(null)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '4px',
                              border: `1px solid ${THEME.borderDefault}`,
                              backgroundColor: THEME.white,
                              color: THEME.textDark,
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Anuluj
                          </button>
                        </div>
                      )}
                    </div>

                    {editingField === 'PHONE' && (
                      <div style={{ marginTop: '0.8rem' }}>
                        <input
                          type="tel"
                          placeholder="np. 600700800"
                          value={formData.phoneNumber}
                          onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: '4px',
                            border: `1px solid ${THEME.borderDefault}`,
                            backgroundColor: THEME.white,
                            fontSize: '0.9rem',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div style={{
                    padding: '1.25rem',
                    backgroundColor: THEME.bgSoft,
                    border: `1px solid ${THEME.borderDefault}`,
                    borderRadius: '4px',
                    marginTop: '0.5rem'
                  }}>
                    {!isChangingPassword ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <KeyRound size={17} color={THEME.textMuted} />
                          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: THEME.textDark }}>
                            Chcesz zmienić hasło?
                          </span>
                        </div>
                        <button
                          onClick={() => { setIsChangingPassword(true); setProfileMsg(null) }}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '4px',
                            border: `1px solid ${THEME.borderDefault}`,
                            backgroundColor: THEME.white,
                            color: THEME.textDark,
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Kliknij, aby zmienić
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: THEME.textMuted }}>
                          Obecne hasło:
                          <input
                            type="password"
                            required
                            value={formData.currentPassword}
                            onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              marginTop: '4px',
                              borderRadius: '4px',
                              border: `1px solid ${THEME.borderDefault}`,
                              backgroundColor: THEME.white,
                              boxSizing: 'border-box'
                            }}
                          />
                        </label>

                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: THEME.textMuted }}>
                          Nowe hasło:
                          <input
                            type="password"
                            required
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              marginTop: '4px',
                              borderRadius: '4px',
                              border: `1px solid ${THEME.borderDefault}`,
                              backgroundColor: THEME.white,
                              boxSizing: 'border-box'
                            }}
                          />
                        </label>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="submit"
                            disabled={loading}
                            style={{
                              padding: '8px 16px',
                              borderRadius: '4px',
                              border: `1px solid ${THEME.borderDefault}`,
                              backgroundColor: THEME.primary,
                              color: THEME.white,
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Zapisz nowe hasło
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsChangingPassword(false)
                              setFormData((prev) => ({ ...prev, currentPassword: '', password: '' }))
                            }}
                            style={{
                              padding: '8px 14px',
                              borderRadius: '4px',
                              border: `1px solid ${THEME.borderDefault}`,
                              backgroundColor: THEME.white,
                              color: THEME.textDark,
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Anuluj
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ZAKŁADKA REZERWACJI (KLIENT) LUB GRAFIKU W KALENDARZU (PRACOWNIK) */}
            {activeTab === 'RESERVATIONS' && (
              <div>
                {resLoading && <p style={{ color: THEME.textMuted, fontSize: '0.85rem' }}>Ładowanie danych...</p>}

                {/* MINIMALISTYCZNY WIDOK GRAFIKU DLA PRACOWNIKA (EMPLOYEE) */}
                {!resLoading && isEmployee && (
                  <div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                      {[
                        { id: 'ALL', label: 'Wszystkie' },
                        { id: 'HANDOVER_OUT', label: 'Wydania' },
                        { id: 'HANDOVER_IN', label: 'Odbiory' },
                        { id: 'SERVICE', label: 'Usługi' }
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setEmployeeTaskFilter(cat.id)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '4px',
                            border: `1px solid ${employeeTaskFilter === cat.id ? THEME.primary : THEME.borderDefault}`,
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            backgroundColor: employeeTaskFilter === cat.id ? THEME.primary : THEME.bgSoft,
                            color: employeeTaskFilter === cat.id ? THEME.white : THEME.textDark
                          }}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                          Kalendarz zadań
                        </h3>
                        <p style={{ fontSize: '0.82rem', color: THEME.textMuted, margin: '2px 0 0 0' }}>
                          Kliknij dzień w kalendarzu, aby zobaczyć zaplanowane zadania.
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                          style={{
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '4px',
                            border: `1px solid ${THEME.borderDefault}`,
                            backgroundColor: THEME.white,
                            cursor: 'pointer'
                          }}
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <span style={{ fontWeight: 700, fontSize: '0.92rem', minWidth: '140px', textAlign: 'center' }}>
                          {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                          style={{
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '4px',
                            border: `1px solid ${THEME.borderDefault}`,
                            backgroundColor: THEME.white,
                            cursor: 'pointer'
                          }}
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(7, 1fr)',
                      gap: '6px',
                      textAlign: 'center',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: THEME.textMuted,
                      marginBottom: '6px'
                    }}>
                      {DAY_NAMES.map((d) => <div key={d}>{d}</div>)}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                      {scheduleCalendarDays.map((dayObj, idx) => {
                        if (!dayObj) {
                          return <div key={`empty-${idx}`} style={{ height: '62px' }} />
                        }

                        const isSelected = selectedScheduleDay === dayObj.dateStr
                        const hasTasks = dayObj.tasks.length > 0

                        return (
                          <div
                            key={dayObj.dateStr}
                            onClick={() => setSelectedScheduleDay(dayObj.dateStr)}
                            style={{
                              height: '62px',
                              borderRadius: '4px',
                              border: isSelected
                                ? `2px solid ${THEME.textDark}`
                                : `1px solid ${THEME.borderDefault}`,
                              backgroundColor: isSelected
                                ? '#e2e8f0'
                                : hasTasks
                                  ? THEME.white
                                  : '#f8fafc',
                              color: THEME.textDark,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              userSelect: 'none'
                            }}
                          >
                            <span style={{ fontSize: '0.95rem', fontWeight: isSelected || hasTasks ? 800 : 600 }}>
                              {dayObj.day}
                            </span>
                            <span style={{
                              fontSize: '0.67rem',
                              color: hasTasks ? THEME.textDark : '#94a3b8',
                              marginTop: '2px'
                            }}>
                              {formatDayCellSummary(dayObj.tasks)}
                            </span>
                          </div>
                        )
                      })}
                    </div>

                    {/* Minimalistyczna lista zadań pod kalendarzem ze zwykłym checkboxem */}
                    <div style={{ marginTop: '1.5rem', borderTop: `1px solid ${THEME.borderDivider}`, paddingTop: '1.25rem' }}>
                      <h4 style={{ margin: '0 0 0.85rem 0', fontSize: '0.95rem', fontWeight: 700 }}>
                        Zadania na dzień {selectedScheduleDay} ({selectedDayTasks.length})
                      </h4>

                      {selectedDayTasks.length === 0 ? (
                        <p style={{ fontSize: '0.85rem', color: THEME.textMuted, margin: 0 }}>
                          Brak zadań w wybranym dniu.
                        </p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                          {selectedDayTasks.map((task) => {
                            const service = task.taskType === 'SERVICE'
                            const cleanName = (task.itemName || '').replace(/^Usługa:\s*/i, '')

                            return (
                              <div
                                key={task.taskUniqueId}
                                style={{
                                  padding: '0.85rem 1rem',
                                  borderRadius: '4px',
                                  border: `1px solid ${THEME.borderDefault}`,
                                  backgroundColor: THEME.bgSoft,
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  flexWrap: 'wrap',
                                  gap: '1rem',
                                  opacity: task.isDone ? 0.65 : 1
                                }}
                              >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  <div style={{ fontSize: '0.95rem', fontWeight: 700, textDecoration: task.isDone ? 'line-through' : 'none' }}>
                                    {task.taskTypeLabel}: {cleanName}
                                  </div>

                                  <div style={{ fontSize: '0.82rem', color: THEME.textMuted }}>
                                    Klient: {task.clientName || 'Gość'} (tel. {task.clientPhone || '-'}) | {task.deliveryAddress || getDeliveryLabel(task, service)}
                                  </div>
                                </div>

                                <label style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  fontSize: '0.85rem',
                                  fontWeight: 600,
                                  color: THEME.textDark,
                                  cursor: 'pointer',
                                  userSelect: 'none'
                                }}>
                                  <input
                                    type="checkbox"
                                    checked={task.isDone}
                                    onChange={(e) => handleToggleTaskCheckbox(task, e.target.checked)}
                                    style={{ width: '17px', height: '17px', cursor: 'pointer', accentColor: THEME.primary }}
                                  />
                                  {task.isDone ? 'Zakończono' : 'Oznacz jako wykonane'}
                                </label>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* WIDOK BIEŻĄCYCH I ZAKOŃCZONYCH ZAMÓWIEŃ DLA KLIENTA (CLIENT) */}
                {!resLoading && !isEmployee && (
                  <>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                      {[
                        { id: 'ALL', label: 'Wszystkie' },
                        { id: 'EQUIPMENT', label: 'Sprzęt' },
                        { id: 'SERVICE', label: 'Usługi' }
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setReservationCategory(cat.id)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '4px',
                            border: `1px solid ${reservationCategory === cat.id ? THEME.primary : THEME.borderDefault}`,
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            backgroundColor: reservationCategory === cat.id ? THEME.primary : THEME.bgSoft,
                            color: reservationCategory === cat.id ? THEME.white : THEME.textDark
                          }}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    {filteredClientReservations.length === 0 && (
                      <p style={{ color: THEME.textMuted, fontSize: '0.85rem', margin: '2rem 0' }}>
                        Brak zamówień w wybranej kategorii.
                      </p>
                    )}

                    {filteredClientReservations.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ border: `1px solid ${THEME.borderDefault}`, borderRadius: '4px', overflow: 'hidden' }}>
                          <button
                            type="button"
                            onClick={() => setOpenCurrentSection(!openCurrentSection)}
                            style={{
                              width: '100%',
                              padding: '12px 16px',
                              backgroundColor: THEME.bgSoft,
                              border: 'none',
                              borderBottom: openCurrentSection ? `1px solid ${THEME.borderDivider}` : 'none',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              cursor: 'pointer',
                              color: THEME.textDark,
                              fontWeight: 700,
                              fontSize: '0.9rem'
                            }}
                          >
                            <span>Bieżące i nadchodzące ({activeReservations.length})</span>
                            {openCurrentSection ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </button>

                          {openCurrentSection && (
                            activeReservations.length === 0 ? (
                              <div style={{ padding: '1rem', fontSize: '0.84rem', color: THEME.textMuted }}>
                                Brak bieżących rezerwacji.
                              </div>
                            ) : (
                              <ReservationResponsiveView
                                items={activeReservations}
                                showPayment={true}
                                showRebook={false}
                                onRebook={handleRebook}
                              />
                            )
                          )}
                        </div>

                        <div style={{ border: `1px solid ${THEME.borderDefault}`, borderRadius: '4px', overflow: 'hidden' }}>
                          <button
                            type="button"
                            onClick={() => setOpenHistorySection(!openHistorySection)}
                            style={{
                              width: '100%',
                              padding: '12px 16px',
                              backgroundColor: THEME.bgSoft,
                              border: 'none',
                              borderBottom: openHistorySection ? `1px solid ${THEME.borderDivider}` : 'none',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              cursor: 'pointer',
                              color: THEME.textDark,
                              fontWeight: 700,
                              fontSize: '0.9rem'
                            }}
                          >
                            <span>Zakończone ({historyReservations.length})</span>
                            {openHistorySection ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </button>

                          {openHistorySection && (
                            historyReservations.length === 0 ? (
                              <div style={{ padding: '1rem', fontSize: '0.84rem', color: THEME.textMuted }}>
                                Brak zakończonych zamówień.
                              </div>
                            ) : (
                              <ReservationResponsiveView
                                items={historyReservations}
                                showPayment={false}
                                showRebook={true}
                                onRebook={handleRebook}
                              />
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function ReservationResponsiveView({ items, showPayment, showRebook, onRebook }) {
  const thStyle = {
    padding: '10px 10px',
    fontSize: '0.74rem',
    fontWeight: 700,
    color: THEME.textMuted,
    textTransform: 'uppercase',
    borderBottom: `1px solid ${THEME.borderDivider}`,
    backgroundColor: '#ffffff',
    textAlign: 'left'
  }

  const tdStyle = {
    padding: '10px 10px',
    fontSize: '0.83rem',
    color: THEME.textDark,
    borderBottom: `1px solid ${THEME.borderDivider}`,
    verticalAlign: 'middle'
  }

  return (
    <>
      <div className="res-table-wrapper">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Kategoria</th>
              <th style={thStyle}>Nazwa</th>
              <th style={thStyle}>Data</th>
              <th style={thStyle}>Koszt</th>
              <th style={thStyle}>Dostawa</th>
              {showPayment && <th style={thStyle}>Płatność</th>}
              <th style={thStyle}>Status</th>
              {showRebook && <th style={{ ...thStyle, textAlign: 'right' }}>Akcja</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((r) => {
              const isService = isServiceReservation(r)
              const statusCfg = getStatusConfig(r.status, isService)
              const StatusIcon = statusCfg.Icon
              const rawName = r.itemName || `Zamówienie #${r.id || r.reservationId}`
              const cleanName = rawName.replace(/^Usługa:\s*/i, '')

              return (
                <tr key={r.id || r.reservationId}>
                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '3px 7px',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      backgroundColor: '#f1f5f9',
                      color: '#334155',
                      border: `1px solid ${THEME.borderDefault}`,
                      whiteSpace: 'nowrap'
                    }}>
                      {isService ? <Sprout size={12} /> : <Wrench size={12} />}
                      {isService ? 'Usługa' : 'Sprzęt'}
                    </span>
                  </td>

                  <td style={{ ...tdStyle, fontWeight: 700 }}>{cleanName}</td>

                  <td style={{ ...tdStyle, color: THEME.textMuted, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                    {formatDateShort(r.startDate || r.startTime)} — {formatDateShort(r.endDate || r.endTime)}
                  </td>

                  <td style={{ ...tdStyle, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {r.totalPrice} zł
                  </td>

                  <td style={{ ...tdStyle, fontSize: '0.8rem' }}>
                    {getDeliveryLabel(r, isService)}
                  </td>

                  {showPayment && (
                    <td style={{ ...tdStyle, fontSize: '0.8rem' }}>
                      {getPaymentLabel(r)}
                    </td>
                  )}

                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      backgroundColor: statusCfg.bg,
                      color: statusCfg.color,
                      border: `1px solid ${statusCfg.border}`,
                      whiteSpace: 'nowrap'
                    }}>
                      <StatusIcon size={13} />
                      {statusCfg.label}
                    </span>
                  </td>

                  {showRebook && (
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {r.itemId ? (
                        <button
                          onClick={() => onRebook(r)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '5px 10px',
                            borderRadius: '4px',
                            border: `1px solid ${THEME.borderDefault}`,
                            backgroundColor: THEME.primary,
                            color: THEME.white,
                            fontSize: '0.76rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          <RotateCcw size={12} />
                          Ponów
                        </button>
                      ) : '-'}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="res-mobile-cards" style={{ padding: '0.75rem' }}>
        {items.map((r) => {
          const isService = isServiceReservation(r)
          const statusCfg = getStatusConfig(r.status, isService)
          const StatusIcon = statusCfg.Icon
          const rawName = r.itemName || `Zamówienie #${r.id || r.reservationId}`
          const cleanName = rawName.replace(/^Usługa:\s*/i, '')

          return (
            <div
              key={r.id || r.reservationId}
              style={{
                border: `1px solid ${THEME.borderDefault}`,
                borderRadius: '4px',
                padding: '0.9rem',
                backgroundColor: THEME.bgSoft,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  backgroundColor: THEME.white,
                  border: `1px solid ${THEME.borderDefault}`
                }}>
                  {isService ? 'Usługa' : 'Sprzęt'}
                </span>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  backgroundColor: statusCfg.bg,
                  color: statusCfg.color,
                  border: `1px solid ${statusCfg.border}`
                }}>
                  <StatusIcon size={12} />
                  {statusCfg.label}
                </span>
              </div>

              <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{cleanName}</div>
              <div style={{ fontSize: '0.78rem', color: THEME.textMuted }}>
                {formatDateShort(r.startDate || r.startTime)} — {formatDateShort(r.endDate || r.endTime)} | <strong>{r.totalPrice} zł</strong>
              </div>
              {showRebook && r.itemId && (
                <button
                  onClick={() => onRebook(r)}
                  style={{
                    alignSelf: 'flex-end',
                    padding: '5px 10px',
                    borderRadius: '4px',
                    border: `1px solid ${THEME.primary}`,
                    backgroundColor: THEME.primary,
                    color: THEME.white,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Ponów
                </button>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}