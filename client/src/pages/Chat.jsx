import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import "../styles/chat.css";

const READ_KEY = (id) => `wm.read.${id}`;
const PLACEHOLDER_IMG = "https://via.placeholder.com/96x96.png?text=Item";
const API = "";

function formatDate(d) {
    try { return new Date(d).toLocaleDateString(); } catch { return ""; }
}

function shallowEqualConvos(a = [], b = []) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        const x = a[i], y = b[i];
        if (x._id !== y._id) return false;
        if (String(x.lastMsgText || "") !== String(y.lastMsgText || "")) return false;
        if (String(x.lastMsgAt || "") !== String(y.lastMsgAt || "")) return false;
        if (String(x.lastMsgSenderId || "") !== String(y.lastMsgSenderId || "")) return false;
    }
    return true;
}
function sameMsgArrays(a = [], b = []) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i]._id !== b[i]._id) return false;
        if (String(a[i].updatedAt || "") !== String(b[i].updatedAt || "")) return false;
    }
    return true;
}

export default function Chat() {
    const { convoId } = useParams();
    const nav = useNavigate();

    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const userId = user?._id;

    const [role, setRole] = useState("all");
    const [convos, setConvos] = useState([]);
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");

    const [loadingConvos, setLoadingConvos] = useState(true);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const [unreadMap, setUnreadMap] = useState({});

    const sidebarRef = useRef(null);
    const msgsWrapRef = useRef(null);
    const endRef = useRef(null);
    const taRef = useRef(null);

    const convosFetchingRef = useRef(false);
    const msgsFetchingRef = useRef(false);

    const [atBottom, setAtBottom] = useState(true);
    const [inputH, setInputH] = useState(44);

    const forceScrollToBottom = () => {
        const wrap = msgsWrapRef.current;
        const end = endRef.current;
        if (!wrap || !end) return;

        const to = wrap.scrollHeight - wrap.clientHeight;
        wrap.scrollTop = to;
        end.scrollIntoView({ block: "end", inline: "nearest" });

        // 下一帧再对齐一次，防止图片/字体回流
        requestAnimationFrame(() => {
            wrap.scrollTop = wrap.scrollHeight - wrap.clientHeight;
            end.scrollIntoView({ block: "end", inline: "nearest" });
            setAtBottom(true); // 手动标记在底部
        });

        // 极端兜底
        setTimeout(() => {
            wrap.scrollTop = wrap.scrollHeight - wrap.clientHeight;
            setAtBottom(true);
        }, 0);
    };
    /** 统计未读（轻量） */
    async function fetchUnreadMap() {
        if (!token) return setUnreadMap({});
        try {
            const r = await fetch(`${API}/api/convos/unread-map`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const m = await r.json().catch(() => ({}));
            setUnreadMap(m || {});
        } catch {
            setUnreadMap({});
        }
    }

    /** 会话列表 */
    async function loadConvos(curRole = role) {
        if (convosFetchingRef.current) return;
        convosFetchingRef.current = true;
        try {
            setLoadingConvos(true);
            const res = await fetch(`${API}/api/convos?role=${encodeURIComponent(curRole)}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Failed to fetch convos");
            const data = await res.json();
            const next = data.rows || [];

            setConvos((prev) => {
                if (shallowEqualConvos(prev, next)) return prev;
                const top = sidebarRef.current?.scrollTop ?? 0;
                requestAnimationFrame(() => {
                    if (sidebarRef.current) sidebarRef.current.scrollTop = top;
                });
                return next;
            });
        } finally {
            setLoadingConvos(false);
            convosFetchingRef.current = false;
        }
    }

    useEffect(() => {
        loadConvos();
        fetchUnreadMap();
    }, [role, token]);

    useEffect(() => {
        const t1 = setInterval(fetchUnreadMap, 10000);
        const t2 = setInterval(loadConvos, 15000);
        return () => { clearInterval(t1); clearInterval(t2); };
    }, [role, token]);

    /** 拉取消息 */
    async function loadMessages(id) {
        if (!id || msgsFetchingRef.current) return;
        msgsFetchingRef.current = true;
        try {
            setLoadingMsgs(true);
            const res = await fetch(`${API}/api/convos/${id}/messages`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Failed to fetch messages");
            const data = await res.json();
            const rows = data.rows || [];
            setMessages((prev) => (sameMsgArrays(prev, rows) ? prev : rows));

            // 标记已读 + 刷新未读
            try {
                await fetch(`${API}/api/convos/${id}/read`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                });
                fetchUnreadMap();
            } catch {}

            localStorage.setItem(READ_KEY(id), new Date().toISOString());
        } finally {
            setLoadingMsgs(false);
            msgsFetchingRef.current = false;
            if (atBottom) forceScrollToBottom();
            // 兜底：切会话后延时再贴一次
            setTimeout(() => { if (convoId === id) forceScrollToBottom(); }, 0);
        }
    }

    useEffect(() => {
        if (convoId) {
            setAtBottom(true);
            loadMessages(convoId);
        } else {
            setMessages([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [convoId]);

    async function sendMessage() {
        const t = text.trim();
        if (!t || !convoId) return;
        try {
            const res = await fetch(`${API}/api/convos/${convoId}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ text: t }),
            });
            if (!res.ok) throw new Error("Failed to send");
            const msg = await res.json();

            setMessages((prev) => [...prev, msg]);
            setText("");

            setConvos((prev) => {
                const list = [...prev];
                const idx = list.findIndex((c) => c._id === convoId);
                if (idx >= 0) {
                    const updated = {
                        ...list[idx],
                        lastMsgText: t.slice(0, 120),
                        lastMsgAt: new Date().toISOString(),
                        lastMsgSenderId: userId,
                    };
                    list.splice(idx, 1);
                    list.unshift(updated);
                }
                return list;
            });

            setUnreadMap((m) => ({ ...m, [convoId]: 0 }));
            localStorage.setItem(READ_KEY(convoId), new Date().toISOString());

            forceScrollToBottom();
        } catch (e) {
            console.error("[Chat] send message error:", e);
            alert("Failed to send message.");
        }
    }
    const onKeyDown = (e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage());

    const onScroll = () => {
            const wrap = msgsWrapRef.current;
            const end = endRef.current;
            if (!wrap || !end) return;

            const wrapRect = wrap.getBoundingClientRect();
            const endRect  = end.getBoundingClientRect();
            const isBottom = endRect.bottom <= wrapRect.bottom + 2;
            setAtBottom(isBottom);
        };

    useEffect(() => {
        const ta = taRef.current;
        if (!ta) return;
        const resize = () => {
            const h = Math.min(ta.scrollHeight, 44 * 6);
            if (h !== inputH) setInputH(h);
            if (atBottom) forceScrollToBottom();
        };
        const ro = new ResizeObserver(resize);
        ro.observe(ta);
        resize();
        return () => ro.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [atBottom]);

    useEffect(() => {
        if (atBottom) forceScrollToBottom();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages.length, atBottom]);

    const activeConvo = convos.find((c) => c._id === convoId);

    const dayKey = (d) => {
        const x = new Date(d);
        return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`;
    };

    const totalUnread = useMemo(
        () => Object.values(unreadMap).reduce((a, b) => a + (Number(b) || 0), 0),
        [unreadMap]
    );

    return (
        <div className="chat-page">
            <aside className="chat-sidebar">
                <div className="chat-sidebar-header">
                    <h3>
                        Messages{" "}
                        <span className={`chat-unread-total ${totalUnread ? "show" : ""}`}>{totalUnread}</span>
                    </h3>
                    <select value={role} onChange={(e)=>setRole(e.target.value)} className="chat-role-select">
                        <option value="all">All</option>
                        <option value="buyer">As Buyer</option>
                        <option value="seller">As Seller</option>
                    </select>
                </div>

                {loadingConvos ? (
                    <p style={{ padding: 12 }}>Loading...</p>
                ) : (
                    <div className="convo-list" ref={sidebarRef}>
                        {convos.map(c => {
                            const item = c.itemId || {};
                            const isActive = convoId === c._id;
                            const thumb = item?.image || "";
                            const ucount = unreadMap[c._id] || 0;
                            return (
                                <div key={c._id} className={`convo-item ${isActive ? "active" : ""}`} onClick={()=>nav(`/chat/${c._id}`)}>
                                    <div className="convo-item__row">
                                        <div className="convo-item__thumb">
                                            {thumb ? <img src={thumb} alt={item?.title || "item"} /> : <span>📦</span>}
                                        </div>
                                        <div>
                                            <div className="convo-item__title">{item?.title || "Untitled"}</div>
                                            <div className="convo-item__peer">
                                                {c.buyerId?._id === userId ? `with ${c.sellerId?.username || "seller"}` : `with ${c.buyerId?.username || "buyer"}`}
                                            </div>
                                            <div className="convo-item__last">{c.lastMsgText || "No messages"}</div>
                                        </div>
                                        <div className="convo-item__meta">
                                            <span>{formatDate(c.lastMsgAt || c.updatedAt)}</span>
                                            {!!ucount && <span className="convo-unread">{ucount}</span>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {!convos.length && <div style={{ color:"#6b7280", padding:"12px 4px" }}>No conversations yet.</div>}
                    </div>
                )}
            </aside>

            <section className="chat-main">
                {convoId && (
                    <div className="chat-sticky-header">
                        <div className="peer-left">
                            <div className="peer-avatar">
                                {(activeConvo?.buyerId?._id === userId ? (activeConvo?.sellerId?.username || "S") : (activeConvo?.buyerId?.username || "B"))?.slice(0,1).toUpperCase()}
                            </div>
                            <div className="peer-meta">
                                <div className="peer-name">{activeConvo?.itemId?.title || "Conversation"}</div>
                                <div className="peer-sub">
                                    {activeConvo?.buyerId?._id === userId
                                        ? <>with <span className="peer-chip">{activeConvo?.sellerId?.username || "seller"}</span></>
                                        : <>with <span className="peer-chip">{activeConvo?.buyerId?.username || "buyer"}</span></>}
                                </div>
                            </div>
                        </div>
                        {activeConvo?.itemId?._id && (
                            <Link to={`/items/${activeConvo.itemId._id}`} className="chat-view-item">View item →</Link>
                        )}
                    </div>
                )}

                {loadingMsgs ? (
                    <p style={{ padding: 16 }}>Loading...</p>
                ) : convoId ? (
                    <>
                        <div
                            className="chat-messages"
                            ref={msgsWrapRef}
                            onScroll={onScroll}
                        >
                            {(() => {
                                const out = [];
                                let lastDay = "";
                                messages.forEach((m, idx) => {
                                    const curDay = dayKey(m.createdAt || m.updatedAt || m._id);
                                    const isMine = String(m.senderId) === String(userId);
                                    if (idx === 0 || curDay !== lastDay) {
                                        out.push(<div key={`day-${curDay}-${idx}`} className="day-row"><span className="day-chip">{formatDate(curDay)}</span></div>);
                                        lastDay = curDay;
                                    }

                                    if (m.isSystem) {
                                        const attach = m.meta?.itemId ? (
                                            <Link to={`/items/${m.meta.itemId}`} className="msg-attach">
                                                {(() => {
                                                    const convoItem = activeConvo?.itemId || {};
                                                    const fallback =
                                                        convoItem.image ||
                                                        (Array.isArray(convoItem.images) && convoItem.images[0]) ||
                                                        PLACEHOLDER_IMG;
                                                    const thumb = m.meta?.image || fallback;
                                                    return <img src={thumb} alt={m.meta?.title || "item"} />;
                                                })()}
                                                <div>
                                                    <div className="msg-attach-title">
                                                        {m.meta?.title || activeConvo?.itemId?.title || "Item"}
                                                    </div>
                                                    {typeof m.meta?.price !== "undefined"
                                                        ? <div className="msg-attach-price">${m.meta.price}</div>
                                                        : (typeof activeConvo?.itemId?.price !== "undefined" && <div className="msg-attach-price">${activeConvo.itemId.price}</div>)
                                                    }
                                                </div>
                                            </Link>
                                        ) : null;

                                        out.push(
                                            <div key={m._id} className="msg-system-row">
                                                <div className="msg-system-card">
                                                    <div className="msg-system-title">{m.text}</div>
                                                    {attach}
                                                </div>
                                            </div>
                                        );
                                        return;
                                    }

                                    out.push(
                                        <div key={m._id} className={`msg-row ${isMine ? "mine" : "other"}`}>
                                            <div className="msg single">
                                                <div className="msg-bubble">{m.text}</div>
                                                <div className="msg-time">
                                                    {new Date(m.createdAt || m.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                });
                                return out;
                            })()}
                            <div ref={endRef} />
                        </div>

                        {!atBottom && messages.length > 0 && (
                            <button className="jump-latest" onClick={forceScrollToBottom}>Jump to latest</button>
                        )}

                        <div className="chat-input">
              <textarea
                  ref={taRef}
                  className="chat-textarea"
                  rows={1}
                  value={text}
                  placeholder="Write a message… (Enter to send, Shift+Enter for new line)"
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={onKeyDown}
                  style={{ height: inputH }}
              />
                            <button onClick={sendMessage} className="chat-send-btn">Send</button>
                        </div>
                    </>
                ) : (
                    <p style={{ padding: 16 }}>Select a conversation to start chatting</p>
                )}
            </section>
        </div>
    );
}