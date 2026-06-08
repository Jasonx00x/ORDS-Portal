@echo off
cd /d "%~dp0"
echo Starting ORDS Portal preview...
echo.
echo Keep this window open while showing the portal.
echo Portal URL: http://127.0.0.1:4173/portal.html
echo.
"C:\Program Files\nodejs\node.exe" preview-server.mjs
