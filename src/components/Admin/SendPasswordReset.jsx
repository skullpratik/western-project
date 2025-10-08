import React, { useState } from 'react';

const API_BASE = 'http://192.168.1.7:5000/api';

export default function SendPasswordReset({ userEmail }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const sendReset = async () => {
    setLoading(true); setMsg('');
    try {
      const res = await fetch(`${API_BASE}/auth/request-password-reset`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: userEmail })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || 'Failed');
      setMsg('OTP sent');
    } catch (e) { setMsg(e.message || 'Error'); }
    finally { setLoading(false); }
  };

  return (
    <button onClick={sendReset} disabled={loading || !userEmail} title={`Send password reset to ${userEmail}`} className="btn-small">
      {loading ? 'Sending...' : 'Send reset'}
      {msg && <span style={{marginLeft:8, fontSize:12}}>{msg}</span>}
    </button>
  );
}
