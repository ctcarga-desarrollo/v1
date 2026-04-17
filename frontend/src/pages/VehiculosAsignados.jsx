import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, MapPin, Phone, Clock, Truck, AlertCircle, CheckCircle } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function VehiculosAsignados() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [datos, setDatos] = useState(null);
  const [modalDocumentos, setModalDocumentos] = useState(null);
  const [modalGPS, setModalGPS] = useState(null);
  const [modalContacto, setModalContacto] = useState(null);

  useEffect(() => {
    cargarVehiculosAsignados();
  }, [id]);

  const cargarVehiculosAsignados = async () => {
    try {
      const res = await fetch(`${API}/api/ofertas/${id}/vehiculos-asignados`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setDatos(data);
      }
    } catch (err) {
      console.error('Error al cargar vehículos:', err);
    } finally {
      setLoading(false);
    }
  };

  const calcularSemaforo = (vehiculo) => {
    const estado = vehiculo.estado.toLowerCase();
    const tiemposEstimados = vehiculo.tiempos_estimados;
    
    // Solo calcular semáforo para estados en proceso
    if (!['en_cargue', 'en_ruta', 'en_descargue'].includes(estado)) {
      return null;
    }

    const fechaCambioEstado = vehiculo.timestamps?.fecha_cambio_estado;
    if (!fechaCambioEstado) return null;

    const tiempoTranscurrido = (new Date() - new Date(fechaCambioEstado)) / 60000; // en minutos
    
    let tiempoEstimado = 0;
    if (estado === 'en_cargue') {
      tiempoEstimado = tiemposEstimados.cargue;
    } else if (estado === 'en_ruta') {
      tiempoEstimado = tiemposEstimados.ruta;
    } else if (estado === 'en_descargue') {
      tiempoEstimado = tiemposEstimados.descargue;
    }

    const dentroDeTiempo = tiempoTranscurrido <= tiempoEstimado;

    return {
      color: dentroDeTiempo ? 'green' : 'red',
      texto: dentroDeTiempo ? 'En tiempo' : 'Fuera de tiempo',
      tiempoTranscurrido: Math.round(tiempoTranscurrido),
      tiempoEstimado
    };
  };

  const getBadgeColor = (tipoPropiedad) => {
    switch (tipoPropiedad) {
      case 'flota_propia':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'tercero_vinculado':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'tercero_externo':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getEstadoLabel = (estado) => {
    const labels = {
      'asignado': 'Asignado',
      'en_cargue': 'En Cargue',
      'en_ruta': 'En Ruta',
      'en_descargue': 'En Descargue',
      'finalizado': 'Finalizado'
    };
    return labels[estado?.toLowerCase()] || estado;
  };

  const getTipoLabel = (tipo) => {
    const labels = {
      'flota_propia': 'Flota Propia',
      'tercero_vinculado': 'Tercero Vinculado',
      'tercero_externo': 'Tercero'
    };
    return labels[tipo] || tipo;
  };

  const formatearHora = (isoString) => {
    if (!isoString) return 'N/A';
    const fecha = new Date(isoString);
    return fecha.toLocaleString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="ofertas-container">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Cargando vehículos asignados...</p>
        </div>
      </div>
    );
  }

  if (!datos || !datos.vehiculos || datos.vehiculos.length === 0) {
    return (
      <div className="ofertas-container">
        <div className="ofertas-header">
          <button onClick={() => navigate('/ofertas')} className="btn-back">
            <ArrowLeft size={20} />
            Volver
          </button>
          <h1>Vehículos Asignados</h1>
        </div>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <AlertCircle size={48} style={{ color: '#888', margin: '0 auto 16px' }} />
          <p>No hay vehículos asignados a esta oferta.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ofertas-container">
      <div className="ofertas-header">
        <button onClick={() => navigate('/ofertas')} className="btn-back">
          <ArrowLeft size={20} />
          Volver
        </button>
        <h1>Vehículos Asignados</h1>
      </div>

      {/* Resumen */}
      <div style={{ 
        background: '#f8fafc', 
        padding: '16px 20px', 
        borderRadius: '8px', 
        marginBottom: '24px',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: '14px', color: '#64748b' }}>Oferta: </span>
            <strong>{datos.oferta_codigo}</strong>
          </div>
          <div>
            <span style={{ fontSize: '14px', color: '#64748b' }}>Vehículos asignados: </span>
            <strong>{datos.resumen.total_asignados}</strong>
          </div>
          <div>
            <span style={{ fontSize: '14px', color: '#64748b' }}>Turnos: </span>
            <strong>{datos.resumen.total_turnos}</strong>
          </div>
          <div>
            <span style={{ fontSize: '14px', color: '#64748b' }}>Completitud: </span>
            <strong>{datos.resumen.porcentaje_completado.toFixed(1)}%</strong>
          </div>
        </div>
      </div>

      {/* Tabla de vehículos */}
      <div className="ofertas-table-container">
        <table className="ofertas-table">
          <thead>
            <tr>
              <th>Placa</th>
              <th>Conductor</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Turno de Cargue</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {datos.vehiculos.map((vehiculo, idx) => {
              const semaforo = calcularSemaforo(vehiculo);
              
              return (
                <tr key={idx}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Truck size={18} style={{ color: '#64748b' }} />
                      <strong>{vehiculo.placa}</strong>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      {vehiculo.marca} {vehiculo.linea}
                    </div>
                  </td>
                  
                  <td>
                    <div>{vehiculo.conductor?.nombre || 'N/A'}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      {vehiculo.conductor?.telefono || ''}
                    </div>
                  </td>
                  
                  <td>
                    <span className={`badge ${getBadgeColor(vehiculo.tipo_propiedad)}`}>
                      {getTipoLabel(vehiculo.tipo_propiedad)}
                    </span>
                  </td>
                  
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {semaforo && (
                        <div 
                          style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            backgroundColor: semaforo.color === 'green' ? '#22c55e' : '#ef4444',
                            boxShadow: `0 0 8px ${semaforo.color === 'green' ? '#22c55e' : '#ef4444'}`
                          }}
                          title={`${semaforo.texto}: ${semaforo.tiempoTranscurrido}/${semaforo.tiempoEstimado} mins`}
                        />
                      )}
                      <span>{getEstadoLabel(vehiculo.estado)}</span>
                    </div>
                    {semaforo && (
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                        {semaforo.tiempoTranscurrido}/{semaforo.tiempoEstimado} mins
                      </div>
                    )}
                  </td>
                  
                  <td>
                    {vehiculo.turno?.numero ? (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={14} style={{ color: '#64748b' }} />
                          <strong>Turno {vehiculo.turno.numero}</strong>
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                          {formatearHora(vehiculo.turno.hora_inicio)}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>Sin turno</span>
                    )}
                  </td>
                  
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setModalDocumentos(vehiculo)}
                        className="btn-icon"
                        title="Ver documentación"
                      >
                        <FileText size={16} />
                      </button>
                      <button
                        onClick={() => setModalGPS(vehiculo)}
                        className="btn-icon"
                        title="Ver tracking GPS"
                      >
                        <MapPin size={16} />
                      </button>
                      <button
                        onClick={() => setModalContacto(vehiculo)}
                        className="btn-icon"
                        title="Ver contacto"
                      >
                        <Phone size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Documentos */}
      {modalDocumentos && (
        <div className="modal-overlay" onClick={() => setModalDocumentos(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Documentación - {modalDocumentos.placa}</h2>
              <button onClick={() => setModalDocumentos(null)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <p style={{ color: '#64748b', marginBottom: '20px' }}>
                <em>Documentos simulados - Integración pendiente</em>
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="doc-item">
                  <FileText size={20} style={{ color: '#3b82f6' }} />
                  <div>
                    <div><strong>Licencia de Conducción</strong></div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>Vigente hasta: 2026-12-31</div>
                  </div>
                  <CheckCircle size={20} style={{ color: '#22c55e' }} />
                </div>
                <div className="doc-item">
                  <FileText size={20} style={{ color: '#3b82f6' }} />
                  <div>
                    <div><strong>SOAT</strong></div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>Vigente hasta: 2026-06-30</div>
                  </div>
                  <CheckCircle size={20} style={{ color: '#22c55e' }} />
                </div>
                <div className="doc-item">
                  <FileText size={20} style={{ color: '#3b82f6' }} />
                  <div>
                    <div><strong>Revisión Técnico-Mecánica</strong></div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>Vigente hasta: 2026-08-15</div>
                  </div>
                  <CheckCircle size={20} style={{ color: '#22c55e' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal GPS */}
      {modalGPS && (
        <div className="modal-overlay" onClick={() => setModalGPS(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Tracking GPS - {modalGPS.placa}</h2>
              <button onClick={() => setModalGPS(null)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <p style={{ color: '#64748b', marginBottom: '20px' }}>
                <em>Tracking GPS simulado - Integración pendiente</em>
              </p>
              
              <div style={{ 
                background: '#f1f5f9', 
                borderRadius: '8px', 
                padding: '20px',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <MapPin size={24} style={{ color: '#3b82f6' }} />
                  <div>
                    <div><strong>Ubicación actual</strong></div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                      Lat: 4.{Math.floor(Math.random() * 900000)}, Lng: -74.{Math.floor(Math.random() * 900000)}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '14px', color: '#475569' }}>
                  Estado: <strong>{getEstadoLabel(modalGPS.estado)}</strong>
                </div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
                  Última actualización: {new Date().toLocaleTimeString('es-CO')}
                </div>
              </div>

              <div style={{ 
                background: '#e0f2fe', 
                border: '1px solid #bae6fd',
                borderRadius: '6px', 
                padding: '12px',
                fontSize: '13px',
                color: '#0c4a6e'
              }}>
                <strong>Nota:</strong> El mapa interactivo con tracking en tiempo real se habilitará próximamente.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Contacto */}
      {modalContacto && (
        <div className="modal-overlay" onClick={() => setModalContacto(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Datos de Contacto - {modalContacto.placa}</h2>
              <button onClick={() => setModalContacto(null)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#1e293b' }}>
                  👤 Conductor
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '8px' }}>
                  <div>
                    <strong>Nombre:</strong> {modalContacto.conductor?.nombre || 'N/A'}
                  </div>
                  <div>
                    <strong>Teléfono:</strong> {modalContacto.conductor?.telefono || 'N/A'}
                  </div>
                  <div>
                    <strong>Email:</strong> {modalContacto.conductor?.email || 'N/A'}
                  </div>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#1e293b' }}>
                  🏢 Propietario
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '8px' }}>
                  <div>
                    <strong>Nombre/Empresa:</strong> {modalContacto.propietario?.nombre || 'N/A'}
                  </div>
                  <div>
                    <strong>Teléfono:</strong> {modalContacto.propietario?.telefono || 'N/A'}
                  </div>
                  <div>
                    <strong>Email:</strong> {modalContacto.propietario?.email || 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
