// src/components/Layout.jsx
import { Outlet } from 'react-router-dom';
import Navbar from './NavBar';
import '../styles/theme.css';

export default function Layout() {
    return (
        <>
            <Navbar />
            <main className="wm-container">
                <Outlet />
            </main>
        </>
    );
}