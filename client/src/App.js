// client/src/App.js
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import PostItem from './pages/PostItem';
import ItemDetail from './pages/ItemDetail';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import MyFavorites from './pages/MyFavorites';
import MyOrders from './pages/MyOrders';
import Seller from './pages/Seller';
import SellerOrders from './pages/SellerOrders';
import Chat from './pages/Chat';
import './index.css';

function isAuthed() {
    return !!localStorage.getItem('token');
}
function isAdmin() {
    try {
        return JSON.parse(localStorage.getItem('user') || '{}')?.isAdmin === true;
    } catch {
        return false;
    }
}

function ProtectedRoute({ children }) {
    if (!isAuthed()) {
        const from = window.location.pathname + window.location.search;
        return <Navigate to={`/login?redirect=${encodeURIComponent(from)}`} replace />;
    }
    return children;
}

function AdminRoute({ children }) {
    if (!isAuthed() || !isAdmin()) {
        return <Navigate to="/" replace />;
    }
    return children;
}

export default function App() {
    return (
        <Router>
            <Routes>
                <Route element={<Layout />}>
                    {/* Public */}
                    <Route index element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/items/:id" element={<ItemDetail />} />
                    <Route path="/seller/:sellerId" element={<Seller />} />

                    {/* Auth required */}
                    <Route
                        path="/post"
                        element={
                            <ProtectedRoute>
                                <PostItem />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/profile"
                        element={
                            <ProtectedRoute>
                                <Profile />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/favorites"
                        element={
                            <ProtectedRoute>
                                <MyFavorites />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/orders"
                        element={
                            <ProtectedRoute>
                                <MyOrders />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/seller-orders"
                        element={
                            <ProtectedRoute>
                                <SellerOrders />
                            </ProtectedRoute>
                        }
                    />

                    {/* Chat (both list and specific conversation) */}
                    <Route
                        path="/chat"
                        element={
                            <ProtectedRoute>
                                <Chat />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/chat/:convoId"
                        element={
                            <ProtectedRoute>
                                <Chat />
                            </ProtectedRoute>
                        }
                    />

                    {/* Admin (must be authed + admin) */}
                    <Route
                        path="/admin"
                        element={
                            <AdminRoute>
                                <Admin />
                            </AdminRoute>
                        }
                    />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
            </Routes>
        </Router>
    );
}