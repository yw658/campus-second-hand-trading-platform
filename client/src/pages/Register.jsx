import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/auth.css';

export default function Register() {
    const [username, setUsername] = useState('');
    const [email, setEmail]     = useState('');
    const [password, setPassword] = useState('');
    const nav = useNavigate();

    const onSubmit = async (e) => {
        e.preventDefault();
        const res = await fetch('http://localhost:5002/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password }),
        });
        const data = await res.json();
        if (res.ok) {
            // many backends just return message; to keep UX consistent, go to login page
            alert('Account created. Please log in.');
            nav('/login', { replace: true });
        } else {
            alert(data?.message || 'Register failed');
        }
    };

    return (
        <div className="auth-wrap">
            <form className="auth-card" onSubmit={onSubmit}>
                <div className="auth-head">
                    <div className="auth-logo">Waikato Market</div>
                    <h2 className="auth-title">Create your account</h2>
                    <p className="auth-sub">Join the campus marketplace in minutes.</p>
                </div>

                <div className="auth-field">
                    <label className="auth-label">Username</label>
                    <input
                        className="auth-input"
                        placeholder="e.g. winter123"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                </div>

                <div className="auth-field">
                    <label className="auth-label">Email</label>
                    <input
                        className="auth-input"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>

                <div className="auth-field">
                    <label className="auth-label">Password</label>
                    <input
                        className="auth-input"
                        type="password"
                        placeholder="At least 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>

                <button className="auth-btn auth-btn--primary" type="submit">Create account</button>

                <div className="auth-foot">
                    <span>Already have an account?</span>
                    <Link className="auth-link" to="/login">Back to login</Link>
                </div>
            </form>
        </div>
    );
}