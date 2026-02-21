import requests
import sys
import json
from datetime import datetime
from typing import Optional

class PhotoboothAPITester:
    def __init__(self, base_url="https://filter-frame-lab.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.session_id: Optional[str] = None
        self.test_results = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                except:
                    response_data = {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Error Response: {json.dumps(response_data, indent=2)}")
                except:
                    response_data = {"error": response.text}

            self.test_results.append({
                "name": name,
                "method": method,
                "endpoint": endpoint,
                "expected_status": expected_status,
                "actual_status": response.status_code,
                "success": success,
                "response_data": response_data if success else {}
            })

            return success, response_data if success else {}

        except requests.RequestException as e:
            print(f"❌ Failed - Request Error: {str(e)}")
            self.test_results.append({
                "name": name,
                "method": method,
                "endpoint": endpoint,
                "expected_status": expected_status,
                "actual_status": "ERROR",
                "success": False,
                "error": str(e)
            })
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.run_test(
            "Root API",
            "GET",
            "",
            200
        )
        return success

    def test_get_templates(self):
        """Test getting templates"""
        success, response = self.run_test(
            "Get Templates",
            "GET",
            "templates",
            200
        )
        
        if success:
            templates = response
            if isinstance(templates, list) and len(templates) >= 2:
                print(f"   Found {len(templates)} templates")
                for template in templates:
                    print(f"   - {template.get('name', 'Unnamed')} ({template.get('id', 'no-id')})")
                return True
            else:
                print(f"   Warning: Expected at least 2 templates, got {len(templates) if isinstance(templates, list) else 0}")
                
        return success

    def test_get_stickers(self):
        """Test getting stickers"""
        success, response = self.run_test(
            "Get Stickers",
            "GET",
            "stickers",
            200
        )
        
        if success:
            stickers = response
            if isinstance(stickers, list) and len(stickers) > 0:
                print(f"   Found {len(stickers)} stickers")
                categories = set(sticker.get('category', 'unknown') for sticker in stickers)
                print(f"   Categories: {', '.join(categories)}")
                return True
            else:
                print(f"   Warning: Expected stickers, got {len(stickers) if isinstance(stickers, list) else 0}")
                
        return success

    def test_create_session(self):
        """Test creating a photo session"""
        success, response = self.run_test(
            "Create Session",
            "POST",
            "sessions",
            200,
            data={"template_id": "classic-white"}
        )
        
        if success and 'session_id' in response:
            self.session_id = response['session_id']
            print(f"   Created session: {self.session_id}")
            return True
        return success

    def test_get_session(self):
        """Test getting session details"""
        if not self.session_id:
            print("❌ No session_id available for testing")
            return False
            
        success, response = self.run_test(
            "Get Session",
            "GET",
            f"sessions/{self.session_id}",
            200
        )
        
        if success:
            session = response
            print(f"   Session status: {session.get('status', 'unknown')}")
            print(f"   Photo count: {len(session.get('photos', []))}")
            return True
        return success

    def test_add_photo(self):
        """Test adding a photo to session"""
        if not self.session_id:
            print("❌ No session_id available for testing")
            return False

        # Create a dummy base64 image (1x1 red pixel)
        dummy_image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
        
        success, response = self.run_test(
            "Add Photo",
            "POST",
            f"sessions/{self.session_id}/photos",
            200,
            data={
                "session_id": self.session_id,
                "photo_data": dummy_image
            }
        )
        
        if success:
            print(f"   Photo count after add: {response.get('photo_count', 'unknown')}")
            return True
        return success

    def test_update_stickers(self):
        """Test updating stickers for session"""
        if not self.session_id:
            print("❌ No session_id available for testing")
            return False

        stickers_data = [
            {
                "id": "test-sticker-1",
                "name": "Test Star",
                "url": "https://cdn-icons-png.flaticon.com/512/1828/1828884.png",
                "x": 50,
                "y": 50,
                "scale": 1.0,
                "rotation": 0
            }
        ]
        
        success, response = self.run_test(
            "Update Stickers",
            "POST",
            f"sessions/{self.session_id}/stickers",
            200,
            data={
                "session_id": self.session_id,
                "stickers": stickers_data
            }
        )
        return success

    def test_qr_code_generation(self):
        """Test QR code generation"""
        if not self.session_id:
            print("❌ No session_id available for testing")
            return False
            
        success, _ = self.run_test(
            "Generate QR Code",
            "GET",
            f"qrcode/{self.session_id}",
            200,
            headers={'Accept': 'image/png'}
        )
        return success

    def test_share_data(self):
        """Test getting share data"""
        if not self.session_id:
            print("❌ No session_id available for testing")
            return False
            
        success, response = self.run_test(
            "Get Share Data",
            "GET",
            f"share/{self.session_id}",
            200
        )
        
        if success:
            print(f"   Share data: {json.dumps(response, indent=2)}")
        return success

    def print_summary(self):
        """Print test summary"""
        print(f"\n📊 Test Summary")
        print(f"   Tests run: {self.tests_run}")
        print(f"   Tests passed: {self.tests_passed}")
        print(f"   Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.tests_passed < self.tests_run:
            print(f"\n❌ Failed Tests:")
            for result in self.test_results:
                if not result['success']:
                    error_msg = result.get('error', f"Status {result['actual_status']}")
                    print(f"   - {result['name']}: {error_msg}")
        
        return self.tests_passed == self.tests_run

def main():
    print("🚀 Starting Power of Ten Photobooth API Testing...")
    print(f"   Testing against: https://filter-frame-lab.preview.emergentagent.com/api")
    
    tester = PhotoboothAPITester()
    
    # Run all tests in sequence
    tests = [
        tester.test_root_endpoint,
        tester.test_get_templates,
        tester.test_get_stickers,
        tester.test_create_session,
        tester.test_get_session,
        tester.test_add_photo,
        tester.test_update_stickers,
        tester.test_qr_code_generation,
        tester.test_share_data,
    ]
    
    for test in tests:
        test()
    
    # Print final results
    all_passed = tester.print_summary()
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())