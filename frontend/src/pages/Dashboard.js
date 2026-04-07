import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Plus, TrendingUp, Bell, Settings, Menu, LogOut, User } from 'lucide-react';
import '@/pages/Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
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
          
          <button className="nav-item" data-testid="ofertas-nav-btn">
            <FileText size={18} />
            <span>Ofertas</span>
          </button>
          
          <button className="nav-item" data-testid="creacion-ofertas-nav-btn">
            <Plus size={18} />
            <span>Creación ofertas</span>
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
            <span className="user-name" data-testid="user-name">Monica Arcila</span>
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
              <p className="subtitle">Monitorea ofertas, rutas de buses y facturas desde un solo lugar</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card" data-testid="ofertas-activas-card">
              <div className="stat-header">
                <span className="stat-label">Ofertas Activas</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"/>
                </svg>
              </div>
              <div className="stat-value">12</div>
              <div className="stat-footer">+2 desde ayer</div>
            </div>

            <div className="stat-card" data-testid="buses-ruta-card">
              <div className="stat-header">
                <span className="stat-label">Buses en Ruta</span>
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

            <div className="stat-card" data-testid="facturas-pendientes-card">
              <div className="stat-header">
                <span className="stat-label">Facturas Pendientes</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              </div>
              <div className="stat-value">5</div>
              <div className="stat-footer">$4.2M total</div>
            </div>
          </div>

          {/* Facturas Pendientes Table */}
          <div className="table-section">
            <div className="section-header">
              <div>
                <h2 data-testid="facturas-section-title">
                  <FileText size={20} />
                  Facturas Pendientes
                </h2>
                <p className="section-subtitle">Facturas por cobrar y su estado de vencimiento</p>
              </div>
            </div>

            <div className="table-container">
              <table className="invoice-table" data-testid="invoice-table">
                <tbody>
                  <tr data-testid="invoice-row-1">
                    <td>
                      <div className="invoice-id">INV-001</div>
                      <span className="invoice-badge pending">Pendiente</span>
                    </td>
                    <td>
                      <div className="company-name">Empresa Logística del Norte</div>
                      <div className="invoice-amount">$ 1,250,000</div>
                    </td>
                    <td>
                      <div className="invoice-date">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                          <line x1="16" y1="2" x2="16" y2="6"/>
                          <line x1="8" y1="2" x2="8" y2="6"/>
                          <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        Vence: 2024-01-18
                      </div>
                    </td>
                    <td className="action-buttons">
                      <button className="btn-secondary" data-testid="ver-factura-btn-1">Ver Factura</button>
                      <button className="btn-primary" data-testid="enviar-recordatorio-btn-1">Enviar Recordatorio</button>
                    </td>
                  </tr>

                  <tr data-testid="invoice-row-2">
                    <td>
                      <div className="invoice-id">INV-002</div>
                      <span className="invoice-badge overdue">VENCIDA</span>
                      <span className="invoice-badge urgent">3 días vencida</span>
                    </td>
                    <td>
                      <div className="company-name">Transportes Andinos S.A.</div>
                      <div className="invoice-amount">$ 850,000</div>
                    </td>
                    <td>
                      <div className="invoice-date">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                          <line x1="16" y1="2" x2="16" y2="6"/>
                          <line x1="8" y1="2" x2="8" y2="6"/>
                          <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        Vence: 2024-01-12
                      </div>
                    </td>
                    <td className="action-buttons">
                      <button className="btn-secondary" data-testid="ver-factura-btn-2">Ver Factura</button>
                      <button className="btn-primary" data-testid="enviar-recordatorio-btn-2">Enviar Recordatorio</button>
                    </td>
                  </tr>

                  <tr data-testid="invoice-row-3">
                    <td>
                      <div className="invoice-id">INV-003</div>
                      <span className="invoice-badge pending">Pendiente</span>
                    </td>
                    <td>
                      <div className="company-name">Carga Express Ltda.</div>
                      <div className="invoice-amount">$ 2,100,000</div>
                    </td>
                    <td>
                      <div className="invoice-date">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                          <line x1="16" y1="2" x2="16" y2="6"/>
                          <line x1="8" y1="2" x2="8" y2="6"/>
                          <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        Vence: 2024-01-25
                      </div>
                    </td>
                    <td className="action-buttons">
                      <button className="btn-secondary" data-testid="ver-factura-btn-3">Ver Factura</button>
                      <button className="btn-primary" data-testid="enviar-recordatorio-btn-3">Enviar Recordatorio</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;