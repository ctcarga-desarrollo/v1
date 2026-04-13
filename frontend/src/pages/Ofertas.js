import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Plus, TrendingUp, Bell, Settings, Menu, User, Filter, Search, MapPin, Package, Calendar, Loader2 } from 'lucide-react';
import '@/pages/Ofertas.css';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Ofertas = () => {
  const navigate = useNavigate();
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
      if (response.ok) {
        const data = await response.json();
        setOfertas(data);
      }
    } catch (error) {
      console.error('Error fetching ofertas:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, estadoFilter]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchOfertas();
    }, 300);
    return () => clearTimeout(debounce);
  }, [fetchOfertas]);

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <img 
            src="https://customer-assets.emergentagent.com/job_2f7d0b2d-48f5-48d8-97ec-b1793c396cc6/artifacts/d1sq0sbe_CTCARGA%20SIN%20FONDO.png" 
            alt="CTCARGA" 
            className="sidebar-logo"
          />
          <div className="sidebar-brand">
            <h2>CTCARGA</h2>
            <p>Empresa de logistica</p>
          </div>
        </div>

        <nav className="sidebar-nav" data-testid="sidebar-nav">
          <button className="nav-item" onClick={() => navigate('/dashboard')} data-testid="dashboard-nav-btn">
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </button>
          
          <button className="nav-item active" data-testid="ofertas-nav-btn">
            <FileText size={18} />
            <span>Ofertas</span>
          </button>
          
          <button className="nav-item" data-testid="creacion-ofertas-nav-btn">
            <Plus size={18} />
            <span>Creacion ofertas</span>
          </button>
          
          <button className="nav-item" data-testid="seguimiento-nav-btn">
            <TrendingUp size={18} />
            <span>Seguimiento cargas</span>
          </button>
          
          <button className="nav-item" data-testid="alertas-nav-btn">
            <Bell size={18} />
            <span>Alertas</span>
            <span className="badge">3</span>
          </button>
          
          <button className="nav-item" data-testid="reportes-nav-btn">
            <TrendingUp size={18} />
            <span>Reportes</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="empresa-carga-btn" data-testid="empresa-carga-btn">
            Empresa de carga
          </button>
          
          <button className="nav-item" data-testid="config-nav-btn">
            <Settings size={18} />
            <span>Configuracion</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="dashboard-header">
          <button 
            className="menu-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            data-testid="menu-toggle-btn"
          >
            <Menu size={24} />
          </button>
          
          <div className="header-right">
            <span className="user-name" data-testid="user-name">Monica Arcila</span>
            <button className="user-avatar" data-testid="user-avatar-btn">
              <User size={20} />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="content-wrapper">
          <div className="ofertas-header">
            <div>
              <p className="breadcrumb">Ofertas</p>
              <h1 data-testid="page-title">Ofertas publicadas</h1>
              <p className="subtitle">Encuentra y gestiona ofertas de transporte disponibles</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="filters-section">
            <div className="filters-header">
              <Filter size={18} />
              <span>Filtros</span>
            </div>
            <div className="filters-content">
              <div className="search-box">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Buscar ofertas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="search-input"
                />
              </div>
              <select
                className="filter-select"
                value={estadoFilter}
                onChange={(e) => setEstadoFilter(e.target.value)}
                data-testid="estado-filter"
              >
                <option value="">Todos los estados</option>
                <option value="Activa">Activa</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Completada">Completada</option>
              </select>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="loading-state" data-testid="loading-indicator">
              <Loader2 size={32} className="spinner" />
              <p>Cargando ofertas...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && ofertas.length === 0 && (
            <div className="empty-state" data-testid="empty-state">
              <FileText size={48} />
              <h3>No se encontraron ofertas</h3>
              <p>Intenta cambiar los filtros o crea una nueva oferta</p>
            </div>
          )}

          {/* Lista de Ofertas */}
          {!loading && ofertas.length > 0 && (
            <div className="ofertas-list" data-testid="ofertas-list">
              {ofertas.map((oferta) => (
                <div key={oferta.id} className="oferta-card" data-testid={`oferta-card-${oferta.id}`}>
                  <div className="oferta-card-header">
                    <div>
                      <h3>{oferta.nombre}</h3>
                      <p className="categoria">{oferta.categoria}</p>
                    </div>
                    <div className="badges">
                      <span className={`badge-status ${oferta.estado.toLowerCase()}`}>{oferta.estado}</span>
                      <span className={`badge-urgency ${oferta.urgencia.toLowerCase()}`}>{oferta.urgencia}</span>
                    </div>
                  </div>

                  <div className="oferta-details">
                    <div className="detail-section">
                      <div className="detail-icon">
                        <MapPin size={16} />
                      </div>
                      <div className="detail-content">
                        <h4>Ruta</h4>
                        <p className="origin"><span className="dot green"></span> Origen: {oferta.ruta.origen}</p>
                        <p className="destination"><span className="dot red"></span> Destino: {oferta.ruta.destino}</p>
                      </div>
                    </div>

                    <div className="detail-section">
                      <div className="detail-icon">
                        <Package size={16} />
                      </div>
                      <div className="detail-content">
                        <h4>Carga</h4>
                        <p>Tipo: {oferta.carga.tipo}</p>
                        <p>Peso: {oferta.carga.peso}</p>
                        <p>Volumen: {oferta.carga.volumen}</p>
                        <p>Vehiculo: <span className="vehicle-type">{oferta.carga.vehiculo}</span></p>
                      </div>
                    </div>

                    <div className="detail-section">
                      <div className="detail-icon">
                        <Calendar size={16} />
                      </div>
                      <div className="detail-content">
                        <h4>Programacion</h4>
                        <p>Recogida: {oferta.programacion.recogida}</p>
                        <p>Entrega: {oferta.programacion.entrega}</p>
                        <p className="precio">Precio: <strong>{oferta.programacion.precio}</strong></p>
                      </div>
                    </div>
                  </div>

                  <div className="requisitos-section">
                    <h4>Requisitos:</h4>
                    <div className="tags">
                      {oferta.requisitos.map((req, index) => (
                        <span key={index} className="tag">{req}</span>
                      ))}
                    </div>
                  </div>

                  <div className="oferta-actions">
                    <button className="btn-primary" data-testid={`ver-btn-${oferta.id}`}>Ver</button>
                    <button className="btn-secondary" data-testid={`rechazar-btn-${oferta.id}`}>Rechazar</button>
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
