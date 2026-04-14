import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Plus, TrendingUp, Bell, Settings, Menu, User, MapPin, ChevronRight, Star, X, Search, ChevronDown, Truck, AlertCircle, Check } from 'lucide-react';
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

const emptyFlete = () => ({
  valorTotal: '', valorTrayecto1: '', valorTrayecto2: '',
  retencionFuente: '', retencionICA: '', valorAnticipo: '',
  lugarPago: '', fechaPago: '', carguePagadoPor: '', descarguePagadoPor: ''
});

const emptyDestinatario = () => ({ nombre: '', identificacion: '' });

/* ---- Main Page ---- */
const CreacionOfertas = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [favoritos, setFavoritos] = useState([]);
  const [showFavModal, setShowFavModal] = useState(false);
  const [favName, setFavName] = useState('');
  const [savingFavIndex, setSavingFavIndex] = useState(null);

  // Validation & Confirmation
  const [validationErrors, setValidationErrors] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmStep, setConfirmStep] = useState(null);

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

  // Step 4: Condiciones de la oferta
  const [condiciones, setCondiciones] = useState({
    remitente: '',
    nombreResponsable: '',
    identificacion: '',
    cantidadMovilizar: '',
    unidadMedida: '',
    naturalezaCarga: '',
    empaqueProducto: '',
    serialISO: '',
  });

  // Destinatario info per destination
  const [destinatarioInfo, setDestinatarioInfo] = useState([emptyDestinatario()]);

  // Multi-destino tonnage distribution
  const [distribucionDestinos, setDistribucionDestinos] = useState([]);

  // Fletes per destination
  const [fletesPerDestino, setFletesPerDestino] = useState([emptyFlete()]);

  // Sync arrays with destination count
  useEffect(() => {
    const len = descargueAddresses.length;
    setDestinatarioInfo(prev => descargueAddresses.map((_, i) => prev[i] || emptyDestinatario()));
    setFletesPerDestino(prev => descargueAddresses.map((_, i) => prev[i] || emptyFlete()));
    if (len > 1) {
      setDistribucionDestinos(prev => descargueAddresses.map((_, i) => prev[i] || ''));
    } else {
      setDistribucionDestinos([]);
    }
  }, [descargueAddresses.length]);

  // Helper to compute flete values
  const computeValorNeto = (flete) => {
    const total = parseFloat(flete.valorTotal) || 0;
    return total - (parseFloat(flete.retencionFuente) || 0) - (parseFloat(flete.retencionICA) || 0);
  };
  const computeSaldoPagar = (flete) => computeValorNeto(flete) - (parseFloat(flete.valorAnticipo) || 0);

  // Update helpers for per-destination arrays
  const updateDestinatario = (idx, field, value) => {
    setDestinatarioInfo(prev => {
      const arr = [...prev];
      arr[idx] = { ...arr[idx], [field]: value };
      return arr;
    });
  };
  const updateFlete = (idx, field, value) => {
    setFletesPerDestino(prev => {
      const arr = [...prev];
      arr[idx] = { ...arr[idx], [field]: value };
      return arr;
    });
  };

  const [infoCargue, setInfoCargue] = useState({
    fechaInicio: '',
    horaInicio: '',
    tiempoEstimadoValor: '',
    tiempoEstimadoUnidad: 'minutos',
    numSitiosCargue: '',
    observaciones: '',
  });

  const numVehiculosRequeridos = useMemo(() => {
    const cantidad = parseFloat(condiciones.cantidadMovilizar) || 0;
    const cargaUtil = parseFloat(vehicleConfig.carga_util) || 0;
    if (cargaUtil === 0 || cantidad === 0) return '';
    return Math.ceil(cantidad / cargaUtil);
  }, [condiciones.cantidadMovilizar, vehicleConfig.carga_util]);

  const formatCurrency = (val) => {
    if (!val && val !== 0) return '';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);
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

  /* ---- Validation ---- */
  const validateAddress = (address) => {
    const missing = [];
    if (!address.tipoVia) missing.push('Tipo de v\u00eda');
    if (!address.numeroPrincipal) missing.push('N\u00famero principal');
    if (!address.numeroSecundario) missing.push('N\u00famero secundario');
    if (!address.letraBis1) missing.push('Letra / Bis / Complemento');
    if (!address.departamento) missing.push('Departamento');
    if (!address.municipio) missing.push('Municipio');
    return missing;
  };

  const validateStep4 = () => {
    const errors = [];
    if (!condiciones.remitente) errors.push('Remitente');
    if (!condiciones.nombreResponsable) errors.push('Nombre Responsable');
    if (!condiciones.identificacion) errors.push('Identificaci\u00f3n del Remitente');
    if (!condiciones.cantidadMovilizar) errors.push('Cantidad a movilizar');
    if (!condiciones.unidadMedida) errors.push('Unidad de medida');
    if (!condiciones.naturalezaCarga) errors.push('Naturaleza de la carga');
    if (!condiciones.empaqueProducto) errors.push('Empaque - Producto');
    if (condiciones.empaqueProducto && condiciones.empaqueProducto.toLowerCase().includes('contenedor') && !condiciones.serialISO) {
      errors.push('Serial ISO del Contenedor');
    }

    destinatarioInfo.forEach((dest, idx) => {
      const prefix = descargueAddresses.length > 1 ? `Destino ${idx + 1}: ` : '';
      if (!dest.nombre) errors.push(`${prefix}Nombre Destinatario`);
      if (!dest.identificacion) errors.push(`${prefix}Identificaci\u00f3n Destinatario`);
    });

    if (descargueAddresses.length > 1 && condiciones.cantidadMovilizar) {
      const total = parseFloat(condiciones.cantidadMovilizar) || 0;
      const sum = distribucionDestinos.reduce((s, v) => s + (parseFloat(v) || 0), 0);
      if (Math.abs(sum - total) > 0.001) {
        errors.push(`La distribuci\u00f3n (${sum}) no coincide con la cantidad a movilizar (${total})`);
      }
    }

    fletesPerDestino.forEach((flete, idx) => {
      const prefix = descargueAddresses.length > 1 ? `Destino ${idx + 1}: ` : '';
      if (!flete.valorTotal) errors.push(`${prefix}Valor Total a Pagar`);
      if (!flete.retencionFuente) errors.push(`${prefix}Retenci\u00f3n en la Fuente`);
      if (!flete.retencionICA) errors.push(`${prefix}Retenci\u00f3n ICA`);
      if (!flete.valorAnticipo) errors.push(`${prefix}Valor Anticipo`);
      if (!flete.lugarPago) errors.push(`${prefix}Lugar de Pago`);
      if (!flete.fechaPago) errors.push(`${prefix}Fecha de Pago`);
      if (!flete.carguePagadoPor) errors.push(`${prefix}Cargue Pagado Por`);
      if (!flete.descarguePagadoPor) errors.push(`${prefix}Descargue Pagado Por`);
    });

    if (!infoCargue.fechaInicio) errors.push('Fecha de Inicio de Cargue');
    if (!infoCargue.horaInicio) errors.push('Hora de Inicio de Cargue');
    if (!infoCargue.tiempoEstimadoValor) errors.push('Tiempo estimado de Cargue');
    if (!infoCargue.numSitiosCargue) errors.push('N\u00famero de sitios de Cargue');

    return errors;
  };

  /* ---- Navigation ---- */
  const handleSiguiente = () => {
    setValidationErrors([]);

    if (currentStep === 1) {
      const errors = validateAddress(cargueAddress);
      if (errors.length > 0) {
        setValidationErrors(errors);
        return;
      }
      setConfirmStep(1);
      setShowConfirmModal(true);
    } else if (currentStep === 2) {
      const allErrors = [];
      descargueAddresses.forEach((addr, idx) => {
        const errors = validateAddress(addr);
        if (errors.length > 0) {
          allErrors.push(...errors.map(e => `Destino ${idx + 1}: ${e}`));
        }
      });
      if (allErrors.length > 0) {
        setValidationErrors(allErrors);
        return;
      }
      setConfirmStep(2);
      setShowConfirmModal(true);
    } else if (currentStep === 3) {
      const errors = [];
      if (!vehicleConfig.configuracion) errors.push('Configuraci\u00f3n');
      if (!vehicleConfig.tipo_vehiculo) errors.push('Tipo de veh\u00edculo');
      if (!vehicleConfig.carroceria) errors.push('Carrocer\u00eda');
      if (!vehicleConfig.tipo_carga) errors.push('Tipo de carga');
      if (errors.length > 0) {
        setValidationErrors(errors);
        return;
      }
      setCurrentStep(4);
    }
  };

  const handleConfirmModal = () => {
    setShowConfirmModal(false);
    setCurrentStep(confirmStep + 1);
    setConfirmStep(null);
  };

  const addDestino = () => setDescargueAddresses([...descargueAddresses, emptyAddress()]);
  const removeDestino = (idx) => {
    if (descargueAddresses.length > 1) {
      setDescargueAddresses(descargueAddresses.filter((_, i) => i !== idx));
    }
  };

  // Clean functions for each step
  const limpiarPaso1 = () => { setCargueAddress(emptyAddress()); setValidationErrors([]); };
  const limpiarPaso2 = () => { setDescargueAddresses([emptyAddress()]); setValidationErrors([]); };
  const limpiarPaso3 = () => { setVehicleConfig({ configuracion: '', tipo_vehiculo: '', carroceria: '', tipo_carga: '', ejes: '', peso_bruto_vehicular: '', carga_util: '' }); setValidationErrors([]); };
  const limpiarPaso4 = () => {
    setCondiciones({ remitente: '', nombreResponsable: '', identificacion: '', cantidadMovilizar: '', unidadMedida: '', naturalezaCarga: '', empaqueProducto: '', serialISO: '' });
    setDestinatarioInfo(descargueAddresses.map(() => emptyDestinatario()));
    setFletesPerDestino(descargueAddresses.map(() => emptyFlete()));
    setDistribucionDestinos(descargueAddresses.length > 1 ? descargueAddresses.map(() => '') : []);
    setInfoCargue({ fechaInicio: '', horaInicio: '', tiempoEstimadoValor: '', tiempoEstimadoUnidad: 'minutos', numSitiosCargue: '', observaciones: '' });
    setValidationErrors([]);
  };

  // Crear Oferta
  const [creando, setCreando] = useState(false);
  const handleCrearOferta = async () => {
    setValidationErrors([]);
    const errors = validateStep4();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setCreando(true);
    try {
      const payload = {
        remitente: condiciones.remitente,
        destinatario: destinatarioInfo[0]?.nombre || '',
        nombre_responsable: condiciones.nombreResponsable,
        identificacion: condiciones.identificacion,
        cargue: cargueAddress,
        descargues: descargueAddresses.map((addr, i) => ({
          ...addr,
          destinatario_nombre: destinatarioInfo[i]?.nombre || '',
          destinatario_identificacion: destinatarioInfo[i]?.identificacion || '',
          distribucion: descargueAddresses.length > 1 ? (distribucionDestinos[i] || '') : condiciones.cantidadMovilizar,
          fletes: {
            ...fletesPerDestino[i],
            valorNeto: computeValorNeto(fletesPerDestino[i]),
            saldoPagar: computeSaldoPagar(fletesPerDestino[i]),
          },
        })),
        vehiculo: vehicleConfig,
        condiciones: {
          cantidadMovilizar: condiciones.cantidadMovilizar,
          unidadMedida: condiciones.unidadMedida,
          naturalezaCarga: condiciones.naturalezaCarga,
          empaqueProducto: condiciones.empaqueProducto,
          serialISO: condiciones.serialISO,
        },
        fletes: {
          ...fletesPerDestino[0],
          valorNeto: computeValorNeto(fletesPerDestino[0]),
          saldoPagar: computeSaldoPagar(fletesPerDestino[0]),
        },
        info_cargue: { ...infoCargue, numVehiculosRequeridos },
      };
      const res = await fetch(`${API}/ofertas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const created = await res.json();
        alert(`Oferta creada exitosamente!\nC\u00f3digo: ${created.codigo_oferta}`);
        navigate('/ofertas');
      }
    } catch (e) {
      console.error(e);
      alert('Error al crear la oferta');
    } finally {
      setCreando(false);
    }
  };

  // Distribution sum check
  const distribucionTotal = useMemo(() => {
    return distribucionDestinos.reduce((s, v) => s + (parseFloat(v) || 0), 0);
  }, [distribucionDestinos]);

  const distribucionValida = useMemo(() => {
    if (descargueAddresses.length <= 1) return true;
    if (!condiciones.cantidadMovilizar) return true;
    const total = parseFloat(condiciones.cantidadMovilizar) || 0;
    return Math.abs(distribucionTotal - total) < 0.001;
  }, [distribucionTotal, condiciones.cantidadMovilizar, descargueAddresses.length]);

  const steps = [
    { num: 1, label: 'Informaci\u00f3n de Cargue', icon: <MapPin size={16} /> },
    { num: 2, label: 'Informaci\u00f3n de Descargue', icon: <MapPin size={16} /> },
    { num: 3, label: 'Tipo de veh\u00edculo requerido', icon: <Truck size={16} /> },
    { num: 4, label: 'Condiciones de la oferta', icon: <FileText size={16} /> },
  ];

  /* ---- Validation Errors Display ---- */
  const ValidationErrorsBox = () => validationErrors.length > 0 ? (
    <div className="validation-errors" data-testid="validation-errors">
      <AlertCircle size={18} />
      <div>
        <p className="validation-title">Campos obligatorios faltantes:</p>
        <ul>
          {validationErrors.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      </div>
    </div>
  ) : null;

  /* ---- Flete Section Component ---- */
  const FleteSection = ({ flete, idx, showTitle }) => (
    <div className="subsection flete-destino-section" data-testid={`fletes-section-${idx}`}>
      {showTitle && <h3 className="subsection-title">Fletes - Destino {idx + 1}</h3>}
      {!showTitle && <h3 className="subsection-title">Fletes</h3>}
      <div className="form-row cols-3">
        <div className="form-group">
          <label>Valor Total a Pagar *</label>
          <input type="number" className="form-input currency-input" placeholder="$ 0" value={flete.valorTotal} onChange={(e) => updateFlete(idx, 'valorTotal', e.target.value)} data-testid={`valor-total-input-${idx}`} />
        </div>
        <div className="form-group">
          <label>Valor Trayecto 1</label>
          <input type="number" className="form-input currency-input" placeholder="$ 0" value={flete.valorTrayecto1} onChange={(e) => updateFlete(idx, 'valorTrayecto1', e.target.value)} data-testid={`valor-trayecto1-input-${idx}`} />
        </div>
        <div className="form-group">
          <label>Valor Trayecto 2</label>
          <input type="number" className="form-input currency-input" placeholder="$ 0" value={flete.valorTrayecto2} onChange={(e) => updateFlete(idx, 'valorTrayecto2', e.target.value)} data-testid={`valor-trayecto2-input-${idx}`} />
        </div>
      </div>
      <div className="form-row cols-3">
        <div className="form-group">
          <label>Retención en la Fuente *</label>
          <input type="number" className="form-input currency-input" placeholder="$ 0" value={flete.retencionFuente} onChange={(e) => updateFlete(idx, 'retencionFuente', e.target.value)} data-testid={`retencion-fuente-input-${idx}`} />
        </div>
        <div className="form-group">
          <label>Retención ICA *</label>
          <input type="number" className="form-input currency-input" placeholder="$ 0" value={flete.retencionICA} onChange={(e) => updateFlete(idx, 'retencionICA', e.target.value)} data-testid={`retencion-ica-input-${idx}`} />
        </div>
        <div className="form-group">
          <label>Valor Neto a Pagar</label>
          <div className="form-input readonly currency-display" data-testid={`valor-neto-display-${idx}`}>{formatCurrency(computeValorNeto(flete))}</div>
        </div>
      </div>
      <div className="form-row cols-2">
        <div className="form-group">
          <label>Valor Anticipo *</label>
          <input type="number" className="form-input currency-input" placeholder="$ 0" value={flete.valorAnticipo} onChange={(e) => updateFlete(idx, 'valorAnticipo', e.target.value)} data-testid={`valor-anticipo-input-${idx}`} />
        </div>
        <div className="form-group">
          <label>Saldo a Pagar</label>
          <div className="form-input readonly currency-display" data-testid={`saldo-pagar-display-${idx}`}>{formatCurrency(computeSaldoPagar(flete))}</div>
        </div>
      </div>
      <div className="form-row cols-2">
        <div className="form-group">
          <label>Lugar de Pago *</label>
          <input type="text" className="form-input" placeholder="Ingrese el lugar de pago" value={flete.lugarPago} onChange={(e) => updateFlete(idx, 'lugarPago', e.target.value)} data-testid={`lugar-pago-input-${idx}`} />
        </div>
        <div className="form-group">
          <label>Fecha de Pago *</label>
          <input type="date" className="form-input" value={flete.fechaPago} onChange={(e) => updateFlete(idx, 'fechaPago', e.target.value)} data-testid={`fecha-pago-input-${idx}`} />
        </div>
      </div>
      <div className="form-row cols-2">
        <div className="form-group">
          <label>Cargue Pagado Por *</label>
          <input type="text" className="form-input" placeholder="Ingrese quién paga el cargue" value={flete.carguePagadoPor} onChange={(e) => updateFlete(idx, 'carguePagadoPor', e.target.value)} data-testid={`cargue-pagado-input-${idx}`} />
        </div>
        <div className="form-group">
          <label>Descargue Pagado Por *</label>
          <input type="text" className="form-input" placeholder="Ingrese quién paga el descargue" value={flete.descarguePagadoPor} onChange={(e) => updateFlete(idx, 'descarguePagadoPor', e.target.value)} data-testid={`descargue-pagado-input-${idx}`} />
        </div>
      </div>
    </div>
  );

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
          <button className="nav-item active" onClick={() => navigate('/creacion-ofertas')} data-testid="creacion-ofertas-nav-btn"><Plus size={18} /><span>Creación ofertas</span></button>
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
          <p className="subtitle">Publica una nueva oferta de carga completando los 4 pasos del formulario</p>

          {/* Stepper */}
          <div className="stepper" data-testid="stepper">
            {steps.map((s, i) => (
              <React.Fragment key={s.num}>
                <div className={`step ${currentStep === s.num ? 'active' : ''} ${currentStep > s.num ? 'completed' : ''}`} data-testid={`step-${s.num}`}>
                  <div className="step-circle">{currentStep > s.num ? <Check size={16} /> : s.icon}</div>
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
              <ValidationErrorsBox />
              <div className="form-actions">
                <button className="btn-clean" onClick={limpiarPaso1} data-testid="limpiar-paso1-btn">Limpiar</button>
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
              <ValidationErrorsBox />
              <div className="form-actions">
                <button className="btn-clean" onClick={limpiarPaso2} data-testid="limpiar-paso2-btn">Limpiar</button>
                <button className="btn-outline" onClick={() => { setCurrentStep(1); setValidationErrors([]); }} data-testid="anterior-btn">Anterior</button>
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
                  <label>Configuración *</label>
                  <select className="form-input" value={vehicleConfig.configuracion} onChange={(e) => updateVehicle('configuracion', e.target.value)} data-testid="configuracion-select">
                    <option value="">Seleccionar configuración...</option>
                    {configuracionOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Tipo de vehículo *</label>
                  <select className="form-input" value={vehicleConfig.tipo_vehiculo} onChange={(e) => updateVehicle('tipo_vehiculo', e.target.value)} disabled={!vehicleConfig.configuracion} data-testid="tipo-vehiculo-select">
                    <option value="">Seleccionar tipo...</option>
                    {tipoVehiculoOptions.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row cols-2">
                <div className="form-group">
                  <label>Carrocería *</label>
                  <select className="form-input" value={vehicleConfig.carroceria} onChange={(e) => updateVehicle('carroceria', e.target.value)} disabled={!vehicleConfig.configuracion} data-testid="carroceria-select">
                    <option value="">Seleccionar carrocería...</option>
                    {carroceriaOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Tipo de carga *</label>
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
                    {vehicleConfig.ejes || 'Se llena autom\u00e1ticamente'}
                  </div>
                </div>
                <div className="form-group">
                  <label>Peso Bruto Vehicular (toneladas)</label>
                  <div className="form-input readonly" data-testid="pbv-display">
                    {vehicleConfig.peso_bruto_vehicular ? `${vehicleConfig.peso_bruto_vehicular} ton` : 'Se llena autom\u00e1ticamente'}
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

              <ValidationErrorsBox />
              <div className="form-actions">
                <button className="btn-clean" onClick={limpiarPaso3} data-testid="limpiar-paso3-btn">Limpiar</button>
                <button className="btn-outline" onClick={() => { setCurrentStep(2); setValidationErrors([]); }} data-testid="anterior-btn-3">Anterior</button>
                <button className="btn-next" onClick={handleSiguiente} data-testid="siguiente-btn-3">
                  Siguiente <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Condiciones de la Oferta */}
          {currentStep === 4 && (
            <div className="form-section" data-testid="step-4-form">
              <h2 className="section-title"><FileText size={20} /> Condiciones de la Oferta</h2>

              {/* Remitente Section */}
              <div className="subsection-block" data-testid="remitente-section">
                <h3 className="block-title"><User size={18} /> Remitente</h3>
                <div className="form-row cols-3">
                  <div className="form-group">
                    <label>Remitente *</label>
                    <input type="text" className="form-input" placeholder="Nombre del remitente" value={condiciones.remitente} onChange={(e) => setCondiciones({...condiciones, remitente: e.target.value})} data-testid="remitente-input" />
                  </div>
                  <div className="form-group">
                    <label>Nombre Responsable *</label>
                    <input type="text" className="form-input" placeholder="Nombre del responsable" value={condiciones.nombreResponsable} onChange={(e) => setCondiciones({...condiciones, nombreResponsable: e.target.value})} data-testid="nombre-responsable-input" />
                  </div>
                  <div className="form-group">
                    <label>Identificación *</label>
                    <input type="text" className="form-input" placeholder="Número de identificación" value={condiciones.identificacion} onChange={(e) => setCondiciones({...condiciones, identificacion: e.target.value})} data-testid="identificacion-input" />
                  </div>
                </div>
                <div className="form-row cols-1">
                  <div className="form-group">
                    <label>Dirección del Remitente</label>
                    <div className="form-input readonly" data-testid="direccion-remitente-display">
                      {cargueAddress.direccionConstruida || 'Se carga autom\u00e1ticamente desde el Paso 1'}
                    </div>
                  </div>
                </div>
              </div>

              {/* General Conditions */}
              <div className="form-row cols-2">
                <div className="form-group">
                  <label>Cantidad a movilizar *</label>
                  <input type="number" className="form-input" value={condiciones.cantidadMovilizar} onChange={(e) => setCondiciones({...condiciones, cantidadMovilizar: e.target.value})} data-testid="cantidad-movilizar-input" />
                </div>
                <div className="form-group">
                  <label>Unidad de medida *</label>
                  <select className="form-input" value={condiciones.unidadMedida} onChange={(e) => setCondiciones({...condiciones, unidadMedida: e.target.value})} data-testid="unidad-medida-select">
                    <option value="">Seleccionar...</option>
                    <option value="Toneladas">Toneladas</option>
                    <option value="Litros">Litros</option>
                    <option value="Contenedores">Contenedores</option>
                  </select>
                </div>
              </div>

              <div className="form-row cols-2">
                <div className="form-group">
                  <label>Naturaleza de la carga *</label>
                  <select className="form-input" value={condiciones.naturalezaCarga} onChange={(e) => setCondiciones({...condiciones, naturalezaCarga: e.target.value})} data-testid="naturaleza-carga-select">
                    <option value="">Seleccionar...</option>
                    {["Animales vivos","Carne","Leche","Frutas","Verduras","Granos","Cemento","Carb\u00f3n","Petr\u00f3leo","Gas","Productos qu\u00edmicos","Medicamentos","Maquinaria","Veh\u00edculos","Electrodom\u00e9sticos","Madera"].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Empaque - Producto Transportado *</label>
                  <select className="form-input" value={condiciones.empaqueProducto} onChange={(e) => setCondiciones({...condiciones, empaqueProducto: e.target.value})} data-testid="empaque-select">
                    <option value="">Seleccionar...</option>
                    {["A granel","En sacos","En bolsas","En cajas","En cajones","En paquetes","En fardos","Paletizado","Big Bag","Contenedor 20 pies","Contenedor 40 pies","Contenedor refrigerado","Contenedor tanque","A granel l\u00edquido","En tanques","En cisternas","En bidones","En tambores","Veh\u00edculos rodando (sin embalaje)","Maquinaria suelta","Sobredimensionada sin embalaje","Animales vivos (en pie)","En canastillas","En rollos","En tubos","En bobinas"].map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              </div>

              {/* Contenedor Serial ISO */}
              {condiciones.empaqueProducto && condiciones.empaqueProducto.toLowerCase().includes('contenedor') && (
                <div className="form-row cols-2">
                  <div className="form-group">
                    <label>Serial ISO del Contenedor *</label>
                    <input type="text" className="form-input" placeholder="Ej: MSCU1234567" value={condiciones.serialISO} onChange={(e) => setCondiciones({...condiciones, serialISO: e.target.value})} data-testid="serial-iso-input" />
                  </div>
                </div>
              )}

              {/* Per-Destination Sections */}
              {descargueAddresses.map((addr, idx) => (
                <div key={idx} className="destino-step4-block" data-testid={`destino-step4-${idx}`}>
                  <h3 className="destino-step4-title">
                    <MapPin size={18} /> Destino {idx + 1} {addr.municipio ? `- ${addr.municipio}` : ''}
                  </h3>

                  {/* Destinatario Info */}
                  <div className="subsection-block">
                    <h4 className="block-subtitle">Destinatario</h4>
                    <div className="form-row cols-3">
                      <div className="form-group">
                        <label>Nombre Destinatario *</label>
                        <input type="text" className="form-input" placeholder="Nombre del destinatario" value={destinatarioInfo[idx]?.nombre || ''} onChange={(e) => updateDestinatario(idx, 'nombre', e.target.value)} data-testid={`destinatario-nombre-${idx}`} />
                      </div>
                      <div className="form-group">
                        <label>Identificación Destinatario *</label>
                        <input type="text" className="form-input" placeholder="Número de identificación" value={destinatarioInfo[idx]?.identificacion || ''} onChange={(e) => updateDestinatario(idx, 'identificacion', e.target.value)} data-testid={`destinatario-identificacion-${idx}`} />
                      </div>
                      <div className="form-group">
                        <label>Dirección Destinatario</label>
                        <div className="form-input readonly" data-testid={`destinatario-direccion-${idx}`}>
                          {addr.direccionConstruida || 'Se carga desde el Paso 2'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Distribution (multi-destination only) */}
                  {descargueAddresses.length > 1 && condiciones.cantidadMovilizar && (
                    <div className="distribution-inline">
                      <label>Cantidad para este destino ({condiciones.unidadMedida || 'unidades'}) *</label>
                      <input type="number" className="form-input" placeholder="0" value={distribucionDestinos[idx] || ''} onChange={(e) => { const arr = [...distribucionDestinos]; arr[idx] = e.target.value; setDistribucionDestinos(arr); }} data-testid={`distribucion-destino-${idx}`} />
                    </div>
                  )}

                  {/* Fletes for this destination */}
                  <FleteSection flete={fletesPerDestino[idx] || emptyFlete()} idx={idx} showTitle={descargueAddresses.length > 1} />
                </div>
              ))}

              {/* Distribution validation message */}
              {descargueAddresses.length > 1 && condiciones.cantidadMovilizar && (
                <div className={`distribution-summary ${distribucionValida ? 'valid' : 'invalid'}`} data-testid="distribution-summary">
                  {distribucionValida ? <Check size={16} /> : <AlertCircle size={16} />}
                  <span>
                    Distribuido: {distribucionTotal} / {condiciones.cantidadMovilizar} {condiciones.unidadMedida}
                    {distribucionValida ? ' - Correcto' : ' - La suma debe coincidir con la cantidad total'}
                  </span>
                </div>
              )}

              {/* Sección Información del Cargue */}
              <div className="subsection" data-testid="info-cargue-section">
                <h3 className="subsection-title">Información del Cargue</h3>
                <div className="form-row cols-3">
                  <div className="form-group">
                    <label>Fecha de Inicio de Cargue *</label>
                    <input type="date" className="form-input" value={infoCargue.fechaInicio} onChange={(e) => setInfoCargue({...infoCargue, fechaInicio: e.target.value})} data-testid="fecha-inicio-input" />
                  </div>
                  <div className="form-group">
                    <label>Hora de Inicio de Cargue *</label>
                    <input type="time" className="form-input" step="1" value={infoCargue.horaInicio} onChange={(e) => setInfoCargue({...infoCargue, horaInicio: e.target.value})} data-testid="hora-inicio-input" />
                  </div>
                  <div className="form-group">
                    <label>Tiempo estimado de Cargue *</label>
                    <div className="input-with-unit">
                      <input type="number" className="form-input" placeholder="0" value={infoCargue.tiempoEstimadoValor} onChange={(e) => setInfoCargue({...infoCargue, tiempoEstimadoValor: e.target.value})} data-testid="tiempo-estimado-input" />
                      <select className="unit-select" value={infoCargue.tiempoEstimadoUnidad} onChange={(e) => setInfoCargue({...infoCargue, tiempoEstimadoUnidad: e.target.value})} data-testid="tiempo-unidad-select">
                        <option value="minutos">Minutos</option>
                        <option value="horas">Horas</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="form-row cols-2">
                  <div className="form-group">
                    <label>Número de sitios de Cargue *</label>
                    <input type="number" className="form-input" value={infoCargue.numSitiosCargue} onChange={(e) => setInfoCargue({...infoCargue, numSitiosCargue: e.target.value})} data-testid="num-sitios-input" />
                  </div>
                  <div className="form-group">
                    <label>Número de Vehículos Requeridos</label>
                    <div className="form-input readonly" data-testid="num-vehiculos-display">
                      {numVehiculosRequeridos || 'Se calcula autom\u00e1ticamente (cantidad / carga \u00fatil)'}
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label>Observaciones</label>
                  <textarea className="form-input textarea" rows="4" placeholder="Escriba observaciones adicionales..." value={infoCargue.observaciones} onChange={(e) => setInfoCargue({...infoCargue, observaciones: e.target.value})} data-testid="observaciones-input" />
                </div>
              </div>

              <ValidationErrorsBox />
              <div className="form-actions">
                <button className="btn-clean" onClick={limpiarPaso4} data-testid="limpiar-paso4-btn">Limpiar</button>
                <button className="btn-outline" onClick={() => { setCurrentStep(3); setValidationErrors([]); }} data-testid="anterior-btn-4">Anterior</button>
                <button className="btn-crear-oferta" onClick={handleCrearOferta} disabled={creando} data-testid="crear-oferta-btn">
                  {creando ? 'Creando...' : 'Crear Oferta'}
                </button>
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

      {/* Modal Confirmar Dirección */}
      {showConfirmModal && (
        <div className="modal-overlay" data-testid="modal-confirm">
          <div className="modal-content modal-confirm-content">
            <div className="modal-header">
              <h3><Check size={18} /> {confirmStep === 1 ? 'Confirmar Direcci\u00f3n de Cargue' : 'Confirmar Direcciones de Descargue'}</h3>
              <button className="modal-close" onClick={() => setShowConfirmModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              {confirmStep === 1 && (
                <div className="confirm-address-card" data-testid="confirm-card-cargue">
                  <div className="confirm-field"><span className="confirm-label">Tipo de vía:</span> {cargueAddress.tipoVia}</div>
                  <div className="confirm-field"><span className="confirm-label">Número:</span> {cargueAddress.numeroPrincipal} # {cargueAddress.numeroSecundario}</div>
                  <div className="confirm-field"><span className="confirm-label">Departamento:</span> {cargueAddress.departamento}</div>
                  <div className="confirm-field"><span className="confirm-label">Municipio:</span> {cargueAddress.municipio}</div>
                  <div className="confirm-field full"><span className="confirm-label">Dirección:</span> {cargueAddress.direccionConstruida}</div>
                </div>
              )}
              {confirmStep === 2 && descargueAddresses.map((addr, idx) => (
                <div key={idx} className="confirm-address-card" data-testid={`confirm-card-descargue-${idx}`}>
                  <h4 className="confirm-destino-title">Destino {idx + 1}</h4>
                  <div className="confirm-field"><span className="confirm-label">Tipo de vía:</span> {addr.tipoVia}</div>
                  <div className="confirm-field"><span className="confirm-label">Número:</span> {addr.numeroPrincipal} # {addr.numeroSecundario}</div>
                  <div className="confirm-field"><span className="confirm-label">Departamento:</span> {addr.departamento}</div>
                  <div className="confirm-field"><span className="confirm-label">Municipio:</span> {addr.municipio}</div>
                  <div className="confirm-field full"><span className="confirm-label">Dirección:</span> {addr.direccionConstruida}</div>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setShowConfirmModal(false)} data-testid="confirm-edit-btn">Editar</button>
              <button className="btn-next" onClick={handleConfirmModal} data-testid="confirm-ok-btn">
                <Check size={16} /> Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreacionOfertas;
