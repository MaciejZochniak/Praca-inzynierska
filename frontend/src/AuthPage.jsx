import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import logoImage from './assets/GardenBookingLogo.png'

const THEME = {
  primary: '#556B2F',
  accent: '#8FA31E',
  surface: '#f8fafc',
  textDark: '#1e293b',
  textMuted: '#64748b',
  white: '#ffffff',
  borderDefault: '#cbd5e1',
  borderDivider: '#e2e8f0'
}

export default function AuthPage({ onLoginSuccess }) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const initialMode = searchParams.get('mode') === 'REGISTER' ? 'REGISTER' : 'LOGIN'
  const [authMode, setAuthMode] = useState(initialMode)

  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phoneNumber: ''
  })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const mode = searchParams.get('mode')
    if (mode === 'REGISTER' || mode === 'LOGIN') {
      setAuthMode(mode)
      setError(null)
    }
  }, [searchParams])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const endpoint = authMode === 'LOGIN' ? '/api/auth/login' : '/api/auth/register'

    try {
      const res = await fetch(`http://localhost:8080${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Błąd autoryzacji')
      }

      onLoginSuccess(data)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '9px 10px',
    borderRadius: '4px',
    border: `1px solid ${THEME.borderDefault}`,
    fontSize: '0.9rem',
    boxSizing: 'border-box'
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f1f5f9',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: THEME.textDark
    }}>
      <nav style={{
        height: '65px',
        backgroundColor: THEME.white,
        padding: '0 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${THEME.borderDivider}`
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
          <img src={logoImage} alt="Logo" style={{ height: '38px' }} />
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: THEME.primary }}>
            Garden<span style={{ color: THEME.accent }}>Booking</span>
          </span>
        </Link>
        <Link
          to="/"
          style={{
            color: THEME.textDark,
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.85rem',
            padding: '7px 12px',
            borderRadius: '4px',
            border: `1px solid ${THEME.borderDefault}`,
            backgroundColor: THEME.surface
          }}
        >
          Wróć do strony głównej
        </Link>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
        <div style={{
          backgroundColor: THEME.white,
          width: '100%',
          maxWidth: '420px',
          borderRadius: '4px',
          border: `1px solid ${THEME.borderDefault}`,
          padding: '1.75rem'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px',
            marginBottom: '1.5rem'
          }}>
            <button
              type="button"
              onClick={() => { setAuthMode('LOGIN'); setError(null) }}
              style={{
                padding: '9px',
                borderRadius: '4px',
                border: `1px solid ${authMode === 'LOGIN' ? THEME.primary : THEME.borderDefault}`,
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                backgroundColor: authMode === 'LOGIN' ? THEME.primary : THEME.surface,
                color: authMode === 'LOGIN' ? THEME.white : THEME.textDark
              }}
            >
              Logowanie
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('REGISTER'); setError(null) }}
              style={{
                padding: '9px',
                borderRadius: '4px',
                border: `1px solid ${authMode === 'REGISTER' ? THEME.primary : THEME.borderDefault}`,
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                backgroundColor: authMode === 'REGISTER' ? THEME.primary : THEME.surface,
                color: authMode === 'REGISTER' ? THEME.white : THEME.textDark
              }}
            >
              Rejestracja
            </button>
          </div>

          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem' }}>
            {authMode === 'LOGIN' ? 'Zaloguj się na konto' : 'Utwórz nowe konto'}
          </h2>

          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              color: '#991b1b',
              padding: '10px',
              borderRadius: '4px',
              fontSize: '0.84rem',
              marginBottom: '1rem',
              border: '1px solid #fecaca'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {authMode === 'REGISTER' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, marginBottom: '4px' }}>Imię</label>
                    <input
                      type="text"
                      required
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, marginBottom: '4px' }}>Nazwisko</label>
                    <input
                      type="text"
                      required
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, marginBottom: '4px' }}>Telefon</label>
                  <input
                    type="tel"
                    required
                    value={form.phoneNumber}
                    onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, marginBottom: '4px' }}>E-mail</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: THEME.textMuted, marginBottom: '4px' }}>Hasło</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                style={inputStyle}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '0.4rem',
                padding: '10px',
                borderRadius: '4px',
                border: `1px solid ${THEME.primary}`,
                backgroundColor: THEME.primary,
                color: THEME.white,
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Przetwarzanie...' : authMode === 'LOGIN' ? 'Zaloguj się' : 'Zarejestruj konto'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}