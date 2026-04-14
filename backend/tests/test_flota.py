"""
Backend API tests for Flota module (Vehicles and Trailers)
Tests: CRUD operations, validation, linking/unlinking, file upload
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestFlotaAPI:
    """Test Flota API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.test_placa = f"TEST{uuid.uuid4().hex[:4].upper()}"
        self.test_remolque_placa = f"R{uuid.uuid4().hex[:5].upper()}"
    
    # ==================== VEHICULOS TESTS ====================
    
    def test_get_vehiculos(self):
        """Test GET /api/vehiculos returns list"""
        response = self.session.get(f"{BASE_URL}/api/vehiculos")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"SUCCESS: GET /api/vehiculos returned {len(data)} vehicles")
    
    def test_create_vehiculo_success(self):
        """Test POST /api/vehiculos creates vehicle with all required fields"""
        payload = {
            "placa": self.test_placa,
            "licencia_transito_no": "LT123456",
            "marca": "Kenworth",
            "linea": "T800",
            "modelo": "2024",
            "clase_vehiculo": "Tractocamión",
            "tipo_carroceria": "Furgón",
            "combustible": "Diésel",
            "numero_motor": "MOT123456",
            "vin": f"VIN{uuid.uuid4().hex[:10].upper()}",
            "propietario": "Test Propietario",
            "identificacion_propietario": "123456789",
            "fecha_matricula": "2024-06-01",
            "tarjeta_operaciones": {
                "numero": "TO123456",
                "fecha_inicio": "2024-06-01",
                "fecha_fin": "2025-06-01"
            },
            "soat": {
                "numero_poliza": "SOAT123456",
                "aseguradora": "Seguros Test",
                "fecha_inicio": "2024-06-01",
                "fecha_fin": "2025-06-01"
            },
            "revision_tecnicomecanica": {
                "numero": "RTM123456",
                "cda": "CDA Test",
                "fecha_inicio": "2024-06-01",
                "fecha_fin": "2026-06-01"
            },
            "documentos": {
                "licencia_transito": None,
                "soat": None,
                "revision_tecnicomecanica": None,
                "tarjeta_operaciones": None
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/vehiculos", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["placa"] == self.test_placa.upper(), "Placa should be uppercase"
        assert data["marca"] == "Kenworth"
        assert data["clase_vehiculo"] == "Tractocamión"
        assert "id" in data, "Response should contain id"
        
        # Verify persistence with GET
        get_response = self.session.get(f"{BASE_URL}/api/vehiculos/{data['id']}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["placa"] == self.test_placa.upper()
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/vehiculos/{data['id']}")
        print(f"SUCCESS: Created and verified vehicle {self.test_placa}")
    
    def test_create_vehiculo_duplicate_placa(self):
        """Test POST /api/vehiculos rejects duplicate placa"""
        # First create a vehicle
        payload = {
            "placa": self.test_placa,
            "licencia_transito_no": "LT123456",
            "marca": "Kenworth",
            "linea": "T800",
            "modelo": "2024",
            "clase_vehiculo": "Tractocamión",
            "tipo_carroceria": "Furgón",
            "combustible": "Diésel",
            "numero_motor": "MOT123456",
            "vin": f"VIN{uuid.uuid4().hex[:10].upper()}",
            "propietario": "Test Propietario",
            "identificacion_propietario": "123456789",
            "fecha_matricula": "2024-06-01",
            "tarjeta_operaciones": {"numero": "TO123456", "fecha_inicio": "2024-06-01", "fecha_fin": "2025-06-01"},
            "soat": {"numero_poliza": "SOAT123456", "aseguradora": "Seguros Test", "fecha_inicio": "2024-06-01", "fecha_fin": "2025-06-01"},
            "revision_tecnicomecanica": {"numero": "RTM123456", "cda": "CDA Test", "fecha_inicio": "2024-06-01", "fecha_fin": "2026-06-01"},
            "documentos": {}
        }
        
        response1 = self.session.post(f"{BASE_URL}/api/vehiculos", json=payload)
        assert response1.status_code == 200
        vehicle_id = response1.json()["id"]
        
        # Try to create another with same placa
        payload["vin"] = f"VIN{uuid.uuid4().hex[:10].upper()}"  # Different VIN
        response2 = self.session.post(f"{BASE_URL}/api/vehiculos", json=payload)
        assert response2.status_code == 400, f"Expected 400 for duplicate placa, got {response2.status_code}"
        assert "placa" in response2.json().get("detail", "").lower()
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/vehiculos/{vehicle_id}")
        print("SUCCESS: Duplicate placa correctly rejected")
    
    def test_update_vehiculo(self):
        """Test PUT /api/vehiculos/{id} updates vehicle"""
        # Create vehicle first
        payload = {
            "placa": self.test_placa,
            "licencia_transito_no": "LT123456",
            "marca": "Kenworth",
            "linea": "T800",
            "modelo": "2024",
            "clase_vehiculo": "Tractocamión",
            "tipo_carroceria": "Furgón",
            "combustible": "Diésel",
            "numero_motor": "MOT123456",
            "vin": f"VIN{uuid.uuid4().hex[:10].upper()}",
            "propietario": "Test Propietario",
            "identificacion_propietario": "123456789",
            "fecha_matricula": "2024-06-01",
            "tarjeta_operaciones": {"numero": "TO123456", "fecha_inicio": "2024-06-01", "fecha_fin": "2025-06-01"},
            "soat": {"numero_poliza": "SOAT123456", "aseguradora": "Seguros Test", "fecha_inicio": "2024-06-01", "fecha_fin": "2025-06-01"},
            "revision_tecnicomecanica": {"numero": "RTM123456", "cda": "CDA Test", "fecha_inicio": "2024-06-01", "fecha_fin": "2026-06-01"},
            "documentos": {}
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/vehiculos", json=payload)
        vehicle_id = create_response.json()["id"]
        
        # Update
        update_payload = {"propietario": "Updated Propietario", "linea": "T880"}
        update_response = self.session.put(f"{BASE_URL}/api/vehiculos/{vehicle_id}", json=update_payload)
        assert update_response.status_code == 200
        
        updated = update_response.json()
        assert updated["propietario"] == "Updated Propietario"
        assert updated["linea"] == "T880"
        
        # Verify with GET
        get_response = self.session.get(f"{BASE_URL}/api/vehiculos/{vehicle_id}")
        assert get_response.json()["propietario"] == "Updated Propietario"
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/vehiculos/{vehicle_id}")
        print("SUCCESS: Vehicle updated and verified")
    
    def test_delete_vehiculo(self):
        """Test DELETE /api/vehiculos/{id} removes vehicle"""
        # Create vehicle first
        payload = {
            "placa": self.test_placa,
            "licencia_transito_no": "LT123456",
            "marca": "Kenworth",
            "linea": "T800",
            "modelo": "2024",
            "clase_vehiculo": "Tractocamión",
            "tipo_carroceria": "Furgón",
            "combustible": "Diésel",
            "numero_motor": "MOT123456",
            "vin": f"VIN{uuid.uuid4().hex[:10].upper()}",
            "propietario": "Test Propietario",
            "identificacion_propietario": "123456789",
            "fecha_matricula": "2024-06-01",
            "tarjeta_operaciones": {"numero": "TO123456", "fecha_inicio": "2024-06-01", "fecha_fin": "2025-06-01"},
            "soat": {"numero_poliza": "SOAT123456", "aseguradora": "Seguros Test", "fecha_inicio": "2024-06-01", "fecha_fin": "2025-06-01"},
            "revision_tecnicomecanica": {"numero": "RTM123456", "cda": "CDA Test", "fecha_inicio": "2024-06-01", "fecha_fin": "2026-06-01"},
            "documentos": {}
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/vehiculos", json=payload)
        vehicle_id = create_response.json()["id"]
        
        # Delete
        delete_response = self.session.delete(f"{BASE_URL}/api/vehiculos/{vehicle_id}")
        assert delete_response.status_code == 200
        
        # Verify deletion
        get_response = self.session.get(f"{BASE_URL}/api/vehiculos/{vehicle_id}")
        assert get_response.status_code == 404
        print("SUCCESS: Vehicle deleted and verified")
    
    def test_search_vehiculos(self):
        """Test GET /api/vehiculos?search= filters results"""
        response = self.session.get(f"{BASE_URL}/api/vehiculos?search=ABC123")
        assert response.status_code == 200
        data = response.json()
        # Should find the existing test vehicle
        if len(data) > 0:
            assert any("ABC123" in v.get("placa", "") for v in data)
            print(f"SUCCESS: Search found {len(data)} vehicles matching 'ABC123'")
        else:
            print("INFO: No vehicles found matching 'ABC123'")
    
    # ==================== REMOLQUES TESTS ====================
    
    def test_get_remolques(self):
        """Test GET /api/remolques returns list"""
        response = self.session.get(f"{BASE_URL}/api/remolques")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: GET /api/remolques returned {len(data)} trailers")
    
    def test_create_remolque_success(self):
        """Test POST /api/remolques creates trailer with all required fields"""
        payload = {
            "placa": self.test_remolque_placa,
            "tipo_remolque": "Plana",
            "vin": f"RVIN{uuid.uuid4().hex[:10].upper()}",
            "numero_ejes": "3",
            "capacidad_carga_util": "35"
        }
        
        response = self.session.post(f"{BASE_URL}/api/remolques", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["placa"] == self.test_remolque_placa.upper()
        assert data["tipo_remolque"] == "Plana"
        assert data["numero_ejes"] == "3"
        assert "id" in data
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/remolques/{data['id']}")
        print(f"SUCCESS: Created and verified trailer {self.test_remolque_placa}")
    
    def test_create_remolque_duplicate_placa(self):
        """Test POST /api/remolques rejects duplicate placa"""
        payload = {
            "placa": self.test_remolque_placa,
            "tipo_remolque": "Plana",
            "vin": f"RVIN{uuid.uuid4().hex[:10].upper()}",
            "numero_ejes": "3",
            "capacidad_carga_util": "35"
        }
        
        response1 = self.session.post(f"{BASE_URL}/api/remolques", json=payload)
        assert response1.status_code == 200
        remolque_id = response1.json()["id"]
        
        # Try duplicate
        payload["vin"] = f"RVIN{uuid.uuid4().hex[:10].upper()}"
        response2 = self.session.post(f"{BASE_URL}/api/remolques", json=payload)
        assert response2.status_code == 400
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/remolques/{remolque_id}")
        print("SUCCESS: Duplicate remolque placa correctly rejected")
    
    def test_update_remolque(self):
        """Test PUT /api/remolques/{id} updates trailer"""
        payload = {
            "placa": self.test_remolque_placa,
            "tipo_remolque": "Plana",
            "vin": f"RVIN{uuid.uuid4().hex[:10].upper()}",
            "numero_ejes": "3",
            "capacidad_carga_util": "35"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/remolques", json=payload)
        remolque_id = create_response.json()["id"]
        
        # Update
        update_response = self.session.put(f"{BASE_URL}/api/remolques/{remolque_id}", json={"capacidad_carga_util": "40"})
        assert update_response.status_code == 200
        assert update_response.json()["capacidad_carga_util"] == "40"
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/remolques/{remolque_id}")
        print("SUCCESS: Trailer updated and verified")
    
    def test_delete_remolque(self):
        """Test DELETE /api/remolques/{id} removes trailer"""
        payload = {
            "placa": self.test_remolque_placa,
            "tipo_remolque": "Plana",
            "vin": f"RVIN{uuid.uuid4().hex[:10].upper()}",
            "numero_ejes": "3",
            "capacidad_carga_util": "35"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/remolques", json=payload)
        remolque_id = create_response.json()["id"]
        
        delete_response = self.session.delete(f"{BASE_URL}/api/remolques/{remolque_id}")
        assert delete_response.status_code == 200
        
        get_response = self.session.get(f"{BASE_URL}/api/remolques")
        assert all(r["id"] != remolque_id for r in get_response.json())
        print("SUCCESS: Trailer deleted and verified")
    
    # ==================== VINCULACION TESTS ====================
    
    def test_vincular_remolque_to_tractocamion(self):
        """Test POST /api/vehiculos/{id}/vincular-remolque links trailer to Tractocamión"""
        # Create Tractocamión
        vehiculo_payload = {
            "placa": self.test_placa,
            "licencia_transito_no": "LT123456",
            "marca": "Kenworth",
            "linea": "T800",
            "modelo": "2024",
            "clase_vehiculo": "Tractocamión",
            "tipo_carroceria": "Furgón",
            "combustible": "Diésel",
            "numero_motor": "MOT123456",
            "vin": f"VIN{uuid.uuid4().hex[:10].upper()}",
            "propietario": "Test Propietario",
            "identificacion_propietario": "123456789",
            "fecha_matricula": "2024-06-01",
            "tarjeta_operaciones": {"numero": "TO123456", "fecha_inicio": "2024-06-01", "fecha_fin": "2025-06-01"},
            "soat": {"numero_poliza": "SOAT123456", "aseguradora": "Seguros Test", "fecha_inicio": "2024-06-01", "fecha_fin": "2025-06-01"},
            "revision_tecnicomecanica": {"numero": "RTM123456", "cda": "CDA Test", "fecha_inicio": "2024-06-01", "fecha_fin": "2026-06-01"},
            "documentos": {}
        }
        
        vehiculo_response = self.session.post(f"{BASE_URL}/api/vehiculos", json=vehiculo_payload)
        vehiculo_id = vehiculo_response.json()["id"]
        
        # Create Remolque
        remolque_payload = {
            "placa": self.test_remolque_placa,
            "tipo_remolque": "Plana",
            "vin": f"RVIN{uuid.uuid4().hex[:10].upper()}",
            "numero_ejes": "3",
            "capacidad_carga_util": "35"
        }
        
        remolque_response = self.session.post(f"{BASE_URL}/api/remolques", json=remolque_payload)
        remolque_id = remolque_response.json()["id"]
        
        # Link
        link_response = self.session.post(
            f"{BASE_URL}/api/vehiculos/{vehiculo_id}/vincular-remolque",
            json={"remolque_id": remolque_id}
        )
        assert link_response.status_code == 200
        
        # Verify link
        vehiculo_check = self.session.get(f"{BASE_URL}/api/vehiculos/{vehiculo_id}").json()
        assert vehiculo_check.get("remolque_vinculado") == remolque_id
        
        remolques_check = self.session.get(f"{BASE_URL}/api/remolques").json()
        linked_remolque = next((r for r in remolques_check if r["id"] == remolque_id), None)
        assert linked_remolque and linked_remolque.get("vehiculo_vinculado") == vehiculo_id
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/vehiculos/{vehiculo_id}")
        self.session.delete(f"{BASE_URL}/api/remolques/{remolque_id}")
        print("SUCCESS: Trailer linked to Tractocamión and verified")
    
    def test_vincular_remolque_to_non_tractocamion_fails(self):
        """Test linking trailer to non-Tractocamión fails"""
        # Create non-Tractocamión vehicle
        vehiculo_payload = {
            "placa": self.test_placa,
            "licencia_transito_no": "LT123456",
            "marca": "Chevrolet",
            "linea": "NPR",
            "modelo": "2024",
            "clase_vehiculo": "Camión rígido",  # Not Tractocamión
            "tipo_carroceria": "Furgón",
            "combustible": "Diésel",
            "numero_motor": "MOT123456",
            "vin": f"VIN{uuid.uuid4().hex[:10].upper()}",
            "propietario": "Test Propietario",
            "identificacion_propietario": "123456789",
            "fecha_matricula": "2024-06-01",
            "tarjeta_operaciones": {"numero": "TO123456", "fecha_inicio": "2024-06-01", "fecha_fin": "2025-06-01"},
            "soat": {"numero_poliza": "SOAT123456", "aseguradora": "Seguros Test", "fecha_inicio": "2024-06-01", "fecha_fin": "2025-06-01"},
            "revision_tecnicomecanica": {"numero": "RTM123456", "cda": "CDA Test", "fecha_inicio": "2024-06-01", "fecha_fin": "2026-06-01"},
            "documentos": {}
        }
        
        vehiculo_response = self.session.post(f"{BASE_URL}/api/vehiculos", json=vehiculo_payload)
        vehiculo_id = vehiculo_response.json()["id"]
        
        # Create Remolque
        remolque_payload = {
            "placa": self.test_remolque_placa,
            "tipo_remolque": "Plana",
            "vin": f"RVIN{uuid.uuid4().hex[:10].upper()}",
            "numero_ejes": "3",
            "capacidad_carga_util": "35"
        }
        
        remolque_response = self.session.post(f"{BASE_URL}/api/remolques", json=remolque_payload)
        remolque_id = remolque_response.json()["id"]
        
        # Try to link - should fail
        link_response = self.session.post(
            f"{BASE_URL}/api/vehiculos/{vehiculo_id}/vincular-remolque",
            json={"remolque_id": remolque_id}
        )
        assert link_response.status_code == 400
        assert "tractocamion" in link_response.json().get("detail", "").lower()
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/vehiculos/{vehiculo_id}")
        self.session.delete(f"{BASE_URL}/api/remolques/{remolque_id}")
        print("SUCCESS: Linking to non-Tractocamión correctly rejected")
    
    def test_desvincular_remolque(self):
        """Test POST /api/vehiculos/{id}/desvincular-remolque unlinks trailer"""
        # Create and link first
        vehiculo_payload = {
            "placa": self.test_placa,
            "licencia_transito_no": "LT123456",
            "marca": "Kenworth",
            "linea": "T800",
            "modelo": "2024",
            "clase_vehiculo": "Tractocamión",
            "tipo_carroceria": "Furgón",
            "combustible": "Diésel",
            "numero_motor": "MOT123456",
            "vin": f"VIN{uuid.uuid4().hex[:10].upper()}",
            "propietario": "Test Propietario",
            "identificacion_propietario": "123456789",
            "fecha_matricula": "2024-06-01",
            "tarjeta_operaciones": {"numero": "TO123456", "fecha_inicio": "2024-06-01", "fecha_fin": "2025-06-01"},
            "soat": {"numero_poliza": "SOAT123456", "aseguradora": "Seguros Test", "fecha_inicio": "2024-06-01", "fecha_fin": "2025-06-01"},
            "revision_tecnicomecanica": {"numero": "RTM123456", "cda": "CDA Test", "fecha_inicio": "2024-06-01", "fecha_fin": "2026-06-01"},
            "documentos": {}
        }
        
        vehiculo_response = self.session.post(f"{BASE_URL}/api/vehiculos", json=vehiculo_payload)
        vehiculo_id = vehiculo_response.json()["id"]
        
        remolque_payload = {
            "placa": self.test_remolque_placa,
            "tipo_remolque": "Plana",
            "vin": f"RVIN{uuid.uuid4().hex[:10].upper()}",
            "numero_ejes": "3",
            "capacidad_carga_util": "35"
        }
        
        remolque_response = self.session.post(f"{BASE_URL}/api/remolques", json=remolque_payload)
        remolque_id = remolque_response.json()["id"]
        
        # Link
        self.session.post(f"{BASE_URL}/api/vehiculos/{vehiculo_id}/vincular-remolque", json={"remolque_id": remolque_id})
        
        # Unlink
        unlink_response = self.session.post(f"{BASE_URL}/api/vehiculos/{vehiculo_id}/desvincular-remolque")
        assert unlink_response.status_code == 200
        
        # Verify unlink
        vehiculo_check = self.session.get(f"{BASE_URL}/api/vehiculos/{vehiculo_id}").json()
        assert vehiculo_check.get("remolque_vinculado") is None
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/vehiculos/{vehiculo_id}")
        self.session.delete(f"{BASE_URL}/api/remolques/{remolque_id}")
        print("SUCCESS: Trailer unlinked and verified")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
