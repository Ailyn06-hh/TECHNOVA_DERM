@echo off
echo ========================================================
echo Iniciando Servidor Central Nácar Omnichannel (FastAPI)
echo Machine Learning Forecaster + Motor de Dynamic Pricing
echo ========================================================
cd backend
venv\Scripts\python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
