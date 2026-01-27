from app.services.openf1 import openf1_client

print("🧪 Testing OpenF1 Service\n")

# Test 1: Get all drivers
print("Test 1: Getting all drivers...")
drivers = openf1_client.get_drivers()

if drivers:
    print(f"✅ Success! Got {len(drivers)} drivers")
    print(f"   First driver: {drivers[0]['full_name']}\n")
else:
    print("❌ Failed to get drivers\n")

# Test 2: Get specific driver
print("Test 2: Getting driver #1 (Max Verstappen)...")
driver = openf1_client.get_driver_by_number(1)

if driver:
    print(f"✅ Success!")
    print(f"   Name: {driver['full_name']}")
    print(f"   Team: {driver['team_name']}")
    print(f"   Number: {driver['driver_number']}\n")
else:
    print("❌ Driver not found\n")

print("✨ Tests completed")