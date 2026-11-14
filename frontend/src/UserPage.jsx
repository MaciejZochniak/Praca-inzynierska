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
  Package,
  BarChart3,
  ExternalLink,
  Trash2
} from 'lucide-react'
import logoImage from './assets/GardenBookingLogo.png'

const API_BASE = 'http://localhost:8080'

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

function resolveImgUrl(url) {
  if (!url) return 'https://placehold.co/120x80/f8fafc/475569?text=Brak'
  if (url.startsWith('http') || url.startsWith('data:')) return url
  return `${API_BASE}${url}`
}

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

function isServiceCatalogItem(item) {
  if (!item) return false
  const name = (item.name || '').toLowerCase()
  const catDesc = (item.category?.description || '').toLowerCase()
  const catId = item.category?.id || 0
  return (
    name.startsWith('usługa:') ||
    catDesc.includes('usług') ||
    (catId >= 10 && catId < 50)
  )
}

function isConsultationRecord(res) {
  const notes = (res.customerNotes || '').toUpperCase()
  return isServiceReservation(res) && notes.startsWith('KONSULTACJA')
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

const formatDateTimeShort = (val) => {
  if (!val) return '-'
  return new Date(val).toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
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

  const isAdmin = currentUser?.role === 'ADMIN'
  const isEmployee = currentUser?.role === 'EMPLOYEE'
  const isStaff = isAdmin || isEmployee

  useEffect(() => {
    if (!currentUser) {
      navigate('/auth')
    }
  }, [currentUser, navigate])

  const tabFromUrl = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(() => {
    if (isAdmin) {
      if (tabFromUrl === 'OFFER' || tabFromUrl === 'ANALYTICS' || tabFromUrl === 'SCHEDULE') {
        return tabFromUrl
      }
      return 'SCHEDULE'
    }
    return tabFromUrl === 'RESERVATIONS' ? 'RESERVATIONS' : 'PROFILE'
  })

  useEffect(() => {
    const t = searchParams.get('tab')
    if (isAdmin) {
      if (t === 'OFFER' || t === 'ANALYTICS' || t === 'SCHEDULE') {
        setActiveTab(t)
      } else if (t === 'RESERVATIONS' || t === 'PROFILE') {
        setActiveTab('SCHEDULE')
      }
    } else if (t === 'RESERVATIONS' || t === 'PROFILE') {
      setActiveTab(t)
    }
  }, [searchParams, isAdmin])

  const handleTabSwitch = (tab) => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  const [reservationCategory, setReservationCategory] = useState('ALL')
  const [employeeTaskFilter, setEmployeeTaskFilter] = useState('ALL')
  const [adminEmployeeFilter, setAdminEmployeeFilter] = useState('ALL')

  // Filtry i sortowanie tabeli historii zadań
  const [histSearch, setHistSearch] = useState('')
  const [histType, setHistType] = useState('ALL')
  const [histCategory, setHistCategory] = useState('ALL')
  const [histDateFrom, setHistDateFrom] = useState('')
  const [histDateTo, setHistDateTo] = useState('')
  const [histSortBy, setHistSortBy] = useState('DATE_DESC')

  const [openCurrentSection, setOpenCurrentSection] = useState(true)
  const [openHistorySection, setOpenHistorySection] = useState(true)

  // Sekcja Oferta (dla Admina)
  const [catalogItems, setCatalogItems] = useState([])
  const [categoriesList, setCategoriesList] = useState([])
  const [offerLoading, setOfferLoading] = useState(false)
  const [openServicesOffer, setOpenServicesOffer] = useState(true)
  const [openEquipmentOffer, setOpenEquipmentOffer] = useState(true)
  const [offerFormMode, setOfferFormMode] = useState(null)
  const [offerFormData, setOfferFormData] = useState({
    id: null,
    categoryId: '',
    newCategoryName: '',
    name: '',
    brand: '',
    description: '',
    price: '',
    quantity: 1,
    imageUrl: '/images/kosiarka.jpg'
  })
  const [offerSaving, setOfferSaving] = useState(false)
  const [confirmDeleteOffer, setConfirmDeleteOffer] = useState(null)

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

  const [activeConsultation, setActiveConsultation] = useState(null)
  const [consultForm, setConsultForm] = useState({
    agreedPrice: '',
    estimatedDuration: '1 dzień (ok. 6 godz.)',
    details: ''
  })
  const [consultSaving, setConsultSaving] = useState(false)

  const [confirmAction, setConfirmAction] = useState(null)

  const fetchReservationsOrSchedule = () => {
    const uid = currentUser?.userId || currentUser?.id
    if (!uid) return
    setResLoading(true)

    let url = `${API_BASE}/api/reservations/user/${uid}`
    if (isAdmin) {
      url = `${API_BASE}/api/reservations/all`
    } else if (isEmployee) {
      url = `${API_BASE}/api/reservations/schedule/${uid}`
    }

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

  const fetchCatalogAndCategories = async () => {
    setOfferLoading(true)
    try {
      const [itemsRes, catRes] = await Promise.all([
        fetch(`${API_BASE}/api/items`),
        fetch(`${API_BASE}/api/items/categories`)
      ])
      const itemsData = itemsRes.ok ? await itemsRes.json() : []
      const catData = catRes.ok ? await catRes.json() : []
      setCatalogItems(Array.isArray(itemsData) ? itemsData : [])
      setCategoriesList(Array.isArray(catData) ? catData : [])
    } catch {
      setCatalogItems([])
    } finally {
      setOfferLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'RESERVATIONS' || activeTab === 'SCHEDULE') {
      fetchReservationsOrSchedule()
    }
    if (isAdmin && activeTab === 'OFFER') {
      fetchCatalogAndCategories()
    }
  }, [activeTab, currentUser, isAdmin, isEmployee])

  const handleEmployeeStatusUpdate = async (reservationId, newStatus) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/reservations/${reservationId}/status?status=${newStatus}`,
        { method: 'PATCH' }
      )
      if (res.ok) {
        fetchReservationsOrSchedule()
      }
    } catch {
      // ignoruj
    }
  }

  const handleConfirmConsultationSubmit = async (e) => {
    e.preventDefault()
    if (!activeConsultation) return
    setConsultSaving(true)

    const cid = activeConsultation.id || activeConsultation.reservationId
    try {
      const res = await fetch(`${API_BASE}/api/reservations/${cid}/confirm-consultation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agreedPrice: Number(consultForm.agreedPrice),
          estimatedDuration: consultForm.estimatedDuration,
          details: consultForm.details
        })
      })
      if (res.ok) {
        setActiveConsultation(null)
        setConsultForm({ agreedPrice: '', estimatedDuration: '1 dzień (ok. 6 godz.)', details: '' })
        fetchReservationsOrSchedule()
      }
    } finally {
      setConsultSaving(false)
    }
  }

  // Filtrowanie kategorii w zależności od tego, czy dodajemy Usługę, czy Sprzęt
  const getCategoriesForType = (itemType) => {
    return categoriesList.filter((c) => {
      const desc = (c.description || '').toLowerCase()
      const isSrvCat = desc.includes('usług') || (c.id >= 10 && c.id < 50)
      return itemType === 'SERVICE' ? isSrvCat : !isSrvCat
    })
  }

  const handleOpenAddOffer = (itemType) => {
    const relevantCats = getCategoriesForType(itemType)
    setOfferFormData({
      id: null,
      categoryId: relevantCats[0]?.id || (relevantCats.length === 0 ? 'NEW' : ''),
      newCategoryName: '',
      name: '',
      brand: '',
      description: '',
      price: '',
      quantity: itemType === 'SERVICE' ? 2 : 1,
      imageUrl: '/images/kosiarka.jpg'
    })
    setOfferFormMode({ mode: 'ADD', itemType })
  }

  const handleOpenEditOffer = (item) => {
    const service = isServiceCatalogItem(item)
    setOfferFormData({
      id: item.id,
      categoryId: item.category?.id || (service ? 10 : 1),
      newCategoryName: '',
      name: (item.name || '').replace(/^Usługa:\s*/i, ''),
      brand: item.brand || '',
      description: item.description || '',
      price: item.price || '',
      quantity: item.quantity ?? 1,
      imageUrl: item.imageUrl || '/images/kosiarka.jpg'
    })
    setOfferFormMode({ mode: 'EDIT', itemType: service ? 'SERVICE' : 'EQUIPMENT' })
  }

  const handleOfferImageFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setOfferFormData((prev) => ({ ...prev, imageUrl: reader.result }))
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSaveOfferSubmit = async (e) => {
    e.preventDefault()
    if (!offerFormMode) return
    setOfferSaving(true)

    const isEdit = offerFormMode.mode === 'EDIT' && offerFormData.id
    const url = isEdit
      ? `${API_BASE}/api/items/${offerFormData.id}`
      : `${API_BASE}/api/items`
    const method = isEdit ? 'PUT' : 'POST'

    const isCreatingNewCategory = String(offerFormData.categoryId) === 'NEW'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType: offerFormMode.itemType,
          categoryId: isCreatingNewCategory ? null : Number(offerFormData.categoryId),
          newCategoryName: isCreatingNewCategory ? offerFormData.newCategoryName : null,
          name: offerFormData.name,
          brand: offerFormMode.itemType === 'EQUIPMENT' ? offerFormData.brand : null,
          description: offerFormData.description,
          price: Number(offerFormData.price),
          quantity: Number(offerFormData.quantity) || 1,
          imageUrl: offerFormData.imageUrl
        })
      })
      if (res.ok) {
        setOfferFormMode(null)
        fetchCatalogAndCategories()
      }
    } finally {
      setOfferSaving(false)
    }
  }

  const handleDeleteOfferConfirm = async () => {
    if (!confirmDeleteOffer) return
    try {
      const res = await fetch(`${API_BASE}/api/items/${confirmDeleteOffer.id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setConfirmDeleteOffer(null)
        fetchCatalogAndCategories()
      }
    } catch {
      setConfirmDeleteOffer(null)
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
      const res = await fetch(`${API_BASE}/api/auth/profile/${uid}`, {
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

  const allStaffTaskRows = useMemo(() => {
    const rows = []

    for (const r of reservations) {
      const service = isServiceReservation(r)
      const isConsult = isConsultationRecord(r)

      if (isConsult) {
        rows.push({
          ...r,
          rowKey: `${r.id}-CONSULT`,
          taskKind: 'CONSULTATION',
          taskLabel: 'Konsultacja telefoniczna',
          rawDate: r.startDate,
          displayDate: formatDateTimeShort(r.startDate),
          isServiceType: true,
          isDone: r.status === 'COMPLETED',
          isCancelled: r.status === 'CANCELLED'
        })
      } else if (service) {
        rows.push({
          ...r,
          rowKey: `${r.id}-SERVICE`,
          taskKind: 'SERVICE',
          taskLabel: 'Usługa do realizacji',
          rawDate: r.startDate,
          displayDate: formatDateShort(r.startDate),
          isServiceType: true,
          isDone: r.status === 'COMPLETED',
          isCancelled: r.status === 'CANCELLED'
        })
      } else {
        rows.push({
          ...r,
          rowKey: `${r.id}-OUT`,
          taskKind: 'HANDOVER_OUT',
          taskLabel: 'Wydanie sprzętu',
          rawDate: r.startDate,
          displayDate: formatDateShort(r.startDate),
          isServiceType: false,
          isDone: r.status === 'CONFIRMED' || r.status === 'COMPLETED',
          isCancelled: r.status === 'CANCELLED'
        })
        rows.push({
          ...r,
          rowKey: `${r.id}-IN`,
          taskKind: 'HANDOVER_IN',
          taskLabel: 'Odbiór sprzętu',
          rawDate: r.endDate,
          displayDate: formatDateShort(r.endDate),
          isServiceType: false,
          isDone: r.status === 'COMPLETED',
          isCancelled: r.status === 'CANCELLED'
        })
      }
    }
    return rows
  }, [reservations])

  const availableStaffNames = useMemo(() => {
    const set = new Set(
      allStaffTaskRows
        .map((r) => r.assignedEmployeeName)
        .filter((n) => n && n !== 'Nieprzypisany')
    )
    return Array.from(set)
  }, [allStaffTaskRows])

  const availableHistoryCategories = useMemo(() => {
    const set = new Set(
      allStaffTaskRows
        .filter((r) => {
          if (histType === 'EQUIPMENT') return !r.isServiceType
          if (histType === 'SERVICE') return r.isServiceType
          return true
        })
        .map((r) => r.categoryName)
        .filter(Boolean)
    )
    return Array.from(set)
  }, [allStaffTaskRows, histType])

  const staffCurrentTasks = useMemo(() => {
    return allStaffTaskRows.filter((row) => {
      if (row.isDone || row.isCancelled) return false
      if (employeeTaskFilter !== 'ALL' && row.taskKind !== employeeTaskFilter) return false
      if (isAdmin && adminEmployeeFilter !== 'ALL' && row.assignedEmployeeName !== adminEmployeeFilter) return false
      return true
    })
  }, [allStaffTaskRows, employeeTaskFilter, isAdmin, adminEmployeeFilter])

  const staffDoneTasksFilteredAndSorted = useMemo(() => {
    const baseDone = allStaffTaskRows.filter((row) => {
      if (!row.isDone && !row.isCancelled) return false
      if (employeeTaskFilter !== 'ALL' && row.taskKind !== employeeTaskFilter) return false
      if (isAdmin && adminEmployeeFilter !== 'ALL' && row.assignedEmployeeName !== adminEmployeeFilter) return false

      if (histType === 'EQUIPMENT' && row.isServiceType) return false
      if (histType === 'SERVICE' && !row.isServiceType) return false

      if (histCategory !== 'ALL' && row.categoryName !== histCategory) return false

      const dateOnly = row.rawDate ? String(row.rawDate).slice(0, 10) : ''
      if (histDateFrom && dateOnly && dateOnly < histDateFrom) return false
      if (histDateTo && dateOnly && dateOnly > histDateTo) return false

      if (histSearch.trim() !== '') {
        const q = histSearch.toLowerCase()
        const cleanName = (row.itemName || '').replace(/^Usługa:\s*/i, '').toLowerCase()
        const client = (row.clientName || '').toLowerCase()
        const emp = (row.assignedEmployeeName || '').toLowerCase()
        const cat = (row.categoryName || '').toLowerCase()
        if (!cleanName.includes(q) && !client.includes(q) && !emp.includes(q) && !cat.includes(q)) {
          return false
        }
      }
      return true
    })

    return [...baseDone].sort((a, b) => {
      if (histSortBy === 'NAME_ASC') {
        const nameA = (a.itemName || '').replace(/^Usługa:\s*/i, '')
        const nameB = (b.itemName || '').replace(/^Usługa:\s*/i, '')
        return nameA.localeCompare(nameB, 'pl')
      }
      const timeA = a.rawDate ? new Date(a.rawDate).getTime() : 0
      const timeB = b.rawDate ? new Date(b.rawDate).getTime() : 0
      if (histSortBy === 'DATE_ASC') return timeA - timeB
      return timeB - timeA
    })
  }, [
    allStaffTaskRows,
    employeeTaskFilter,
    isAdmin,
    adminEmployeeFilter,
    histType,
    histCategory,
    histDateFrom,
    histDateTo,
    histSearch,
    histSortBy
  ])

  const serviceCatalogItems = useMemo(
    () => catalogItems.filter((i) => isServiceCatalogItem(i)),
    [catalogItems]
  )
  const equipmentCatalogItems = useMemo(
    () => catalogItems.filter((i) => !isServiceCatalogItem(i)),
    [catalogItems]
  )

  const handleRebook = (res) => {
    if (onRebookItem) {
      onRebookItem({ id: res.itemId, name: res.itemName })
    }
    navigate('/')
  }

  if (!currentUser) return null

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

  const filterInputStyle = {
    width: '100%',
    padding: '7px 10px',
    borderRadius: '4px',
    border: `1px solid ${THEME.borderDefault}`,
    backgroundColor: THEME.white,
    fontSize: '0.83rem',
    boxSizing: 'border-box'
  }

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      backgroundColor: '#f1f5f9',
      color: THEME.textDark,
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <style>{`
        .res-table-wrapper { display: block; width: 100%; overflow-x: auto; }
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
            / {isAdmin ? 'Panel administratora' : isEmployee ? 'Panel pracownika' : 'Panel klienta'}
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

      <main style={{ maxWidth: '1180px', margin: '2rem auto', padding: '0 1rem 3rem 1rem' }}>
        <div style={{
          backgroundColor: THEME.white,
          borderRadius: '4px',
          border: `1px solid ${THEME.borderDefault}`,
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', backgroundColor: '#f8fafc', borderBottom: `1px solid ${THEME.borderDivider}` }}>
            {isAdmin ? (
              <>
                <button
                  onClick={() => handleTabSwitch('SCHEDULE')}
                  style={{
                    flex: 1,
                    padding: '14px',
                    border: 'none',
                    borderBottom: activeTab === 'SCHEDULE' ? `2px solid ${THEME.borderHover}` : '2px solid transparent',
                    backgroundColor: activeTab === 'SCHEDULE' ? THEME.white : 'transparent',
                    color: activeTab === 'SCHEDULE' ? THEME.textDark : THEME.textMuted,
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Clock size={16} />
                  1. Grafik
                </button>
                <button
                  onClick={() => handleTabSwitch('OFFER')}
                  style={{
                    flex: 1,
                    padding: '14px',
                    border: 'none',
                    borderBottom: activeTab === 'OFFER' ? `2px solid ${THEME.borderHover}` : '2px solid transparent',
                    backgroundColor: activeTab === 'OFFER' ? THEME.white : 'transparent',
                    color: activeTab === 'OFFER' ? THEME.textDark : THEME.textMuted,
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Package size={16} />
                  2. Oferta
                </button>
                <button
                  onClick={() => handleTabSwitch('ANALYTICS')}
                  style={{
                    flex: 1,
                    padding: '14px',
                    border: 'none',
                    borderBottom: activeTab === 'ANALYTICS' ? `2px solid ${THEME.borderHover}` : '2px solid transparent',
                    backgroundColor: activeTab === 'ANALYTICS' ? THEME.white : 'transparent',
                    color: activeTab === 'ANALYTICS' ? THEME.textDark : THEME.textMuted,
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <BarChart3 size={16} />
                  3. Analiza
                </button>
              </>
            ) : (
              <>
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
                  <Clock size={16} />
                  {isEmployee ? 'Grafik zadań' : 'Rezerwacje i historia'}
                </button>
              </>
            )}
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

            {/* ZAKŁADKA DANYCH PROFILU */}
            {!isAdmin && activeTab === 'PROFILE' && (
              <div>
                <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.15rem', color: THEME.textDark }}>
                  Twoje dane osobowe ({isEmployee ? 'Pracownik' : 'Klient'})
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ padding: '1rem', backgroundColor: THEME.bgSoft, border: `1px solid ${THEME.borderDefault}`, borderRadius: '4px' }}>
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
                          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 14px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          <Edit3 size={14} /> Edytuj
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={handleSave}
                            disabled={loading}
                            style={{ padding: '6px 14px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.primary, color: THEME.white, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            {loading ? 'Zapis...' : 'Zapisz'}
                          </button>
                          <button
                            onClick={() => setEditingField(null)}
                            style={{ padding: '6px 12px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
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
                          style={{ padding: '8px 10px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white }}
                        />
                        <input
                          type="text"
                          placeholder="Nazwisko"
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          style={{ padding: '8px 10px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white }}
                        />
                      </div>
                    )}
                  </div>

                  <div style={{ padding: '1rem', backgroundColor: THEME.bgSoft, border: `1px solid ${THEME.borderDefault}`, borderRadius: '4px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: THEME.textMuted, display: 'block' }}>
                      Adres e-mail
                    </span>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: THEME.textDark }}>
                      {currentUser.email}
                    </span>
                  </div>

                  <div style={{ padding: '1rem', backgroundColor: THEME.bgSoft, border: `1px solid ${THEME.borderDefault}`, borderRadius: '4px' }}>
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
                          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 14px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          {formData.phoneNumber ? <><Edit3 size={14} /> Edytuj</> : <><Plus size={14} /> Dodaj</>}
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={handleSave}
                            disabled={loading}
                            style={{ padding: '6px 14px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.primary, color: THEME.white, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            {loading ? 'Zapis...' : 'Zapisz'}
                          </button>
                          <button
                            onClick={() => setEditingField(null)}
                            style={{ padding: '6px 12px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
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
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white, boxSizing: 'border-box' }}
                        />
                      </div>
                    )}
                  </div>

                  <div style={{ padding: '1.25rem', backgroundColor: THEME.bgSoft, border: `1px solid ${THEME.borderDefault}`, borderRadius: '4px' }}>
                    {!isChangingPassword ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <KeyRound size={17} color={THEME.textMuted} />
                          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Chcesz zmienić hasło?</span>
                        </div>
                        <button
                          onClick={() => { setIsChangingPassword(true); setProfileMsg(null) }}
                          style={{ padding: '6px 14px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
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
                            style={{ width: '100%', padding: '8px 10px', marginTop: '4px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white, boxSizing: 'border-box' }}
                          />
                        </label>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: THEME.textMuted }}>
                          Nowe hasło:
                          <input
                            type="password"
                            required
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            style={{ width: '100%', padding: '8px 10px', marginTop: '4px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white, boxSizing: 'border-box' }}
                          />
                        </label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="submit"
                            disabled={loading}
                            style={{ padding: '8px 16px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.primary, color: THEME.white, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Zapisz nowe hasło
                          </button>
                          <button
                            type="button"
                            onClick={() => { setIsChangingPassword(false); setFormData((prev) => ({ ...prev, currentPassword: '', password: '' })) }}
                            style={{ padding: '8px 14px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
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

            {/* SEKCJA 1 (ADMIN) ORAZ GRAFIK (PRACOWNIK) */}
            {isStaff && (activeTab === 'RESERVATIONS' || activeTab === 'SCHEDULE') && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {[
                      { id: 'ALL', label: 'Wszystkie typy zadań' },
                      { id: 'CONSULTATION', label: 'Konsultacje' },
                      { id: 'SERVICE', label: 'Usługi do realizacji' },
                      { id: 'HANDOVER_OUT', label: 'Wydania sprzętu' },
                      { id: 'HANDOVER_IN', label: 'Odbiory sprzętu' }
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

                  {isAdmin && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: THEME.textMuted }}>Pracownik:</span>
                      <select
                        value={adminEmployeeFilter}
                        onChange={(e) => setAdminEmployeeFilter(e.target.value)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '4px',
                          border: `1px solid ${THEME.borderDefault}`,
                          backgroundColor: THEME.white,
                          fontSize: '0.82rem'
                        }}
                      >
                        <option value="ALL">Wszyscy pracownicy</option>
                        {availableStaffNames.map((empName) => (
                          <option key={empName} value={empName}>{empName}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {resLoading && <p style={{ color: THEME.textMuted, fontSize: '0.85rem' }}>Ładowanie grafiku...</p>}

                {!resLoading && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* TABELA 1: BIEŻĄCE ZADANIA DO WYKONANIA */}
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
                        <span>Bieżący grafik zadań do wykonania ({staffCurrentTasks.length})</span>
                        {openCurrentSection ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>

                      {openCurrentSection && (
                        staffCurrentTasks.length === 0 ? (
                          <div style={{ padding: '1rem', fontSize: '0.84rem', color: THEME.textMuted }}>
                            Brak bieżących zadań w grafiku.
                          </div>
                        ) : (
                          <div style={{ width: '100%', overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr>
                                  <th style={thStyle}>Typ zadania</th>
                                  <th style={thStyle}>Nazwa</th>
                                  <th style={thStyle}>Data / Godzina</th>
                                  {isAdmin && <th style={thStyle}>Przydzielony pracownik</th>}
                                  <th style={thStyle}>Klient i adres</th>
                                  <th style={thStyle}>Szczegóły / Kwota</th>
                                  <th style={{ ...thStyle, textAlign: 'right' }}>Akcja</th>
                                </tr>
                              </thead>
                              <tbody>
                                {staffCurrentTasks.map((task) => {
                                  const cleanName = (task.itemName || '').replace(/^Usługa:\s*/i, '')
                                  const resId = task.id || task.reservationId

                                  return (
                                    <tr key={task.rowKey}>
                                      <td style={tdStyle}>
                                        <span style={{
                                          padding: '3px 7px',
                                          borderRadius: '4px',
                                          fontSize: '0.72rem',
                                          fontWeight: 700,
                                          backgroundColor: THEME.bgSoft,
                                          border: `1px solid ${THEME.borderDefault}`,
                                          whiteSpace: 'nowrap'
                                        }}>
                                          {task.taskLabel}
                                        </span>
                                      </td>

                                      <td style={{ ...tdStyle, fontWeight: 700 }}>{cleanName}</td>

                                      <td style={{ ...tdStyle, whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                                        {task.displayDate}
                                      </td>

                                      {isAdmin && (
                                        <td style={{ ...tdStyle, fontSize: '0.8rem', fontWeight: 600 }}>
                                          {task.assignedEmployeeName || 'Nieprzypisany'}
                                        </td>
                                      )}

                                      <td style={{ ...tdStyle, fontSize: '0.8rem' }}>
                                        <div><strong>{task.clientName}</strong> (tel. {task.clientPhone || '-'})</div>
                                        <div style={{ color: THEME.textMuted }}>{task.deliveryAddress}</div>
                                      </td>

                                      <td style={{ ...tdStyle, fontSize: '0.8rem' }}>
                                        {task.taskKind === 'CONSULTATION' ? (
                                          <span style={{ color: THEME.textMuted }}>{task.customerNotes || 'Konsultacja wstępna'}</span>
                                        ) : (
                                          <div>
                                            <strong>{task.totalPrice} zł</strong>
                                            {task.customerNotes && (
                                              <div style={{ color: THEME.textMuted, fontSize: '0.76rem' }}>{task.customerNotes}</div>
                                            )}
                                          </div>
                                        )}
                                      </td>

                                      <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                                        {task.taskKind === 'CONSULTATION' ? (
                                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setActiveConsultation(task)
                                                setConsultForm({
                                                  agreedPrice: task.totalPrice || '',
                                                  estimatedDuration: '1 dzień (ok. 6 godz.)',
                                                  details: ''
                                                })
                                              }}
                                              style={{
                                                padding: '6px 12px',
                                                borderRadius: '4px',
                                                border: `1px solid ${THEME.primary}`,
                                                backgroundColor: THEME.primary,
                                                color: THEME.white,
                                                fontSize: '0.78rem',
                                                fontWeight: 600,
                                                cursor: 'pointer'
                                              }}
                                            >
                                              Wprowadź szczegóły
                                            </button>

                                            <button
                                              type="button"
                                              onClick={() => {
                                                setConfirmAction({
                                                  resId,
                                                  nextStatus: 'CANCELLED',
                                                  title: 'Potwierdzenie anulowania',
                                                  message: `Czy na pewno chcesz anulować konsultację „${cleanName}” dla klienta ${task.clientName}?`
                                                })
                                              }}
                                              style={{
                                                padding: '5px 8px',
                                                borderRadius: '4px',
                                                border: `1px solid ${THEME.borderDefault}`,
                                                backgroundColor: THEME.white,
                                                color: THEME.textMuted,
                                                fontSize: '0.75rem',
                                                cursor: 'pointer'
                                              }}
                                            >
                                              Anuluj
                                            </button>
                                          </div>
                                        ) : (
                                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                                              <input
                                                type="checkbox"
                                                checked={false}
                                                onChange={() => {
                                                  const nextStatus = task.taskKind === 'HANDOVER_OUT' ? 'CONFIRMED' : 'COMPLETED'
                                                  setConfirmAction({
                                                    resId,
                                                    nextStatus,
                                                    title: 'Potwierdzenie wykonania zadania',
                                                    message: `Czy na pewno chcesz oznaczyć zadanie „${task.taskLabel}: ${cleanName}” jako wykonane?`
                                                  })
                                                }}
                                                style={{ width: '15px', height: '15px', accentColor: THEME.primary, cursor: 'pointer' }}
                                              />
                                              Zakończone
                                            </label>

                                            <button
                                              type="button"
                                              onClick={() => {
                                                setConfirmAction({
                                                  resId,
                                                  nextStatus: 'CANCELLED',
                                                  title: 'Potwierdzenie anulowania',
                                                  message: `Czy na pewno chcesz anulować zlecenie „${cleanName}” dla klienta ${task.clientName}?`
                                                })
                                              }}
                                              style={{
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                border: `1px solid ${THEME.borderDefault}`,
                                                backgroundColor: THEME.white,
                                                color: THEME.textMuted,
                                                fontSize: '0.75rem',
                                                cursor: 'pointer'
                                              }}
                                            >
                                              Anuluj
                                            </button>
                                          </div>
                                        )}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        )
                      )}
                    </div>

                    {/* TABELA 2: HISTORIA ZADAŃ ZAKOŃCZONYCH I ANULOWANYCH */}
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
                        <span>Historia zadań zakończonych i anulowanych ({staffDoneTasksFilteredAndSorted.length})</span>
                        {openHistorySection ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>

                      {openHistorySection && (
                        <div>
                          <div style={{
                            padding: '1rem',
                            backgroundColor: '#f8fafc',
                            borderBottom: `1px solid ${THEME.borderDivider}`,
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                            gap: '0.75rem',
                            alignItems: 'end'
                          }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: THEME.textMuted, marginBottom: '4px' }}>
                                Wyszukaj
                              </label>
                              <input
                                type="text"
                                placeholder="Nazwa, klient, pracownik..."
                                value={histSearch}
                                onChange={(e) => setHistSearch(e.target.value)}
                                style={filterInputStyle}
                              />
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: THEME.textMuted, marginBottom: '4px' }}>
                                Typ oferty
                              </label>
                              <select
                                value={histType}
                                onChange={(e) => { setHistType(e.target.value); setHistCategory('ALL') }}
                                style={filterInputStyle}
                              >
                                <option value="ALL">Sprzęt i usługi</option>
                                <option value="EQUIPMENT">Tylko sprzęt</option>
                                <option value="SERVICE">Tylko usługi</option>
                              </select>
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: THEME.textMuted, marginBottom: '4px' }}>
                                Kategoria
                              </label>
                              <select
                                value={histCategory}
                                onChange={(e) => setHistCategory(e.target.value)}
                                style={filterInputStyle}
                              >
                                <option value="ALL">Wszystkie kategorie</option>
                                {availableHistoryCategories.map((c) => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: THEME.textMuted, marginBottom: '4px' }}>
                                Data od
                              </label>
                              <input
                                type="date"
                                value={histDateFrom}
                                onChange={(e) => setHistDateFrom(e.target.value)}
                                style={filterInputStyle}
                              />
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: THEME.textMuted, marginBottom: '4px' }}>
                                Data do
                              </label>
                              <input
                                type="date"
                                value={histDateTo}
                                onChange={(e) => setHistDateTo(e.target.value)}
                                style={filterInputStyle}
                              />
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: THEME.textMuted, marginBottom: '4px' }}>
                                Sortowanie
                              </label>
                              <select
                                value={histSortBy}
                                onChange={(e) => setHistSortBy(e.target.value)}
                                style={filterInputStyle}
                              >
                                <option value="DATE_DESC">Od najnowszych</option>
                                <option value="DATE_ASC">Od najstarszych</option>
                                <option value="NAME_ASC">Alfabetycznie (A - Z)</option>
                              </select>
                            </div>
                          </div>

                          {staffDoneTasksFilteredAndSorted.length === 0 ? (
                            <div style={{ padding: '1rem', fontSize: '0.84rem', color: THEME.textMuted }}>
                              Brak zakończonych lub anulowanych zadań spełniających kryteria.
                            </div>
                          ) : (
                            <div style={{ width: '100%', overflowX: 'auto' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr>
                                    <th style={thStyle}>Typ zadania</th>
                                    <th style={thStyle}>Kategoria</th>
                                    <th style={thStyle}>Nazwa</th>
                                    <th style={thStyle}>Data</th>
                                    {isAdmin && <th style={thStyle}>Pracownik</th>}
                                    <th style={thStyle}>Klient</th>
                                    <th style={thStyle}>Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {staffDoneTasksFilteredAndSorted.map((task) => {
                                    const cleanName = (task.itemName || '').replace(/^Usługa:\s*/i, '')
                                    const statusCfg = getStatusConfig(task.status, task.isServiceType)

                                    return (
                                      <tr key={task.rowKey}>
                                        <td style={tdStyle}>{task.taskLabel}</td>
                                        <td style={{ ...tdStyle, fontSize: '0.78rem', color: THEME.textMuted }}>{task.categoryName}</td>
                                        <td style={{ ...tdStyle, fontWeight: 700 }}>{cleanName}</td>
                                        <td style={{ ...tdStyle, fontSize: '0.8rem', color: THEME.textMuted, whiteSpace: 'nowrap' }}>{task.displayDate}</td>
                                        {isAdmin && (
                                          <td style={{ ...tdStyle, fontSize: '0.8rem', fontWeight: 600 }}>
                                            {task.assignedEmployeeName || 'Nieprzypisany'}
                                          </td>
                                        )}
                                        <td style={{ ...tdStyle, fontSize: '0.8rem' }}>{task.clientName}</td>
                                        <td style={tdStyle}>
                                          <span style={{
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontSize: '0.74rem',
                                            fontWeight: 700,
                                            backgroundColor: statusCfg.bg,
                                            color: statusCfg.color,
                                            border: `1px solid ${statusCfg.border}`
                                          }}>
                                            {task.isCancelled ? 'Anulowane' : 'Zakończone'}
                                          </span>
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SEKCJA 2 (ADMIN): ZARZĄDZANIE OFERTĄ */}
            {isAdmin && activeTab === 'OFFER' && (
              <div>
                {offerLoading && <p style={{ color: THEME.textMuted, fontSize: '0.85rem' }}>Ładowanie katalogu ofert...</p>}

                {!offerLoading && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* ZWIJANA TABELA 1: USŁUGI OGRODNICZE */}
                    <div style={{ border: `1px solid ${THEME.borderDefault}`, borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        padding: '12px 16px',
                        backgroundColor: THEME.bgSoft,
                        borderBottom: openServicesOffer ? `1px solid ${THEME.borderDivider}` : 'none',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '10px'
                      }}>
                        <button
                          type="button"
                          onClick={() => setOpenServicesOffer(!openServicesOffer)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontWeight: 800,
                            fontSize: '0.95rem',
                            color: THEME.textDark,
                            cursor: 'pointer'
                          }}
                        >
                          {openServicesOffer ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          <span>Tabela usług ogrodniczych ({serviceCatalogItems.length})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenAddOffer('SERVICE')}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '7px 14px',
                            borderRadius: '4px',
                            border: `1px solid ${THEME.primary}`,
                            backgroundColor: THEME.primary,
                            color: THEME.white,
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          <Plus size={15} />
                          Dodaj nową usługę
                        </button>
                      </div>

                      {openServicesOffer && (
                        <div style={{ width: '100%', overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr>
                                <th style={thStyle}>ID</th>
                                <th style={thStyle}>Zdjęcie</th>
                                <th style={thStyle}>Nazwa usługi</th>
                                <th style={thStyle}>Kategoria</th>
                                <th style={thStyle}>Cena bazowa</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>Akcje</th>
                              </tr>
                            </thead>
                            <tbody>
                              {serviceCatalogItems.map((item) => (
                                <tr key={item.id}>
                                  <td style={{ ...tdStyle, color: THEME.textMuted }}>#{item.id}</td>
                                  <td style={tdStyle}>
                                    <img
                                      src={resolveImgUrl(item.imageUrl)}
                                      alt={item.name}
                                      onError={(e) => { e.target.src = 'https://placehold.co/120x80/f8fafc/475569?text=Brak' }}
                                      style={{ width: '52px', height: '38px', objectFit: 'cover', borderRadius: '4px', border: `1px solid ${THEME.borderDivider}` }}
                                    />
                                  </td>
                                  <td style={{ ...tdStyle, fontWeight: 700 }}>{(item.name || '').replace(/^Usługa:\s*/i, '')}</td>
                                  <td style={{ ...tdStyle, fontSize: '0.8rem', color: THEME.textMuted }}>{item.category?.name}</td>
                                  <td style={{ ...tdStyle, fontWeight: 700 }}>od {Number(item.price).toFixed(2)} zł</td>
                                  <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                                      <button
                                        type="button"
                                        onClick={() => navigate(`/item/${item.id}`)}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          padding: '5px 10px',
                                          borderRadius: '4px',
                                          border: `1px solid ${THEME.borderDefault}`,
                                          backgroundColor: THEME.white,
                                          color: THEME.textDark,
                                          fontSize: '0.76rem',
                                          fontWeight: 600,
                                          cursor: 'pointer'
                                        }}
                                      >
                                        <ExternalLink size={13} />
                                        Zobacz ofertę
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditOffer(item)}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          padding: '5px 10px',
                                          borderRadius: '4px',
                                          border: `1px solid ${THEME.borderDefault}`,
                                          backgroundColor: THEME.bgSoft,
                                          color: THEME.textDark,
                                          fontSize: '0.76rem',
                                          fontWeight: 600,
                                          cursor: 'pointer'
                                        }}
                                      >
                                        <Edit3 size={13} />
                                        Edytuj
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteOffer(item)}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          padding: '5px 10px',
                                          borderRadius: '4px',
                                          border: '1px solid #fecaca',
                                          backgroundColor: '#fef2f2',
                                          color: '#b91c1c',
                                          fontSize: '0.76rem',
                                          fontWeight: 600,
                                          cursor: 'pointer'
                                        }}
                                      >
                                        <Trash2 size={13} />
                                        Usuń
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* ZWIJANA TABELA 2: SPRZĘT DO WYPOŻYCZENIA */}
                    <div style={{ border: `1px solid ${THEME.borderDefault}`, borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        padding: '12px 16px',
                        backgroundColor: THEME.bgSoft,
                        borderBottom: openEquipmentOffer ? `1px solid ${THEME.borderDivider}` : 'none',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '10px'
                      }}>
                        <button
                          type="button"
                          onClick={() => setOpenEquipmentOffer(!openEquipmentOffer)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontWeight: 800,
                            fontSize: '0.95rem',
                            color: THEME.textDark,
                            cursor: 'pointer'
                          }}
                        >
                          {openEquipmentOffer ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          <span>Tabela sprzętu ogrodniczego ({equipmentCatalogItems.length})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenAddOffer('EQUIPMENT')}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '7px 14px',
                            borderRadius: '4px',
                            border: `1px solid ${THEME.primary}`,
                            backgroundColor: THEME.primary,
                            color: THEME.white,
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          <Plus size={15} />
                          Dodaj nowy sprzęt
                        </button>
                      </div>

                      {openEquipmentOffer && (
                        <div style={{ width: '100%', overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr>
                                <th style={thStyle}>ID</th>
                                <th style={thStyle}>Zdjęcie</th>
                                <th style={thStyle}>Marka</th>
                                <th style={thStyle}>Nazwa sprzętu</th>
                                <th style={thStyle}>Kategoria</th>
                                <th style={thStyle}>Ilość szt.</th>
                                <th style={thStyle}>Cena / doba</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>Akcje</th>
                              </tr>
                            </thead>
                            <tbody>
                              {equipmentCatalogItems.map((item) => (
                                <tr key={item.id}>
                                  <td style={{ ...tdStyle, color: THEME.textMuted }}>#{item.id}</td>
                                  <td style={tdStyle}>
                                    <img
                                      src={resolveImgUrl(item.imageUrl)}
                                      alt={item.name}
                                      onError={(e) => { e.target.src = 'https://placehold.co/120x80/f8fafc/475569?text=Brak' }}
                                      style={{ width: '52px', height: '38px', objectFit: 'cover', borderRadius: '4px', border: `1px solid ${THEME.borderDivider}` }}
                                    />
                                  </td>
                                  <td style={{ ...tdStyle, fontWeight: 600 }}>{item.brand || '-'}</td>
                                  <td style={{ ...tdStyle, fontWeight: 700 }}>{item.name}</td>
                                  <td style={{ ...tdStyle, fontSize: '0.8rem', color: THEME.textMuted }}>{item.category?.name}</td>
                                  <td style={tdStyle}>{item.quantity ?? 1} szt.</td>
                                  <td style={{ ...tdStyle, fontWeight: 700 }}>{Number(item.price).toFixed(2)} zł</td>
                                  <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                                      <button
                                        type="button"
                                        onClick={() => navigate(`/item/${item.id}`)}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          padding: '5px 10px',
                                          borderRadius: '4px',
                                          border: `1px solid ${THEME.borderDefault}`,
                                          backgroundColor: THEME.white,
                                          color: THEME.textDark,
                                          fontSize: '0.76rem',
                                          fontWeight: 600,
                                          cursor: 'pointer'
                                        }}
                                      >
                                        <ExternalLink size={13} />
                                        Zobacz ofertę
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditOffer(item)}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          padding: '5px 10px',
                                          borderRadius: '4px',
                                          border: `1px solid ${THEME.borderDefault}`,
                                          backgroundColor: THEME.bgSoft,
                                          color: THEME.textDark,
                                          fontSize: '0.76rem',
                                          fontWeight: 600,
                                          cursor: 'pointer'
                                        }}
                                      >
                                        <Edit3 size={13} />
                                        Edytuj
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteOffer(item)}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          padding: '5px 10px',
                                          borderRadius: '4px',
                                          border: '1px solid #fecaca',
                                          backgroundColor: '#fef2f2',
                                          color: '#b91c1c',
                                          fontSize: '0.76rem',
                                          fontWeight: 600,
                                          cursor: 'pointer'
                                        }}
                                      >
                                        <Trash2 size={13} />
                                        Usuń
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SEKCJA 3 (ADMIN): ANALIZA (W BUDOWIE) */}
            {isAdmin && activeTab === 'ANALYTICS' && (
              <div style={{
                padding: '3rem 1.5rem',
                textAlign: 'center',
                backgroundColor: THEME.bgSoft,
                border: `1px solid ${THEME.borderDefault}`,
                borderRadius: '4px'
              }}>
                <BarChart3 size={36} color={THEME.textMuted} style={{ marginBottom: '0.75rem' }} />
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', fontWeight: 800, color: THEME.textDark }}>
                  Moduł analizy wykorzystania zasobów
                </h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: THEME.textMuted }}>
                  Ta sekcja jest obecnie w budowie i zostanie wdrożona w ostatnim etapie prac.
                </p>
              </div>
            )}

            {/* ZAKŁADKA REZERWACJI DLA KLIENTA (CLIENT) */}
            {!isStaff && activeTab === 'RESERVATIONS' && (
              <div>
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

                {resLoading && <p style={{ color: THEME.textMuted, fontSize: '0.85rem' }}>Ładowanie rezerwacji...</p>}

                {!resLoading && filteredClientReservations.length === 0 && (
                  <p style={{ color: THEME.textMuted, fontSize: '0.85rem', margin: '2rem 0' }}>
                    Brak zamówień w wybranej kategorii.
                  </p>
                )}

                {!resLoading && filteredClientReservations.length > 0 && (
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
              </div>
            )}
          </div>
        </div>
      </main>

      {/* WYŚRODKOWANY MODAL: Wprowadzanie szczegółów konsultacji */}
      {activeConsultation && (
        <div
          onClick={() => setActiveConsultation(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 200
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: THEME.white,
              border: `1px solid ${THEME.borderDefault}`,
              borderRadius: '4px',
              padding: '1.5rem',
              width: '100%',
              maxWidth: '540px',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                Ustalenia po konsultacji: {(activeConsultation.itemName || '').replace(/^Usługa:\s*/i, '')}
              </h4>
              <button
                type="button"
                onClick={() => setActiveConsultation(null)}
                style={{ padding: '4px 10px', borderRadius: '4px', border: `1px solid ${THEME.borderDefault}`, backgroundColor: THEME.white, fontSize: '0.8rem', cursor: 'pointer' }}
              >
                Zamknij
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: THEME.textMuted, margin: '0 0 1rem 0' }}>
              Klient: <strong>{activeConsultation.clientName}</strong> (tel. {activeConsultation.clientPhone}) | {activeConsultation.customerNotes}
            </p>

            <form onSubmit={handleConfirmConsultationSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, marginBottom: '4px' }}>
                    Ustalona kwota (zł)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    placeholder="np. 450"
                    value={consultForm.agreedPrice}
                    onChange={(e) => setConsultForm({ ...consultForm, agreedPrice: e.target.value })}
                    style={filterInputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, marginBottom: '4px' }}>
                    Przybliżony czas realizacji
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="np. 1 dzień (ok. 6 godz.)"
                    value={consultForm.estimatedDuration}
                    onChange={(e) => setConsultForm({ ...consultForm, estimatedDuration: e.target.value })}
                    style={filterInputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, marginBottom: '4px' }}>
                  Szczegóły ustalone z klientem (zakres prac, materiały, dojazd)
                </label>
                <input
                  type="text"
                  required
                  placeholder="np. Koszenie z wywozem trawy + nawożenie, start od jutra"
                  value={consultForm.details}
                  onChange={(e) => setConsultForm({ ...consultForm, details: e.target.value })}
                  style={filterInputStyle}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setActiveConsultation(null)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '4px',
                    border: `1px solid ${THEME.borderDefault}`,
                    backgroundColor: THEME.white,
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={consultSaving}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '4px',
                    border: `1px solid ${THEME.primary}`,
                    backgroundColor: THEME.primary,
                    color: THEME.white,
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {consultSaving ? 'Zapisywanie...' : 'Zatwierdź szczegóły'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WYŚRODKOWANY MODAL: Dodawanie lub edycja oferty sprzętu / usługi (bez podglądu zdjęcia, z opcją dodania nowej kategorii) */}
      {offerFormMode && (
        <div
          onClick={() => setOfferFormMode(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 200
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: THEME.white,
              border: `1px solid ${THEME.borderDefault}`,
              borderRadius: '4px',
              padding: '1.5rem',
              width: '100%',
              maxWidth: '620px',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                {offerFormMode.mode === 'ADD'
                  ? (offerFormMode.itemType === 'SERVICE' ? 'Dodaj nową usługę' : 'Dodaj nowy sprzęt')
                  : (offerFormMode.itemType === 'SERVICE' ? 'Edytuj usługę' : 'Edytuj sprzęt')}
              </h3>
              <button
                type="button"
                onClick={() => setOfferFormMode(null)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '4px',
                  border: `1px solid ${THEME.borderDefault}`,
                  backgroundColor: THEME.white,
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Zamknij
              </button>
            </div>

            <form onSubmit={handleSaveOfferSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, marginBottom: '4px' }}>
                    Nazwa {offerFormMode.itemType === 'SERVICE' ? 'usługi' : 'sprzętu'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={offerFormMode.itemType === 'SERVICE' ? 'np. Kompleksowe koszenie trawnika' : 'np. Kosiarka spalinowa RM 248'}
                    value={offerFormData.name}
                    onChange={(e) => setOfferFormData({ ...offerFormData, name: e.target.value })}
                    style={filterInputStyle}
                  />
                </div>

                {offerFormMode.itemType === 'EQUIPMENT' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, marginBottom: '4px' }}>
                      Marka / Producent
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="np. STIHL, Husqvarna, Honda"
                      value={offerFormData.brand}
                      onChange={(e) => setOfferFormData({ ...offerFormData, brand: e.target.value })}
                      style={filterInputStyle}
                    />
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, marginBottom: '4px' }}>
                    Kategoria
                  </label>
                  <select
                    value={offerFormData.categoryId}
                    onChange={(e) => setOfferFormData({ ...offerFormData, categoryId: e.target.value })}
                    style={filterInputStyle}
                  >
                    {getCategoriesForType(offerFormMode.itemType).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                    <option value="NEW">+ Dodaj nową kategorię...</option>
                  </select>
                </div>

                {String(offerFormData.categoryId) === 'NEW' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, marginBottom: '4px' }}>
                      Nazwa nowej kategorii
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={offerFormMode.itemType === 'SERVICE' ? 'np. Nawadnianie ogrodów' : 'np. Opryskiwacze i pompy'}
                      value={offerFormData.newCategoryName}
                      onChange={(e) => setOfferFormData({ ...offerFormData, newCategoryName: e.target.value })}
                      style={filterInputStyle}
                    />
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, marginBottom: '4px' }}>
                    {offerFormMode.itemType === 'SERVICE' ? 'Cena bazowa (zł)' : 'Cena za dobę (zł)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={offerFormData.price}
                    onChange={(e) => setOfferFormData({ ...offerFormData, price: e.target.value })}
                    style={filterInputStyle}
                  />
                </div>

                {offerFormMode.itemType === 'EQUIPMENT' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, marginBottom: '4px' }}>
                      Ilość sztuk w wypożyczalni
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={offerFormData.quantity}
                      onChange={(e) => setOfferFormData({ ...offerFormData, quantity: e.target.value })}
                      style={filterInputStyle}
                    />
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, marginBottom: '4px' }}>
                  Opis oferty
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Szczegółowy opis parametrów technicznych lub zakresu wykonywanej usługi..."
                  value={offerFormData.description}
                  onChange={(e) => setOfferFormData({ ...offerFormData, description: e.target.value })}
                  style={{ ...filterInputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'center' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, marginBottom: '4px' }}>
                    Ścieżka zdjęcia lub adres URL
                  </label>
                  <input
                    type="text"
                    value={offerFormData.imageUrl}
                    onChange={(e) => setOfferFormData({ ...offerFormData, imageUrl: e.target.value })}
                    placeholder="/images/kosiarka.jpg"
                    style={filterInputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, marginBottom: '4px' }}>
                    Lub wybierz plik zdjęcia z dysku
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleOfferImageFileChange}
                    style={{ fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.25rem' }}>
                <button
                  type="button"
                  onClick={() => setOfferFormMode(null)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '4px',
                    border: `1px solid ${THEME.borderDefault}`,
                    backgroundColor: THEME.white,
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={offerSaving}
                  style={{
                    padding: '9px 22px',
                    borderRadius: '4px',
                    border: `1px solid ${THEME.primary}`,
                    backgroundColor: THEME.primary,
                    color: THEME.white,
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {offerSaving ? 'Zapisywanie...' : 'Zapisz ofertę'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal potwierdzenia zmiany statusu zadania */}
      {confirmAction && (
        <div
          onClick={() => setConfirmAction(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 200
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: THEME.white,
              border: `1px solid ${THEME.borderDefault}`,
              borderRadius: '4px',
              padding: '1.5rem',
              width: '100%',
              maxWidth: '420px'
            }}
          >
            <h4 style={{ margin: '0 0 0.6rem 0', fontSize: '1.05rem', fontWeight: 800, color: THEME.textDark }}>
              {confirmAction.title}
            </h4>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.88rem', lineHeight: 1.5, color: THEME.textMuted }}>
              {confirmAction.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '4px',
                  border: `1px solid ${THEME.borderDefault}`,
                  backgroundColor: THEME.white,
                  color: THEME.textDark,
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Wróć
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleEmployeeStatusUpdate(confirmAction.resId, confirmAction.nextStatus)
                  setConfirmAction(null)
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: `1px solid ${confirmAction.nextStatus === 'CANCELLED' ? '#b91c1c' : THEME.primary}`,
                  backgroundColor: confirmAction.nextStatus === 'CANCELLED' ? '#b91c1c' : THEME.primary,
                  color: THEME.white,
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {confirmAction.nextStatus === 'CANCELLED' ? 'Tak, anuluj' : 'Tak, zakończ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal potwierdzenia usunięcia oferty */}
      {confirmDeleteOffer && (
        <div
          onClick={() => setConfirmDeleteOffer(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 200
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: THEME.white,
              border: `1px solid ${THEME.borderDefault}`,
              borderRadius: '4px',
              padding: '1.5rem',
              width: '100%',
              maxWidth: '420px'
            }}
          >
            <h4 style={{ margin: '0 0 0.6rem 0', fontSize: '1.05rem', fontWeight: 800, color: THEME.textDark }}>
              Potwierdzenie usunięcia oferty
            </h4>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.88rem', lineHeight: 1.5, color: THEME.textMuted }}>
              Czy na pewno chcesz trwale usunąć ofertę <strong>„{(confirmDeleteOffer.name || '').replace(/^Usługa:\s*/i, '')}”</strong> z katalogu?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setConfirmDeleteOffer(null)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '4px',
                  border: `1px solid ${THEME.borderDefault}`,
                  backgroundColor: THEME.white,
                  color: THEME.textDark,
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Wróć
              </button>
              <button
                type="button"
                onClick={handleDeleteOfferConfirm}
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: '1px solid #b91c1c',
                  backgroundColor: '#b91c1c',
                  color: THEME.white,
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Tak, usuń ofertę
              </button>
            </div>
          </div>
        </div>
      )}
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
              const isConsult = isConsultationRecord(r)
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
                      {isConsult ? 'Konsultacja' : isService ? 'Usługa' : 'Sprzęt'}
                    </span>
                  </td>

                  <td style={{ ...tdStyle, fontWeight: 700 }}>{cleanName}</td>

                  <td style={{ ...tdStyle, color: THEME.textMuted, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                    {isService ? formatDateShort(r.startDate) : `${formatDateShort(r.startDate)} — ${formatDateShort(r.endDate)}`}
                  </td>

                  <td style={{ ...tdStyle, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {isConsult ? 'Wycena po rozmowie' : `${r.totalPrice} zł`}
                  </td>

                  <td style={{ ...tdStyle, fontSize: '0.8rem' }}>
                    {getDeliveryLabel(r, isService)}
                  </td>

                  {showPayment && (
                    <td style={{ ...tdStyle, fontSize: '0.8rem' }}>
                      {isConsult ? '-' : getPaymentLabel(r)}
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
                <span style={{ padding: '2px 7px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, backgroundColor: THEME.white, border: `1px solid ${THEME.borderDefault}` }}>
                  {isService ? 'Usługa' : 'Sprzęt'}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 7px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, backgroundColor: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}` }}>
                  <StatusIcon size={12} />
                  {statusCfg.label}
                </span>
              </div>

              <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{cleanName}</div>
              <div style={{ fontSize: '0.78rem', color: THEME.textMuted }}>
                {formatDateShort(r.startDate)} | <strong>{r.totalPrice} zł</strong>
              </div>
              {showRebook && r.itemId && (
                <button
                  onClick={() => onRebook(r)}
                  style={{ alignSelf: 'flex-end', padding: '5px 10px', borderRadius: '4px', border: `1px solid ${THEME.primary}`, backgroundColor: THEME.primary, color: THEME.white, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
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