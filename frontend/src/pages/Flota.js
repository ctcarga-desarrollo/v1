import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Plus, TrendingUp, Bell, Settings, Menu, User, Truck, Search, Edit2, Trash2, Link2, Unlink, ArrowLeft, Upload, X, FileCheck, Calendar, Shield, Wrench, ChevronDown } from 'lucide-react';
import { useAuth } from '@/AuthContext';
import VEHICULOS_DATA from '@/data/vehiculosData';
import '@/pages/Flota.css';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const MARCAS = ["Chevrolet","Dongfeng","Foton","Freightliner","Fruehauf","Great Dane Trailers","Hino Motors","Hyundai","International Trucks","Isuzu","JAC Motors","Kenworth","Mack Trucks","Mercedes-Benz","Scania","Schmitz Cargobull","Tata Motors","Utility Trailer Manufacturing Company","Volvo Trucks","Wabash National"];
const CLASES_VEHICULO = ["Tractocamión","Camión rígido","Camión liviano","Camión mediano","Volqueta","Camión grúa","Camión cisterna","Camión refrigerado","Camión plataforma","Camión furgón","Camión cama baja","Maquinaria amarilla","Vehículo especial de carga"];
const COMBUSTIBLES = ["Gasolina","Diésel","GNV","Eléctrico","Híbrido"];
const TIPOS_REMOLQUE = ["Furgón","Plana","Cisterna","Cama baja","Estacas","Volco","Portacontenedor","Tanque","Refrigerada","Carbonera","Niñera","Minimula","Planchón"];

const emptyVehicle = () => ({
  placa: '', licencia_transito_no: '', marca: '', linea: '', modelo: '',
  clase_vehiculo: '', configuracion: '', tipo_vehiculo: '', carroceria: '', tipo_carga: '',
  tipo_carroceria: '', combustible: '', numero_motor: '', vin: '',
  propietario: '', identificacion_propietario: '', fecha_matricula: '',
  tarjeta_operaciones: { numero: '', fecha_inicio: '', fecha_fin: '' },
  soat: { numero_poliza: '', aseguradora: '', fecha_inicio: '', fecha_fin: '' },
  revision_tecnicomecanica: { numero: '', cda: '', fecha_inicio: '', fecha_fin: '' },
  documentos: { licencia_transito: null, soat: null, revision_tecnicomecanica: null, tarjeta_operaciones: null },
});

const emptyTrailer = () => ({
  placa: '', tipo_remolque: '', vin: '', numero_ejes: '', capacidad_carga_util: '',
});

/* Date helpers */
const addYears = (dateStr, years) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().split('T')[0];
};

const yearsDiff = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return (d2 - d1) / (365.25 * 24 * 60 * 60 * 1000);
};

const Flota = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [view, setView] = useState('list');
  const [activeTab, setActiveTab] = useState('vehiculos');
  const [vehiculos, setVehiculos] = useState([]);
  const [remolques, setRemolques] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  const [vehicleForm, setVehicleForm] = useState(emptyVehicle());
  const [trailerForm, setTrailerForm] = useState(emptyTrailer());
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);

  // File upload state (temporary files before save)
  const [fileUploads, setFileUploads] = useState({ licencia_transito: null, soat: null, revision_tecnicomecanica: null, tarjeta_operaciones: null });
  const [fileNames, setFileNames] = useState({ licencia_transito: '', soat: '', revision_tecnicomecanica: '', tarjeta_operaciones: '' });

  // Link modal
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkVehiculoId, setLinkVehiculoId] = useState(null);
  const [selectedRemolqueId, setSelectedRemolqueId] = useState('');

  const fetchVehiculos = useCallback(async () => {
    try {
      const params = searchTerm.trim() ? `?search=${encodeURIComponent(searchTerm)}` : '';
      const res = await fetch(`${API}/vehiculos${params}`, { credentials: 'include' });
      if (res.ok) setVehiculos(await res.json());
    } catch (e) { console.error(e); }
  }, [searchTerm]);

  const fetchRemolques = useCallback(async () => {
    try {
      const params = searchTerm.trim() ? `?search=${encodeURIComponent(searchTerm)}` : '';
      const res = await fetch(`${API}/remolques${params}`, { credentials: 'include' });
      if (res.ok) setRemolques(await res.json());
    } catch (e) { console.error(e); }
  }, [searchTerm]);

  // Cascading options for vehicle configuration (from VEHICULOS_DATA)
  const configuracionOptions = useMemo(() => [...new Set(VEHICULOS_DATA.map(v => v.configuracion))], []);

  const tipoVehiculoOptions = useMemo(() => {
    if (!vehicleForm.configuracion) return [];
    return [...new Set(VEHICULOS_DATA.filter(v => v.configuracion === vehicleForm.configuracion).map(v => v.tipo_vehiculo))];
  }, [vehicleForm.configuracion]);

  const carroceriaOptions = useMemo(() => {
    let filtered = VEHICULOS_DATA;
    if (vehicleForm.configuracion) filtered = filtered.filter(v => v.configuracion === vehicleForm.configuracion);
    if (vehicleForm.tipo_vehiculo) filtered = filtered.filter(v => v.tipo_vehiculo === vehicleForm.tipo_vehiculo);
    return [...new Set(filtered.map(v => v.carroceria))];
  }, [vehicleForm.configuracion, vehicleForm.tipo_vehiculo]);

  const tipoCargaOptions = useMemo(() => {
    let filtered = VEHICULOS_DATA;
    if (vehicleForm.configuracion) filtered = filtered.filter(v => v.configuracion === vehicleForm.configuracion);
    if (vehicleForm.tipo_vehiculo) filtered = filtered.filter(v => v.tipo_vehiculo === vehicleForm.tipo_vehiculo);
    if (vehicleForm.carroceria) filtered = filtered.filter(v => v.carroceria === vehicleForm.carroceria);
    return [...new Set(filtered.map(v => v.tipo_carga))];
  }, [vehicleForm.configuracion, vehicleForm.tipo_vehiculo, vehicleForm.carroceria]);

  useEffect(() => {
    const t = setTimeout(() => { fetchVehiculos(); fetchRemolques(); }, 300);
    return () => clearTimeout(t);
  }, [fetchVehiculos, fetchRemolques]);

  /* Auto-calculate dates */
  useEffect(() => {
    const f = vehicleForm;
    const updates = {};
    // Tarjeta operaciones
    if (f.tarjeta_operaciones.fecha_inicio) {
      const fin = addYears(f.tarjeta_operaciones.fecha_inicio, 1);
      if (fin !== f.tarjeta_operaciones.fecha_fin) updates.tarjeta_operaciones = { ...f.tarjeta_operaciones, fecha_fin: fin };
    }
    // SOAT
    if (f.soat.fecha_inicio) {
      const fin = addYears(f.soat.fecha_inicio, 1);
      if (fin !== f.soat.fecha_fin) updates.soat = { ...f.soat, fecha_fin: fin };
    }
    // Revisión técnico-mecánica
    if (f.fecha_matricula) {
      const today = new Date().toISOString().split('T')[0];
      const yearsFromMatricula = yearsDiff(f.fecha_matricula, today);
      if (yearsFromMatricula < 2) {
        const inicio = f.fecha_matricula;
        const fin = addYears(f.fecha_matricula, 2);
        if (f.revision_tecnicomecanica.fecha_inicio !== inicio || f.revision_tecnicomecanica.fecha_fin !== fin) {
          updates.revision_tecnicomecanica = { ...f.revision_tecnicomecanica, fecha_inicio: inicio, fecha_fin: fin };
        }
      } else if (f.revision_tecnicomecanica.fecha_inicio) {
        const fin = addYears(f.revision_tecnicomecanica.fecha_inicio, 1);
        if (fin !== f.revision_tecnicomecanica.fecha_fin) {
          updates.revision_tecnicomecanica = { ...f.revision_tecnicomecanica, fecha_fin: fin };
        }
      }
    }
    if (Object.keys(updates).length > 0) {
      setVehicleForm(prev => ({ ...prev, ...updates }));
    }
  }, [vehicleForm.tarjeta_operaciones.fecha_inicio, vehicleForm.soat.fecha_inicio, vehicleForm.revision_tecnicomecanica.fecha_inicio, vehicleForm.fecha_matricula]);

  const updateVF = (field, val) => setVehicleForm(prev => ({ ...prev, [field]: val }));
  const updateVFNested = (section, field, val) => setVehicleForm(prev => ({ ...prev, [section]: { ...prev[section], [field]: val } }));

  // Handle cascading updates for vehicle configuration fields
  const updateVehicleConfig = (field, value) => {
    setVehicleForm(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'configuracion') {
        updated.tipo_vehiculo = '';
        updated.carroceria = '';
        updated.tipo_carga = '';
      } else if (field === 'tipo_vehiculo') {
        updated.carroceria = '';
        updated.tipo_carga = '';
      } else if (field === 'carroceria') {
        updated.tipo_carga = '';
      }
      return updated;
    });
  };

  /* File Upload */
  const handleFileSelect = async (docType, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API}/upload`, { method: 'POST', body: formData, credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setFileUploads(prev => ({ ...prev, [docType]: data.url }));
        setFileNames(prev => ({ ...prev, [docType]: data.original_name }));
      }
    } catch (e) { console.error(e); }
  };

  const removeFile = (docType) => {
    setFileUploads(prev => ({ ...prev, [docType]: null }));
    setFileNames(prev => ({ ...prev, [docType]: '' }));
  };

  /* Validation */
  const validateVehicle = () => {
    const errs = [];
    const f = vehicleForm;
    if (!f.placa.trim()) errs.push('Placa');
    if (!f.licencia_transito_no.trim()) errs.push('Licencia de tránsito No');
    if (!f.marca) errs.push('Marca');
    if (!f.linea.trim()) errs.push('Línea');
    if (!f.modelo) errs.push('Modelo');
    if (!f.clase_vehiculo) errs.push('Clase de vehículo');
    if (!f.configuracion) errs.push('Configuración');
    if (!f.tipo_vehiculo) errs.push('Tipo de vehículo');
    if (!f.carroceria) errs.push('Carrocería');
    if (!f.tipo_carga) errs.push('Tipo de carga');
    if (!f.tipo_carroceria.trim()) errs.push('Tipo de carrocería');
    if (!f.combustible) errs.push('Combustible');
    if (!f.numero_motor.trim()) errs.push('Número de motor');
    if (!f.vin.trim()) errs.push('VIN');
    if (!f.propietario.trim()) errs.push('Propietario');
    if (!f.identificacion_propietario.trim()) errs.push('Identificación del propietario');
    if (!f.fecha_matricula) errs.push('Fecha de matrícula');
    if (!f.tarjeta_operaciones.numero.trim()) errs.push('Número de tarjeta de operaciones');
    if (!f.tarjeta_operaciones.fecha_inicio) errs.push('Fecha inicio tarjeta de operaciones');
    if (!f.soat.numero_poliza.trim()) errs.push('Número de póliza SOAT');
    if (!f.soat.aseguradora.trim()) errs.push('Aseguradora SOAT');
    if (!f.soat.fecha_inicio) errs.push('Fecha inicio SOAT');
    if (!f.revision_tecnicomecanica.numero.trim()) errs.push('Número de revisión técnico-mecánica');
    if (!f.revision_tecnicomecanica.cda.trim()) errs.push('CDA');
    return errs;
  };

  const validateTrailer = () => {
    const errs = [];
    const f = trailerForm;
    if (!f.placa.trim()) errs.push('Placa del remolque');
    if (!f.tipo_remolque) errs.push('Tipo de remolque');
    if (!f.vin.trim()) errs.push('VIN del remolque');
    if (!f.numero_ejes) errs.push('Número de ejes');
    if (!f.capacidad_carga_util) errs.push('Capacidad de carga útil');
    return errs;
  };

  /* Save Vehicle */
  const handleSaveVehicle = async () => {
    setErrors([]);
    const errs = validateVehicle();
    if (errs.length > 0) { setErrors(errs); return; }
    setSaving(true);
    const payload = {
      ...vehicleForm,
      documentos: {
        licencia_transito: fileUploads.licencia_transito || vehicleForm.documentos.licencia_transito,
        soat: fileUploads.soat || vehicleForm.documentos.soat,
        revision_tecnicomecanica: fileUploads.revision_tecnicomecanica || vehicleForm.documentos.revision_tecnicomecanica,
        tarjeta_operaciones: fileUploads.tarjeta_operaciones || vehicleForm.documentos.tarjeta_operaciones,
      },
    };
    try {
      const url = editingId ? `${API}/vehiculos/${editingId}` : `${API}/vehiculos`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) });
      if (res.ok) {
        await fetchVehiculos();
        setView('list');
        setVehicleForm(emptyVehicle());
        setEditingId(null);
        resetFiles();
      } else {
        const err = await res.json();
        setErrors([err.detail || 'Error al guardar']);
      }
    } catch (e) { setErrors(['Error de conexión']); }
    finally { setSaving(false); }
  };

  /* Save Trailer */
  const handleSaveTrailer = async () => {
    setErrors([]);
    const errs = validateTrailer();
    if (errs.length > 0) { setErrors(errs); return; }
    setSaving(true);
    try {
      const url = editingId ? `${API}/remolques/${editingId}` : `${API}/remolques`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(trailerForm) });
      if (res.ok) {
        await fetchRemolques();
        setView('list');
        setTrailerForm(emptyTrailer());
        setEditingId(null);
      } else {
        const err = await res.json();
        setErrors([err.detail || 'Error al guardar']);
      }
    } catch (e) { setErrors(['Error de conexión']); }
    finally { setSaving(false); }
  };

  /* Delete */
  const handleDeleteVehiculo = async (id) => {
    if (!window.confirm('¿Eliminar este vehículo?')) return;
    await fetch(`${API}/vehiculos/${id}`, { method: 'DELETE', credentials: 'include' });
    fetchVehiculos();
    fetchRemolques();
  };
  const handleDeleteRemolque = async (id) => {
    if (!window.confirm('¿Eliminar este remolque?')) return;
    await fetch(`${API}/remolques/${id}`, { method: 'DELETE', credentials: 'include' });
    fetchRemolques();
  };

  /* Edit */
  const handleEditVehiculo = (v) => {
    setVehicleForm(v);
    setEditingId(v.id);
    setFileUploads({
      licencia_transito: v.documentos?.licencia_transito || null,
      soat: v.documentos?.soat || null,
      revision_tecnicomecanica: v.documentos?.revision_tecnicomecanica || null,
      tarjeta_operaciones: v.documentos?.tarjeta_operaciones || null,
    });
    setFileNames({
      licencia_transito: v.documentos?.licencia_transito ? 'Archivo cargado' : '',
      soat: v.documentos?.soat ? 'Archivo cargado' : '',
      revision_tecnicomecanica: v.documentos?.revision_tecnicomecanica ? 'Archivo cargado' : '',
      tarjeta_operaciones: v.documentos?.tarjeta_operaciones ? 'Archivo cargado' : '',
    });
    setErrors([]);
    setView('register-vehicle');
  };
  const handleEditRemolque = (r) => {
    setTrailerForm({ placa: r.placa, tipo_remolque: r.tipo_remolque, vin: r.vin, numero_ejes: r.numero_ejes, capacidad_carga_util: r.capacidad_carga_util });
    setEditingId(r.id);
    setErrors([]);
    setView('register-trailer');
  };

  /* Linking */
  const availableRemolques = useMemo(() => remolques.filter(r => !r.vehiculo_vinculado), [remolques]);

  const handleVincular = async () => {
    if (!selectedRemolqueId) return;
    const res = await fetch(`${API}/vehiculos/${linkVehiculoId}/vincular-remolque`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ remolque_id: selectedRemolqueId }),
    });
    if (res.ok) {
      await fetchVehiculos();
      await fetchRemolques();
      setShowLinkModal(false);
      setLinkVehiculoId(null);
      setSelectedRemolqueId('');
    } else {
      const err = await res.json();
      alert(err.detail || 'Error al vincular');
    }
  };

  const handleDesvincular = async (vehiculoId) => {
    if (!window.confirm('¿Desvincular el remolque de este vehículo?')) return;
    await fetch(`${API}/vehiculos/${vehiculoId}/desvincular-remolque`, { method: 'POST', credentials: 'include' });
    await fetchVehiculos();
    await fetchRemolques();
  };

  const resetFiles = () => {
    setFileUploads({ licencia_transito: null, soat: null, revision_tecnicomecanica: null, tarjeta_operaciones: null });
    setFileNames({ licencia_transito: '', soat: '', revision_tecnicomecanica: '', tarjeta_operaciones: '' });
  };

  const goToRegisterVehicle = () => { setVehicleForm(emptyVehicle()); setEditingId(null); setErrors([]); resetFiles(); setView('register-vehicle'); };
  const goToRegisterTrailer = () => { setTrailerForm(emptyTrailer()); setEditingId(null); setErrors([]); setView('register-trailer'); };
  const goToList = () => { setView('list'); setErrors([]); setEditingId(null); };

  const getLinkedRemolque = (v) => {
    if (!v.remolque_vinculado) return null;
    return remolques.find(r => r.id === v.remolque_vinculado);
  };

  const isVehicleLessThan2Years = useMemo(() => {
    if (!vehicleForm.fecha_matricula) return false;
    const today = new Date().toISOString().split('T')[0];
    return yearsDiff(vehicleForm.fecha_matricula, today) < 2;
  }, [vehicleForm.fecha_matricula]);

  /* Error display */
  const ErrorBox = () => errors.length > 0 ? (
    <div className="validation-errors" data-testid="form-errors">
      <X size={18} />
      <div>
        <p className="validation-title">Campos obligatorios faltantes:</p>
        <ul>{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
      </div>
    </div>
  ) : null;

  return (
    <div className="dashboard-container">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <img src="https://customer-assets.emergentagent.com/job_2f7d0b2d-48f5-48d8-97ec-b1793c396cc6/artifacts/d1sq0sbe_CTCARGA%20SIN%20FONDO.png" alt="CTCARGA" className="sidebar-logo" />
          <div className="sidebar-brand"><h2>CTCARGA</h2><p>Empresa de logística</p></div>
        </div>
        <nav className="sidebar-nav" data-testid="sidebar-nav">
          <button className="nav-item" onClick={() => navigate('/dashboard')} data-testid="dashboard-nav-btn"><LayoutDashboard size={18} /><span>Dashboard</span></button>
          <button className="nav-item" onClick={() => navigate('/ofertas')} data-testid="ofertas-nav-btn"><FileText size={18} /><span>Ofertas</span></button>
          <button className="nav-item" onClick={() => navigate('/creacion-ofertas')} data-testid="creacion-ofertas-nav-btn"><Plus size={18} /><span>Creación ofertas</span></button>
          <button className="nav-item active" data-testid="flota-nav-btn"><Truck size={18} /><span>Flota</span></button>
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
          <p className="breadcrumb">Flota</p>
          <h1 className="page-title" data-testid="page-title">Gestión de Flota</h1>
          <p className="subtitle">Administra vehículos y remolques de tu empresa</p>

          {/* LIST VIEW */}
          {view === 'list' && (
            <>
              <div className="flota-tabs" data-testid="flota-tabs">
                <button className={`flota-tab ${activeTab === 'vehiculos' ? 'active' : ''}`} onClick={() => setActiveTab('vehiculos')} data-testid="tab-vehiculos">
                  <Truck size={16} /> Vehículos <span className="tab-count">{vehiculos.length}</span>
                </button>
                <button className={`flota-tab ${activeTab === 'remolques' ? 'active' : ''}`} onClick={() => setActiveTab('remolques')} data-testid="tab-remolques">
                  <Truck size={16} /> Remolques <span className="tab-count">{remolques.length}</span>
                </button>
              </div>

              <div className="list-header">
                <div className="list-search">
                  <Search size={16} />
                  <input type="text" placeholder={activeTab === 'vehiculos' ? "Buscar por placa, marca o propietario..." : "Buscar por placa o tipo..."} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} data-testid="search-input" />
                </div>
                {activeTab === 'vehiculos' ? (
                  <button className="btn-register" onClick={goToRegisterVehicle} data-testid="btn-registrar-vehiculo"><Plus size={16} /> Registrar nuevo vehículo</button>
                ) : (
                  <button className="btn-register" onClick={goToRegisterTrailer} data-testid="btn-registrar-remolque"><Plus size={16} /> Registrar nuevo remolque</button>
                )}
              </div>

              {/* VEHICULOS TABLE */}
              {activeTab === 'vehiculos' && (
                <div className="data-table-container" data-testid="vehiculos-table">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Placa</th>
                        <th>Marca</th>
                        <th>Línea</th>
                        <th>Modelo</th>
                        <th>Clase</th>
                        <th>Propietario</th>
                        <th>Remolque</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vehiculos.length === 0 && (
                        <tr><td colSpan="8"><div className="empty-state"><Truck size={40} /><p>No hay vehículos registrados</p></div></td></tr>
                      )}
                      {vehiculos.map(v => {
                        const linked = getLinkedRemolque(v);
                        return (
                          <tr key={v.id}>
                            <td><span className="placa-badge">{v.placa}</span></td>
                            <td>{v.marca}</td>
                            <td>{v.linea}</td>
                            <td>{v.modelo}</td>
                            <td><span className="clase-badge">{v.clase_vehiculo}</span></td>
                            <td>{v.propietario}</td>
                            <td>
                              {linked ? (
                                <span className="link-badge"><Link2 size={12} /> {linked.placa}</span>
                              ) : (
                                <span className="link-badge none">Sin vincular</span>
                              )}
                            </td>
                            <td>
                              <div className="table-actions">
                                <button className="btn-action edit" onClick={() => handleEditVehiculo(v)} data-testid={`edit-vehiculo-${v.id}`}><Edit2 size={12} /> Editar</button>
                                {v.clase_vehiculo === 'Tractocamión' && !linked && (
                                  <button className="btn-action link" onClick={() => { setLinkVehiculoId(v.id); setShowLinkModal(true); }} data-testid={`link-vehiculo-${v.id}`}><Link2 size={12} /> Vincular</button>
                                )}
                                {linked && (
                                  <button className="btn-action unlink" onClick={() => handleDesvincular(v.id)} data-testid={`unlink-vehiculo-${v.id}`}><Unlink size={12} /></button>
                                )}
                                <button className="btn-action delete" onClick={() => handleDeleteVehiculo(v.id)} data-testid={`delete-vehiculo-${v.id}`}><Trash2 size={12} /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* REMOLQUES TABLE */}
              {activeTab === 'remolques' && (
                <div className="data-table-container" data-testid="remolques-table">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Placa</th>
                        <th>Tipo</th>
                        <th>VIN</th>
                        <th>Ejes</th>
                        <th>Carga útil</th>
                        <th>Vinculado a</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {remolques.length === 0 && (
                        <tr><td colSpan="7"><div className="empty-state"><Truck size={40} /><p>No hay remolques registrados</p></div></td></tr>
                      )}
                      {remolques.map(r => {
                        const linkedVehicle = r.vehiculo_vinculado ? vehiculos.find(v => v.id === r.vehiculo_vinculado) : null;
                        return (
                          <tr key={r.id}>
                            <td><span className="placa-badge">{r.placa}</span></td>
                            <td>{r.tipo_remolque}</td>
                            <td>{r.vin}</td>
                            <td>{r.numero_ejes}</td>
                            <td>{r.capacidad_carga_util} ton</td>
                            <td>
                              {linkedVehicle ? (
                                <span className="link-badge"><Link2 size={12} /> {linkedVehicle.placa}</span>
                              ) : (
                                <span className="link-badge none">Disponible</span>
                              )}
                            </td>
                            <td>
                              <div className="table-actions">
                                <button className="btn-action edit" onClick={() => handleEditRemolque(r)} data-testid={`edit-remolque-${r.id}`}><Edit2 size={12} /> Editar</button>
                                <button className="btn-action delete" onClick={() => handleDeleteRemolque(r.id)} data-testid={`delete-remolque-${r.id}`}><Trash2 size={12} /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* REGISTER / EDIT VEHICLE */}
          {view === 'register-vehicle' && (
            <>
              <div className="form-page-header">
                <button className="btn-back" onClick={goToList} data-testid="btn-back"><ArrowLeft size={18} /></button>
                <h2 className="form-page-title">{editingId ? 'Editar Vehículo' : 'Registrar Nuevo Vehículo'}</h2>
              </div>

              {/* Datos del Vehículo */}
              <div className="form-card">
                <h3 className="form-card-title"><Truck size={18} /> Datos del Vehículo</h3>
                <div className="form-row cols-4">
                  <div className="form-group">
                    <label>Placa *</label>
                    <input type="text" className="form-input" placeholder="ABC123" value={vehicleForm.placa} onChange={(e) => updateVF('placa', e.target.value.toUpperCase())} maxLength={7} data-testid="placa-input" />
                  </div>
                  <div className="form-group">
                    <label>Licencia de tránsito No *</label>
                    <input type="text" className="form-input" value={vehicleForm.licencia_transito_no} onChange={(e) => updateVF('licencia_transito_no', e.target.value)} data-testid="licencia-input" />
                  </div>
                  <div className="form-group">
                    <label>Marca *</label>
                    <select className="form-input" value={vehicleForm.marca} onChange={(e) => updateVF('marca', e.target.value)} data-testid="marca-select">
                      <option value="">Seleccionar...</option>
                      {MARCAS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Línea *</label>
                    <input type="text" className="form-input" value={vehicleForm.linea} onChange={(e) => updateVF('linea', e.target.value)} data-testid="linea-input" />
                  </div>
                </div>
                <div className="form-row cols-4">
                  <div className="form-group">
                    <label>Modelo *</label>
                    <input type="number" className="form-input" placeholder="2024" value={vehicleForm.modelo} onChange={(e) => updateVF('modelo', e.target.value)} data-testid="modelo-input" />
                  </div>
                  <div className="form-group">
                    <label>Clase de vehículo *</label>
                    <select className="form-input" value={vehicleForm.clase_vehiculo} onChange={(e) => updateVF('clase_vehiculo', e.target.value)} data-testid="clase-select">
                      <option value="">Seleccionar...</option>
                      {CLASES_VEHICULO.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Configuración *</label>
                    <select className="form-input" value={vehicleForm.configuracion} onChange={(e) => updateVehicleConfig('configuracion', e.target.value)} data-testid="configuracion-select">
                      <option value="">Seleccionar configuración...</option>
                      {configuracionOptions.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Tipo de vehículo *</label>
                    <select className="form-input" value={vehicleForm.tipo_vehiculo} onChange={(e) => updateVehicleConfig('tipo_vehiculo', e.target.value)} disabled={!vehicleForm.configuracion} data-testid="tipo-vehiculo-select">
                      <option value="">Seleccionar tipo...</option>
                      {tipoVehiculoOptions.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row cols-4">
                  <div className="form-group">
                    <label>Carrocería *</label>
                    <select className="form-input" value={vehicleForm.carroceria} onChange={(e) => updateVehicleConfig('carroceria', e.target.value)} disabled={!vehicleForm.configuracion} data-testid="carroceria-select">
                      <option value="">Seleccionar carrocería...</option>
                      {carroceriaOptions.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Tipo de carga *</label>
                    <select className="form-input" value={vehicleForm.tipo_carga} onChange={(e) => updateVehicleConfig('tipo_carga', e.target.value)} disabled={!vehicleForm.configuracion} data-testid="tipo-carga-select">
                      <option value="">Seleccionar tipo de carga...</option>
                      {tipoCargaOptions.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Tipo de carrocería *</label>
                    <input type="text" className="form-input" value={vehicleForm.tipo_carroceria} onChange={(e) => updateVF('tipo_carroceria', e.target.value)} data-testid="carroceria-input" />
                  </div>
                  <div className="form-group">
                    <label>Combustible *</label>
                    <select className="form-input" value={vehicleForm.combustible} onChange={(e) => updateVF('combustible', e.target.value)} data-testid="combustible-select">
                      <option value="">Seleccionar...</option>
                      {COMBUSTIBLES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row cols-4">
                  <div className="form-group">
                    <label>Número de motor *</label>
                    <input type="text" className="form-input" value={vehicleForm.numero_motor} onChange={(e) => updateVF('numero_motor', e.target.value)} data-testid="motor-input" />
                  </div>
                  <div className="form-group">
                    <label>VIN *</label>
                    <input type="text" className="form-input" value={vehicleForm.vin} onChange={(e) => updateVF('vin', e.target.value)} data-testid="vin-input" />
                  </div>
                  <div className="form-group">
                    <label>Propietario *</label>
                    <input type="text" className="form-input" value={vehicleForm.propietario} onChange={(e) => updateVF('propietario', e.target.value)} data-testid="propietario-input" />
                  </div>
                  <div className="form-group">
                    <label>Identificación del propietario *</label>
                    <input type="text" className="form-input" value={vehicleForm.identificacion_propietario} onChange={(e) => updateVF('identificacion_propietario', e.target.value)} data-testid="id-propietario-input" />
                  </div>
                </div>
                <div className="form-row cols-4">
                  <div className="form-group">
                    <label>Fecha de matrícula *</label>
                    <input type="date" className="form-input" value={vehicleForm.fecha_matricula} onChange={(e) => updateVF('fecha_matricula', e.target.value)} data-testid="fecha-matricula-input" />
                  </div>
                </div>
              </div>

              {/* Tarjeta de Operaciones */}
              <div className="form-card">
                <h3 className="form-card-title"><FileCheck size={18} /> Tarjeta de Operaciones</h3>
                <div className="form-row cols-3">
                  <div className="form-group">
                    <label>Número de tarjeta *</label>
                    <input type="text" className="form-input" value={vehicleForm.tarjeta_operaciones.numero} onChange={(e) => updateVFNested('tarjeta_operaciones', 'numero', e.target.value)} data-testid="tarjeta-numero-input" />
                  </div>
                  <div className="form-group">
                    <label>Fecha inicio vigencia *</label>
                    <input type="date" className="form-input" value={vehicleForm.tarjeta_operaciones.fecha_inicio} onChange={(e) => updateVFNested('tarjeta_operaciones', 'fecha_inicio', e.target.value)} data-testid="tarjeta-inicio-input" />
                  </div>
                  <div className="form-group">
                    <label>Fecha fin vigencia (1 año)</label>
                    <input type="date" className="form-input auto-field" value={vehicleForm.tarjeta_operaciones.fecha_fin} readOnly data-testid="tarjeta-fin-display" />
                  </div>
                </div>
              </div>

              {/* SOAT */}
              <div className="form-card">
                <h3 className="form-card-title"><Shield size={18} /> SOAT</h3>
                <div className="form-row cols-2">
                  <div className="form-group">
                    <label>Número de póliza SOAT *</label>
                    <input type="text" className="form-input" value={vehicleForm.soat.numero_poliza} onChange={(e) => updateVFNested('soat', 'numero_poliza', e.target.value)} data-testid="soat-numero-input" />
                  </div>
                  <div className="form-group">
                    <label>Aseguradora SOAT *</label>
                    <input type="text" className="form-input" value={vehicleForm.soat.aseguradora} onChange={(e) => updateVFNested('soat', 'aseguradora', e.target.value)} data-testid="soat-aseguradora-input" />
                  </div>
                </div>
                <div className="form-row cols-2">
                  <div className="form-group">
                    <label>Fecha inicio vigencia *</label>
                    <input type="date" className="form-input" value={vehicleForm.soat.fecha_inicio} onChange={(e) => updateVFNested('soat', 'fecha_inicio', e.target.value)} data-testid="soat-inicio-input" />
                  </div>
                  <div className="form-group">
                    <label>Fecha fin vigencia (1 año)</label>
                    <input type="date" className="form-input auto-field" value={vehicleForm.soat.fecha_fin} readOnly data-testid="soat-fin-display" />
                  </div>
                </div>
              </div>

              {/* Revisión Técnico-Mecánica */}
              <div className="form-card">
                <h3 className="form-card-title"><Wrench size={18} /> Revisión Técnico-Mecánica</h3>
                {isVehicleLessThan2Years && (
                  <div className="distribution-summary valid" style={{ marginBottom: 16 }}>
                    <Calendar size={16} />
                    <span>Vehículo con menos de 2 años: vigencia automática de 2 años desde la matrícula</span>
                  </div>
                )}
                <div className="form-row cols-2">
                  <div className="form-group">
                    <label>Número de revisión *</label>
                    <input type="text" className="form-input" value={vehicleForm.revision_tecnicomecanica.numero} onChange={(e) => updateVFNested('revision_tecnicomecanica', 'numero', e.target.value)} data-testid="rtm-numero-input" />
                  </div>
                  <div className="form-group">
                    <label>CDA *</label>
                    <input type="text" className="form-input" value={vehicleForm.revision_tecnicomecanica.cda} onChange={(e) => updateVFNested('revision_tecnicomecanica', 'cda', e.target.value)} data-testid="rtm-cda-input" />
                  </div>
                </div>
                <div className="form-row cols-2">
                  <div className="form-group">
                    <label>Fecha inicio vigencia {isVehicleLessThan2Years ? '(auto - matrícula)' : '*'}</label>
                    <input type="date" className={`form-input ${isVehicleLessThan2Years ? 'auto-field' : ''}`} value={vehicleForm.revision_tecnicomecanica.fecha_inicio} onChange={(e) => { if (!isVehicleLessThan2Years) updateVFNested('revision_tecnicomecanica', 'fecha_inicio', e.target.value); }} readOnly={isVehicleLessThan2Years} data-testid="rtm-inicio-input" />
                  </div>
                  <div className="form-group">
                    <label>Fecha fin vigencia ({isVehicleLessThan2Years ? '2 años' : '1 año'})</label>
                    <input type="date" className="form-input auto-field" value={vehicleForm.revision_tecnicomecanica.fecha_fin} readOnly data-testid="rtm-fin-display" />
                  </div>
                </div>
              </div>

              {/* Documentos */}
              <div className="form-card">
                <h3 className="form-card-title"><Upload size={18} /> Documentos del Vehículo</h3>
                <div className="file-upload-grid">
                  {[
                    { key: 'licencia_transito', label: 'Licencia de tránsito' },
                    { key: 'soat', label: 'SOAT' },
                    { key: 'revision_tecnicomecanica', label: 'Revisión técnico-mecánica' },
                    { key: 'tarjeta_operaciones', label: 'Tarjeta de operaciones' },
                  ].map(doc => (
                    <div key={doc.key} className={`file-upload-item ${fileUploads[doc.key] ? 'has-file' : ''}`}>
                      <span className="file-upload-label">{doc.label}</span>
                      <label className="file-upload-btn" htmlFor={`file-${doc.key}`}>
                        <Upload size={14} /> {fileUploads[doc.key] ? 'Cambiar' : 'Seleccionar archivo'}
                      </label>
                      <input id={`file-${doc.key}`} type="file" className="file-upload-input" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.heic,.bmp,.tiff" onChange={(e) => handleFileSelect(doc.key, e.target.files[0])} data-testid={`file-${doc.key}`} />
                      {fileNames[doc.key] && <p className="file-name">{fileNames[doc.key]}</p>}
                      {fileUploads[doc.key] && <button className="file-remove" onClick={() => removeFile(doc.key)}><X size={12} /></button>}
                    </div>
                  ))}
                </div>
              </div>

              <ErrorBox />
              <div className="form-actions">
                <button className="btn-clean" onClick={goToList} data-testid="btn-cancel">Cancelar</button>
                <button className="btn-crear-oferta" onClick={handleSaveVehicle} disabled={saving} data-testid="btn-save-vehicle">
                  {saving ? 'Guardando...' : (editingId ? 'Actualizar Vehículo' : 'Registrar Vehículo')}
                </button>
              </div>
            </>
          )}

          {/* REGISTER / EDIT TRAILER */}
          {view === 'register-trailer' && (
            <>
              <div className="form-page-header">
                <button className="btn-back" onClick={goToList} data-testid="btn-back-trailer"><ArrowLeft size={18} /></button>
                <h2 className="form-page-title">{editingId ? 'Editar Remolque' : 'Registrar Nuevo Remolque / Semirremolque'}</h2>
              </div>

              <div className="form-card">
                <h3 className="form-card-title"><Truck size={18} /> Datos del Remolque</h3>
                <div className="form-row cols-3">
                  <div className="form-group">
                    <label>Placa del remolque *</label>
                    <input type="text" className="form-input" placeholder="R12345" value={trailerForm.placa} onChange={(e) => setTrailerForm({ ...trailerForm, placa: e.target.value.toUpperCase() })} data-testid="remolque-placa-input" />
                  </div>
                  <div className="form-group">
                    <label>Tipo de remolque *</label>
                    <select className="form-input" value={trailerForm.tipo_remolque} onChange={(e) => setTrailerForm({ ...trailerForm, tipo_remolque: e.target.value })} data-testid="remolque-tipo-select">
                      <option value="">Seleccionar...</option>
                      {TIPOS_REMOLQUE.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>VIN del remolque *</label>
                    <input type="text" className="form-input" value={trailerForm.vin} onChange={(e) => setTrailerForm({ ...trailerForm, vin: e.target.value })} data-testid="remolque-vin-input" />
                  </div>
                </div>
                <div className="form-row cols-2">
                  <div className="form-group">
                    <label>Número de ejes *</label>
                    <input type="number" className="form-input" value={trailerForm.numero_ejes} onChange={(e) => setTrailerForm({ ...trailerForm, numero_ejes: e.target.value })} data-testid="remolque-ejes-input" />
                  </div>
                  <div className="form-group">
                    <label>Capacidad de carga útil (ton) *</label>
                    <input type="number" className="form-input" step="0.1" value={trailerForm.capacidad_carga_util} onChange={(e) => setTrailerForm({ ...trailerForm, capacidad_carga_util: e.target.value })} data-testid="remolque-carga-input" />
                  </div>
                </div>
              </div>

              <ErrorBox />
              <div className="form-actions">
                <button className="btn-clean" onClick={goToList} data-testid="btn-cancel-trailer">Cancelar</button>
                <button className="btn-crear-oferta" onClick={handleSaveTrailer} disabled={saving} data-testid="btn-save-trailer">
                  {saving ? 'Guardando...' : (editingId ? 'Actualizar Remolque' : 'Registrar Remolque')}
                </button>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Link Modal */}
      {showLinkModal && (
        <div className="modal-overlay" data-testid="modal-vincular">
          <div className="modal-content">
            <div className="modal-header">
              <h3><Link2 size={18} /> Vincular Remolque</h3>
              <button className="modal-close" onClick={() => { setShowLinkModal(false); setSelectedRemolqueId(''); }}><X size={20} /></button>
            </div>
            <div className="modal-body">
              {availableRemolques.length === 0 ? (
                <p style={{ color: '#6b7280', textAlign: 'center' }}>No hay remolques disponibles para vincular.</p>
              ) : (
                <>
                  <label style={{ fontWeight: 600, fontSize: 14 }}>Seleccionar remolque disponible:</label>
                  <select className="link-select" value={selectedRemolqueId} onChange={(e) => setSelectedRemolqueId(e.target.value)} data-testid="select-remolque-vincular">
                    <option value="">Seleccionar...</option>
                    {availableRemolques.map(r => (
                      <option key={r.id} value={r.id}>{r.placa} - {r.tipo_remolque} ({r.capacidad_carga_util} ton)</option>
                    ))}
                  </select>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => { setShowLinkModal(false); setSelectedRemolqueId(''); }}>Cancelar</button>
              {availableRemolques.length > 0 && (
                <button className="btn-next" onClick={handleVincular} disabled={!selectedRemolqueId} data-testid="btn-confirmar-vincular">
                  <Link2 size={16} /> Vincular
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Flota;
