import React, { useState } from 'react';

const API_BASE = 'http://192.168.1.7:5000/api';

export default function PasswordReset() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState(1); // 1=request, 2=reset
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const requestOtp = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/auth/request-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to send OTP');
      setMessage('OTP sent to your email');
      setStep(2);
    } catch (err) {
      setMessage(err.message || 'Error');
    } finally { setLoading(false); }
  };

  const submitReset = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to reset password');
      setMessage('Password reset successful. You can now login.');
      setStep(1);
      setEmail(''); setOtp(''); setNewPassword('');
    } catch (err) {
      setMessage(err.message || 'Error');
    } finally { setLoading(false); }
  };

  return (
    <div className="password-reset-card">
      <h2>Change / Reset Password</h2>
      {message && <div className="message">{message}</div>}

      {step === 1 ? (
        <div>
          <label>Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com" />
          <div style={{marginTop:12}}>
            <button onClick={requestOtp} disabled={loading || !email}>Send OTP</button>
          </div>
        </div>
      ) : (
        <div>
          <label>Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} />
          <label>OTP</label>
          <input value={otp} onChange={e => setOtp(e.target.value)} />
          <label>New password</label>
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          <div style={{marginTop:12}}>
            <button onClick={submitReset} disabled={loading || !otp || !newPassword}>Reset password</button>
          </div>
        </div>
      )}
    </div>
  );
}
