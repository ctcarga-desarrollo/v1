import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Plus, TrendingUp, Bell, Settings, Menu, LogOut, User, Truck } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/AuthContext';
import '@/pages/Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Datos para la gráfica estadística
  const chartData = [
    { mes: 'Ene', servicios: 45, completados: 42, cancelados: 3 },
    { mes: 'Feb', servicios: 52, completados: 48, cancelados: 4 },
    { mes: 'Mar', servicios: 61, completados: 58, cancelados: 3 },
    { mes: 'Abr', servicios: 58, completados: 54, cancelados: 4 },
    { mes: 'May', servicios: 67, completados: 63, cancelados: 4 },
    { mes: 'Jun', servicios: 73, completados: 70, cancelados: 3 },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

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
            <p>Empresa de logística</p>
          </div>
        </div>

        <nav className="sidebar-nav" data-testid="sidebar-nav">
          <button className="nav-item active" data-testid="dashboard-nav-btn">
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </button>
          
          <button className="nav-item" onClick={() => navigate('/ofertas')} data-testid="ofertas-nav-btn">
            <FileText size={18} />
            <span>Ofertas</span>
          </button>
          
          <button className="nav-item" onClick={() => navigate('/creacion-ofertas')} data-testid="creacion-ofertas-nav-btn">
            <Plus size={18} />
            <span>Creación ofertas</span>
          </button>
          
          <button className="nav-item" onClick={() => navigate('/flota')} data-testid="flota-nav-btn">
            <Truck size={18} />
            <span>Flota</span>
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
            <span>Configuración</span>
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
            <span className="user-name" data-testid="user-name">{user?.name || 'Usuario'}</span>
            <button className="user-avatar" data-testid="user-avatar-btn">
              <User size={20} />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="content-wrapper">
          <div className="content-header">
            <div>
              <h1 data-testid="page-title">Panel de control</h1>
              <p className="subtitle">Monitorea ofertas, rutas de servicios y estadísticas desde un solo lugar</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card" data-testid="ofertas-card">
              <div className="stat-header">
                <span className="stat-label">Ofertas</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"/>
                </svg>
              </div>
              <div className="stat-value">12</div>
              <div className="stat-footer">+2 desde ayer</div>
            </div>

            <div className="stat-card" data-testid="servicios-ruta-card">
              <div className="stat-header">
                <span className="stat-label">Servicios en Ruta</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="6" width="18" height="13" rx="2"/>
                  <circle cx="8.5" cy="16.5" r="1.5"/>
                  <circle cx="15.5" cy="16.5" r="1.5"/>
                  <path d="M3 11h18M8 6V4M16 6V4"/>
                </svg>
              </div>
              <div className="stat-value">8</div>
              <div className="stat-footer">de 12 total</div>
            </div>
          </div>

          {/* Gráfica Estadística */}
          <div className="chart-section">
            <div className="section-header">
              <div>
                <h2 data-testid="estadisticas-section-title">
                  <TrendingUp size={20} />
                  Estadísticas de Servicios
                </h2>
                <p className="section-subtitle">Análisis mensual de servicios realizados</p>
              </div>
            </div>

            <div className="chart-container">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="mes" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="servicios" fill="#5b9eff" name="Total Servicios" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="completados" fill="#10b981" name="Completados" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="cancelados" fill="#ef4444" name="Cancelados" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Resumen de métricas */}
            <div className="metrics-summary">
              <div className="metric-item">
                <div className="metric-label">Tasa de Completados</div>
                <div className="metric-value success">96.2%</div>
              </div>
              <div className="metric-item">
                <div className="metric-label">Promedio Mensual</div>
                <div className="metric-value">59 servicios</div>
              </div>
              <div className="metric-item">
                <div className="metric-label">Crecimiento</div>
                <div className="metric-value success">+62% vs año anterior</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;