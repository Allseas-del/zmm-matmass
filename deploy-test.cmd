@echo off
rem Deploys the TEST VARIANT next to the productive app: BSP ZMMMATMASST, app id com.allseas.zmmmatmasst,
rem intent Material-massUploadTest (transport DS4K915674, logon from .env). The productive BSP ZMMMATMASS is not touched.
rem After the deploy: https://vhlruds4ci.sap.allseas.global:44300/sap/bc/ui5_ui5/sap/zmmmatmasst/tool.html?sap-client=410
rem Double-click, or run in a terminal: deploy-test.cmd
cd /d "%~dp0"
where node >nul 2>&1 || set "PATH=C:\Users\jdr\tools\node-v24.21.0-win-x64;%PATH%"
node scripts\variant.js apply
if errorlevel 1 goto :fail
call npx.cmd ui5 build --config=ui5-test.yaml --clean-dest --dest dist
if errorlevel 1 goto :fail
call npx.cmd fiori deploy --config ui5-deploy-test.yaml --yes
if errorlevel 1 goto :fail
node scripts\variant.js restore
echo.
echo Deploy of the test variant finished: BSP ZMMMATMASST
echo Open: https://vhlruds4ci.sap.allseas.global:44300/sap/bc/ui5_ui5/sap/zmmmatmasst/tool.html?sap-client=410
pause
exit /b 0
:fail
node scripts\variant.js restore
echo.
echo Deploy FAILED, see the messages above.
pause
exit /b 1
