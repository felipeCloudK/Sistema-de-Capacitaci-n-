import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'production'
    ? '/api'
    : 'http://localhost:4000/api');
const api = axios.create({ baseURL: API_URL });

// Secciones ocultas por solicitud; los datos y endpoints del backend se conservan.
const HIDDEN_DASHBOARD_CHARTS = ['area', 'monthly'];
const HIDDEN_DASHBOARD_ALERTS = ['withoutTraining', 'recentRenewals'];

const emptyWorker = {
  rut: '',
  nombres: '',
  apellidos: '',
  email: '',
  telefono: '',
  cargo: '',
  area: '',
  fechaIngreso: '',
  estado: 'activo',
};

const emptyTraining = {
  trabajador: '',
  nombre: '',
  fechaRealizacion: '',
  vigenciaAnios: 1,
};

const formatDate = (value) => value
  ? new Date(value).toLocaleDateString('es-CL')
  : '—';

const formatRut = (value) => {
  const rut = String(value || '').replace(/[.-]/g, '').toUpperCase();
  return rut.length > 1 ? `${rut.slice(0, -1)}-${rut.slice(-1)}` : rut;
};

function Layout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const title = {
    '/': 'Dashboard Operativo',
    '/trabajadores': 'Trabajadores',
    '/capacitaciones': 'Capacitaciones',
    '/reportes': 'Reportes',
    '/configuracion': 'Configuración',
  }[location.pathname] || 'Dashboard Operativo';

  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <span className="brand-mark">GP</span>
          <div>
            <strong>Gestión de Personal</strong>
            <small>Capacitaciones</small>
          </div>
        </div>
        <nav>
          <NavLink to="/" end><span>▦</span>Dashboard Operativo</NavLink>
          <NavLink to="/trabajadores"><span>♙</span>Trabajadores</NavLink>
          <NavLink to="/capacitaciones"><span>✓</span>Capacitaciones</NavLink>
          <NavLink to="/reportes"><span>↗</span>Reportes</NavLink>
          <NavLink to="/configuracion"><span>⚙</span>Configuración</NavLink>
        </nav>
      </aside>
      {open && <button className="sidebar-overlay" aria-label="Cerrar menú" onClick={() => setOpen(false)} />}
      <main className="main">
        <header className="topbar">
          <button className="menu-button" onClick={() => setOpen(true)} aria-label="Abrir menú">☰</button>
          <div>
            <small>Operaciones</small>
            <h1>{title}</h1>
          </div>
          <div className="status-chip"><span /> Sistema operativo</div>
        </header>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/trabajadores" element={<Workers />} />
          <Route path="/capacitaciones" element={<Trainings />} />
          <Route path="/reportes" element={<Reports />} />
          <Route path="/configuracion" element={<Configuration />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    api.get('/dashboard')
      .then(({ data: result }) => setData(result))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const upcoming = useMemo(() => {
    if (!data) return [];
    return data.proximosVencimientos.filter((item) => {
      const matchesSearch = `${item.trabajador} ${formatRut(item.rut)} ${item.capacitacion}`
        .toLowerCase()
        .includes(search.toLowerCase());
      return matchesSearch && (!status || item.estado === status);
    });
  }, [data, search, status]);

  if (loading) return <div className="content"><div className="loading">Cargando indicadores...</div></div>;
  if (!data) return <div className="content"><div className="error-box">No fue posible cargar los datos operativos.</div></div>;

  const cards = [
    ['Total trabajadores', data.tarjetas.totalTrabajadores, 'neutral'],
    ['Trabajadores activos', data.tarjetas.trabajadoresActivos, 'blue'],
    ['Total capacitaciones', data.tarjetas.totalCapacitaciones, 'neutral'],
    ['Vigentes', data.tarjetas.vigentes, 'green'],
    ['Próximas a vencer', data.tarjetas.proximas, 'yellow'],
    ['Vencidas', data.tarjetas.vencidas, 'red'],
  ];

  const maxArea = Math.max(...data.porArea.map((item) => item.valor), 1);
  const maxMonth = Math.max(...data.evolucionMensual.map((item) => item.valor), 1);

  return (
    <div className="content">
      <section className="stat-grid">
        {cards.map(([label, value, tone]) => (
          <article className={`stat-card ${tone}`} key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>

      <section className="charts-grid">
        <article className="panel">
          <div className="panel-heading"><div><small>Estado</small><h2>Distribución de capacitaciones</h2></div></div>
          <div className="bars">
            {data.distribucionEstados
              .map((item) => (
              <div className="bar-row" key={item.estado}>
                <span>{item.estado}</span>
                <div className="bar-track"><div className={`bar ${item.estado === 'Vencido' ? 'bar-red' : item.estado === 'Próximo a vencer' ? 'bar-yellow' : 'bar-green'}`} style={{ width: `${Math.max(item.valor ? 12 : 0, (item.valor / Math.max(...data.distribucionEstados.map((x) => x.valor), 1)) * 100)}%` }} /></div>
                <strong>{item.valor}</strong>
              </div>
            ))}
          </div>
        </article>
        {!HIDDEN_DASHBOARD_CHARTS.includes('area') && <article className="panel">
          <div className="panel-heading"><div><small>Área</small><h2>Capacitaciones por departamento</h2></div></div>
          <div className="bars">
            {data.porArea.length ? data.porArea.map((item) => (
              <div className="bar-row" key={item.area}>
                <span>{item.area}</span>
                <div className="bar-track"><div className="bar bar-blue" style={{ width: `${(item.valor / maxArea) * 100}%` }} /></div>
                <strong>{item.valor}</strong>
              </div>
            )) : <div className="empty">Sin capacitaciones registradas.</div>}
          </div>
        </article>}
        {!HIDDEN_DASHBOARD_CHARTS.includes('monthly') && <article className="panel">
          <div className="panel-heading"><div><small>Tendencia</small><h2>Evolución mensual</h2></div></div>
          <div className="month-chart">
            {data.evolucionMensual.map((item) => (
              <div className="month-column" key={item.mes} title={`${item.mes}: ${item.valor}`}>
                <div style={{ height: `${Math.max(item.valor ? 8 : 2, (item.valor / maxMonth) * 110)}px` }} />
                <span>{item.mes.slice(5)}</span>
              </div>
            ))}
          </div>
        </article>}
      </section>

      <section className="alerts-grid">
        <AlertCard title="Certificados próximos a vencer" items={data.alertas.proximas} />
        <AlertCard title="Certificados vencidos" items={data.alertas.vencidas} />
        {!HIDDEN_DASHBOARD_ALERTS.includes('withoutTraining') && <AlertCard title="Sin capacitaciones" items={data.alertas.sinCapacitaciones} />}
        {!HIDDEN_DASHBOARD_ALERTS.includes('recentRenewals') && <AlertCard title="Renovaciones recientes" items={data.alertas.renovacionesRecientes} />}
      </section>

      <section className="panel table-panel">
        <div className="panel-heading">
          <div><small>Control</small><h2>Próximos vencimientos</h2></div>
        </div>
        <div className="toolbar">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar trabajador, RUT o capacitación" />
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Todos los estados</option>
            <option>Vigente</option>
            <option>Próximo a vencer</option>
            <option>Vencido</option>
          </select>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Trabajador</th><th>RUT</th><th>Capacitación</th><th>Fecha de vencimiento</th><th>Días restantes</th><th>Estado</th></tr></thead>
            <tbody>
              {upcoming.map((item) => (
                <tr key={item.id}>
                  <td>{item.trabajador}</td><td>{formatRut(item.rut)}</td><td>{item.capacitacion}</td>
                  <td>{formatDate(item.vencimiento)}</td><td>{item.diasRestantes}</td>
                  <td><StatusBadge status={item.estado} /></td>
                </tr>
              ))}
              {!upcoming.length && <tr><td colSpan="6" className="empty">No existen vencimientos que coincidan con el filtro.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function AlertCard({ title, items }) {
  return (
    <article className="panel alert-card">
      <div className="panel-heading"><div><h2>{title}</h2></div><span className="count">{items.length}</span></div>
      <div className="alert-list">
        {items.slice(0, 5).map((item, index) => (
          <div key={item.id || item.rut || index}>
            <strong>{item.trabajador || item.nombre || 'Registro'}</strong>
            <small>{item.capacitacion || item.area || item.rut || 'Sin detalle'}</small>
          </div>
        ))}
        {!items.length && <div className="empty">Sin registros.</div>}
      </div>
    </article>
  );
}

function StatusBadge({ status }) {
  const className = status === 'Vigente'
    ? 'badge-green'
    : status === 'Vencido'
      ? 'badge-red'
      : 'badge-yellow';
  return <span className={`status-badge ${className}`}>{status}</span>;
}

function Workers() {
  const [workers, setWorkers] = useState([]);
  const [search, setSearch] = useState('');
  const [estado, setEstado] = useState('');
  const [form, setForm] = useState(emptyWorker);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/workers', { params: { search, estado } })
    .then(({ data }) => setWorkers(data))
    .catch(() => setWorkers([]));

  useEffect(() => { load(); }, [estado]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      if (editing) {
        await api.put(`/workers/${editing}`, form);
      } else {
        await api.post('/workers', form);
      }
      setForm(emptyWorker);
      setEditing(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'No fue posible guardar el trabajador.');
    }
  };

  const edit = (worker) => {
    setEditing(worker._id);
    setForm({
      ...worker,
      rut: formatRut(worker.rut),
      fechaIngreso: worker.fechaIngreso?.slice(0, 10) || '',
    });
    setError('');
  };

  const remove = async (worker) => {
    if (!window.confirm(`¿Eliminar permanentemente al trabajador ${worker.nombres} ${worker.apellidos} y todas sus capacitaciones y certificados? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/workers/${worker._id}`);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'No fue posible eliminar el trabajador.');
    } finally {
      load();
    }
  };

  const toggleStatus = async (worker) => {
    await api.patch(`/workers/${worker._id}/status`, {
      estado: worker.estado === 'activo' ? 'inactivo' : 'activo',
    });
    load();
  };

  const openDetail = async (worker) => {
    const { data } = await api.get(`/workers/${worker._id}`);
    setDetail(data);
  };

  return (
    <div className="content split-layout">
      <section className="panel form-panel">
        <div className="panel-heading">
          <div><small>{editing ? 'Actualizar' : 'Nuevo registro'}</small><h2>{editing ? 'Editar trabajador' : 'Registrar trabajador'}</h2></div>
        </div>
        {error && <div className="error-box">{error}</div>}
        <form className="form-grid" onSubmit={submit}>
          <label>RUT<input required pattern="[0-9]{1,2}([.]?[0-9]{3}){0,2}-[0-9kK]" value={form.rut} onChange={(e) => setForm({ ...form, rut: e.target.value })} placeholder="12345678-9" title="Ingresa el RUT con guion antes del dígito verificador, por ejemplo 12345678-9." /></label>
          <label>Nombres<input required value={form.nombres} onChange={(e) => setForm({ ...form, nombres: e.target.value })} /></label>
          <label>Apellidos<input required value={form.apellidos} onChange={(e) => setForm({ ...form, apellidos: e.target.value })} /></label>
          <label>Correo electrónico<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label>Teléfono<input required value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></label>
          <label>Cargo<input required value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} /></label>
          <label>Área o departamento<input required value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} /></label>
          <label>Fecha de ingreso<input required type="date" value={form.fechaIngreso} onChange={(e) => setForm({ ...form, fechaIngreso: e.target.value })} /></label>
          <label>Estado<select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select></label>
          <div className="form-actions">
            {editing && <button type="button" className="secondary" onClick={() => { setEditing(null); setForm(emptyWorker); }}>Cancelar</button>}
            <button type="submit">{editing ? 'Guardar cambios' : 'Registrar trabajador'}</button>
          </div>
        </form>
      </section>

      <section className="panel table-panel">
        <div className="panel-heading"><div><small>Directorio</small><h2>Trabajadores</h2></div></div>
        <div className="toolbar">
          <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyUp={(e) => e.key === 'Enter' && load()} placeholder="Buscar por nombre o RUT" />
          <select value={estado} onChange={(e) => setEstado(e.target.value)}><option value="">Todos los estados</option><option value="activo">Activos</option><option value="inactivo">Inactivos</option></select>
          <button type="button" className="secondary" onClick={load}>Buscar</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>RUT</th><th>Trabajador</th><th>Cargo</th><th>Área</th><th>Ingreso</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {workers.map((worker) => (
                <tr key={worker._id}>
                  <td>{formatRut(worker.rut)}</td><td>{worker.nombres} {worker.apellidos}</td><td>{worker.cargo}</td><td>{worker.area}</td>
                  <td>{formatDate(worker.fechaIngreso)}</td>
                  <td><button className={`status-toggle ${worker.estado}`} onClick={() => toggleStatus(worker)}>{worker.estado}</button></td>
                  <td className="actions"><button onClick={() => openDetail(worker)}>Ver</button><button onClick={() => edit(worker)}>Editar</button><button className="danger" onClick={() => remove(worker)}>Eliminar</button></td>
                </tr>
              ))}
              {!workers.length && <tr><td colSpan="7" className="empty">No hay trabajadores registrados.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {detail && (
        <section className="panel detail-panel">
          <div className="panel-heading">
            <div><small>Información individual</small><h2>{detail.worker.nombres} {detail.worker.apellidos}</h2></div>
            <button type="button" className="secondary" onClick={() => setDetail(null)}>Cerrar</button>
          </div>
          <div className="detail-grid">
            <p><small>RUT</small><strong>{formatRut(detail.worker.rut)}</strong></p>
            <p><small>Correo</small><strong>{detail.worker.email}</strong></p>
            <p><small>Teléfono</small><strong>{detail.worker.telefono}</strong></p>
            <p><small>Cargo</small><strong>{detail.worker.cargo}</strong></p>
            <p><small>Área</small><strong>{detail.worker.area}</strong></p>
            <p><small>Estado</small><strong>{detail.worker.estado}</strong></p>
          </div>
          <h3>Historial de capacitaciones</h3>
          <div className="table-wrap">
            <table><thead><tr><th>Capacitación</th><th>Realización</th><th>Vencimiento</th><th>Estado</th></tr></thead>
              <tbody>{detail.trainings.map((item) => <tr key={item._id}><td>{item.nombre}</td><td>{formatDate(item.fechaRealizacion)}</td><td>{formatDate(item.fechaVencimiento)}</td><td><StatusBadge status={item.estadoCalculado || 'Vigente'} /></td></tr>)}</tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function Trainings() {
  const [workers, setWorkers] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [form, setForm] = useState(emptyTraining);
  const [file, setFile] = useState(null);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const [workerResponse, trainingResponse] = await Promise.all([
      api.get('/workers'),
      api.get('/trainings', { params: { search, status } }),
    ]);
    setWorkers(workerResponse.data);
    setTrainings(trainingResponse.data);
  };

  useEffect(() => { load().catch(() => {}); }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.append(key, value));
      if (file) formData.append('certificado', file);
      if (editing) {
        await api.put(`/trainings/${editing}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/trainings', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      setForm(emptyTraining);
      setFile(null);
      setEditing(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'No fue posible guardar la capacitación.');
    }
  };

  const edit = (training) => {
    setEditing(training._id);
    setForm({
      trabajador: training.trabajador?._id || '',
      nombre: training.nombre,
      fechaRealizacion: training.fechaRealizacion?.slice(0, 10) || '',
      vigenciaAnios: training.vigenciaAnios,
    });
    setFile(null);
  };

  const remove = async (training) => {
    if (!window.confirm(`¿Eliminar permanentemente la capacitación "${training.nombre}", su historial y sus certificados? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/trainings/${training._id}`);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'No fue posible eliminar la capacitación.');
    } finally {
      load().catch(() => setError('No fue posible actualizar la lista de capacitaciones.'));
    }
  };

  return (
    <div className="content split-layout">
      <section className="panel form-panel">
        <div className="panel-heading"><div><small>{editing ? 'Renovar' : 'Nueva capacitación'}</small><h2>{editing ? 'Reemplazar certificado' : 'Registrar capacitación'}</h2></div></div>
        {error && <div className="error-box">{error}</div>}
        <form className="form-grid" onSubmit={submit}>
          <label>Trabajador
            <select required value={form.trabajador} onChange={(e) => setForm({ ...form, trabajador: e.target.value })}>
              <option value="">Seleccione un trabajador</option>
              {workers.map((worker) => <option value={worker._id} key={worker._id}>{worker.nombres} {worker.apellidos} — {formatRut(worker.rut)}</option>)}
            </select>
          </label>
          <label>Nombre de la capacitación<input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></label>
          <label>Fecha de realización<input required type="date" value={form.fechaRealizacion} onChange={(e) => setForm({ ...form, fechaRealizacion: e.target.value })} /></label>
          <label>Duración de vigencia<select value={form.vigenciaAnios} onChange={(e) => setForm({ ...form, vigenciaAnios: Number(e.target.value) })}><option value={1}>1 año</option><option value={2}>2 años</option><option value={3}>3 años</option></select></label>
          <label>Certificado {editing ? '(reemplazo opcional)' : '(obligatorio)'}<input required={!editing} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(e) => setFile(e.target.files[0] || null)} /></label>
          <div className="form-actions">
            {editing && <button type="button" className="secondary" onClick={() => { setEditing(null); setForm(emptyTraining); setFile(null); }}>Cancelar</button>}
            <button type="submit">{editing ? 'Guardar renovación' : 'Registrar capacitación'}</button>
          </div>
        </form>
      </section>

      <section className="panel table-panel">
        <div className="panel-heading"><div><small>Control documental</small><h2>Capacitaciones</h2></div></div>
        <div className="toolbar">
          <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyUp={(e) => e.key === 'Enter' && load()} placeholder="Buscar trabajador, RUT o capacitación" />
          <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todos los estados</option><option>Vigente</option><option>Próximo a vencer</option><option>Vencido</option></select>
          <button type="button" className="secondary" onClick={load}>Buscar</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Trabajador</th><th>RUT</th><th>Capacitación</th><th>Realización</th><th>Vencimiento</th><th>Estado</th><th>Certificado</th><th>Acciones</th></tr></thead>
            <tbody>
              {trainings.map((training) => (
                <tr key={training._id}>
                  <td>{training.trabajador?.nombres} {training.trabajador?.apellidos}</td>
                  <td>{formatRut(training.trabajador?.rut)}</td><td>{training.nombre}</td>
                  <td>{formatDate(training.fechaRealizacion)}</td><td>{formatDate(training.fechaVencimiento)}</td>
                  <td><StatusBadge status={training.estadoCalculado} /></td>
                  <td>{training.certificado?.ruta ? <a href={`${API_URL}${training.certificado.ruta.replace('/api', '')}`} target="_blank" rel="noreferrer">Ver certificado</a> : 'Sin archivo'}</td>
                  <td className="actions"><button onClick={() => edit(training)}>Renovar</button><button className="danger" onClick={() => remove(training)}>Eliminar</button></td>
                </tr>
              ))}
              {!trainings.length && <tr><td colSpan="8" className="empty">No hay capacitaciones registradas.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Reports() {
  const [tipo, setTipo] = useState('capacitaciones');
  const [estado, setEstado] = useState('');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);

  const load = async () => {
    const statusFilter = tipo === 'vencidas'
      ? 'Vencido'
      : tipo === 'proximas'
        ? 'Próximo a vencer'
        : estado;
    const params = { tipo, search, ...(tipo === 'trabajadores' ? { estado } : { status: statusFilter }) };
    const { data } = await api.get('/reports', { params });
    setRows(data);
  };

  useEffect(() => { load().catch(() => setRows([])); }, [tipo, estado]); // eslint-disable-line react-hooks/exhaustive-deps

  const exportUrl = (format) => {
    const statusFilter = tipo === 'vencidas'
      ? 'Vencido'
      : tipo === 'proximas'
        ? 'Próximo a vencer'
        : estado;
    const params = new URLSearchParams({
      tipo,
      search,
      ...(tipo === 'trabajadores' ? { estado } : { status: statusFilter }),
    });
    return `${API_URL}/reports/export/${format}?${params.toString()}`;
  };

  return (
    <div className="content">
      <section className="panel table-panel">
        <div className="panel-heading"><div><small>Consultas</small><h2>Reportes operativos</h2></div></div>
        <div className="toolbar">
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="capacitaciones">Capacitaciones</option>
            <option value="trabajadores">Trabajadores activos</option>
            <option value="vencidas">Capacitaciones vencidas</option>
            <option value="proximas">Próximos vencimientos</option>
          </select>
          <select value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos</option>
            {tipo === 'trabajadores'
              ? <><option value="activo">Activos</option><option value="inactivo">Inactivos</option></>
              : <><option>Vigente</option><option>Próximo a vencer</option><option>Vencido</option></>}
          </select>
          <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyUp={(e) => e.key === 'Enter' && load()} placeholder="Buscar" />
          <button type="button" className="secondary" onClick={load}>Consultar</button>
          <a className="export-button" href={exportUrl('excel')} download>Exportar Excel</a>
          <a className="export-button" href={exportUrl('pdf')} download>Exportar PDF</a>
        </div>
        <div className="table-wrap">
          <table>
            {tipo === 'trabajadores' ? (
              <>
                <thead><tr><th>RUT</th><th>Nombre</th><th>Correo</th><th>Cargo</th><th>Área</th><th>Estado</th></tr></thead>
                <tbody>{rows.map((row) => <tr key={row._id}><td>{formatRut(row.rut)}</td><td>{row.nombres} {row.apellidos}</td><td>{row.email}</td><td>{row.cargo}</td><td>{row.area}</td><td>{row.estado}</td></tr>)}</tbody>
              </>
            ) : (
              <>
                <thead><tr><th>Trabajador</th><th>RUT</th><th>Área</th><th>Capacitación</th><th>Vencimiento</th><th>Días</th><th>Estado</th></tr></thead>
                <tbody>{rows.map((row, index) => <tr key={row._id || index}><td>{row.trabajador}</td><td>{formatRut(row.rut)}</td><td>{row.area}</td><td>{row.capacitacion}</td><td>{formatDate(row.vencimiento)}</td><td>{row.diasRestantes}</td><td><StatusBadge status={row.estado} /></td></tr>)}</tbody>
              </>
            )}
          </table>
          {!rows.length && <div className="empty">No hay resultados para los filtros seleccionados.</div>}
        </div>
      </section>
    </div>
  );
}

function Configuration() {
  return (
    <div className="content">
      <section className="panel config-panel">
        <div className="panel-heading"><div><small>Infraestructura</small><h2>Configuración del sistema</h2></div></div>
        <div className="config-grid">
          <article><small>Base de datos</small><strong>MongoDB</strong><p>La conexión se configura mediante la variable de entorno <code>MONGODB_URI</code>.</p></article>
          <article><small>Backend</small><strong>Express / API REST</strong><p>Servicio disponible en la ruta <code>/api</code>.</p></article>
          <article><small>Acceso</small><strong>Red interna</strong><p>El servicio no utiliza inicio de sesión. Debe desplegarse en una red privada y protegerse con firewall o VPN.</p></article>
          <article><small>Certificados</small><strong>PDF, JPG y PNG</strong><p>Los archivos se almacenan en <code>backend/uploads/certificados</code>.</p></article>
        </div>
      </section>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}
