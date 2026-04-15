import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Plus, TrendingUp, Bell, Settings, Menu, User, Filter, Search, MapPin, Package, Calendar, Loader2, Truck, DollarSign, Trash2 } from 'lucide-react';
import { useAuth } from '@/AuthContext';
import '@/pages/Ofertas.css';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Ofertas = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ofertas, setOfertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');

  const fetchOfertas = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (estadoFilter && estadoFilter !== 'Todos los estados') params.append('estado', estadoFilter);
      const response = await fetch(`${API}/ofertas?${params.toString()}`);
      if (response.ok) setOfertas(await response.json());
    } catch (error) {
      console.error('Error fetching ofertas:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, estadoFilter]);

  useEffect(() => {
    const debounce = setTimeout(() => { fetchOfertas(); }, 300);
    return () => clearTimeout(debounce);
  }, [fetchOfertas]);

  const handleDelete = async (ofertaId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta oferta? Se borrarán todos los datos asociados.')) return;
    try {
      const res = await fetch(`${API}/ofertas/${ofertaId}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) fetchOfertas();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="dashboard-container">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <img src="https://customer-assets.emergentagent.com/job_2f7d0b2d-48f5-48d8-97ec-b1793c396cc6/artifacts/d1sq0sbe_CTCARGA%20SIN%20FONDO.png" alt="CTCARGA" className="sidebar-logo" />
          <div className="sidebar-brand"><h2>CTCARGA</h2><p>Empresa de logistica</p></div>
        </div>
        <nav className="sidebar-nav" data-testid="sidebar-nav">
          <button className="nav-item" onClick={() => navigate('/dashboard')} data-testid="dashboard-nav-btn"><LayoutDashboard size={18} /><span>Dashboard</span></button>
          <button className="nav-item active" data-testid="ofertas-nav-btn"><FileText size={18} /><span>Ofertas</span></button>
          <button className="nav-item" onClick={() => navigate('/creacion-ofertas')} data-testid="creacion-ofertas-nav-btn"><Plus size={18} /><span>Creacion ofertas</span></button>
          <button className="nav-item" onClick={() => navigate('/flota')} data-testid="flota-nav-btn"><Truck size={18} /><span>Flota</span></button>
          <button className="nav-item" data-testid="seguimiento-nav-btn"><TrendingUp size={18} /><span>Seguimiento cargas</span></button>
          <button className="nav-item" data-testid="alertas-nav-btn"><Bell size={18} /><span>Alertas</span><span className="badge">3</span></button>
          <button className="nav-item" data-testid="reportes-nav-btn"><TrendingUp size={18} /><span>Reportes</span></button>
        </nav>
        <div className="sidebar-footer">
          <button className="empresa-carga-btn" data-testid="empresa-carga-btn">Empresa de carga</button>
          <button className="nav-item" data-testid="config-nav-btn"><Settings size={18} /><span>Configuracion</span></button>
        </div>
      </aside>

      <main className="main-content">
        <header className="dashboard-header">
          <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} data-testid="menu-toggle-btn"><Menu size={24} /></button>
          <div className="header-right">
            <span className="user-name" data-testid="user-name">{user?.name || 'Usuario'}</span>
            <button className="user-avatar" data-testid="user-avatar-btn"><User size={20} /></button>
          </div>
        </header>

        <div className="content-wrapper">
          <div className="ofertas-header">
            <div>
              <p className="breadcrumb">Ofertas</p>
              <h1 data-testid="page-title">Ofertas publicadas</h1>
              <p className="subtitle">Encuentra y gestiona ofertas de transporte disponibles</p>
            </div>
          </div>

          <div className="filters-section">
            <div className="filters-header"><Filter size={18} /><span>Filtros</span></div>
            <div className="filters-content">
              <div className="search-box">
                <Search size={16} />
                <input type="text" placeholder="Buscar ofertas..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} data-testid="search-input" />
              </div>
              <select className="filter-select" value={estadoFilter} onChange={(e) => setEstadoFilter(e.target.value)} data-testid="estado-filter">
                <option value="">Todos los estados</option>
                <option value="Sin Asignar">Sin Asignar</option>
                <option value="Activa">Activa</option>
                <option value="Completada">Completada</option>
              </select>
            </div>
          </div>

          {loading && (
            <div className="loading-state" data-testid="loading-indicator">
              <Loader2 size={32} className="spinner" />
              <p>Cargando ofertas...</p>
            </div>
          )}

          {!loading && ofertas.length === 0 && (
            <div className="empty-state" data-testid="empty-state">
              <FileText size={48} />
              <h3>No se encontraron ofertas</h3>
              <p>Crea una nueva oferta desde el menú "Creación ofertas"</p>
            </div>
          )}

          {!loading && ofertas.length > 0 && (
            <div className="ofertas-list" data-testid="ofertas-list">
              {ofertas.map((oferta) => (
                <div key={oferta.id} className="oferta-card" data-testid={`oferta-card-${oferta.id}`}>
                  <div className="oferta-card-header">
                    <div>
                      <h3>{oferta.remitente || 'Sin remitente'}</h3>
                      <p className="codigo-oferta">{oferta.codigo_oferta}</p>
                    </div>
                    <div className="badges">
                      <span className="badge-status sin-asignar">{oferta.estado}</span>
                    </div>
                  </div>

                  {/* Sección Ubicación */}
                  <div className="oferta-section">
                    <h4 className="oferta-section-title"><MapPin size={16} /> Ubicación</h4>
                    <div className="oferta-section-grid">
                      <div className="info-item">
                        <span className="info-label">Dirección de cargue</span>
                        <span className="info-value">{oferta.cargue?.direccionConstruida || '-'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Fecha y hora de cargue</span>
                        <span className="info-value">
                          {oferta.info_cargue?.fechaInicio || '-'} {oferta.info_cargue?.horaInicio || ''}
                        </span>
                      </div>
                      {oferta.descargues?.map((desc, i) => (
                        <div className="info-item" key={i}>
                          <span className="info-label">Dirección de descargue {oferta.descargues.length > 1 ? `(${i+1})` : ''}</span>
                          <span className="info-value">{desc.direccionConstruida || '-'}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sección Vehículos */}
                  {oferta.vehiculo && oferta.vehiculo.configuracion && (
                    <div className="oferta-section">
                      <h4 className="oferta-section-title"><Truck size={16} /> Vehículos</h4>
                      <div className="oferta-section-grid cols-4">
                        <div className="info-item"><span className="info-label">Configuración</span><span className="info-value">{oferta.vehiculo.configuracion}</span></div>
                        <div className="info-item"><span className="info-label">Tipo vehículo</span><span className="info-value">{oferta.vehiculo.tipo_vehiculo}</span></div>
                        <div className="info-item"><span className="info-label">Carrocería</span><span className="info-value">{oferta.vehiculo.carroceria}</span></div>
                        <div className="info-item"><span className="info-label">Tipo carga</span><span className="info-value">{oferta.vehiculo.tipo_carga}</span></div>
                        <div className="info-item"><span className="info-label">Ejes</span><span className="info-value">{oferta.vehiculo.ejes}</span></div>
                        <div className="info-item"><span className="info-label">PBV (ton)</span><span className="info-value">{oferta.vehiculo.peso_bruto_vehicular}</span></div>
                        <div className="info-item"><span className="info-label">Carga útil (ton)</span><span className="info-value">{oferta.vehiculo.carga_util}</span></div>
                      </div>
                    </div>
                  )}

                  {/* Sección Carga */}
                  {oferta.condiciones && (
                    <div className="oferta-section">
                      <h4 className="oferta-section-title"><Package size={16} /> Carga</h4>
                      <div className="oferta-section-grid cols-4">
                        <div className="info-item"><span className="info-label">Cantidad</span><span className="info-value">{oferta.condiciones.cantidadMovilizar} {oferta.condiciones.unidadMedida}</span></div>
                        <div className="info-item"><span className="info-label">Naturaleza</span><span className="info-value">{oferta.condiciones.naturalezaCarga}</span></div>
                        <div className="info-item"><span className="info-label">Empaque</span><span className="info-value">{oferta.condiciones.empaqueProducto}</span></div>
                        {oferta.condiciones.unidadMedida && <div className="info-item"><span className="info-label">Unidad medida</span><span className="info-value">{oferta.condiciones.unidadMedida}</span></div>}
                      </div>
                    </div>
                  )}

                  {/* Sección Flete */}
                  {oferta.fletes && (
                    <div className="oferta-section">
                      <h4 className="oferta-section-title"><DollarSign size={16} /> Flete</h4>
                      <div className="oferta-section-grid cols-3">
                        <div className="info-item"><span className="info-label">Valor total</span><span className="info-value precio-value">${Number(oferta.fletes.valorTotal || 0).toLocaleString('es-CO')}</span></div>
                        <div className="info-item"><span className="info-label">Valor anticipo</span><span className="info-value">${Number(oferta.fletes.valorAnticipo || 0).toLocaleString('es-CO')}</span></div>
                        <div className="info-item"><span className="info-label">Fecha de pago</span><span className="info-value">{oferta.fletes.fechaPago || '-'}</span></div>
                      </div>
                    </div>
                  )}

                  <div className="oferta-actions">
                    <button className="btn-primary" data-testid={`ver-btn-${oferta.id}`}>Ver</button>
                    <button className="btn-danger" onClick={() => handleDelete(oferta.id)} data-testid={`eliminar-btn-${oferta.id}`}><Trash2 size={14} /> Eliminar oferta</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Ofertas;
