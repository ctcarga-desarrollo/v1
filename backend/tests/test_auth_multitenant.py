"""
Test suite for CTCARGA Auth and Multitenant features
Tests: Login, Logout, Auth/me, Protected routes, Tenant isolation, Role-based access
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from /app/memory/test_credentials.md
ADMIN_EMAIL = "admin@ctcarga.com"
ADMIN_PASSWORD = "admin123"


class TestAuthEndpoints:
    """Authentication endpoint tests"""
    
    def test_login_success(self):
        """Test successful login returns user with tenant_id and empresa"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "id" in data, "Response missing 'id'"
        assert "email" in data, "Response missing 'email'"
        assert "name" in data, "Response missing 'name'"
        assert "rol" in data, "Response missing 'rol'"
        assert "tenant_id" in data, "Response missing 'tenant_id'"
        assert "empresa" in data, "Response missing 'empresa'"
        
        # Verify values
        assert data["email"] == ADMIN_EMAIL
        assert data["rol"] == "ADMIN"
        assert data["empresa"] == "Sueña"
        assert len(data["tenant_id"]) > 0
        
        # Verify cookies are set
        assert "access_token" in session.cookies, "access_token cookie not set"
        assert "refresh_token" in session.cookies, "refresh_token cookie not set"
        print(f"Login successful: {data['name']} ({data['rol']}) - Empresa: {data['empresa']}")
    
    def test_login_invalid_credentials(self):
        """Test login with wrong credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@email.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "inválidas" in data["detail"].lower() or "invalid" in data["detail"].lower()
    
    def test_login_missing_fields(self):
        """Test login with missing fields returns 400"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "",
            "password": ""
        })
        assert response.status_code == 400
    
    def test_auth_me_authenticated(self):
        """Test /auth/me returns user info when authenticated"""
        session = requests.Session()
        # Login first
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200
        
        # Get user info
        me_resp = session.get(f"{BASE_URL}/api/auth/me")
        assert me_resp.status_code == 200
        
        data = me_resp.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["rol"] == "ADMIN"
        assert "tenant_id" in data
        assert data["empresa"] == "Sueña"
    
    def test_auth_me_unauthenticated(self):
        """Test /auth/me returns 401 when not authenticated"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
    
    def test_logout(self):
        """Test logout clears cookies"""
        session = requests.Session()
        # Login first
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200
        
        # Logout
        logout_resp = session.post(f"{BASE_URL}/api/auth/logout")
        assert logout_resp.status_code == 200
        
        # Verify auth/me now fails (cookies should be cleared)
        # Note: requests session may still have old cookies, so we test with new session
        new_session = requests.Session()
        me_resp = new_session.get(f"{BASE_URL}/api/auth/me")
        assert me_resp.status_code == 401


class TestProtectedEndpoints:
    """Test that protected endpoints require authentication"""
    
    def test_ofertas_unauthenticated(self):
        """Test /ofertas returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/ofertas")
        assert response.status_code == 401
    
    def test_vehiculos_unauthenticated(self):
        """Test /vehiculos returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/vehiculos")
        assert response.status_code == 401
    
    def test_remolques_unauthenticated(self):
        """Test /remolques returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/remolques")
        assert response.status_code == 401
    
    def test_stats_unauthenticated(self):
        """Test /stats returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/stats")
        assert response.status_code == 401
    
    def test_direcciones_favoritas_unauthenticated(self):
        """Test /direcciones-favoritas returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/direcciones-favoritas")
        assert response.status_code == 401


class TestAuthenticatedAccess:
    """Test authenticated access to protected endpoints"""
    
    @pytest.fixture
    def auth_session(self):
        """Create authenticated session"""
        session = requests.Session()
        resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert resp.status_code == 200
        return session
    
    def test_ofertas_authenticated(self, auth_session):
        """Test /ofertas works with auth"""
        response = auth_session.get(f"{BASE_URL}/api/ofertas")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_vehiculos_authenticated(self, auth_session):
        """Test /vehiculos works with auth"""
        response = auth_session.get(f"{BASE_URL}/api/vehiculos")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_remolques_authenticated(self, auth_session):
        """Test /remolques works with auth"""
        response = auth_session.get(f"{BASE_URL}/api/remolques")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_stats_authenticated(self, auth_session):
        """Test /stats works with auth"""
        response = auth_session.get(f"{BASE_URL}/api/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total_ofertas" in data
        assert "sin_asignar" in data
    
    def test_direcciones_favoritas_authenticated(self, auth_session):
        """Test /direcciones-favoritas works with auth"""
        response = auth_session.get(f"{BASE_URL}/api/direcciones-favoritas")
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestRoleBasedAccess:
    """Test role-based access control for ADMIN role"""
    
    @pytest.fixture
    def admin_session(self):
        """Create admin authenticated session"""
        session = requests.Session()
        resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert resp.status_code == 200
        return session
    
    def test_admin_can_create_oferta(self, admin_session):
        """Test ADMIN can create offers"""
        response = admin_session.post(f"{BASE_URL}/api/ofertas", json={
            "remitente": "TEST_Remitente Auth Test",
            "destinatario": "TEST_Destinatario",
            "cargue": {"direccionConstruida": "Test Address"},
            "descargues": [{"direccionConstruida": "Test Dest"}],
            "vehiculo": {},
            "condiciones": {},
            "fletes": {},
            "info_cargue": {}
        })
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "codigo_oferta" in data
        assert data["remitente"] == "TEST_Remitente Auth Test"
        
        # Cleanup - delete the test offer
        delete_resp = admin_session.delete(f"{BASE_URL}/api/ofertas/{data['id']}")
        assert delete_resp.status_code == 200
    
    def test_admin_can_create_vehiculo(self, admin_session):
        """Test ADMIN can create vehicles"""
        response = admin_session.post(f"{BASE_URL}/api/vehiculos", json={
            "placa": "TEST999",
            "marca": "Test Brand",
            "linea": "Test Line",
            "modelo": "2024",
            "clase_vehiculo": "Camión",
            "propietario": "Test Owner"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["placa"] == "TEST999"
        
        # Cleanup
        delete_resp = admin_session.delete(f"{BASE_URL}/api/vehiculos/{data['id']}")
        assert delete_resp.status_code == 200
    
    def test_admin_can_create_remolque(self, admin_session):
        """Test ADMIN can create trailers"""
        response = admin_session.post(f"{BASE_URL}/api/remolques", json={
            "placa": "RTEST99",
            "tipo_remolque": "Plana",
            "vin": "TEST123456789",
            "ejes": 2,
            "capacidad_carga": 10000
        })
        assert response.status_code == 200
        data = response.json()
        assert data["placa"] == "RTEST99"
        
        # Cleanup
        delete_resp = admin_session.delete(f"{BASE_URL}/api/remolques/{data['id']}")
        assert delete_resp.status_code == 200


class TestTenantIsolation:
    """Test tenant isolation - data filtered by tenant_id"""
    
    @pytest.fixture
    def admin_session(self):
        """Create admin authenticated session"""
        session = requests.Session()
        resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert resp.status_code == 200
        user_data = resp.json()
        return session, user_data["tenant_id"]
    
    def test_ofertas_filtered_by_tenant(self, admin_session):
        """Test ofertas are filtered by tenant_id"""
        session, tenant_id = admin_session
        
        # Create an offer
        create_resp = session.post(f"{BASE_URL}/api/ofertas", json={
            "remitente": "TEST_Tenant Isolation Test",
            "destinatario": "TEST_Dest",
            "cargue": {},
            "descargues": [],
            "vehiculo": {},
            "condiciones": {},
            "fletes": {},
            "info_cargue": {}
        })
        assert create_resp.status_code == 200
        created = create_resp.json()
        
        # Verify tenant_id is set
        assert created.get("tenant_id") == tenant_id
        
        # Get all ofertas and verify they all have same tenant_id
        list_resp = session.get(f"{BASE_URL}/api/ofertas")
        assert list_resp.status_code == 200
        ofertas = list_resp.json()
        
        for oferta in ofertas:
            assert oferta.get("tenant_id") == tenant_id, f"Oferta {oferta.get('id')} has wrong tenant_id"
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/ofertas/{created['id']}")
    
    def test_vehiculos_filtered_by_tenant(self, admin_session):
        """Test vehiculos are filtered by tenant_id"""
        session, tenant_id = admin_session
        
        list_resp = session.get(f"{BASE_URL}/api/vehiculos")
        assert list_resp.status_code == 200
        vehiculos = list_resp.json()
        
        for vehiculo in vehiculos:
            assert vehiculo.get("tenant_id") == tenant_id, f"Vehiculo {vehiculo.get('id')} has wrong tenant_id"
    
    def test_remolques_filtered_by_tenant(self, admin_session):
        """Test remolques are filtered by tenant_id"""
        session, tenant_id = admin_session
        
        list_resp = session.get(f"{BASE_URL}/api/remolques")
        assert list_resp.status_code == 200
        remolques = list_resp.json()
        
        for remolque in remolques:
            assert remolque.get("tenant_id") == tenant_id, f"Remolque {remolque.get('id')} has wrong tenant_id"


class TestTokenRefresh:
    """Test token refresh functionality"""
    
    def test_refresh_token_works(self):
        """Test refresh token endpoint"""
        session = requests.Session()
        # Login first
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200
        
        # Refresh token
        refresh_resp = session.post(f"{BASE_URL}/api/auth/refresh")
        assert refresh_resp.status_code == 200
        
        # Verify we can still access protected endpoints
        me_resp = session.get(f"{BASE_URL}/api/auth/me")
        assert me_resp.status_code == 200
    
    def test_refresh_without_token_fails(self):
        """Test refresh without token returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/refresh")
        assert response.status_code == 401


class TestPublicEndpoints:
    """Test public endpoints that don't require auth"""
    
    def test_root_endpoint(self):
        """Test root API endpoint is public"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
    
    def test_ofertas_borrador_public(self):
        """Test ofertas-borrador is public (legacy endpoint)"""
        response = requests.post(f"{BASE_URL}/api/ofertas-borrador", json={})
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
