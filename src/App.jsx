import React, { useState, useEffect } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { anyApi } from "convex/server";
import { optimizeMenuImage } from "./imageOptimizer";
const api = anyApi;
const price = (n) =>
  n === undefined
    ? "Not set"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(n / 100);
const label = {
  preparing: "Preparing",
  ready: "Ready",
  collected: "Collected",
  cancelled: "Cancelled",
};
function Dialog({ title, onClose, children }) {
  const ref = React.useRef();
  useEffect(() => {
    const el = ref.current;
    el.showModal();
    const close = () => onClose();
    el.addEventListener("cancel", close);
    return () => el.removeEventListener("cancel", close);
  }, []);
  return (
    <dialog ref={ref}>
      <header className="dialog-header">
        <h2>{title}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Close"
          onClick={onClose}
        >
          ×
        </button>
      </header>
      {children}
    </dialog>
  );
}
export default function App() {
  const [token, setToken] = useState(
    () => sessionStorage.getItem("jamroc_staff_session") || "",
  );
  const [view, setView] = useState("orders");
  const [message, setMessage] = useState("");
  const me = useQuery(api.auth.me, token ? { token } : "skip");
  const logout = useMutation(api.auth.logout);
  useEffect(() => {
    if (token && me === null) {
      sessionStorage.removeItem("jamroc_staff_session");
      setToken("");
    }
  }, [me, token]);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 7000);
    return () => clearTimeout(t);
  }, [message]);
  if (!token)
    return (
      <Login
        onLogin={(r) => {
          sessionStorage.setItem("jamroc_staff_session", r.token);
          setToken(r.token);
          setView(r.role === "admin" ? "overview" : "orders");
        }}
      />
    );
  if (!me)
    return (
      <main className="setup-screen">
        <p>Verifying your session…</p>
      </main>
    );
  const admin = me.role === "admin";
  const current = admin ? view : "orders";
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          href={import.meta.env.VITE_PUBLIC_SITE_URL || "#"}
          className="sidebar-brand"
        >
          <img src="assets/logo.webp" alt="Jam Roc" />
          <span>
            JAM ROC<small>STAFF PORTAL</small>
          </span>
        </a>
        <p className="nav-label">WORKSPACE</p>
        <nav>
          {(admin
            ? [
                ["overview", "Overview"],
                ["orders", "Orders"],
                ["food", "Food items"],
                ["drink", "Drinks"],
                ["settings", "Settings"],
                ["team", "Employees"],
              ]
            : [["orders", "Orders"]]
          ).map(([key, name]) => (
            <button
              key={key}
              className={current === key ? "active" : ""}
              onClick={() => setView(key)}
            >
              {name}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div>
            <strong>{me.username}</strong>
            <small>{admin ? "Administrator" : "Employee"}</small>
          </div>
          <button
            aria-label="Sign out"
            title="Sign out"
            onClick={async () => {
              try {
                await logout({ token });
              } finally {
                sessionStorage.removeItem("jamroc_staff_session");
                setToken("");
              }
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="workspace-header">
          <span>
            Jam Roc <span className="header-divider">/</span>{" "}
            {
              {
                overview: "Overview",
                orders: "Orders",
                food: "Food items",
                drink: "Drinks",
                settings: "Settings",
                team: "Employees",
              }[current]
            }
          </span>
          <span className="role-label">
            {admin ? "Admin access" : "Orders only"}
          </span>
        </header>
        <main>
          {current === "overview" ? (
            <Overview token={token} onOrders={() => setView("orders")} />
          ) : current === "orders" ? (
            <Orders token={token} admin={admin} notify={setMessage} />
          ) : current === "food" || current === "drink" ? (
            <Menu
              key={current}
              token={token}
              kind={current}
              notify={setMessage}
            />
          ) : current === "settings" ? (
            <Settings token={token} notify={setMessage} />
          ) : (
            <Team token={token} notify={setMessage} />
          )}
        </main>
      </div>
      {message && (
        <div role="status" className="toast-message">
          {message}
          <button aria-label="Dismiss" onClick={() => setMessage("")}>
            ×
          </button>
        </div>
      )}
    </div>
  );
}
function Login({ onLogin }) {
  const login = useAction(api.accounts.login);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <main className="login-layout">
      <section className="login-art">
        <img src="assets/logo.webp" alt="Jam Roc Restaurant & Lounge" />
        <h1>
          Jam Roc
          <br />
          Staff portal
        </h1>
        <p>Restaurant & Lounge · Staff portal</p>
      </section>
      <section className="login-form">
        <h2>Sign in</h2>
        <p>Sign in to your Jam Roc workspace.</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const f = new FormData(e.currentTarget);
            try {
              const r = await login({
                username: f.get("username"),
                password: f.get("password"),
              });
              if (r.error) setError(r.error);
              else onLogin(r);
            } catch {
              setError(
                "Unable to sign in. Check your connection or contact the administrator.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Username
            <input
              name="username"
              autoComplete="username"
              required
              maxLength={40}
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
            />
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button disabled={busy} className="primary">
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="muted">Access is limited to your assigned role.</p>
      </section>
    </main>
  );
}
function Title({ title, description, children }) {
  return (
    <div className="page-title">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children}
    </div>
  );
}
function Overview({ token, onOrders }) {
  const orders = useQuery(api.orders.staffList, { token }),
    menu = useQuery(api.menu.adminMenu, { token });
  if (!orders || !menu) return <Loading />;
  return (
    <>
      <Title
        title="Welcome to Jam Roc."
        description="Keep the kitchen moving and your menu up to date."
      />
      <div className="stats">
        {[
          ["Preparing", orders.filter((o) => o.status === "preparing").length],
          [
            "Ready for pickup",
            orders.filter((o) => o.status === "ready").length,
          ],
          ["Food items", menu.items.filter((i) => i.kind === "food").length],
          ["Drinks", menu.items.filter((i) => i.kind === "drink").length],
        ].map(([k, n]) => (
          <div className="stat" key={k}>
            <span>{k}</span>
            <strong>{n}</strong>
          </div>
        ))}
      </div>
      <section className="panel">
        <h2>Today’s pickup queue</h2>
        <p>
          Employees mark orders ready here. Customers see their first name and
          pickup progress on the live board.
        </p>
        <button className="primary" onClick={onOrders}>
          Open orders
        </button>
      </section>
      <section className="panel">
        <h2>Before online ordering opens</h2>
        <p>
          Review and publish your food items, add prices and drinks, then
          connect Toast. The public website routes checkout to Toast.
        </p>
        <p className="muted">
          The site currently previews the menu, including drafts. Publish
          approved items before preview mode is turned off. Unpriced items show
          “Price coming soon.”
        </p>
      </section>
    </>
  );
}
function Loading() {
  return (
    <div className="loading" role="status">
      Loading your workspace…
    </div>
  );
}
function Orders({ token, admin, notify }) {
  const orders = useQuery(api.orders.staffList, { token });
  const [filter, setFilter] = useState("active"),
    [pending, setPending] = useState(new Set()),
    [selected, setSelected] = useState(null);
  const change = useMutation(api.orders.changeStatus).withOptimisticUpdate(
    (store, args) => {
      const value = store.getQuery(api.orders.staffList, { token });
      if (value)
        store.setQuery(
          api.orders.staffList,
          { token },
          value.map((o) =>
            o._id === args.id ? { ...o, status: args.status } : o,
          ),
        );
    },
  );
  async function update(id, status) {
    setPending((s) => new Set(s).add(id));
    try {
      await change({ token, id, status });
      notify("Order marked " + label[status].toLowerCase() + ".");
    } catch (e) {
      notify("Could not update order: " + e.message);
    } finally {
      setPending((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  }
  return (
    <>
      <Title
        title="Orders"
        description="Mark orders ready, then collected. Updates appear on the customer board."
      />
      <div className="tabs">
        {["active", "preparing", "ready", "history"].map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={filter === k ? "active" : ""}
          >
            {k[0].toUpperCase() + k.slice(1)}
          </button>
        ))}
      </div>
      {!orders ? (
        <Loading />
      ) : (
        <div className="orders-grid">
          {orders
            .filter((o) =>
              filter === "active"
                ? ["preparing", "ready"].includes(o.status)
                : filter === "history"
                  ? ["collected", "cancelled"].includes(o.status)
                  : o.status === filter,
            )
            .map((o) => (
              <article className="order-card" key={o._id}>
                <div className="order-head">
                  <span className={"badge " + o.status}>{label[o.status]}</span>
                  <time>
                    {new Date(o.createdAt).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
                <h2>#{o.orderNumber}</h2>
                <OrderName token={token} id={o._id} />
                <ul>
                  {o.items.map((i, j) => (
                    <li key={j}>
                      <strong>{i.quantity}×</strong> {i.name}
                    </li>
                  ))}
                </ul>
                <div className="order-actions">
                  <button onClick={() => setSelected(o)} className="secondary">
                    Details
                  </button>
                  {o.status === "preparing" && (
                    <button
                      disabled={pending.has(o._id)}
                      className="primary"
                      onClick={() => update(o._id, "ready")}
                    >
                      Mark ready
                    </button>
                  )}
                  {o.status === "ready" && (
                    <>
                      <button
                        disabled={pending.has(o._id)}
                        className="primary"
                        onClick={() => update(o._id, "collected")}
                      >
                        Collected
                      </button>
                      <button
                        disabled={pending.has(o._id)}
                        className="text-button"
                        onClick={() => update(o._id, "preparing")}
                      >
                        Back to preparing
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          {!orders.some((o) =>
            filter === "active"
              ? ["preparing", "ready"].includes(o.status)
              : filter === "history"
                ? ["collected", "cancelled"].includes(o.status)
                : o.status === filter,
          ) && (
            <div className="empty panel">
              <h2>All clear.</h2>
              <p>
                No orders in this view. Confirmed Toast orders will appear here
                automatically once connected.
              </p>
            </div>
          )}
        </div>
      )}
      {selected && (
        <OrderDetail
          token={token}
          order={selected}
          admin={admin}
          onClose={() => setSelected(null)}
          onCancel={() => {
            if (
              confirm(
                "Cancel this pickup-board entry? This does not cancel or refund the order in Toast.",
              )
            ) {
              update(selected._id, "cancelled");
              setSelected(null);
            }
          }}
        />
      )}
    </>
  );
}
function OrderName({ token, id }) {
  const detail = useAction(api.customerData.detail);
  const [name, setName] = useState("");
  useEffect(() => {
    let active = true;
    detail({ token, id })
      .then((r) => {
        if (active) setName(r.firstName);
      })
      .catch(() => {
        if (active) setName("Name unavailable");
      });
    return () => {
      active = false;
    };
  }, [token, id]);
  return <p className="order-name">{name || "Loading customer…"}</p>;
}
function OrderDetail({ token, order, admin, onClose, onCancel }) {
  const detail = useAction(api.customerData.detail);
  const [data, setData] = useState(null);
  useEffect(() => {
    detail({ token, id: order._id })
      .then(setData)
      .catch(() =>
        setData({
          firstName: "Unavailable",
          notes: "Could not load private details.",
        }),
      );
  }, []);
  return (
    <Dialog title={"Order #" + order.orderNumber} onClose={onClose}>
      <p>
        <strong>{data?.firstName || "Loading…"}</strong>
      </p>
      {order.items.map((i, k) => (
        <p key={k}>
          {i.quantity}× {i.name}
        </p>
      ))}
      <h3>Order notes</h3>
      <p className="preline">{data?.notes || "No notes."}</p>
      <p className="muted">
        Payment: {order.paymentState}. Payment changes and refunds are handled
        in Toast.
      </p>
      {admin && ["preparing", "ready"].includes(order.status) && (
        <button className="danger" onClick={onCancel}>
          Cancel pickup-board entry
        </button>
      )}
    </Dialog>
  );
}
function Menu({ token, kind, notify }) {
  const menu = useQuery(api.menu.adminMenu, { token });
  const [edit, setEdit] = useState(null),
    [search, setSearch] = useState(""),
    [category, setCategory] = useState(null);
  const save = useMutation(api.menu.save).withOptimisticUpdate(
    (store, args) => {
      if (!args.id) return;
      const data = store.getQuery(api.menu.adminMenu, { token });
      if (data)
        store.setQuery(
          api.menu.adminMenu,
          { token },
          {
            ...data,
            items: data.items.map((i) =>
              i._id === args.id ? { ...i, ...args } : i,
            ),
          },
        );
    },
  );
  const remove = useMutation(api.menu.remove);
  const removeCategory = useMutation(api.menu.removeCategory);
  const items =
    menu?.items
      .filter(
        (i) =>
          i.kind === kind &&
          i.name.toLowerCase().includes(search.toLowerCase()),
      )
      .sort((a, b) => a.sortOrder - b.sortOrder) || [];
  const cats =
    menu?.categories
      .filter((c) => c.kind === kind)
      .sort((a, b) => a.sortOrder - b.sortOrder) || [];
  return (
    <>
      <Title
        title={kind === "food" ? "Food items" : "Drinks"}
        description="Edit your menu, upload photos, and choose what customers see."
      >
        <button
          className="primary"
          onClick={() =>
            setEdit({
              kind,
              name: "",
              description: "",
              categorySlug: cats[0]?.slug || "",
              isAvailable: true,
              published: false,
              illustrative: false,
              options: [],
              sortOrder: items.length,
            })
          }
        >
          + Add {kind === "food" ? "food item" : "drink"}
        </button>
      </Title>
      <div className="toolbar">
        <input
          type="search"
          placeholder="Search items…"
          aria-label="Search items"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className="secondary"
          onClick={() =>
            setCategory({ name: "", kind, sortOrder: cats.length })
          }
        >
          + Add section
        </button>
      </div>
      {!menu ? (
        <Loading />
      ) : (
        cats.map((c) => (
          <section key={c._id} className="menu-category">
            <div className="category-heading">
              <h2>
                {c.name}
                <small>
                  {items.filter((i) => i.categorySlug === c.slug).length} items
                </small>
              </h2>
              <div>
                <button className="text-button" onClick={() => setCategory(c)}>
                  Edit section
                </button>
                <button
                  className="text-button"
                  onClick={async () => {
                    if (confirm("Remove this empty section?"))
                      try {
                        await removeCategory({ token, id: c._id });
                      } catch (e) {
                        notify(e.message);
                      }
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
            <div className="item-list">
              {items
                .filter((i) => i.categorySlug === c.slug)
                .map((i) => (
                  <article className="menu-item" key={i._id}>
                    <MenuImage url={i.imageUrl} alt={i.name} />
                    <div>
                      <h3>{i.name}</h3>
                      <p>{i.description}</p>
                      <div className="item-meta">
                        <span
                          className={
                            "badge " + (i.published ? "published" : "draft")
                          }
                        >
                          {i.published ? "Published" : "Draft"}
                        </span>
                        <span>{price(i.price)}</span>
                        {!i.isAvailable && <span>Unavailable</span>}
                      </div>
                    </div>
                    <button className="secondary" onClick={() => setEdit(i)}>
                      Edit
                    </button>
                  </article>
                ))}
              {!items.some((i) => i.categorySlug === c.slug) && (
                <p className="empty">No items in this section yet.</p>
              )}
            </div>
          </section>
        ))
      )}
      {edit && (
        <MenuEditor
          item={edit}
          categories={cats}
          token={token}
          onClose={() => setEdit(null)}
          onSave={async (fields) => {
            await save({
              token,
              ...(edit._id ? { id: edit._id } : {}),
              ...fields,
            });
            notify("Menu item saved.");
            setEdit(null);
          }}
          onDelete={
            edit._id
              ? async () => {
                  await remove({ token, id: edit._id });
                  setEdit(null);
                  notify("Menu item removed.");
                }
              : null
          }
        />
      )}{" "}
      {category && (
        <CategoryEditor
          token={token}
          category={category}
          onClose={() => setCategory(null)}
          notify={notify}
        />
      )}
    </>
  );
}
function MenuImage({ url, alt }) {
  const base = import.meta.env.VITE_PUBLIC_SITE_URL;
  const src = url?.startsWith("assets/")
    ? base
      ? new URL(url, base.endsWith("/") ? base : base + "/").href
      : ""
    : url;
  return src ? (
    <img className="menu-thumb" src={src} alt={alt} loading="lazy" />
  ) : (
    <div className="menu-thumb no-image">No photo</div>
  );
}
function MenuEditor({ item, categories, token, onClose, onSave, onDelete }) {
  const [draft, setDraft] = useState({
      ...item,
      price: item.price === undefined ? "" : (item.price / 100).toFixed(2),
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [optionText, setOptionText] = useState(
    item.options.map((o) => o.name).join("\n"),
  );
  const uploadUrl = useMutation(api.menu.uploadUrl),
    register = useMutation(api.menu.registerUpload);
  const set = (k, v) => setDraft((s) => ({ ...s, [k]: v }));
  return (
    <Dialog
      title={item._id ? "Edit " + item.name : "New menu item"}
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const fields = {
              name: draft.name.trim(),
              description: draft.description,
              kind: draft.kind,
              categorySlug: draft.categorySlug,
              isAvailable: draft.isAvailable,
              published: draft.published,
              illustrative: draft.illustrative,
              sortOrder: Number(draft.sortOrder),
              options: optionText
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean)
                .map((name) => {
                  const old = draft.options.find((o) => o.name === name);
                  return {
                    name,
                    ...(old?.imageUrl ? { imageUrl: old.imageUrl } : {}),
                  };
                }),
              ...(draft.price !== ""
                ? { price: Math.round(Number(draft.price) * 100) }
                : {}),
              ...(draft.imageStorageId
                ? { imageStorageId: draft.imageStorageId }
                : {}),
              ...(draft.imageUrl ? { imageUrl: draft.imageUrl } : {}),
            };
            await onSave(fields);
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Name
          <input
            required
            maxLength={100}
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </label>
        <label>
          Description
          <textarea
            maxLength={1200}
            rows={3}
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </label>
        <div className="form-row">
          <label>
            Section
            <select
              value={draft.categorySlug}
              onChange={(e) => set("categorySlug", e.target.value)}
              required
            >
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Price ($)
            <input
              type="number"
              min="0"
              max="1000"
              step="0.01"
              placeholder="Not set"
              value={draft.price}
              onChange={(e) => set("price", e.target.value)}
            />
          </label>
          <label>
            Display order
            <input
              type="number"
              required
              value={draft.sortOrder}
              onChange={(e) => set("sortOrder", e.target.value)}
            />
          </label>
        </div>
        <div className="image-editor">
          <MenuImage url={draft.imageUrl} alt={draft.name} />
          <label>
            Replace photo
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              onChange={async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                setBusy(true);
                setError("");
                try {
                  const optimized = await optimizeMenuImage(file);
                  const url = await uploadUrl({ token });
                  const response = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": optimized.type },
                    body: optimized,
                  });
                  if (!response.ok) throw new Error("Upload failed");
                  const { storageId } = await response.json();
                  const imageUrl = await register({ token, storageId });
                  setDraft((s) => ({
                    ...s,
                    imageStorageId: storageId,
                    imageUrl,
                    illustrative: false,
                  }));
                } catch (e) {
                  setError(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            />
            <small>Photos are compressed before upload.</small>
          </label>
        </div>
        <label>
          Preparation choices (one per line)
          <textarea
            value={optionText}
            onChange={(e) => setOptionText(e.target.value)}
          />
        </label>
        {[
          ["published", "Publish on website"],
          ["isAvailable", "Currently available"],
          ["illustrative", "Image is illustrative"],
        ].map(([k, l]) => (
          <label className="checkbox" key={k}>
            <input
              type="checkbox"
              checked={draft[k]}
              onChange={(e) => set(k, e.target.checked)}
            />
            {l}
          </label>
        ))}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="form-actions">
          {onDelete && (
            <button
              type="button"
              className="danger"
              disabled={busy}
              onClick={async () => {
                if (confirm("Delete this menu item?")) {
                  setBusy(true);
                  try {
                    await onDelete();
                  } catch (e) {
                    setError(e.message);
                    setBusy(false);
                  }
                }
              }}
            >
              Delete item
            </button>
          )}
          <button type="submit" className="primary" disabled={busy}>
            {busy ? "Saving…" : "Save item"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
function CategoryEditor({ token, category, onClose, notify }) {
  const save = useMutation(api.menu.saveCategory);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Dialog title="Menu section" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const f = new FormData(e.currentTarget);
          try {
            await save({
              token,
              ...(category._id ? { id: category._id } : {}),
              name: f.get("name"),
              kind: category.kind,
              sortOrder: Number(f.get("sortOrder")),
            });
            onClose();
            notify("Section saved.");
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Name
          <input
            name="name"
            required
            maxLength={80}
            defaultValue={category.name}
          />
        </label>
        <label>
          Display order
          <input
            name="sortOrder"
            type="number"
            required
            defaultValue={category.sortOrder}
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="primary" disabled={busy}>
          Save section
        </button>
      </form>
    </Dialog>
  );
}
function Settings({ token, notify }) {
  const data = useQuery(api.settings.adminSettings, { token });
  const save = useMutation(api.settings.save);
  const [busy, setBusy] = useState(false);
  if (!data) return <Loading />;
  const s = data.settings || {};
  return (
    <>
      <Title
        title="Make it yours."
        description="Keep your public contact details and ordering link current."
      />
      <section className="panel">
        <h2>Toast connection</h2>
        <span
          className={"badge " + (data.toastConnected ? "published" : "draft")}
        >
          {data.toastConnected ? "Enabled" : "Awaiting API configuration"}
        </span>
        <p>
          Checkout is hosted by Toast. Order updates feed the Jam Roc pickup
          board. Credentials are configured securely on the server.
        </p>
      </section>
      <form
        className="panel settings-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const f = new FormData(e.currentTarget);
          try {
            await save({
              token,
              phone: f.get("phone"),
              address: f.get("address"),
              hours: f.get("hours"),
              email: f.get("email"),
              instagram: f.get("instagram"),
              toastOrderingUrl: f.get("toastOrderingUrl"),
              orderingEnabled: f.has("orderingEnabled"),
            });
            notify("Settings saved.");
          } catch (e) {
            notify(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {[
          ["phone", "Phone"],
          ["address", "Address"],
          ["hours", "Opening hours"],
          ["email", "Email"],
          ["instagram", "Instagram URL"],
          ["toastOrderingUrl", "Toast ordering URL"],
        ].map(([key, l]) => (
          <label key={key}>
            {l}
            {["hours", "address"].includes(key) ? (
              <textarea
                name={key}
                defaultValue={s[key] || ""}
                maxLength={2000}
              />
            ) : (
              <input
                name={key}
                defaultValue={s[key] || ""}
                type={
                  key === "email"
                    ? "email"
                    : key.toLowerCase().includes("url") || key === "instagram"
                      ? "url"
                      : "text"
                }
                maxLength={2000}
              />
            )}
          </label>
        ))}
        <label className="checkbox">
          <input
            type="checkbox"
            name="orderingEnabled"
            defaultChecked={s.orderingEnabled}
            disabled={!data.toastConnected}
          />
          Enable online ordering
        </label>
        <button disabled={busy} className="primary">
          {busy ? "Saving…" : "Save settings"}
        </button>
      </form>
      <section className="panel">
        <h2>Recent order imports</h2>
        {data.recentWebhookEvents.length ? (
          data.recentWebhookEvents.map((e) => (
            <p key={e._id}>
              <span className="badge">{e.state}</span>{" "}
              {new Date(e.createdAt).toLocaleString()}{" "}
              {e.lastError && "— " + e.lastError}
            </p>
          ))
        ) : (
          <p className="muted">No Toast events received yet.</p>
        )}
      </section>
    </>
  );
}
function Team({ token, notify }) {
  const employees = useQuery(api.auth.listEmployees, { token });
  const save = useAction(api.accounts.saveEmployee),
    disable = useMutation(api.auth.deactivateEmployee);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Title
        title="Employee access"
        description="Employees can view orders and mark them ready or collected. Everything else stays with you."
      />
      <section className="panel">
        <h2>Create account or reset password</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const f = new FormData(form);
            setBusy(true);
            try {
              await save({
                token,
                username: f.get("username"),
                password: f.get("password"),
              });
              form.reset();
              notify("Employee access saved. Share the password privately.");
            } catch (e) {
              notify(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="form-row">
            <label>
              Username
              <input
                name="username"
                required
                minLength={3}
                maxLength={40}
                pattern="[a-zA-Z0-9_-]+"
                autoComplete="off"
              />
            </label>
            <label>
              New password
              <input
                name="password"
                type="password"
                required
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
              />
            </label>
          </div>
          <button disabled={busy} className="primary">
            {busy ? "Saving…" : "Save employee"}
          </button>
        </form>
        <p className="muted">
          Saving an existing employee resets their password, unlocks their
          account, and signs out their previous sessions.
        </p>
      </section>
      <section className="panel">
        <h2>Team members</h2>
        {employees === undefined ? (
          <Loading />
        ) : employees.length ? (
          employees.map((u) => (
            <div key={u._id} className="team-row">
              <strong>{u.username}</strong>
              <span className="badge">{u.active ? "Active" : "Disabled"}</span>
              {u.active && (
                <button
                  className="danger"
                  onClick={async () => {
                    if (confirm("Disable this employee’s access?"))
                      try {
                        await disable({ token, id: u._id });
                        notify("Employee access disabled.");
                      } catch (e) {
                        notify(e.message);
                      }
                  }}
                >
                  Disable
                </button>
              )}
            </div>
          ))
        ) : (
          <p>No employee accounts yet.</p>
        )}
      </section>
    </>
  );
}
