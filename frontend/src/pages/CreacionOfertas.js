import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Plus, TrendingUp, Bell, Settings, Menu, User, MapPin, ChevronRight, Star, X, Search, ChevronDown, Truck } from 'lucide-react';
import COLOMBIA_DATA from '@/data/colombiaData';
import VEHICULOS_DATA from '@/data/vehiculosData';
import '@/pages/CreacionOfertas.css';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TIPOS_VIA = ["Calle","Carrera","Avenida","Avenida Calle","Avenida Carrera","Diagonal","Transversal","Circular","Kilómetro","Vía","Carretera","Troncal","Variante","Vereda","Corregimiento","Finca","Hacienda","Parcela","Lote","Predio"];

const ZONAS_ESPECIALES = ["Zona Franca","Parque Industrial","Parque Empresarial","Zona Industrial","Complejo Industrial","Centro Logístico","Plataforma Logística","Centro de Distribución","Bodega","Patio de Operaciones","Terminal de Carga","Puerto","Puerto Seco","Aeropuerto","Terminal de Transporte","Depósito Aduanero","Zona Portuaria","Zona Aduanera"];

const DEPARTAMENTOS = Object.keys(COLOMBIA_DATA).sort();

/* ---- Searchable Dropdown Component ---- */
const SearchableDropdown = ({ label, options, value, onChange, placeholder, testId }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="form-group" ref={ref}>
      <label>{label}</label>
      <div className="searchable-dropdown" data-testid={testId}>
        <div className="dropdown-trigger" onClick={() => setOpen(!open)}>
          <span className={value ? 'selected' : 'placeholder'}>{value || placeholder}</span>
          <ChevronDown size={16} />
        </div>
        {open && (
          <div className="dropdown-panel">
            <div className="dropdown-search">
              <Search size={14} />
              <input
                type="text"
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
            <ul className="dropdown-list">
              {filtered.length === 0 && <li className="no-results">Sin resultados</li>}
              {filtered.map((opt) => (
                <li key={opt} className={opt === value ? 'active' : ''} onClick={() => { onChange(opt); setOpen(false); setSearch(''); }}>
                  {opt}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

/* ---- AutoComplete Field (type 3+ chars) ---- */
const AutoCompleteField = ({ label, options, value, onChange, placeholder, testId, disabled }) => {
  const [open, setOpen] = useState(false);
  const [inputVal, setInputVal] = useState(value || '');
  const ref = useRef(null);

  useEffect(() => { setInputVal(value || ''); }, [value]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = inputVal.length >= 3 ? options.filter(o => o.toLowerCase().includes(inputVal.toLowerCase())) : [];

  return (
    <div className="form-group" ref={ref}>
      <label>{label}</label>
      <input
        type="text"
        className="form-input"
        placeholder={placeholder}
        value={inputVal}
        onChange={(e) => { setInputVal(e.target.value); setOpen(true); if (e.target.value.length < 3) onChange(''); }}
        onFocus={() => { if (inputVal.length >= 3) setOpen(true); }}
        disabled={disabled}
        data-testid={testId}
      />
      {open && filtered.length > 0 && (
        <ul className="autocomplete-list">
          {filtered.map((opt) => (
            <li key={opt} onClick={() => { onChange(opt); setInputVal(opt); setOpen(false); }}>
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/* ---- Address Form Component ---- */
const AddressForm = ({ address, setAddress, favoritos, title, index }) => {
  const municipios = useMemo(() => {
    if (!address.departamento) return [];
    return COLOMBIA_DATA[address.departamento] || [];
  }, [address.departamento]);

  const direccionConstruida = useMemo(() => {
    const parts = [
      address.tipoVia,
      address.numeroPrincipal,
      address.letraBis1,
      address.numeroSecundario ? `# ${address.numeroSecundario}` : '',
      address.letraBis2,
      address.complemento,
      address.zonaEspecial && address.zonaEspecial !== '' ? `- ${address.zonaEspecial}` : '',
      address.municipio ? `, ${address.municipio}` : '',
      address.departamento ? `, ${address.departamento}` : '',
    ].filter(Boolean).join(' ');
    return parts || '';
  }, [address]);

  useEffect(() => {
    if (direccionConstruida !== address.direccionConstruida) {
      setAddress({ ...address, direccionConstruida });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direccionConstruida]);

  const update = (field, val) => setAddress({ ...address, [field]: val });

  const handleFavoritoSelect = (favName) => {
    const fav = favoritos.find(f => f.nombre_favorito === favName);
    if (fav) {
      setAddress({
        ...fav.direccion,
        direccionFavorita: favName,
      });
    }
  };

  return (
    <div className="address-form-block">
      {title && <h3 className="address-block-title"><MapPin size={18} /> {title}</h3>}

      <div className="form-row cols-3">
        <SearchableDropdown
          label="Dirección Favorita"
          options={favoritos.map(f => f.nombre_favorito)}
          value={address.direccionFavorita}
          onChange={handleFavoritoSelect}
          placeholder="Selecciona una Dirección Favorita"
          testId={`favorita-select-${index}`}
        />
        <div className="form-group">
          <label>Tipo de vía</label>
          <select className="form-input" value={address.tipoVia} onChange={(e) => update('tipoVia', e.target.value)} data-testid={`tipo-via-${index}`}>
            <option value="">Seleccionar...</option>
            {TIPOS_VIA.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Número Principal</label>
          <input type="number" className="form-input" value={address.numeroPrincipal} onChange={(e) => update('numeroPrincipal', e.target.value)} data-testid={`num-principal-${index}`} />
        </div>
      </div>

      <div className="form-row cols-3">
        <div className="form-group">
          <label>Letra / Bis / Complemento</label>
          <input type="text" className="form-input" value={address.letraBis1} onChange={(e) => update('letraBis1', e.target.value)} data-testid={`letra-bis-1-${index}`} />
        </div>
        <div className="form-group">
          <label>Número Secundario</label>
          <input type="number" className="form-input" value={address.numeroSecundario} onChange={(e) => update('numeroSecundario', e.target.value)} data-testid={`num-secundario-${index}`} />
        </div>
        <div className="form-group">
          <label>Letra / Bis / Complemento</label>
          <input type="text" className="form-input" value={address.letraBis2} onChange={(e) => update('letraBis2', e.target.value)} data-testid={`letra-bis-2-${index}`} />
        </div>
      </div>

      <div className="form-row cols-3">
        <div className="form-group">
          <label>Complemento</label>
          <input type="text" className="form-input" placeholder="Apartamento, Oficina, Torre, etc." value={address.complemento} onChange={(e) => update('complemento', e.target.value)} data-testid={`complemento-${index}`} />
        </div>
        <div className="form-group">
          <label>Zona/Nombre especial</label>
          <select className="form-input" value={address.zonaEspecial} onChange={(e) => update('zonaEspecial', e.target.value)} data-testid={`zona-especial-${index}`}>
            <option value="">-</option>
            {ZONAS_ESPECIALES.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
        </div>
        <AutoCompleteField
          label="Departamento"
          options={DEPARTAMENTOS}
          value={address.departamento}
          onChange={(val) => { update('departamento', val); if (val !== address.departamento) update('municipio', ''); setAddress(prev => ({...prev, departamento: val, municipio: ''})); }}
          placeholder="Escriba 3 letras..."
          testId={`departamento-${index}`}
        />
      </div>

      <div className="form-row cols-3">
        <AutoCompleteField
          label="Municipio"
          options={municipios}
          value={address.municipio}
          onChange={(val) => update('municipio', val)}
          placeholder={address.departamento ? "Escriba 3 letras..." : "Seleccione departamento primero"}
          testId={`municipio-${index}`}
          disabled={!address.departamento}
        />
        <div className="form-group span-2">
          <label>Dirección</label>
          <div className="form-input readonly" data-testid={`direccion-construida-${index}`}>
            {address.direccionConstruida || 'Se construirá automáticamente...'}
          </div>
        </div>
      </div>
    </div>
  );
};

const emptyAddress = () => ({
  direccionFavorita: '', tipoVia: '', numeroPrincipal: '', letraBis1: '', numeroSecundario: '', letraBis2: '', complemento: '', zonaEspecial: '', departamento: '', municipio: '', direccionConstruida: ''
});

/* ---- Main Page ---- */
const CreacionOfertas = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [favoritos, setFavoritos] = useState([]);
  const [showFavModal, setShowFavModal] = useState(false);
  const [favName, setFavName] = useState('');
  const [savingFavIndex, setSavingFavIndex] = useState(null);

  // Step 1: Single origin address
  const [cargueAddress, setCargueAddress] = useState(emptyAddress());

  // Step 2: Multiple destination addresses
  const [descargueAddresses, setDescargueAddresses] = useState([emptyAddress()]);

  // Step 3: Vehicle configuration
  const [vehicleConfig, setVehicleConfig] = useState({
    configuracion: '',
    tipo_vehiculo: '',
    carroceria: '',
    tipo_carga: '',
    ejes: '',
    peso_bruto_vehicular: '',
    carga_util: '',
  });

  // Filtered options based on cascading selection
  const configuracionOptions = useMemo(() => [...new Set(VEHICULOS_DATA.map(v => v.configuracion))], []);

  const tipoVehiculoOptions = useMemo(() => {
    if (!vehicleConfig.configuracion) return [];
    return [...new Set(VEHICULOS_DATA.filter(v => v.configuracion === vehicleConfig.configuracion).map(v => v.tipo_vehiculo))];
  }, [vehicleConfig.configuracion]);

  const carroceriaOptions = useMemo(() => {
    let filtered = VEHICULOS_DATA;
    if (vehicleConfig.configuracion) filtered = filtered.filter(v => v.configuracion === vehicleConfig.configuracion);
    if (vehicleConfig.tipo_vehiculo) filtered = filtered.filter(v => v.tipo_vehiculo === vehicleConfig.tipo_vehiculo);
    return [...new Set(filtered.map(v => v.carroceria))];
  }, [vehicleConfig.configuracion, vehicleConfig.tipo_vehiculo]);

  const tipoCargaOptions = useMemo(() => {
    let filtered = VEHICULOS_DATA;
    if (vehicleConfig.configuracion) filtered = filtered.filter(v => v.configuracion === vehicleConfig.configuracion);
    if (vehicleConfig.tipo_vehiculo) filtered = filtered.filter(v => v.tipo_vehiculo === vehicleConfig.tipo_vehiculo);
    if (vehicleConfig.carroceria) filtered = filtered.filter(v => v.carroceria === vehicleConfig.carroceria);
    return [...new Set(filtered.map(v => v.tipo_carga))];
  }, [vehicleConfig.configuracion, vehicleConfig.tipo_vehiculo, vehicleConfig.carroceria]);

  // Auto-fill ejes, PBV and carga_util when enough fields selected
  useEffect(() => {
    let filtered = VEHICULOS_DATA;
    if (vehicleConfig.configuracion) filtered = filtered.filter(v => v.configuracion === vehicleConfig.configuracion);
    if (vehicleConfig.tipo_vehiculo) filtered = filtered.filter(v => v.tipo_vehiculo === vehicleConfig.tipo_vehiculo);
    if (vehicleConfig.carroceria) filtered = filtered.filter(v => v.carroceria === vehicleConfig.carroceria);
    if (vehicleConfig.tipo_carga) filtered = filtered.filter(v => v.tipo_carga === vehicleConfig.tipo_carga);

    if (filtered.length === 1) {
      const match = filtered[0];
      setVehicleConfig(prev => ({
        ...prev,
        ejes: String(match.ejes),
        peso_bruto_vehicular: String(match.peso_bruto_vehicular),
        carga_util: String(match.carga_util),
      }));
    } else if (filtered.length > 1 && vehicleConfig.configuracion) {
      // If all have same ejes/PBV, fill those
      const ejesSet = new Set(filtered.map(v => v.ejes));
      const pbvSet = new Set(filtered.map(v => v.peso_bruto_vehicular));
      setVehicleConfig(prev => ({
        ...prev,
        ejes: ejesSet.size === 1 ? String([...ejesSet][0]) : '',
        peso_bruto_vehicular: pbvSet.size === 1 ? String([...pbvSet][0]) : '',
        carga_util: '',
      }));
    }
  }, [vehicleConfig.configuracion, vehicleConfig.tipo_vehiculo, vehicleConfig.carroceria, vehicleConfig.tipo_carga]);

  const updateVehicle = (field, value) => {
    setVehicleConfig(prev => {
      const updated = { ...prev, [field]: value };
      // Reset dependent fields when parent changes
      if (field === 'configuracion') {
        updated.tipo_vehiculo = '';
        updated.carroceria = '';
        updated.tipo_carga = '';
        updated.ejes = '';
        updated.peso_bruto_vehicular = '';
        updated.carga_util = '';
      } else if (field === 'tipo_vehiculo') {
        updated.carroceria = '';
        updated.tipo_carga = '';
        updated.ejes = '';
        updated.peso_bruto_vehicular = '';
        updated.carga_util = '';
      } else if (field === 'carroceria') {
        updated.tipo_carga = '';
      }
      return updated;
    });
  };

  useEffect(() => { fetchFavoritos(); }, []);

  const fetchFavoritos = async () => {
    try {
      const res = await fetch(`${API}/direcciones-favoritas`);
      if (res.ok) setFavoritos(await res.json());
    } catch (e) { console.error(e); }
  };

  const saveFavorito = async () => {
    if (!favName.trim()) return;
    const addr = savingFavIndex === null ? cargueAddress : descargueAddresses[savingFavIndex];
    try {
      const res = await fetch(`${API}/direcciones-favoritas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre_favorito: favName.trim(), direccion: addr })
      });
      if (res.ok) {
        await fetchFavoritos();
        setShowFavModal(false);
        setFavName('');
        setSavingFavIndex(null);
      }
    } catch (e) { console.error(e); }
  };

  const handleSiguiente = async () => {
    if (currentStep === 1) {
      // Save cargue address as part of offer
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Save everything as offer draft
      try {
        await fetch(`${API}/ofertas-borrador`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cargue: cargueAddress, descargues: descargueAddresses })
        });
      } catch (e) { console.error(e); }
      // For now, go to step 3 placeholder
      setCurrentStep(3);
    }
  };

  const addDestino = () => setDescargueAddresses([...descargueAddresses, emptyAddress()]);
  const removeDestino = (idx) => {
    if (descargueAddresses.length > 1) {
      setDescargueAddresses(descargueAddresses.filter((_, i) => i !== idx));
    }
  };

  const steps = [
    { num: 1, label: 'Información de Cargue', icon: <MapPin size={16} /> },
    { num: 2, label: 'Información de Descargue', icon: <MapPin size={16} /> },
    { num: 3, label: 'Tipo de vehículo requerido', icon: <FileText size={16} /> },
    { num: 4, label: 'Condiciones de la oferta', icon: <FileText size={16} /> },
    { num: 5, label: 'Datos de la mercancía', icon: <FileText size={16} /> },
  ];

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <img src="https://customer-assets.emergentagent.com/job_2f7d0b2d-48f5-48d8-97ec-b1793c396cc6/artifacts/d1sq0sbe_CTCARGA%20SIN%20FONDO.png" alt="CTCARGA" className="sidebar-logo" />
          <div className="sidebar-brand"><h2>CTCARGA</h2><p>Empresa de logística</p></div>
        </div>
        <nav className="sidebar-nav" data-testid="sidebar-nav">
          <button className="nav-item" onClick={() => navigate('/dashboard')} data-testid="dashboard-nav-btn"><LayoutDashboard size={18} /><span>Dashboard</span></button>
          <button className="nav-item" onClick={() => navigate('/ofertas')} data-testid="ofertas-nav-btn"><FileText size={18} /><span>Ofertas</span></button>
          <button className="nav-item active" data-testid="creacion-ofertas-nav-btn"><Plus size={18} /><span>Creación ofertas</span></button>
          <button className="nav-item" data-testid="seguimiento-nav-btn"><TrendingUp size={18} /><span>Seguimiento cargas</span></button>
          <button className="nav-item" data-testid="alertas-nav-btn"><Bell size={18} /><span>Alertas</span><span className="badge">3</span></button>
          <button className="nav-item" data-testid="reportes-nav-btn"><TrendingUp size={18} /><span>Reportes</span></button>
        </nav>
        <div className="sidebar-footer">
          <button className="empresa-carga-btn" data-testid="empresa-carga-btn">Empresa de carga</button>
          <button className="nav-item" data-testid="config-nav-btn"><Settings size={18} /><span>Configuración</span></button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="dashboard-header">
          <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} data-testid="menu-toggle-btn"><Menu size={24} /></button>
          <div className="header-right">
            <span className="user-name" data-testid="user-name">Monica Arcila</span>
            <button className="user-avatar" data-testid="user-avatar-btn"><User size={20} /></button>
          </div>
        </header>

        <div className="content-wrapper">
          <p className="breadcrumb">Ofertas / Crear oferta</p>
          <h1 className="page-title" data-testid="page-title">Crear Oferta</h1>
          <p className="subtitle">Publica una nueva oferta de carga completando los 5 pasos del formulario</p>

          {/* Stepper */}
          <div className="stepper" data-testid="stepper">
            {steps.map((s, i) => (
              <React.Fragment key={s.num}>
                <div className={`step ${currentStep === s.num ? 'active' : ''} ${currentStep > s.num ? 'completed' : ''}`} data-testid={`step-${s.num}`}>
                  <div className="step-circle">{s.icon}</div>
                  <div className="step-info">
                    <span className="step-label">Paso {s.num}</span>
                    <span className="step-name">{s.label}</span>
                  </div>
                </div>
                {i < steps.length - 1 && <div className="step-connector" />}
              </React.Fragment>
            ))}
          </div>

          {/* Step 1: Información de Cargue */}
          {currentStep === 1 && (
            <div className="form-section" data-testid="step-1-form">
              <h2 className="section-title"><MapPin size={20} /> Información sitio de cargue</h2>
              <AddressForm address={cargueAddress} setAddress={setCargueAddress} favoritos={favoritos} title={null} index="cargue" />
              <div className="form-actions">
                <button className="btn-outline" onClick={() => { setSavingFavIndex(null); setShowFavModal(true); }} data-testid="guardar-favorito-btn">
                  <Star size={16} /> Guardar como favorito
                </button>
                <button className="btn-next" onClick={handleSiguiente} data-testid="siguiente-btn">
                  Siguiente <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Información de Descargue */}
          {currentStep === 2 && (
            <div className="form-section" data-testid="step-2-form">
              <h2 className="section-title"><MapPin size={20} /> Información sitio de descargue</h2>
              {descargueAddresses.map((addr, idx) => (
                <div key={idx} className="destino-block">
                  <div className="destino-header">
                    <h4>Destino {idx + 1}</h4>
                    {descargueAddresses.length > 1 && (
                      <button className="btn-remove-destino" onClick={() => removeDestino(idx)} data-testid={`remove-destino-${idx}`}><X size={16} /> Eliminar</button>
                    )}
                  </div>
                  <AddressForm
                    address={addr}
                    setAddress={(newAddr) => {
                      const updated = [...descargueAddresses];
                      updated[idx] = typeof newAddr === 'function' ? newAddr(updated[idx]) : newAddr;
                      setDescargueAddresses(updated);
                    }}
                    favoritos={favoritos}
                    title={null}
                    index={`descargue-${idx}`}
                  />
                  <div className="save-fav-inline">
                    <button className="btn-outline-sm" onClick={() => { setSavingFavIndex(idx); setShowFavModal(true); }} data-testid={`guardar-favorito-descargue-${idx}`}>
                      <Star size={14} /> Guardar como favorito
                    </button>
                  </div>
                </div>
              ))}
              <button className="btn-add-destino" onClick={addDestino} data-testid="agregar-destino-btn">
                <Plus size={16} /> Agregar otro destino
              </button>
              <div className="form-actions">
                <button className="btn-outline" onClick={() => setCurrentStep(1)} data-testid="anterior-btn">Anterior</button>
                <button className="btn-next" onClick={handleSiguiente} data-testid="siguiente-btn-2">
                  Siguiente <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Tipo de vehículo requerido */}
          {currentStep === 3 && (
            <div className="form-section" data-testid="step-3-form">
              <h2 className="section-title"><Truck size={20} /> Tipo de vehículo requerido</h2>

              <div className="form-row cols-2">
                <div className="form-group">
                  <label>Configuración</label>
                  <select className="form-input" value={vehicleConfig.configuracion} onChange={(e) => updateVehicle('configuracion', e.target.value)} data-testid="configuracion-select">
                    <option value="">Seleccionar configuración...</option>
                    {configuracionOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Tipo de vehículo</label>
                  <select className="form-input" value={vehicleConfig.tipo_vehiculo} onChange={(e) => updateVehicle('tipo_vehiculo', e.target.value)} disabled={!vehicleConfig.configuracion} data-testid="tipo-vehiculo-select">
                    <option value="">Seleccionar tipo...</option>
                    {tipoVehiculoOptions.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row cols-2">
                <div className="form-group">
                  <label>Carrocería</label>
                  <select className="form-input" value={vehicleConfig.carroceria} onChange={(e) => updateVehicle('carroceria', e.target.value)} disabled={!vehicleConfig.configuracion} data-testid="carroceria-select">
                    <option value="">Seleccionar carrocería...</option>
                    {carroceriaOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Tipo de carga</label>
                  <select className="form-input" value={vehicleConfig.tipo_carga} onChange={(e) => updateVehicle('tipo_carga', e.target.value)} disabled={!vehicleConfig.configuracion} data-testid="tipo-carga-select">
                    <option value="">Seleccionar tipo de carga...</option>
                    {tipoCargaOptions.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row cols-3">
                <div className="form-group">
                  <label>Ejes</label>
                  <div className="form-input readonly" data-testid="ejes-display">
                    {vehicleConfig.ejes || 'Se llena automáticamente'}
                  </div>
                </div>
                <div className="form-group">
                  <label>Peso Bruto Vehicular (toneladas)</label>
                  <div className="form-input readonly" data-testid="pbv-display">
                    {vehicleConfig.peso_bruto_vehicular ? `${vehicleConfig.peso_bruto_vehicular} ton` : 'Se llena automáticamente'}
                  </div>
                </div>
                <div className="form-group">
                  <label>Carga útil (toneladas)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={vehicleConfig.carga_util}
                    onChange={(e) => setVehicleConfig(prev => ({ ...prev, carga_util: e.target.value }))}
                    placeholder="Se llena automáticamente (editable)"
                    step="0.1"
                    data-testid="carga-util-input"
                  />
                </div>
              </div>

              {/* Vehicle Summary Card */}
              {vehicleConfig.configuracion && vehicleConfig.tipo_vehiculo && (
                <div className="vehicle-summary" data-testid="vehicle-summary">
                  <div className="summary-icon"><Truck size={28} /></div>
                  <div className="summary-details">
                    <h4>{vehicleConfig.configuracion} - {vehicleConfig.tipo_vehiculo}</h4>
                    <div className="summary-tags">
                      {vehicleConfig.carroceria && <span className="summary-tag">{vehicleConfig.carroceria}</span>}
                      {vehicleConfig.tipo_carga && <span className="summary-tag">{vehicleConfig.tipo_carga}</span>}
                      {vehicleConfig.ejes && <span className="summary-tag">{vehicleConfig.ejes} ejes</span>}
                      {vehicleConfig.peso_bruto_vehicular && <span className="summary-tag">PBV: {vehicleConfig.peso_bruto_vehicular} ton</span>}
                      {vehicleConfig.carga_util && <span className="summary-tag highlight">Carga útil: {vehicleConfig.carga_util} ton</span>}
                    </div>
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button className="btn-outline" onClick={() => setCurrentStep(2)} data-testid="anterior-btn-3">Anterior</button>
                <button className="btn-next" onClick={() => setCurrentStep(4)} data-testid="siguiente-btn-3">
                  Siguiente <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Steps 4-5: Placeholder */}
          {currentStep >= 4 && (
            <div className="form-section placeholder-step" data-testid="step-placeholder">
              <h2 className="section-title">{steps[currentStep - 1]?.label || 'Paso completado'}</h2>
              <p>Este paso se desarrollará próximamente.</p>
              <div className="form-actions">
                <button className="btn-outline" onClick={() => setCurrentStep(currentStep - 1)} data-testid="anterior-btn">Anterior</button>
                {currentStep < 5 && (
                  <button className="btn-next" onClick={() => setCurrentStep(currentStep + 1)} data-testid="siguiente-btn-next">
                    Siguiente <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal Guardar Favorito */}
      {showFavModal && (
        <div className="modal-overlay" data-testid="modal-favorito">
          <div className="modal-content">
            <div className="modal-header">
              <h3><Star size={18} /> Guardar como favorito</h3>
              <button className="modal-close" onClick={() => { setShowFavModal(false); setFavName(''); }}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <label>Nombre del favorito</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej: Bodega Principal, Oficina Central..."
                value={favName}
                onChange={(e) => setFavName(e.target.value)}
                autoFocus
                data-testid="fav-name-input"
              />
            </div>
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => { setShowFavModal(false); setFavName(''); }}>Cancelar</button>
              <button className="btn-next" onClick={saveFavorito} data-testid="save-fav-btn">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreacionOfertas;
