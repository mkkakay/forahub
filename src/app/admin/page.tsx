export const dynamic = 'force-dynamic'

// Bright red smoke-test — confirms auth check passed.
// Replace this with AdminDashboard once confirmed working.
export default function AdminDashboard() {
  return (
    <div style={{
      background: '#dc2626',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontFamily: 'monospace',
    }}>
      <div style={{ fontSize: 56, fontWeight: 900, letterSpacing: '-1px' }}>ADMIN WORKS</div>
      <div style={{ fontSize: 20, marginTop: 12, opacity: 0.85 }}>
        auth.getUser() passed · is_admin = true
      </div>
      <div style={{ fontSize: 14, marginTop: 8, opacity: 0.6 }}>
        Replace this page with the real dashboard once confirmed.
      </div>
    </div>
  )
}
