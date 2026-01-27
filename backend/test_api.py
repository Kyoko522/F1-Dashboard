import requests
import time

url = "https://api.openf1.org/v1/drivers?session_key=latest"

print("🔄 Making request to OpenF1 API...")
print(f"📍 URL: {url}\n")

try:
    # Make request with timeout
    response = requests.get(url, timeout=10)
    
    # Check status code
    if response.status_code == 200:
        print(" Success! Status code: 200\n")
        
        # Try to parse JSON
        try:
            data = response.json()
            
            # Check if data is empty
            if not data:
                print("⚠️ Warning: API returned empty data")
            else:
                print(f"📊 Retrieved {len(data)} drivers\n")
                
                # Print first 3 drivers
                print("🏁 First 3 drivers:")
                for i in range(min(3, len(data))):
                    driver = data[i]
                    print(f"   {i+1}. {driver['full_name']} - {driver['team_name']} (#{driver['driver_number']})")
        
        except ValueError as e:
            print(f"Error: Response is not valid JSON")
            print(f"Details: {e}")
    
    elif response.status_code == 404:
        print("Error 404: Endpoint not found")
        print("The API endpoint may have changed")
    
    elif response.status_code == 500:
        print("Error 500: Server error")
        print("The API server is having problems")
    
    else:
        print(f"Unexpected status code: {response.status_code}")

except requests.exceptions.Timeout:
    print("Error: Request timed out")
    print("The API took too long to respond (>10 seconds)")

except requests.exceptions.ConnectionError:
    print("Error: Connection failed")
    print("Check your internet connection or the API may be down")

except requests.exceptions.RequestException as e:
    print(f"Unexpected error occurred: {e}")

print("\n✨ Script completed")