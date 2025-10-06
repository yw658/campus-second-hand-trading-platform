import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import '../styles/auth.css';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const nav = useNavigate();
    const loc = useLocation();

    const onSubmit = async (e) => {
        e.preventDefault();
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            const redirect = new URLSearchParams(loc.search).get('redirect') || '/';
            nav(redirect, { replace: true });
        } else {
            alert(data?.message || 'Login failed');
        }
    };

    return (
        <div className="auth-wrap">
            <form className="auth-card" onSubmit={onSubmit}>
                <div className="auth-head">
                    <div className="auth-logo">Waikato Market</div>
                    <h2 className="auth-title">Welcome back</h2>
                    <p className="auth-sub">Log in to continue buying and selling.</p>
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
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>

                <button className="auth-btn auth-btn--primary" type="submit">Login</button>

                <div className="auth-foot">
                    <span>New here?</span>
                    <Link className="auth-link" to="/register">Create an account</Link>
                </div>
            </form>
        </div>
    );
}