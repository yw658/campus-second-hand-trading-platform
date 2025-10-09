// client/src/pages/Admin.jsx
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/admin.css';
import { adminListUsers, adminListItems, adminHideItem, adminUnhideItem } from '../api/admin';
import { fetchReports, resolveReport, dismissReport } from '../api/reports';

export default function Admin() {
    const [tab, setTab] = useState('users'); // 'users' | 'reports' | 'items'
    const [users, setUsers] = useState([]);
    const [items, setItems] = useState([]);
    const [reports, setReports] = useState([]);
    const [reportTab, setReportTab] = useState('pending'); // 'pending'|'resolved'|'dismissed'
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const me = JSON.parse(localStorage.getItem('user') || '{}');

    // guard
    useEffect(() => {
        if (!token || !me?.isAdmin) navigate('/', { replace: true });
    }, [token, me, navigate]);

    // loaders
    const loadUsers = async () => {
        setLoading(true);
        try { setUsers(await adminListUsers()); }
        catch { setUsers([]); }
        finally { setLoading(false); }
    };

    const loadItems = async () => {
        setLoading(true);
        try { setItems(await adminListItems()); }
        catch { setItems([]); }
        finally { setLoading(false); }
    };

    const loadReports = async (status = reportTab) => {
        setLoading(true);
        try { setReports(await fetchReports(status === 'all' ? '' : status)); }
        catch { setReports([]); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        if (tab === 'users') loadUsers();
        if (tab === 'items') loadItems();
        if (tab === 'reports') loadReports(reportTab);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab]);

    useEffect(() => {
        if (tab === 'reports') loadReports(reportTab);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reportTab]);

    // actions
    const onResolve = async (id) => {
        try { await resolveReport(id); await loadReports(reportTab); }
        catch (e) { alert(e.message || 'Resolve failed'); }
    };
    const onDismiss = async (id) => {
        try { await dismissReport(id); await loadReports(reportTab); }
        catch (e) { alert(e.message || 'Dismiss failed'); }
    };
    const onHide = async (itemId) => {
        try { await adminHideItem(itemId); await (tab === 'items' ? loadItems() : loadReports(reportTab)); }
        catch (e) { alert(e.message || 'Hide failed'); }
    };
    const onUnhide = async (itemId) => {
        try { await adminUnhideItem(itemId); await (tab === 'items' ? loadItems() : loadReports(reportTab)); }
        catch (e) { alert(e.message || 'Unhide failed'); }
    };

    return (
        <div className="admin-page">
            <h1>Admin Dashboard</h1>

            {/* Tabs */}
            <div className="admin-tabs">
                <button className={`admin-tab ${tab==='users'?'is-active':''}`} onClick={()=>setTab('users')}>Users</button>
                <button className={`admin-tab ${tab==='reports'?'is-active':''}`} onClick={()=>setTab('reports')}>Reports</button>
                <button className={`admin-tab ${tab==='items'?'is-active':''}`} onClick={()=>setTab('items')}>Items</button>
            </div>

            {/* Users */}
            {tab === 'users' && (
                <section className="admin-section">
                    <h2>Users</h2>
                    {loading ? <p>Loading…</p> : users.length === 0 ? (
                        <p style={{ color:'#6b7280' }}>No users.</p>
                    ) : (
                        <table className="admin-table">
                            <thead>
                            <tr>
                                <th>Email</th><th>Username</th><th>Role</th><th>Status</th><th>Created</th>
                            </tr>
                            </thead>
                            <tbody>
                            {users.map(u=>(
                                <tr key={u._id}>
                                    <td>{u.email}</td>
                                    <td>{u.username}</td>
                                    <td>{u.isAdmin ? 'admin':'user'}</td>
                                    <td><span className={`badge ${u.isBanned?'badge--danger':''}`}>{u.isBanned?'Banned':'Active'}</span></td>
                                    <td>{new Date(u.createdAt).toLocaleString()}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    )}
                </section>
            )}

            {/* Reports */}
            {tab === 'reports' && (
                <section className="admin-section">
                    <div className="admin-section__head">
                        <h2>Reports</h2>
                        <div className="segmented">
                            <button className={`segmented__btn ${reportTab==='pending'?'is-active':''}`} onClick={()=>setReportTab('pending')}>Pending</button>
                            <button className={`segmented__btn ${reportTab==='resolved'?'is-active':''}`} onClick={()=>setReportTab('resolved')}>Resolved</button>
                            <button className={`segmented__btn ${reportTab==='dismissed'?'is-active':''}`} onClick={()=>setReportTab('dismissed')}>Dismissed</button>
                        </div>
                    </div>

                    {loading ? <p>Loading…</p> : reports.length === 0 ? (
                        <p style={{ color:'#6b7280' }}>No reports.</p>
                    ) : (
                        <table className="admin-table">
                            <thead>
                            <tr>
                                <th>Item</th><th>Reporter</th><th>Reason</th><th>Status</th><th>Created</th><th>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {reports.map(r=>{
                                const item = r.itemId || {};
                                const reporter = r.reporterId || {};
                                return (
                                    <tr key={r._id}>
                                        <td>
                                            <div className="cell-item">
                                                <img className="cell-thumb" src={item.image || 'https://via.placeholder.com/56x56?text=No+Img'} alt="" />
                                                <div className="cell-item__meta">
                                                    <Link to={`/items/${item._id || ''}`} className="link">{item.title || 'Untitled'}</Link>
                                                    <div className="muted">${typeof item.price==='number' ? item.price.toFixed(2) : '-'}</div>
                                                    <div className="pill-row">
                                                        {item.isReported && <span className="pill pill--warn">reported</span>}
                                                        {item.isHidden && <span className="pill pill--danger">hidden</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div>{reporter.username || '-'}</div>
                                            <div className="muted">{reporter.email || ''}</div>
                                        </td>
                                        <td style={{maxWidth:360, whiteSpace:'pre-wrap'}}>{r.reason}</td>
                                        <td>
                        <span className={`badge ${r.status==='pending'?'badge--warn': r.status==='dismissed'?'badge--muted':'badge--ok'}`}>
                          {r.status}
                        </span>
                                        </td>
                                        <td>{new Date(r.createdAt).toLocaleString()}</td>
                                        <td className="actions-col">
                                            {r.status==='pending' && (
                                                <>
                                                    <button className="btn btn--primary" onClick={()=>onResolve(r._id)}>Resolve</button>
                                                    <button className="btn" onClick={()=>onDismiss(r._id)}>Dismiss</button>
                                                </>
                                            )}
                                            {!item.isHidden ? (
                                                <button className="btn btn--ghost" onClick={()=>onHide(item._id)}>Hide Item</button>
                                            ) : (
                                                <button className="btn btn--ghost" onClick={()=>onUnhide(item._id)}>Unhide Item</button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    )}
                </section>
            )}

            {/* Items */}
            {tab === 'items' && (
                <section className="admin-section">
                    <h2>Items</h2>
                    {loading ? <p>Loading…</p> : items.length === 0 ? (
                        <p style={{ color:'#6b7280' }}>No items.</p>
                    ) : (
                        <table className="admin-table">
                            <thead>
                            <tr>
                                <th>Item</th><th>Seller</th><th>Flags</th><th>Created</th><th>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {items.map(it=>(
                                <tr key={it._id}>
                                    <td>
                                        <div className="cell-item">
                                            <img className="cell-thumb" src={it.image || 'https://via.placeholder.com/56x56?text=No+Img'} alt="" />
                                            <div className="cell-item__meta">
                                                <Link to={`/items/${it._id}`} className="link">{it.title}</Link>
                                                <div className="muted">
                                                    {typeof it.price==='number' ? `$${it.price.toFixed(2)}` : '-'}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>{it.sellerId?.username || '-'}</td>
                                    <td className="pill-row">
                      <span className={`pill ${ (it.pendingReportCount||0) > 0 ? 'pill--warn' : ''}`}>
                        {(it.pendingReportCount||0)} pending
                      </span>
                                        <span className="pill">{(it.reportCount||0)} total</span>
                                        <span className={`pill ${it.isHidden ? 'pill--danger' : ''}`}>
                        {it.isHidden ? 'hidden' : 'visible'}
                      </span>
                                        <span className="pill">
                        {it.isSold ? 'sold' : 'available'}
                      </span>
                                    </td>
                                    <td>{new Date(it.createdAt).toLocaleString()}</td>
                                    <td className="actions-col">
                                        {!it.isHidden ? (
                                            <button className="btn btn--ghost" onClick={()=>onHide(it._id)}>Hide</button>
                                        ) : (
                                            <button className="btn btn--ghost" onClick={()=>onUnhide(it._id)}>Unhide</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    )}
                </section>
            )}
        </div>
    );
}