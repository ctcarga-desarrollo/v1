import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Plus, TrendingUp, Bell, Settings, Menu, User, Search, MapPin, Package, Loader2, Truck, DollarSign, Trash2, Eye, ArrowLeft, XCircle, ChevronDown } from 'lucide-react';
import { useAuth } from '@/AuthContext';
import '@/pages/Ofertas.css';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ESTADOS = [
  "SIN ASIGNAR",
  "ASIGNADO",
  "EN PROCESO DE CARGUE",
  "EN RUTA",
  "EN PROCESO DE DESCARGUE",
  "PENDIENTE DOCUMENTACIÓN",
  "FINALIZADA",
];

const estadoClass = (estado) => {
  const map = {
    'SIN ASIGNAR': 'sin-asignar', 'Sin Asignar': 'sin-asignar',
    'ASIGNADO': 'asignado',
    'EN PROCESO DE CARGUE': 'en-proceso',
    'EN RUTA': 'en-ruta',
    'EN PROCESO DE DESCARGUE': 'en-proceso',
    'PENDIENTE DOCUMENTACIÓN': 'pendiente-doc',
    'FINALIZADA': 'finalizada',
  };
  return map[estado] || 'sin-asignar';
};

const Ofertas = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ofertas, setOfertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [selectedOferta, setSelectedOferta] = useState(null);
  
  // Modales de asignación de vehículos
  const [showModalConfirm, setShowModalConfirm] = useState(false);
  const [showModalPublicar, setShowModalPublicar] = useState(false);

  const fetchOfertas = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (estadoFilter && estadoFilter !== 'Todos los estados') params.append('estado', estadoFilter);
      const response = await fetch(`${API}/ofertas?${params.toString()}`, { credentials: 'include' });
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
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta oferta?')) return;
    try {
      const res = await fetch(`${API}/ofertas/${ofertaId}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        setSelectedOferta(null);
        fetchOfertas();
      }
    } catch (e) { console.error(e); }
  };

  const handleCancel = async (ofertaId) => {
    if (!window.confirm('¿Cancelar esta oferta? Esta acción cambiará el estado.')) return;
    // For now, delete. Future: change state to CANCELADA
    await handleDelete(ofertaId);
  };

  const canDeleteOrCancel = (estado) => {
    const upper = (estado || '').toUpperCase();
    return upper === 'SIN ASIGNAR' || upper === 'ASIGNADO';
  };

  const handleAsignarVehiculos = () => {
    setShowModalConfirm(true);
  };

  const handleConfirmYes = () => {
    setShowModalConfirm(false);
    setShowModalPublicar(true);
  };

  const handleConfirmNo = () => {
    setShowModalConfirm(false);
  };

  const handlePublicar = async () => {
    try {
      const res = await fetch(`${API}/ofertas/${selectedOferta.id}/publicar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        setShowModalPublicar(false);
        alert('Oferta publicada exitosamente. La asignación de vehículos ha iniciado.');
        // Actualizar lista de ofertas
        fetchOfertas();
        // Limpiar oferta seleccionada para que se recargue con nuevo estado
        setSelectedOferta(null);
      } else {
        const error = await res.json();
        alert(`Error al publicar oferta: ${error.detail || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error publicando oferta:', error);
      alert('Error al publicar oferta. Por favor intente nuevamente.');
    }
  };

  const handleCerrarPublicar = () => {
    setShowModalPublicar(false);
  };

  const formatCurrency = (value) => {
    if (!value) return '$0';
    return `$${Number(value).toLocaleString('es-CO')}`;
  };

  return (
    <div className="dashboard-container">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <img src="https://customer-assets.emergentagent.com/job_2f7d0b2d-48f5-48d8-97ec-b1793c396cc6/artifacts/d1sq0sbe_CTCARGA%20SIN%20FONDO.png" alt="CTCARGA" className="sidebar-logo" />
          <div className="sidebar-brand"><h2>CTCARGA</h2><p>Empresa de logística</p></div>
        </div>
        <nav className="sidebar-nav" data-testid="sidebar-nav">
          <button className="nav-item" onClick={() => navigate('/dashboard')} data-testid="dashboard-nav-btn"><LayoutDashboard size={18} /><span>Dashboard</span></button>
          <button className="nav-item active" data-testid="ofertas-nav-btn"><FileText size={18} /><span>Ofertas</span></button>
          <button className="nav-item" onClick={() => navigate('/creacion-ofertas')} data-testid="creacion-ofertas-nav-btn"><Plus size={18} /><span>Creación ofertas</span></button>
          <button className="nav-item" onClick={() => navigate('/flota')} data-testid="flota-nav-btn"><Truck size={18} /><span>Flota</span></button>
          <button className="nav-item" data-testid="seguimiento-nav-btn"><TrendingUp size={18} /><span>Seguimiento cargas</span></button>
          <button className="nav-item" data-testid="alertas-nav-btn"><Bell size={18} /><span>Alertas</span><span className="badge">3</span></button>
          <button className="nav-item" data-testid="reportes-nav-btn"><TrendingUp size={18} /><span>Reportes</span></button>
        </nav>
        <div className="sidebar-footer">
          <button className="empresa-carga-btn" data-testid="empresa-carga-btn">Empresa de carga</button>
          <button className="nav-item" data-testid="config-nav-btn"><Settings size={18} /><span>Configuración</span></button>
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

          {/* ========== LISTADO ========== */}
          {!selectedOferta && (
            <>
              <div className="ofertas-header">
                <div>
                  <p className="breadcrumb">Ofertas</p>
                  <h1 data-testid="page-title">Ofertas publicadas</h1>
                  <p className="subtitle">Gestiona las ofertas de transporte de tu empresa</p>
                </div>
                <button className="btn-new-offer" onClick={() => navigate('/creacion-ofertas')} data-testid="btn-nueva-oferta">
                  <Plus size={16} /> Nueva Oferta
                </button>
              </div>

              <div className="list-controls">
                <div className="list-search">
                  <Search size={16} />
                  <input type="text" placeholder="Buscar por ID, remitente o dirección..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} data-testid="search-input" />
                </div>
                <select className="filter-select" value={estadoFilter} onChange={(e) => setEstadoFilter(e.target.value)} data-testid="estado-filter">
                  <option value="">Todos los estados</option>
                  {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
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
                  <p>Crea una nueva oferta desde el botón "Nueva Oferta"</p>
                </div>
              )}

              {!loading && ofertas.length > 0 && (
                <div className="data-table-container" data-testid="ofertas-table">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>ID Oferta</th>
                        <th>Remitente</th>
                        <th>Fecha de Cargue</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ofertas.map((oferta) => (
                        <tr key={oferta.id} data-testid={`oferta-row-${oferta.id}`}>
                          <td>
                            <span className="codigo-badge">{oferta.codigo_oferta}</span>
                          </td>
                          <td className="td-remitente">{oferta.remitente || 'Sin remitente'}</td>
                          <td>
                            {oferta.info_cargue?.fechaInicio
                              ? `${oferta.info_cargue.fechaInicio} ${oferta.info_cargue.horaInicio || ''}`
                              : '-'}
                          </td>
                          <td>
                            <span className={`estado-badge ${estadoClass(oferta.estado)}`}>
                              {oferta.estado}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <button 
                                className="btn-icon-action btn-icon-asignar" 
                                onClick={() => {
                                  setSelectedOferta(oferta);
                                  handleAsignarVehiculos();
                                }} 
                                data-testid={`asignar-btn-${oferta.id}`}
                                title="Asignar vehículos"
                              >
                                <Truck size={16} />
                              </button>
                              <button 
                                className="btn-icon-action btn-icon-ver" 
                                onClick={() => setSelectedOferta(oferta)} 
                                data-testid={`ver-btn-${oferta.id}`}
                                title="Ver detalle"
                              >
                                <Eye size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ========== DETALLE ========== */}
          {selectedOferta && (
            <div className="oferta-detail" data-testid="oferta-detail">
              <div className="detail-header">
                <button className="btn-back-detail" onClick={() => setSelectedOferta(null)} data-testid="btn-volver-listado">
                  <ArrowLeft size={18} /> Volver al listado
                </button>
              </div>

              <div className="detail-top">
                <div>
                  <p className="breadcrumb">Ofertas / Detalle</p>
                  <h1 className="detail-title">{selectedOferta.remitente || 'Sin remitente'}</h1>
                  <span className="codigo-badge lg">{selectedOferta.codigo_oferta}</span>
                </div>
                <span className={`estado-badge lg ${estadoClass(selectedOferta.estado)}`}>
                  {selectedOferta.estado}
                </span>
              </div>

              {/* Ubicación */}
              <div className="oferta-section">
                <h4 className="oferta-section-title"><MapPin size={16} /> Ubicación</h4>
                <div className="oferta-section-grid">
                  <div className="info-item">
                    <span className="info-label">Dirección de cargue</span>
                    <span className="info-value">{selectedOferta.cargue?.direccionConstruida || '-'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Fecha y hora de cargue</span>
                    <span className="info-value">
                      {selectedOferta.info_cargue?.fechaInicio || '-'} {selectedOferta.info_cargue?.horaInicio || ''}
                    </span>
                  </div>
                  {selectedOferta.descargues?.map((desc, i) => (
                    <div className="info-item" key={i}>
                      <span className="info-label">Dirección de descargue {selectedOferta.descargues.length > 1 ? `(${i+1})` : ''}</span>
                      <span className="info-value">{desc.direccionConstruida || '-'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vehículos */}
              {selectedOferta.vehiculo && selectedOferta.vehiculo.configuracion && (
                <div className="oferta-section">
                  <h4 className="oferta-section-title"><Truck size={16} /> Vehículos</h4>
                  <div className="oferta-section-grid cols-4">
                    <div className="info-item"><span className="info-label">Configuración</span><span className="info-value">{selectedOferta.vehiculo.configuracion}</span></div>
                    <div className="info-item"><span className="info-label">Tipo vehículo</span><span className="info-value">{selectedOferta.vehiculo.tipo_vehiculo}</span></div>
                    <div className="info-item"><span className="info-label">Carrocería</span><span className="info-value">{selectedOferta.vehiculo.carroceria}</span></div>
                    <div className="info-item"><span className="info-label">Tipo carga</span><span className="info-value">{selectedOferta.vehiculo.tipo_carga}</span></div>
                    <div className="info-item"><span className="info-label">Ejes</span><span className="info-value">{selectedOferta.vehiculo.ejes}</span></div>
                    <div className="info-item"><span className="info-label">PBV (ton)</span><span className="info-value">{selectedOferta.vehiculo.peso_bruto_vehicular}</span></div>
                    <div className="info-item"><span className="info-label">Carga útil (ton)</span><span className="info-value">{selectedOferta.vehiculo.carga_util}</span></div>
                  </div>
                </div>
              )}

              {/* Carga */}
              {selectedOferta.condiciones && (
                <div className="oferta-section">
                  <h4 className="oferta-section-title"><Package size={16} /> Carga</h4>
                  <div className="oferta-section-grid cols-4">
                    <div className="info-item"><span className="info-label">Cantidad</span><span className="info-value">{selectedOferta.condiciones.cantidadMovilizar} {selectedOferta.condiciones.unidadMedida}</span></div>
                    <div className="info-item"><span className="info-label">Naturaleza</span><span className="info-value">{selectedOferta.condiciones.naturalezaCarga}</span></div>
                    <div className="info-item"><span className="info-label">Empaque</span><span className="info-value">{selectedOferta.condiciones.empaqueProducto}</span></div>
                    {selectedOferta.condiciones.serialISO && <div className="info-item"><span className="info-label">Serial ISO</span><span className="info-value">{selectedOferta.condiciones.serialISO}</span></div>}
                  </div>
                </div>
              )}

              {/* Flete */}
              {selectedOferta.fletes && selectedOferta.fletes.valorTotal && (
                <div className="oferta-section">
                  <h4 className="oferta-section-title"><DollarSign size={16} /> Flete</h4>
                  <div className="oferta-section-grid cols-3">
                    <div className="info-item"><span className="info-label">Valor total</span><span className="info-value precio-value">${Number(selectedOferta.fletes.valorTotal || 0).toLocaleString('es-CO')}</span></div>
                    <div className="info-item"><span className="info-label">Valor anticipo</span><span className="info-value">${Number(selectedOferta.fletes.valorAnticipo || 0).toLocaleString('es-CO')}</span></div>
                    <div className="info-item"><span className="info-label">Fecha de pago</span><span className="info-value">{selectedOferta.fletes.fechaPago || '-'}</span></div>
                  </div>
                </div>
              )}

              {/* Remitente / Destinatario */}
              <div className="oferta-section">
                <h4 className="oferta-section-title"><User size={16} /> Remitente / Destinatario</h4>
                <div className="oferta-section-grid cols-3">
                  <div className="info-item"><span className="info-label">Remitente</span><span className="info-value">{selectedOferta.remitente || '-'}</span></div>
                  <div className="info-item"><span className="info-label">Responsable</span><span className="info-value">{selectedOferta.nombre_responsable || '-'}</span></div>
                  <div className="info-item"><span className="info-label">Identificación</span><span className="info-value">{selectedOferta.identificacion || '-'}</span></div>
                </div>
              </div>

              {/* Acciones */}
              <div className="detail-actions">
                {canDeleteOrCancel(selectedOferta.estado) && (
                  <>
                    {(selectedOferta.estado || '').toUpperCase() === 'SIN ASIGNAR' && (
                      <button className="btn-eliminar" onClick={() => handleDelete(selectedOferta.id)} data-testid="btn-eliminar-oferta">
                        <Trash2 size={14} /> Eliminar Oferta
                      </button>
                    )}
                    {(selectedOferta.estado || '').toUpperCase() === 'ASIGNADO' && (
                      <button className="btn-cancelar" onClick={() => handleCancel(selectedOferta.id)} data-testid="btn-cancelar-oferta">
                        <XCircle size={14} /> Cancelar Oferta
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ========== MODAL 1: CONFIRMACIÓN ========== */}
      {showModalConfirm && selectedOferta && (
        <div className="modal-overlay" data-testid="modal-confirm-asignacion">
          <div className="modal-content modal-asignacion">
            <div className="modal-header">
              <h3>Confirmación de Publicación</h3>
            </div>
            <div className="modal-body">
              <p className="modal-intro">
                Está a punto de publicar la oferta No. <strong>{selectedOferta.codigo_oferta}</strong>
              </p>
              
              <div className="modal-info-grid">
                <div className="modal-info-item">
                  <span className="modal-info-label">Cargue:</span>
                  <span className="modal-info-value">{selectedOferta.cargue?.direccionConstruida || '-'}</span>
                </div>
                
                <div className="modal-info-item">
                  <span className="modal-info-label">Descargue:</span>
                  <span className="modal-info-value">
                    {selectedOferta.descargues && selectedOferta.descargues.length > 0
                      ? selectedOferta.descargues.map((d, i) => (
                          <span key={i}>
                            {d.direccionConstruida || '-'}
                            {i < selectedOferta.descargues.length - 1 && <br />}
                          </span>
                        ))
                      : '-'}
                  </span>
                </div>
                
                <div className="modal-info-item">
                  <span className="modal-info-label">Valor del flete:</span>
                  <span className="modal-info-value precio">{formatCurrency(selectedOferta.fletes?.valorTotal)}</span>
                </div>
                
                <div className="modal-info-item">
                  <span className="modal-info-label">Anticipo:</span>
                  <span className="modal-info-value">{formatCurrency(selectedOferta.fletes?.valorAnticipo)}</span>
                </div>
                
                <div className="modal-info-item">
                  <span className="modal-info-label">Fecha de pago:</span>
                  <span className="modal-info-value">{selectedOferta.fletes?.fechaPago || '-'}</span>
                </div>
              </div>
              
              <p className="modal-question">¿Desea continuar?</p>
            </div>
            <div className="modal-footer">
              <button className="btn-modal-secondary" onClick={handleConfirmNo} data-testid="btn-confirm-no">
                No
              </button>
              <button className="btn-modal-primary" onClick={handleConfirmYes} data-testid="btn-confirm-yes">
                Sí
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== MODAL 2: PUBLICAR ========== */}
      {showModalPublicar && selectedOferta && (
        <div className="modal-overlay" data-testid="modal-publicar-asignacion">
          <div className="modal-content modal-asignacion">
            <div className="modal-header">
              <h3>Información de Publicación</h3>
            </div>
            <div className="modal-body">
              <p className="modal-intro"><strong>Recuerde:</strong></p>
              
              <ul className="modal-info-list">
                <li>
                  La asignación iniciará <strong>24 horas antes</strong> de la fecha programada de cargue.
                </li>
                <li>
                  La oferta se enviará a vehículos ubicados a <strong>menos de 20 km</strong> de la zona de cargue y que cumplan los requisitos de la oferta.
                </li>
                <li>
                  El orden de prioridad será:
                  <ol className="modal-priority-list">
                    <li>Flota propia</li>
                    <li>Flota vinculada</li>
                    <li>Terceros</li>
                  </ol>
                </li>
              </ul>
              
              <p className="modal-question">¿Desea realizar la publicación?</p>
            </div>
            <div className="modal-footer">
              <button className="btn-modal-secondary" onClick={handleCerrarPublicar} data-testid="btn-publicar-cerrar">
                Cerrar
              </button>
              <button className="btn-modal-primary" onClick={handlePublicar} data-testid="btn-publicar-confirmar">
                Publicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ofertas;
