import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, MapPin, Phone, Clock, Truck, AlertCircle, CheckCircle, ChevronRight, Plus } from 'lucide-react';
import '@/pages/Ofertas.css';

const API = process.env.REACT_APP_BACKEND_URL;

export default function VehiculosAsignados() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [datos, setDatos] = useState(null);
  const [modalDocumentos, setModalDocumentos] = useState(null);
  const [modalGPS, setModalGPS] = useState(null);
  const [modalContacto, setModalContacto] = useState(null);
  const [avanzandoEstado, setAvanzandoEstado] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    cargarVehiculosAsignados();
  }, [id]);

  const cargarVehiculosAsignados = async () => {
    try {
      const res = await fetch(`${API}/api/ofertas/${id}/vehiculos-asignados`, {
        credentials: 'include',
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (res.ok) {
        const data = await res.json();
        // Forzar nueva referencia para asegurar re-render
        setDatos({...data, vehiculos: [...(data.vehiculos || [])]});
        setRefreshKey(prev => prev + 1);
      } else {
        console.error('Error al cargar vehículos:', res.status);
      }
    } catch (err) {
      console.error('Error al cargar vehículos:', err);
    } finally {
      setLoading(false);
    }
  };

  const avanzarEstadoVehiculo = async (vehiculoId) => {
    setAvanzandoEstado(vehiculoId);
    try {
      const res = await fetch(`${API}/api/vehiculos/${vehiculoId}/avanzar-estado`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ oferta_id: id })
      });
      
      if (res.ok) {
        const result = await res.json();
        // Recargar datos inmediatamente
        const reloadRes = await fetch(`${API}/api/ofertas/${id}/vehiculos-asignados`, {
          credentials: 'include',
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (reloadRes.ok) {
          const newData = await reloadRes.json();
          // Forzar nueva referencia para asegurar re-render
          setDatos({...newData, vehiculos: [...(newData.vehiculos || [])]});
          setRefreshKey(prev => prev + 1);
          console.log('✅ Estado actualizado:', result.mensaje);
        }
      } else {
        const error = await res.json();
        alert(`❌ Error: ${error.detail || 'No se pudo actualizar el estado'}`);
      }
    } catch (err) {
      console.error('Error al avanzar estado:', err);
      alert('❌ Error al actualizar el estado del vehículo');
    } finally {
      setAvanzandoEstado(null);
    }
  };

  const simularAsignacion = async (cantidad = 1) => {
    setAvanzandoEstado('simulando');
    try {
      const res = await fetch(`${API}/api/ofertas/${id}/simular-asignacion-progresiva`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ cantidad })
      });
      
      if (res.ok) {
        const result = await res.json();
        // Recargar datos inmediatamente
        const reloadRes = await fetch(`${API}/api/ofertas/${id}/vehiculos-asignados`, {
          credentials: 'include',
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (reloadRes.ok) {
          const newData = await reloadRes.json();
          // Forzar nueva referencia para asegurar re-render
          setDatos({...newData, vehiculos: [...(newData.vehiculos || [])]});
          setRefreshKey(prev => prev + 1);
          console.log('✅ Simulación exitosa:', result.mensaje);
        }
      } else {
        const error = await res.json();
        alert(`❌ Error: ${error.detail || 'No se pudo simular la asignación'}`);
      }
    } catch (err) {
      console.error('Error al simular asignación:', err);
      alert('❌ Error al simular la asignación');
    } finally {
      setAvanzandoEstado(null);
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

  const getEstadoClass = (estado) => {
    const map = {
      'asignado': 'asignado',
      'en_cargue': 'en-proceso',
      'en_ruta': 'en-ruta',
      'en_descargue': 'en-proceso',
      'finalizado': 'finalizada'
    };
    return map[estado?.toLowerCase()] || 'sin-asignar';
  };

  const getEstadoLabel = (estado) => {
    const labels = {
      'asignado': 'Asignado',
      'en_cargue': 'En cargue',
      'en_ruta': 'En ruta',
      'en_descargue': 'En descargue',
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
    const asignacionCompleta = datos?.resumen?.asignacion_completa || false;
    
    return (
      <div className="ofertas-container">
        <div className="ofertas-header">
          <button onClick={() => navigate('/ofertas')} className="btn-back-detail">
            <ArrowLeft size={18} />
            Volver al listado
          </button>
          <h1>Vehículos Asignados</h1>
        </div>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <AlertCircle size={48} style={{ color: '#888', margin: '0 auto 16px' }} />
          <p>No hay vehículos asignados a esta oferta.</p>
          {datos?.resumen?.vehiculos_requeridos && (
            <p style={{ fontSize: '14px', color: '#64748b', marginTop: '12px' }}>
              Se requieren {datos.resumen.vehiculos_requeridos} vehículo(s). Usa el botón "Simular Asignación" para agregar vehículos progresivamente.
            </p>
          )}
        </div>
        
        {/* Botón centrado debajo */}
        {!asignacionCompleta && (
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <button 
              onClick={() => simularAsignacion(1)}
              disabled={avanzandoEstado === 'simulando'}
              className="btn-icon-action btn-icon-asignar"
              style={{ 
                opacity: avanzandoEstado === 'simulando' ? 0.6 : 1,
                cursor: avanzandoEstado === 'simulando' ? 'not-allowed' : 'pointer'
              }}
              title="Agregar 1 vehículo simulado"
            >
              <Plus size={16} />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="ofertas-container">
      <div className="ofertas-header">
        <button onClick={() => navigate('/ofertas')} className="btn-back-detail">
          <ArrowLeft size={18} />
          Volver al listado
        </button>
        <h1>Vehículos Asignados</h1>
      </div>

      {/* Resumen mejorado con campos separados */}
      <div className="oferta-section" style={{ marginBottom: '24px' }}>
        <div className="oferta-section-grid cols-4">
          <div className="info-item">
            <div className="info-label">Código de Oferta</div>
            <div className="info-value" style={{ fontWeight: '700', fontSize: '16px' }}>
              {datos.oferta_codigo}
            </div>
          </div>
          <div className="info-item">
            <div className="info-label">Vehículos Requeridos</div>
            <div className="info-value" style={{ fontWeight: '700', fontSize: '16px', color: '#6366f1' }}>
              {datos.resumen.vehiculos_requeridos}
            </div>
          </div>
          <div className="info-item">
            <div className="info-label">Vehículos Asignados</div>
            <div className="info-value" style={{ 
              fontWeight: '700', 
              fontSize: '16px', 
              color: datos.resumen.asignacion_completa ? '#059669' : '#d97706' 
            }}>
              {datos.resumen.total_asignados}
            </div>
            {(datos.resumen.reales > 0 || datos.resumen.simulados > 0) && (
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                {datos.resumen.reales > 0 && (
                  <span style={{ color: '#059669' }}>{datos.resumen.reales} reales</span>
                )}
                {datos.resumen.reales > 0 && datos.resumen.simulados > 0 && ' + '}
                {datos.resumen.simulados > 0 && (
                  <span style={{ color: '#d97706' }}>{datos.resumen.simulados} simulados</span>
                )}
              </div>
            )}
          </div>
          <div className="info-item">
            <div className="info-label">Estado Asignación</div>
            <div className="info-value" style={{ 
              fontWeight: '700', 
              fontSize: '16px', 
              color: datos.resumen.asignacion_completa ? '#059669' : '#2563eb' 
            }}>
              {datos.resumen.asignacion_completa ? '✅ Completa' : `${datos.resumen.porcentaje_completado.toFixed(0)}%`}
            </div>
          </div>
        </div>
      </div>

      {/* Tabla mejorada */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '16%' }}>Placa</th>
              <th style={{ width: '16%' }}>Conductor</th>
              <th style={{ width: '12%' }}>Tipo</th>
              <th style={{ width: '14%' }}>Estado del proceso</th>
              <th style={{ width: '16%' }}>Turno de Cargue</th>
              <th style={{ width: '14%', textAlign: 'center' }}>Acciones</th>
              <th style={{ width: '12%', textAlign: 'center' }}>Avanzar Estado</th>
            </tr>
          </thead>
          <tbody>
            {datos.vehiculos.map((vehiculo) => {
              const semaforo = calcularSemaforo(vehiculo);
              
              return (
                <tr key={vehiculo.vehiculo_id || vehiculo.placa}>
                  {/* Placa */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Truck size={20} style={{ color: '#64748b', flexShrink: 0 }} />
                      <div>
                        <div style={{ 
                          fontWeight: '700', 
                          fontSize: '15px', 
                          color: '#1a202c',
                          marginBottom: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          {vehiculo.placa}
                          {vehiculo.marca === 'SIMULADO' && (
                            <span style={{
                              padding: '2px 8px',
                              fontSize: '10px',
                              fontWeight: '700',
                              background: '#fef3c7',
                              color: '#92400e',
                              border: '1px solid #fcd34d',
                              borderRadius: '4px',
                              textTransform: 'uppercase'
                            }}>
                              SIMULADO
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          {vehiculo.marca} {vehiculo.linea}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  {/* Conductor */}
                  <td>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: '#374151', marginBottom: '2px' }}>
                      {vehiculo.conductor?.nombre || 'N/A'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                      {vehiculo.conductor?.telefono || ''}
                    </div>
                  </td>
                  
                  {/* Tipo */}
                  <td>
                    <span className={`badge ${getBadgeColor(vehiculo.tipo_propiedad)}`} style={{ 
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {getTipoLabel(vehiculo.tipo_propiedad)}
                    </span>
                  </td>
                  
                  {/* Estado con semáforo */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {semaforo && (
                        <div 
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: semaforo.color === 'green' ? '#22c55e' : '#ef4444',
                            flexShrink: 0,
                            boxShadow: `0 0 8px ${semaforo.color === 'green' ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`
                          }}
                          title={`${semaforo.texto}: ${semaforo.tiempoTranscurrido}/${semaforo.tiempoEstimado} mins`}
                        />
                      )}
                      <div>
                        <span className={`estado-badge ${getEstadoClass(vehiculo.estado)}`}>
                          {getEstadoLabel(vehiculo.estado)}
                        </span>
                        {semaforo && (
                          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                            {semaforo.tiempoTranscurrido}/{semaforo.tiempoEstimado} mins
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  
                  {/* Turno */}
                  <td>
                    {vehiculo.turno?.numero ? (
                      <div>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px',
                          marginBottom: '4px'
                        }}>
                          <Clock size={16} style={{ color: '#64748b' }} />
                          <strong style={{ fontSize: '14px', color: '#374151' }}>
                            Turno {vehiculo.turno.numero}
                          </strong>
                        </div>
                        <div style={{ 
                          fontSize: '13px', 
                          color: '#64748b',
                          paddingLeft: '22px',
                          fontFamily: 'monospace'
                        }}>
                          {formatearHora(vehiculo.turno.hora_inicio)}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: '13px' }}>Sin turno asignado</span>
                    )}
                  </td>
                  
                  {/* Acciones */}
                  <td>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      <button
                        onClick={() => setModalDocumentos(vehiculo)}
                        className="btn-icon-action btn-icon-ver"
                        title="Ver documentación"
                      >
                        <FileText size={16} />
                      </button>
                      <button
                        onClick={() => setModalGPS(vehiculo)}
                        className="btn-icon-action"
                        style={{ 
                          background: '#fef3c7',
                          color: '#b45309',
                          borderColor: '#fcd34d'
                        }}
                        title="Ver tracking GPS"
                      >
                        <MapPin size={16} />
                      </button>
                      <button
                        onClick={() => setModalContacto(vehiculo)}
                        className="btn-icon-action btn-icon-asignar"
                        title="Ver contacto"
                      >
                        <Phone size={16} />
                      </button>
                    </div>
                  </td>
                  
                  {/* Botón Avanzar Estado */}
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      {vehiculo.estado.toLowerCase() !== 'finalizado' ? (
                        <button
                          onClick={() => avanzarEstadoVehiculo(vehiculo.vehiculo_id)}
                          disabled={avanzandoEstado === vehiculo.vehiculo_id}
                          className="btn-icon-action"
                          style={{ 
                            background: avanzandoEstado === vehiculo.vehiculo_id ? '#e5e7eb' : '#dcfce7',
                            color: '#166534',
                            borderColor: '#86efac',
                            cursor: avanzandoEstado === vehiculo.vehiculo_id ? 'not-allowed' : 'pointer',
                            opacity: avanzandoEstado === vehiculo.vehiculo_id ? 0.6 : 1
                          }}
                          title="Avanzar al siguiente estado"
                        >
                          <ChevronRight size={16} />
                        </button>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                          Finalizado
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Botón Simular Asignación - Centrado debajo de la tabla */}
      <div style={{ 
        textAlign: 'center', 
        marginTop: '24px',
        paddingBottom: '24px',
        borderBottom: '1px solid #e5e7eb'
      }}>
        {datos.resumen.asignacion_completa ? (
          <div style={{
            padding: '12px 24px',
            background: '#dcfce7',
            color: '#166534',
            borderRadius: '8px',
            border: '1px solid #86efac',
            display: 'inline-block',
            fontWeight: '600',
            fontSize: '14px'
          }}>
            ✅ Asignación completa ({datos.resumen.total_asignados}/{datos.resumen.vehiculos_requeridos} vehículos)
          </div>
        ) : (
          <>
            <button 
              onClick={() => simularAsignacion(1)}
              disabled={avanzandoEstado === 'simulando'}
              className="btn-icon-action btn-icon-asignar"
              style={{ 
                opacity: avanzandoEstado === 'simulando' ? 0.6 : 1,
                cursor: avanzandoEstado === 'simulando' ? 'not-allowed' : 'pointer'
              }}
              title="Agregar 1 vehículo simulado"
            >
              <Plus size={16} />
            </button>
            <div style={{ 
              fontSize: '12px', 
              color: '#64748b', 
              marginTop: '8px' 
            }}>
              Click para agregar 1 vehículo simulado ({datos.resumen.total_asignados}/{datos.resumen.vehiculos_requeridos})
            </div>
          </>
        )}
      </div>

      {/* Modales con diseño mejorado */}
      {modalDocumentos && (
        <div className="modal-overlay" onClick={() => setModalDocumentos(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>
                Documentación - {modalDocumentos.placa}
              </h2>
              <button onClick={() => setModalDocumentos(null)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <div style={{ 
                background: '#eff6ff', 
                border: '1px solid #bfdbfe',
                borderRadius: '8px', 
                padding: '12px 16px',
                marginBottom: '20px',
                fontSize: '13px',
                color: '#1e40af'
              }}>
                <strong>Nota:</strong> Documentos simulados - Integración pendiente
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="oferta-section" style={{ 
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px'
                }}>
                  <FileText size={24} style={{ color: '#2563eb', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: '#374151', marginBottom: '2px' }}>
                      Licencia de Conducción
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                      Vigente hasta: 2026-12-31
                    </div>
                  </div>
                  <CheckCircle size={24} style={{ color: '#22c55e' }} />
                </div>
                
                <div className="oferta-section" style={{ 
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px'
                }}>
                  <FileText size={24} style={{ color: '#2563eb', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: '#374151', marginBottom: '2px' }}>
                      SOAT
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                      Vigente hasta: 2026-06-30
                    </div>
                  </div>
                  <CheckCircle size={24} style={{ color: '#22c55e' }} />
                </div>
                
                <div className="oferta-section" style={{ 
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px'
                }}>
                  <FileText size={24} style={{ color: '#2563eb', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: '#374151', marginBottom: '2px' }}>
                      Revisión Técnico-Mecánica
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                      Vigente hasta: 2026-08-15
                    </div>
                  </div>
                  <CheckCircle size={24} style={{ color: '#22c55e' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal GPS */}
      {modalGPS && (
        <div className="modal-overlay" onClick={() => setModalGPS(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>
                Tracking GPS - {modalGPS.placa}
              </h2>
              <button onClick={() => setModalGPS(null)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <div style={{ 
                background: '#eff6ff', 
                border: '1px solid #bfdbfe',
                borderRadius: '8px', 
                padding: '12px 16px',
                marginBottom: '20px',
                fontSize: '13px',
                color: '#1e40af'
              }}>
                <strong>Nota:</strong> Tracking GPS simulado - Integración pendiente
              </div>
              
              <div className="oferta-section" style={{ margin: '0 0 16px 0' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
                  <MapPin size={28} style={{ color: '#2563eb', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700', fontSize: '15px', color: '#374151', marginBottom: '6px' }}>
                      Ubicación actual
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
                      Lat: 4.{Math.floor(Math.random() * 900000)}, Lng: -74.{Math.floor(Math.random() * 900000)}
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                      Última actualización: {new Date().toLocaleTimeString('es-CO')}
                    </div>
                  </div>
                </div>
                
                <div className="oferta-section-grid cols-2" style={{ paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                  <div className="info-item">
                    <div className="info-label">Estado Actual</div>
                    <div className="info-value">
                      <span className={`estado-badge ${getEstadoClass(modalGPS.estado)}`}>
                        {getEstadoLabel(modalGPS.estado)}
                      </span>
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Velocidad</div>
                    <div className="info-value">{Math.floor(Math.random() * 60)} km/h</div>
                  </div>
                </div>
              </div>

              <div style={{ 
                background: '#fef3c7', 
                border: '1px solid #fde68a',
                borderRadius: '8px', 
                padding: '12px 16px',
                fontSize: '13px',
                color: '#92400e'
              }}>
                <strong>Próximamente:</strong> Mapa interactivo con tracking en tiempo real
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Contacto */}
      {modalContacto && (
        <div className="modal-overlay" onClick={() => setModalContacto(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>
                Datos de Contacto - {modalContacto.placa}
              </h2>
              <button onClick={() => setModalContacto(null)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              {/* Conductor */}
              <div className="oferta-section" style={{ marginBottom: '16px' }}>
                <div className="oferta-section-title" style={{ marginBottom: '16px' }}>
                  👤 Conductor
                </div>
                <div className="oferta-section-grid cols-2">
                  <div className="info-item">
                    <div className="info-label">Nombre Completo</div>
                    <div className="info-value">{modalContacto.conductor?.nombre || 'N/A'}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Teléfono</div>
                    <div className="info-value">{modalContacto.conductor?.telefono || 'N/A'}</div>
                  </div>
                  <div className="info-item" style={{ gridColumn: 'span 2' }}>
                    <div className="info-label">Email</div>
                    <div className="info-value">{modalContacto.conductor?.email || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* Propietario */}
              <div className="oferta-section" style={{ margin: 0 }}>
                <div className="oferta-section-title" style={{ marginBottom: '16px' }}>
                  🏢 Propietario
                </div>
                <div className="oferta-section-grid cols-2">
                  <div className="info-item">
                    <div className="info-label">Nombre / Empresa</div>
                    <div className="info-value">{modalContacto.propietario?.nombre || 'N/A'}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Teléfono</div>
                    <div className="info-value">{modalContacto.propietario?.telefono || 'N/A'}</div>
                  </div>
                  <div className="info-item" style={{ gridColumn: 'span 2' }}>
                    <div className="info-label">Email</div>
                    <div className="info-value">{modalContacto.propietario?.email || 'N/A'}</div>
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
