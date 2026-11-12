import { useEffect, useState, useMemo, useRef } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { 
  Phone, 
  ShoppingCart, 
  CalendarCheck, 
  User, 
  LogOut, 
  LogIn, 
  UserPlus,
  ChevronDown
} from 'lucide-react'
import logoImage from './assets/GardenBookingLogo.png'
import AuthPage from './AuthPage'
import UserPage from './UserPage'
import ItemPage from './ItemPage'
import CartPage from './CartPage'

const THEME = {
  primary: '#556B2F',
  accent: '#8FA31E',
  surface: '#f8fafc',
  textDark: '#1e293b',
  textMuted: '#64748b',
  white: '#ffffff',
  borderDefault: '#cbd5e1',
  borderHover: '#475569',
  borderDivider: '#e2e8f0'
}

function isServiceItem(item) {
  if (!item) return false
  const catId = item.category?.id || 0
  return catId >= 10 || (item.name || '').toLowerCase().startsWith('usługa:')
}

// Funkcja pomocnicza wyznaczająca unikalny klucz koszyka dla danego konta (lub gościa)
function getCartKeyForUser(user) {
  if (!user) return 'garden_cart_guest'
  const identifier = user.userId || user.id || user.email
  return identifier ? `garden_cart_user_${identifier}` : 'garden_cart_guest'
}

function loadCartFromStorage(user) {
  try {
    const key = getCartKeyForUser(user)
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function HomeCatalog({ currentUser, handleLogout, cartCount }) {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [mainType, setMainType] = useState('ALL')
  const [selectedCategory, setSelectedCategory] = useState('WSZYSTKIE')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('DEFAULT')

  const catalogSectionRef = useRef(null)

  useEffect(() => {
    fetch('http://localhost:8080/api/items')
      .then((res) => {
        if (!res.ok) throw new Error(`Błąd HTTP: ${res.status}`)
        return res.json()
      })
      .then((data) => {
        setItems(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const scrollToCatalog = (typeFilter) => {
    setMainType(typeFilter)
    setSelectedCategory('WSZYSTKIE')
    catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const availableCategories = useMemo(() => {
    const relevantItems = items.filter((item) => {
      if (mainType === 'EQUIPMENT') return !isServiceItem(item)
      if (mainType === 'SERVICE') return isServiceItem(item)
      return true
    })
    const unique = new Set(relevantItems.map((i) => i.category?.name).filter(Boolean))
    return ['WSZYSTKIE', ...Array.from(unique)]
  }, [items, mainType])

  const filteredAndSortedItems = useMemo(() => {
    const filtered = items.filter((item) => {
      const isService = isServiceItem(item)
      if (mainType === 'EQUIPMENT' && isService) return false
      if (mainType === 'SERVICE' && !isService) return false

      const matchesCategory = selectedCategory === 'WSZYSTKIE' || item.category?.name === selectedCategory
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        item.name.toLowerCase().includes(q) ||
        (item.brand && item.brand.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q))

      return matchesCategory && matchesSearch
    })

    return [...filtered].sort((a, b) => {
      if (sortBy === 'PRICE_ASC') return Number(a.price) - Number(b.price)
      if (sortBy === 'PRICE_DESC') return Number(b.price) - Number(a.price)
      if (sortBy === 'NAME_ASC') return a.name.localeCompare(b.name, 'pl')
      if (sortBy === 'NAME_DESC') return b.name.localeCompare(a.name, 'pl')
      return 0
    })
  }, [items, mainType, selectedCategory, searchQuery, sortBy])

  const navIconBtnStyle = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '38px',
    height: '38px',
    borderRadius: '4px',
    border: `1px solid ${THEME.borderDefault}`,
    backgroundColor: THEME.white,
    color: THEME.textDark,
    cursor: 'pointer',
    padding: 0
  }

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: THEME.white,
      color: THEME.textDark,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      boxSizing: 'border-box'
    }}>
      <style>{`
        @media (max-width: 640px) {
          .brand-text-container { display: none !important; }
          .navbar-inner { padding: 0 0.75rem !important; }
        }
      `}</style>

      <nav
        className="navbar-inner"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '65px',
          backgroundColor: THEME.white,
          padding: '0 2rem',
          borderBottom: `1px solid ${THEME.borderDivider}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 100,
          boxSizing: 'border-box'
        }}
      >
        <div
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
        >
          <img src={logoImage} alt="Logo" style={{ height: '40px', width: 'auto', objectFit: 'contain' }} />
          <div className="brand-text-container">
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: THEME.primary }}>
              Garden<span style={{ color: THEME.accent }}>Booking</span>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            type="button"
            title="Kontakt"
            onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
            style={navIconBtnStyle}
          >
            <Phone size={18} />
          </button>

          <button
            type="button"
            title="Koszyk"
            onClick={() => navigate('/cart')}
            style={navIconBtnStyle}
          >
            <ShoppingCart size={18} />
            {cartCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-6px',
                right: '-6px',
                minWidth: '18px',
                height: '18px',
                padding: '0 4px',
                backgroundColor: THEME.primary,
                color: THEME.white,
                fontSize: '0.68rem',
                fontWeight: 800,
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {cartCount}
              </span>
            )}
          </button>

          {currentUser ? (
            <>
              <button
                type="button"
                title={currentUser.role === 'EMPLOYEE' ? 'Grafik pracy' : 'Rezerwacje i historia'}
                onClick={() => navigate('/user?tab=RESERVATIONS')}
                style={navIconBtnStyle}
              >
                <CalendarCheck size={18} />
              </button>

              <button
                type="button"
                title={`Profil (${currentUser.firstName || currentUser.email})`}
                onClick={() => navigate('/user?tab=PROFILE')}
                style={navIconBtnStyle}
              >
                <User size={18} />
              </button>

              <button
                type="button"
                title="Wyloguj się"
                onClick={handleLogout}
                style={navIconBtnStyle}
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                title="Zaloguj się"
                onClick={() => navigate('/auth?mode=LOGIN')}
                style={navIconBtnStyle}
              >
                <LogIn size={18} />
              </button>

              <button
                type="button"
                title="Zarejestruj się"
                onClick={() => navigate('/auth?mode=REGISTER')}
                style={{
                  ...navIconBtnStyle,
                  backgroundColor: THEME.primary,
                  color: THEME.white,
                  border: `1px solid ${THEME.primary}`
                }}
              >
                <UserPlus size={18} />
              </button>
            </>
          )}
        </div>
      </nav>

      <section style={{
        minHeight: '100vh',
        width: '100%',
        paddingTop: '65px',
        backgroundColor: THEME.primary,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxSizing: 'border-box'
      }}>
        <div />

        <div style={{
          maxWidth: '920px',
          width: '100%',
          padding: '1rem 1.5rem',
          textAlign: 'center',
          boxSizing: 'border-box'
        }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: THEME.white, margin: '0 0 0.5rem 0' }}>
            Wybierz czego potrzebujesz
          </h1>
          <p style={{ fontSize: '0.95rem', color: '#e2e8f0', margin: '0 0 2rem 0' }}>
            Wypożycz maszynę do samodzielnej pracy lub zamów usługę ogrodniczą.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
            <div
              onClick={() => scrollToCatalog('EQUIPMENT')}
              style={{
                backgroundColor: THEME.white,
                borderRadius: '4px',
                padding: '2rem 1.5rem',
                cursor: 'pointer',
                border: `1px solid ${THEME.borderDefault}`,
                textAlign: 'center'
              }}
            >
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: THEME.textDark, margin: '0 0 0.4rem 0' }}>
                Wypożycz sprzęt
              </h2>
              <span style={{ fontSize: '0.88rem', color: THEME.textMuted }}>
                Kosiarki, aeratory, glebogryzarki i inne maszyny
              </span>
            </div>

            <div
              onClick={() => scrollToCatalog('SERVICE')}
              style={{
                backgroundColor: THEME.white,
                borderRadius: '4px',
                padding: '2rem 1.5rem',
                cursor: 'pointer',
                border: `1px solid ${THEME.borderDefault}`,
                textAlign: 'center'
              }}
            >
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: THEME.textDark, margin: '0 0 0.4rem 0' }}>
                Zamów usługę
              </h2>
              <span style={{ fontSize: '0.88rem', color: THEME.textMuted }}>
                Koszenie, wertykulacja oraz kompleksowe prace ogrodowe
              </span>
            </div>
          </div>
        </div>

        <div
          onClick={() => scrollToCatalog('ALL')}
          style={{
            paddingBottom: '1.5rem',
            cursor: 'pointer',
            textAlign: 'center',
            color: THEME.white,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.25rem'
          }}
        >
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            Przewiń w dół, aby zobaczyć pełną ofertę
          </span>
          <ChevronDown size={20} />
        </div>
      </section>

      <main
        ref={catalogSectionRef}
        style={{
          maxWidth: '1240px',
          width: '100%',
          margin: '0 auto',
          padding: '4.5rem 1.5rem 3rem 1.5rem',
          flex: 1,
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: `Cała oferta (${items.length})` },
            { id: 'EQUIPMENT', label: `Sprzęt (${items.filter((i) => !isServiceItem(i)).length})` },
            { id: 'SERVICE', label: `Usługi (${items.filter((i) => isServiceItem(i)).length})` }
          ].map((tab) => {
            const active = mainType === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => { setMainType(tab.id); setSelectedCategory('WSZYSTKIE') }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: `1px solid ${active ? THEME.primary : THEME.borderDefault}`,
                  backgroundColor: active ? THEME.primary : THEME.surface,
                  color: active ? THEME.white : THEME.textDark,
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <div style={{
          backgroundColor: THEME.surface,
          padding: '1rem',
          borderRadius: '4px',
          border: `1px solid ${THEME.borderDefault}`,
          marginBottom: '1.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          alignItems: 'end'
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, marginBottom: '4px' }}>
              Szukaj
            </label>
            <input
              type="text"
              placeholder="Nazwa, marka lub opis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '4px',
                border: `1px solid ${THEME.borderDefault}`,
                backgroundColor: THEME.white,
                fontSize: '0.88rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, marginBottom: '4px' }}>
              Kategoria
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '4px',
                border: `1px solid ${THEME.borderDefault}`,
                backgroundColor: THEME.white,
                fontSize: '0.88rem',
                boxSizing: 'border-box'
              }}
            >
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'WSZYSTKIE' ? 'Wszystkie kategorie' : cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, marginBottom: '4px' }}>
              Sortowanie
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '4px',
                border: `1px solid ${THEME.borderDefault}`,
                backgroundColor: THEME.white,
                fontSize: '0.88rem',
                boxSizing: 'border-box'
              }}
            >
              <option value="DEFAULT">Domyślne</option>
              <option value="PRICE_ASC">Cena: od najniższej</option>
              <option value="PRICE_DESC">Cena: od najwyższej</option>
              <option value="NAME_ASC">Nazwa: A - Z</option>
              <option value="NAME_DESC">Nazwa: Z - A</option>
            </select>
          </div>
        </div>

        {loading && <p style={{ textAlign: 'center', padding: '2rem', color: THEME.textMuted }}>Ładowanie katalogu...</p>}
        {error && (
          <div style={{ background: '#fef2f2', color: '#991b1b', padding: '1rem', borderRadius: '4px', border: '1px solid #fecaca' }}>
            Błąd pobierania: {error}
          </div>
        )}

        {!loading && !error && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.25rem'
          }}>
            {filteredAndSortedItems.map((item) => {
              const service = isServiceItem(item)
              return (
                <div
                  key={item.id}
                  onClick={() => navigate(`/item/${item.id}`)}
                  style={{
                    backgroundColor: THEME.white,
                    borderRadius: '4px',
                    border: `1px solid ${THEME.borderDefault}`,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = THEME.borderHover }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = THEME.borderDefault }}
                >
                  <div>
                    <div style={{ position: 'relative', height: '180px', backgroundColor: '#f1f5f9', borderBottom: `1px solid ${THEME.borderDivider}` }}>
                      <img
                        src={`http://localhost:8080${item.imageUrl}`}
                        alt={item.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.target.src = 'https://placehold.co/400x260/f1f5f9/475569?text=GardenBooking' }}
                      />
                      <span style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        backgroundColor: THEME.white,
                        color: THEME.textDark,
                        border: `1px solid ${THEME.borderDefault}`,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700
                      }}>
                        {service ? 'Usługa' : 'Sprzęt'}
                      </span>

                      {!service && item.brand && (
                        <span style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          backgroundColor: THEME.white,
                          color: THEME.textDark,
                          border: `1px solid ${THEME.borderDefault}`,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700
                        }}>
                          {item.brand}
                        </span>
                      )}
                    </div>

                    <div style={{ padding: '1rem' }}>
                      <div style={{ fontSize: '0.75rem', color: THEME.textMuted, marginBottom: '4px' }}>
                        {item.category?.name}
                      </div>
                      <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1rem', color: THEME.textDark }}>
                        {item.name.replace(/^Usługa:\s*/i, '')}
                      </h3>
                      <p style={{ color: THEME.textMuted, fontSize: '0.84rem', lineHeight: 1.45, margin: 0 }}>
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div style={{
                    padding: '0.85rem 1rem',
                    backgroundColor: THEME.surface,
                    borderTop: `1px solid ${THEME.borderDivider}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: THEME.textMuted, display: 'block' }}>
                        {service ? 'Stawka bazowa' : 'Cena za dobę'}
                      </span>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: THEME.textDark }}>
                        {item.price} zł
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/item/${item.id}`)
                      }}
                      style={{
                        padding: '7px 14px',
                        borderRadius: '4px',
                        border: `1px solid ${THEME.primary}`,
                        backgroundColor: THEME.primary,
                        color: THEME.white,
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        cursor: 'pointer'
                      }}
                    >
                      Szczegóły
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      <footer style={{
        backgroundColor: THEME.surface,
        color: THEME.textDark,
        padding: '2rem 1.5rem',
        marginTop: 'auto',
        width: '100%',
        borderTop: `1px solid ${THEME.borderDefault}`,
        boxSizing: 'border-box'
      }}>
        <div style={{
          maxWidth: '1240px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.5rem'
        }}>
          <div>
            <strong style={{ display: 'block', marginBottom: '0.4rem' }}>GardenBooking</strong>
            <span style={{ color: THEME.textMuted, fontSize: '0.84rem' }}>
              Wypożyczalnia sprzętu i rezerwacja usług ogrodniczych.
            </span>
          </div>
          <div>
            <strong style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem' }}>Kontakt</strong>
            <div style={{ fontSize: '0.84rem', color: THEME.textMuted }}>ul. Ogrodowa 15, 00-001 Warszawa</div>
            <div style={{ fontSize: '0.84rem', color: THEME.textMuted }}>Tel.: +48 123 456 789 | kontakt@gardenbooking.pl</div>
          </div>
          <div>
            <strong style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem' }}>Godziny otwarcia</strong>
            <div style={{ fontSize: '0.84rem', color: THEME.textMuted }}>Pon. - Pt.: 08:00 - 18:00 | Sob.: 08:00 - 14:00</div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function App() {
  const navigate = useNavigate()

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('garden_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('garden_user')
      const parsedUser = saved ? JSON.parse(saved) : null
      return loadCartFromStorage(parsedUser)
    } catch {
      return []
    }
  })

  // Helper aktualizujący stan koszyka ODPOWIEDNIEGO użytkownika w localStorage
  const updateCartForCurrentUser = (updater) => {
    setCartItems((prev) => {
      const nextCart = typeof updater === 'function' ? updater(prev) : updater
      const key = getCartKeyForUser(currentUser)
      localStorage.setItem(key, JSON.stringify(nextCart))
      return nextCart
    })
  }

  const handleLoginSuccess = (userData) => {
    setCurrentUser(userData)
    localStorage.setItem('garden_user', JSON.stringify(userData))
    // Od razu wczytujemy indywidualny koszyk zalogowanego użytkownika
    setCartItems(loadCartFromStorage(userData))
  }

  const handleLogout = () => {
    setCurrentUser(null)
    localStorage.removeItem('garden_user')
    // Po wylogowaniu przełączamy na koszyk gościa
    setCartItems(loadCartFromStorage(null))
    navigate('/')
  }

  const handleAddToCart = (newEntry) => {
    updateCartForCurrentUser((prev) => [
      ...prev,
      { ...newEntry, cartEntryId: `${Date.now()}-${Math.random()}` }
    ])
  }

  const handleRemoveFromCart = (cartEntryId) => {
    updateCartForCurrentUser((prev) =>
      prev.filter((item) => item.cartEntryId !== cartEntryId)
    )
  }

  const handleClearCart = () => {
    updateCartForCurrentUser([])
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <HomeCatalog
            currentUser={currentUser}
            handleLogout={handleLogout}
            cartCount={cartItems.length}
          />
        }
      />
      <Route
        path="/item/:id"
        element={
          <ItemPage
            currentUser={currentUser}
            onAddToCart={handleAddToCart}
            cartCount={cartItems.length}
          />
        }
      />
      <Route
        path="/cart"
        element={
          <CartPage
            currentUser={currentUser}
            cartItems={cartItems}
            onRemoveFromCart={handleRemoveFromCart}
            onClearCart={handleClearCart}
          />
        }
      />
      <Route
        path="/auth"
        element={<AuthPage onLoginSuccess={handleLoginSuccess} />}
      />
      <Route
        path="/user"
        element={
          <UserPage
            currentUser={currentUser}
            onUserUpdate={handleLoginSuccess}
            onRebookItem={(item) => {
              if (item?.id) navigate(`/item/${item.id}`)
            }}
          />
        }
      />
    </Routes>
  )
}