import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import logoImg from './assets/GardenBookingLogo.png'

const API_BASE = 'http://localhost:8080'

const MONTH_NAMES = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
]
const DAY_NAMES = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz']

export default function ItemPage({ currentUser }) {
  const { id } = useParams()
  const navigate = useNavigate()

  const [item, setItem] = useState(null)
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Stan kalendarza (domyślnie bieżący miesiąc: Listopad 2026 lub dzisiejsza data)
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  // Stan formularza rezerwacji
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [guestName, setGuestName] = useState(currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : '')
  const [guestEmail, setGuestEmail] = useState(currentUser ? currentUser.email : '')
  const [guestPhone, setGuestPhone] = useState(currentUser ? (currentUser.phoneNumber || '') : '')
  const [deliveryType, setDeliveryType] = useState('PICKUP')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('BLIK')

  const [submitStatus, setSubmitStatus] = useState({ loading: false, error: null, success: null })

  const fetchItemAndAvailability = async () => {
    try {
      setLoading(true)
      const [itemRes, availRes] = await Promise.all([
        fetch(`${API_BASE}/api/items/${id}`),
        fetch(`${API_BASE}/api/reservations/item/${id}`)
      ])

      if (!itemRes.ok) throw new Error('Nie znaleziono wybranej pozycji w katalogu.')
      const itemData = await itemRes.json()
      const availData = availRes.ok ? await availRes.json() : []

      setItem(itemData)
      setReservations(availData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItemAndAvailability()
  }, [id])

  useEffect(() => {
    if (currentUser) {
      setGuestName(`${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim())
      setGuestEmail(currentUser.email || '')
      setGuestPhone(currentUser.phoneNumber || '')
    }
  }, [currentUser])

  const isService = useMemo(() => {
    if (!item) return false
    const catId = item.category?.id || 0
    return catId >= 10 || item.name?.toLowerCase().startsWith('usługa')
  }, [item])

  const totalQuantity = item?.quantity ?? 1

  // Funkcja sprawdzająca ile sztuk jest zajętych w konkretnym dniu (YYYY-MM-DD)
  const getBusyCountForDay = (dateStr) => {
    const dayStart = new Date(`${dateStr}T00:00:00`)
    const dayEnd = new Date(`${dateStr}T23:59:59`)

    let count = 0
    for (const res of reservations) {
      const rStart = new Date(res.startDate)
      const rEnd = new Date(res.endDate)
      if (rStart <= dayEnd && rEnd >= dayStart) {
        count++
      }
    }
    return count
  }

  // Generowanie siatki dni dla wybranego miesiąca
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)

    // Dostosowanie do poniedziałku jako pierwszego dnia tygodnia (0 = Pon, 6 = Ndz)
    const startOffset = (firstDayOfMonth.getDay() + 6) % 7
    const totalDays = lastDayOfMonth.getDate()

    const days = []
    for (let i = 0; i < startOffset; i++) {
      days.push(null)
    }

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const busyCount = getBusyCountForDay(dateStr)
      const freeCount = Math.max(0, totalQuantity - busyCount)

      days.push({
        day,
        dateStr,
        busyCount,
        freeCount,
        isFull: freeCount === 0,
        isPartial: busyCount > 0 && freeCount > 0
      })
    }
    return days
  }, [currentMonth, reservations, totalQuantity])

  // Kliknięcie dnia w kalendarzu ułatwia wybór zakresu dat
  const handleDayClick = (dayObj) => {
    if (!dayObj || dayObj.isFull) return
    if (!startDate || (startDate && endDate)) {
      setStartDate(dayObj.dateStr)
      setEndDate('')
    } else if (dayObj.dateStr >= startDate) {
      setEndDate(dayObj.dateStr)
    } else {
      setStartDate(dayObj.dateStr)
    }
  }

  // Sprawdzenie, czy w wybranym przedziale startDate - endDate jest kolizja
  const rangeConflict = useMemo(() => {
    if (!startDate || !endDate) return false
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (end < start) return true

    const cur = new Date(start)
    while (cur <= end) {
      const dStr = cur.toISOString().slice(0, 10)
      if (getBusyCountForDay(dStr) >= totalQuantity) {
        return true
      }
      cur.setDate(cur.getDate() + 1)
    }
    return false
  }, [startDate, endDate, reservations, totalQuantity])

  // Kalkulacja ceny na żywo (WF-03)
  const priceSummary = useMemo(() => {
    if (!item || !startDate || !endDate) return null
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (end < start) return null

    const diffTime = Math.abs(end - start)
    const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + (startDate === endDate ? 0 : 0))
    // Jeśli wybrano ten sam dzień (np. 15.11 - 15.11) liczymy jako 1 dobę/dzień
    const daysCount = startDate === endDate ? 1 : Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)))
    const baseCost = Number(item.price) * daysCount
    const deliveryCost = deliveryType === 'DELIVERY' ? 50 : 0

    return {
      daysCount,
      baseCost,
      deliveryCost,
      total: baseCost + deliveryCost
    }
  }, [item, startDate, endDate, deliveryType])

  const handleReservationSubmit = async (e) => {
    e.preventDefault()
    if (!startDate || !endDate) {
      setSubmitStatus({ loading: false, error: 'Wybierz datę początkową i końcową w kalendarzu.', success: null })
      return
    }
    if (rangeConflict) {
      setSubmitStatus({ loading: false, error: 'W wybranym przedziale dat wszystkie sztuki są już zajęte!', success: null })
      return
    }

    setSubmitStatus({ loading: true, error: null, success: null })

    // Jeśli startDate === endDate, ustawiamy 08:00 do 18:00 tego samego dnia
    const payload = {
      userId: currentUser?.id || null,
      itemId: Number(id),
      startDate: `${startDate}T08:00:00`,
      endDate: `${endDate}T18:00:00`,
      guestName,
      guestEmail,
      guestPhone,
      deliveryType,
      street: deliveryType === 'DELIVERY' ? street : '',
      city: deliveryType === 'DELIVERY' ? city : '',
      postalCode: deliveryType === 'DELIVERY' ? postalCode : '',
      paymentMethod
    }

    try {
      const res = await fetch(`${API_BASE}/api/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Nie udało się utworzyć rezerwacji.')
      }

      setSubmitStatus({
        loading: false,
        error: null,
        success: `Rezerwacja nr #${data.reservationId} została pomyślnie złożona! Całkowity koszt: ${Number(data.totalPrice).toFixed(2)} zł.`
      })
      // Odświeżenie kalendarza zajętości
      fetchItemAndAvailability()
    } catch (err) {
      setSubmitStatus({ loading: false, error: err.message, success: null })
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f4f7f4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ fontSize: '18px', color: '#2e6f40', fontWeight: 600 }}>Ładowanie szczegółów oferty i kalendarza...</div>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div style={{ minHeight: '100vh', background: '#f4f7f4', padding: '40px', textAlign: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <h2 style={{ color: '#b91c1c' }}>{error || 'Nie znaleziono przedmiotu'}</h2>
        <button onClick={() => navigate('/')} style={{ marginTop: '16px', padding: '10px 20px', background: '#2e6f40', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          Wróć do katalogu
        </button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f7f4', color: '#1e293b', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Pasek nawigacji */}
      <header style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '14px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 50 }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', color: '#14532d', fontWeight: 700, fontSize: '20px' }}>
          <img src={logoImg} alt="Logo" style={{ height: '42px', objectFit: 'contain' }} />
          <span>OgrodoweRezerwacje</span>
        </Link>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => navigate('/')}
            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontWeight: 600, cursor: 'pointer' }}
          >
            ← Powrót do katalogu
          </button>
          {currentUser ? (
            <Link to="/user?tab=RESERVATIONS" style={{ padding: '8px 16px', borderRadius: '8px', background: '#2e6f40', color: '#fff', textDecoration: 'none', fontWeight: 600 }}>
              Moje konto ({currentUser.firstName})
            </Link>
          ) : (
            <Link to="/auth" style={{ padding: '8px 16px', borderRadius: '8px', background: '#2e6f40', color: '#fff', textDecoration: 'none', fontWeight: 600 }}>
              Zaloguj się
            </Link>
          )}
        </div>
      </header>

      <main style={{ maxWidth: '1240px', margin: '32px auto', padding: '0 24px' }}>
        {/* GÓRNA SEKCJA: Obrazek + Informacje o sprzęcie/usłudze */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '32px', background: '#ffffff', borderRadius: '18px', padding: '32px', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
          
          {/* Kolumna lewa: Zdjęcie */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f8fafc', height: '360px' }}>
              <img
                src={`${API_BASE}${item.imageUrl}`}
                alt={item.name}
                onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1592417817098-8fd3d9eb14a5?w=800&auto=format&fit=crop&q=80' }}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <span style={{
                position: 'absolute',
                top: '16px',
                left: '16px',
                padding: '6px 14px',
                borderRadius: '999px',
                fontSize: '13px',
                fontWeight: 700,
                background: isService ? '#0284c7' : '#15803d',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}>
                {isService ? 'Usługa ogrodnicza' : 'Sprzęt do wypożyczenia'}
              </span>
            </div>
          </div>

          {/* Kolumna prawa: Firma, Nazwa, Opis, Cena, Ilość dostępnych sztuk */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', background: '#f1f5f9', padding: '4px 10px', borderRadius: '6px' }}>
                  Kategoria: {item.category?.name || 'Ogólna'}
                </span>

                {/* FIRMA / PRODUCENT (jeżeli to sprzęt) */}
                {!isService && item.brand && (
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#14532d', background: '#dcfce7', padding: '4px 12px', borderRadius: '6px', border: '1px solid #86efac' }}>
                    Producent / Firma: {item.brand}
                  </span>
                )}
              </div>

              {/* NAZWA */}
              <h1 style={{ fontSize: '30px', fontWeight: 800, color: '#0f172a', margin: '8px 0 16px' }}>
                {!isService && item.brand && !item.name.toLowerCase().includes(item.brand.toLowerCase())
                  ? `${item.brand} – ${item.name}`
                  : item.name}
              </h1>

              {/* CENA I DOSTĘPNE SZTUKI (KAFELKI) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '22px' }}>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '13px', color: '#166534', fontWeight: 600 }}>
                    {isService ? 'Stawka za usługę (dzień):' : 'Cena wypożyczenia (doba):'}
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>
                    {Number(item.price).toFixed(2)} zł
                  </div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>
                    {isService ? 'Dostępne ekipy wykonawcze:' : 'Ilość dostępnych sztuk:'}
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: item.isAvailable && totalQuantity > 0 ? '#0f172a' : '#dc2626', marginTop: '4px' }}>
                    {item.isAvailable ? `${totalQuantity} szt.` : 'Niedostępny'}
                  </div>
                </div>
              </div>

              {/* OPIS */}
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  Opis i specyfikacja techniczna
                </h3>
                <p style={{ fontSize: '15px', lineHeight: 1.65, color: '#475569', margin: 0 }}>
                  {item.description || 'Brak szczegółowego opisu dla tej pozycji.'}
                </p>
              </div>
            </div>

            {/* Podsumowanie cech */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '13px', color: '#475569' }}>
              <span>✔ Natychmiastowa wycena w kalkulatorze</span>
              <span>✔ Walidacja dostępności na żywo</span>
              <span>✔ Odbiór osobisty lub dostawa pod dom (+50 zł)</span>
            </div>
          </div>
        </div>

        {/* DOLNA SEKCJA: KALENDARZ DOSTĘPNOŚCI + FORMULARZ REZERWACJI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '32px', marginTop: '32px' }}>
          
          {/* LEWY PANEL: KALENDARZ DOSTĘPNOŚCI (WF-04) */}
          <div style={{ background: '#ffffff', borderRadius: '18px', padding: '28px', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  📅 Kalendarz dostępności
                </h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>
                  Kliknij na wolne dni w kalendarzu, aby wybrać termin rezerwacji
                </p>
              </div>

              {/* Nawigacja po miesiącach */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                  style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontWeight: 700 }}
                >
                  ◀
                </button>
                <span style={{ fontWeight: 700, fontSize: '15px', minWidth: '140px', textAlign: 'center' }}>
                  {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                  style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontWeight: 700 }}
                >
                  ▶
                </button>
              </div>
            </div>

            {/* Legenda kalendarza */}
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '16px', padding: '10px 12px', background: '#f8fafc', borderRadius: '10px', fontSize: '12px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '4px', background: '#dcfce7', border: '1px solid #22c55e', display: 'inline-block' }} />
                Dostępne (pełna pula)
              </span>
              {totalQuantity > 1 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '4px', background: '#fef3c7', border: '1px solid #f59e0b', display: 'inline-block' }} />
                  Częściowo zajęte (ostatnie sztuki)
                </span>
              )}
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '4px', background: '#fee2e2', border: '1px solid #ef4444', display: 'inline-block' }} />
                Zajęte (brak wolnych sztuk)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '4px', background: '#15803d', display: 'inline-block' }} />
                Twój wybór
              </span>
            </div>

            {/* Nagłówki dni tygodnia */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', textAlign: 'center', fontWeight: 700, fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
              {DAY_NAMES.map(d => <div key={d}>{d}</div>)}
            </div>

            {/* Siatka dni miesiąca */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
              {calendarDays.map((dayObj, idx) => {
                if (!dayObj) {
                  return <div key={`empty-${idx}`} style={{ height: '62px' }} />
                }

                const isSelected = (startDate && dayObj.dateStr === startDate) ||
                                   (endDate && dayObj.dateStr === endDate) ||
                                   (startDate && endDate && dayObj.dateStr > startDate && dayObj.dateStr < endDate)

                let bg = '#f0fdf4'
                let border = '1px solid #bbf7d0'
                let textColor = '#166534'

                if (dayObj.isFull) {
                  bg = '#fee2e2'
                  border = '1px solid #fca5a5'
                  textColor = '#991b1b'
                } else if (dayObj.isPartial) {
                  bg = '#fef3c7'
                  border = '1px solid #fcd34d'
                  textColor = '#92400e'
                }

                if (isSelected) {
                  bg = '#15803d'
                  border = '2px solid #14532d'
                  textColor = '#ffffff'
                }

                return (
                  <div
                    key={dayObj.dateStr}
                    onClick={() => handleDayClick(dayObj)}
                    style={{
                      height: '62px',
                      borderRadius: '10px',
                      background: bg,
                      border,
                      color: textColor,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: dayObj.isFull ? 'not-allowed' : 'pointer',
                      opacity: dayObj.isFull ? 0.75 : 1,
                      transition: 'all 0.15s ease',
                      userSelect: 'none'
                    }}
                    title={dayObj.isFull ? 'Termin całkowicie zarezerwowany' : `Dostępne sztuki: ${dayObj.freeCount}/${totalQuantity}`}
                  >
                    <span style={{ fontWeight: 800, fontSize: '15px', textDecoration: dayObj.isFull ? 'line-through' : 'none' }}>
                      {dayObj.day}
                    </span>
                    <span style={{ fontSize: '10px', fontWeight: 600, marginTop: '2px' }}>
                      {dayObj.isFull ? 'Zajęte' : `Wolne: ${dayObj.freeCount}/${totalQuantity}`}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Lista nadchodzących blokad w tym przedmiocie */}
            <div style={{ marginTop: '22px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#475569', margin: '0 0 8px' }}>
                Zarezerwowane terminy w systemie ({reservations.length}):
              </h4>
              {reservations.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#16a34a' }}>Brak rezerwacji – wszystkie terminy są w pełni dostępne!</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '130px', overflowY: 'auto' }}>
                  {reservations.map((r, i) => (
                    <div key={i} style={{ fontSize: '12px', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                      <span>🔒 Od: <strong>{r.startDate.slice(0, 10)}</strong> do <strong>{r.endDate.slice(0, 10)}</strong></span>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>Zajęta 1 szt. ({r.status})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* PRAWY PANEL: KALKULATOR I FORMULARZ REZERWACJI (WF-03, WF-05, WF-07) */}
          <div style={{ background: '#ffffff', borderRadius: '18px', padding: '28px', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 6px', color: '#0f172a' }}>
              🛒 Zarezerwuj wybrany termin
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px' }}>
              {currentUser
                ? `Rezerwujesz jako zalogowany klient: ${currentUser.firstName} ${currentUser.lastName}`
                : 'Możesz zarezerwować bez zakładania konta (jako Gość)'}
            </p>

            <form onSubmit={handleReservationSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Data początkowa</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Data końcowa</label>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {rangeConflict && (
                <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
                  ⚠️ Wybrany przedział zawiera dni, w których wszystkie egzemplarze ({totalQuantity} szt.) są już zarezerwowane! Wybierz inne daty.
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Imię i nazwisko</label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    required
                    placeholder="np. Jan Kowalski"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Telefon kontaktowy</label>
                  <input
                    type="tel"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    required
                    placeholder="np. 600700800"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Adres e-mail (do potwierdzenia)</label>
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  required
                  placeholder="twoj@email.pl"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              {/* Opcja dostawy i płatności */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Sposób odbioru / transport</label>
                  <select
                    value={deliveryType}
                    onChange={(e) => setDeliveryType(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}
                  >
                    <option value="PICKUP">Odbiór osobisty (0 zł)</option>
                    <option value="DELIVERY">Dostawa pod adres (+50 zł)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Metoda płatności</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}
                  >
                    <option value="BLIK">Szybki przelew / BLIK</option>
                    <option value="CARD">Karta płatnicza</option>
                    <option value="CASH">Gotówka przy odbiorze</option>
                  </select>
                </div>
              </div>

              {deliveryType === 'DELIVERY' && (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px', background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <input
                    type="text"
                    placeholder="Ulica i nr domu"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    required
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                  <input
                    type="text"
                    placeholder="Miasto"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                  <input
                    type="text"
                    placeholder="Kod (00-000)"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    required
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              )}

              {/* KALKULATOR KOSZTÓW W CZASIE RZECZYWISTYM (WF-03) */}
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px', padding: '14px 16px', marginTop: '4px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#166534', marginBottom: '6px' }}>
                  Kalkulacja kosztów na żywo:
                </div>
                {priceSummary ? (
                  <div style={{ fontSize: '14px', color: '#14532d', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Czas trwania ({priceSummary.daysCount} {priceSummary.daysCount === 1 ? 'dzień' : 'dni'} × {Number(item.price).toFixed(2)} zł):</span>
                      <strong>{priceSummary.baseCost.toFixed(2)} zł</strong>
                    </div>
                    {priceSummary.deliveryCost > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Koszt transportu pod wskazany adres:</span>
                        <strong>+{priceSummary.deliveryCost.toFixed(2)} zł</strong>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #bbf7d0', paddingTop: '6px', marginTop: '4px', fontSize: '17px', fontWeight: 800 }}>
                      <span>Razem do zapłaty:</span>
                      <span>{priceSummary.total.toFixed(2)} zł</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '13px', color: '#64748b' }}>
                    Wybierz datę początkową i końcową w kalendarzu, aby obliczyć koszt.
                  </div>
                )}
              </div>

              {submitStatus.error && (
                <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
                  {submitStatus.error}
                </div>
              )}

              {submitStatus.success && (
                <div style={{ background: '#dcfce7', border: '1px solid #22c55e', color: '#14532d', padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: 700 }}>
                  ✅ {submitStatus.success}
                </div>
              )}

              <button
                type="submit"
                disabled={submitStatus.loading || rangeConflict || !item.isAvailable}
                style={{
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: rangeConflict || !item.isAvailable ? '#94a3b8' : '#15803d',
                  color: '#ffffff',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: rangeConflict || !item.isAvailable ? 'not-allowed' : 'pointer',
                  marginTop: '4px'
                }}
              >
                {submitStatus.loading ? 'Przetwarzanie rezerwacji...' : 'Zatwierdź i zarezerwuj termin'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}