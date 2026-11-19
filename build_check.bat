cd "D:\AIR BOOKING\frontend"
npm run build > build_output.txt 2>&1
echo ERRORLEVEL=%ERRORLEVEL% >> build_output.txt
type build_output.txt