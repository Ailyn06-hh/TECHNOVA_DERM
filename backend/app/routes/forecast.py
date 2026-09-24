import uuid
from datetime import datetime, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Product, SupplierOrder
from ..schemas import ProductForecastResponse, SupplierOrderResponse
from ..ml.demand_forecaster import forecaster

router = APIRouter(prefix="/forecast", tags=["Machine Learning Forecast"])

@router.get("/all", response_model=List[ProductForecastResponse])
def get_all_forecasts(db: Session = Depends(get_db)):
    """
    Retorna la predicción de Machine Learning (Random Forest) a 14 días para todos los productos,
    incluyendo curva de demanda, Runout Date, nivel de riesgo y sugerencia de reorden.
    """
    products = db.query(Product).all()
    results = []
    for product in products:
        results.append(forecaster.forecast_product(db, product, horizon_days=14))
    return results

@router.get("/{product_id}", response_model=ProductForecastResponse)
def get_product_forecast(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return forecaster.forecast_product(db, product, horizon_days=14)

@router.post("/retrain")
def retrain_ml_models(db: Session = Depends(get_db)):
    """
    Fuerza el reentrenamiento de los modelos de Machine Learning con el historial más reciente.
    """
    forecaster.train_models(db)
    return {"message": "Modelos de Machine Learning (RandomForest) reentrenados exitosamente con scikit-learn."}

@router.post("/generate-reorder/{product_id}", response_model=SupplierOrderResponse)
def generate_reorder_supplier(product_id: int, db: Session = Depends(get_db)):
    """
    Genera automáticamente una Orden de Compra formal al proveedor basada en la cantidad
    sugerida por el modelo de ML (ROP).
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    forecast = forecaster.forecast_product(db, product, horizon_days=14)
    qty = forecast["suggested_reorder_qty"]
    if qty <= 0:
        qty = product.min_safety_stock * 2

    order_code = f"OC-ML-{uuid.uuid4().hex[:6].upper()}"
    unit_cost = product.cost_price
    total_cost = round(unit_cost * qty, 2)
    arrival = datetime.utcnow() + timedelta(days=product.lead_time_days)

    supplier_order = SupplierOrder(
        order_code=order_code,
        product_id=product.id,
        quantity_ordered=qty,
        status="ORDERED",
        supplier_name="Laboratorios Dermocosmética MX",
        unit_cost=unit_cost,
        total_cost=total_cost,
        ml_reason=f"Generado por modelo ML: Cobertura en riesgo ({forecast['days_until_runout']} días restantes vs {product.lead_time_days} días de lead time). Demanda proyectada diaria: {forecast['avg_daily_demand_forecast']} u.",
        estimated_arrival=arrival
    )
    db.add(supplier_order)
    db.commit()
    db.refresh(supplier_order)

    return SupplierOrderResponse(
        id=supplier_order.id,
        order_code=supplier_order.order_code,
        product_id=supplier_order.product_id,
        product_name=product.name,
        quantity_ordered=supplier_order.quantity_ordered,
        status=supplier_order.status,
        supplier_name=supplier_order.supplier_name,
        unit_cost=supplier_order.unit_cost,
        total_cost=supplier_order.total_cost,
        ml_reason=supplier_order.ml_reason,
        created_at=supplier_order.created_at
    )

@router.get("/supplier-orders/list", response_model=List[SupplierOrderResponse])
def list_supplier_orders(db: Session = Depends(get_db)):
    orders = db.query(SupplierOrder).order_by(SupplierOrder.created_at.desc()).all()
    results = []
    for o in orders:
        results.append(SupplierOrderResponse(
            id=o.id,
            order_code=o.order_code,
            product_id=o.product_id,
            product_name=o.product.name if o.product else "N/A",
            quantity_ordered=o.quantity_ordered,
            status=o.status,
            supplier_name=o.supplier_name,
            unit_cost=o.unit_cost,
            total_cost=o.total_cost,
            ml_reason=o.ml_reason,
            created_at=o.created_at
        ))
    return results
