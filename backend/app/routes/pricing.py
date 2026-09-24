from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Product
from ..schemas import PricingRecommendation, ApplyPricingRequest, ProductResponse
from ..ml.dynamic_pricing import pricing_engine

router = APIRouter(prefix="/pricing", tags=["Dynamic Pricing"])

@router.get("/recommendations", response_model=List[PricingRecommendation])
def get_pricing_recommendations(db: Session = Depends(get_db)):
    """
    Retorna la lista de precios recomendados por el algoritmo cuantitativo de Dynamic Pricing,
    correlacionando el stock actual con la demanda predicha por el modelo de Machine Learning.
    """
    return pricing_engine.get_all_recommendations(db)

@router.post("/apply", response_model=ProductResponse)
def apply_price_change(payload: ApplyPricingRequest, db: Session = Depends(get_db)):
    """
    Aplica un nuevo precio en tiempo real a un producto.
    El precio se propaga instantáneamente a todos los canales: Web, App y POS.
    """
    try:
        updated = pricing_engine.apply_pricing(db, payload.product_id, payload.new_price)
        return updated
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/apply-all")
def apply_all_recommendations(db: Session = Depends(get_db)):
    """
    Aplica en 1 solo clic todas las sugerencias del motor de Dynamic Pricing a los productos con auto-pricing.
    """
    count = pricing_engine.apply_all_recommendations(db)
    return {"message": f"Precios dinámicos actualizados con éxito en {count} productos para todos los canales."}

@router.post("/toggle-auto/{product_id}")
def toggle_auto_pricing(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    product.auto_pricing_enabled = not product.auto_pricing_enabled
    db.commit()
    return {
        "product_id": product.id,
        "sku": product.sku,
        "auto_pricing_enabled": product.auto_pricing_enabled
    }
