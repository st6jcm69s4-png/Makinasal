@echo off
cd /d "%~dp0"
echo Guncel kod indiriliyor...
git pull
echo Paketler kontrol ediliyor...
call npm install
echo Uygulama baslatiliyor. Telefonda Expo Go ile QR kodu okutun.
call npx expo start --tunnel
pause
