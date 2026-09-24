from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routes import products, inventory, pricing, forecast, orders, cart

# Crear tablas en base de datos si no existen
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Nácar Omnichannel Brain API - HackaTec 2026",
    description="Cerebro Digital de E-Business para MiPyMEs: Predicción de Stock con Machine Learning (scikit-learn), Motor de Dynamic Pricing en tiempo real e Inventario Único Omnicanal.",
    version="2.0.0"
)

# Configuración CORS permisiva para comunicación fluida con Web (Next.js), POS y App Móvil
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registro de routers modulares
app.include_router(products.router, prefix="/api")
app.include_router(inventory.router, prefix="/api")
app.include_router(pricing.router, prefix="/api")
app.include_router(forecast.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(cart.router, prefix="/api")

@app.get("/")
def root():
    return {
        "status": "online",
        "platform": "Nácar SkinHub Omnicanal",
        "hackathon": "HackaTec 2026 - Etapa Regional",
        "components": {
            "ml_engine": "scikit-learn RandomForest Demand Forecaster",
            "dynamic_pricing": "Real-time elasticity and stock velocity pricing engine",
            "omnichannel_core": "Single central inventory with atomic order dispatch (Web, POS, Mobile App)",
            "documentation": "/docs"
        }
    }
