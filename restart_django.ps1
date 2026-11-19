taskkill /F /IM python.exe 2>$null
Start-Sleep -Seconds 3
cd "D:\AIR BOOKING\backend"
.\venv\Scripts\python.exe manage.py runserver 8000 --noreload 2>&1 &
Write-Output "Django restart initiated"