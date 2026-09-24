from typing import List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import Product, SaleHistory, Order
from ..schemas import ProductResponse

router = APIRouter(prefix="/inventory", tags=["Inventario Centralizado"])

class StockAdjustmentRequest(BaseModel):
    product_id: int
    new_stock: int
    reason: str = "Ajuste manual de inventario / Auditoría"

@router.get("/summary")
def get_inventory_summary(db: Session = Depends(get_db)):
    products = db.query(Product).all()
    
    total_skus = len(products)
    total_units = sum(p.stock_central for p in products)
    valuation_cost = round(sum(p.stock_central * p.cost_price for p in products), 2)
    valuation_retail = round(sum(p.stock_central * p.current_dynamic_price for p in products), 2)

    critical_items = [
        {
            "id": p.id,
            "sku": p.sku,
            "name": p.name,
            "stock_central": p.stock_central,
            "min_safety_stock": p.min_safety_stock,
            "current_price": p.current_dynamic_price
        } for p in products if p.stock_central <= p.min_safety_stock
    ]

    out_of_stock_items = [p.name for p in products if p.stock_central <= 0]

    # Distribución de ventas por canal
    sales_by_channel = db.query(
        SaleHistory.channel,
        func.sum(SaleHistory.quantity_sold).label("total_units"),
        func.sum(SaleHistory.quantity_sold * SaleHistory.unit_price).label("total_revenue")
    ).group_by(SaleHistory.channel).all()

    channel_stats = {
        row.channel: {
            "units": int(row.total_units or 0),
            "revenue": round(float(row.total_revenue or 0), 2)
        } for row in sales_by_channel
    }

    return {
        "total_skus": total_skus,
        "total_units_in_stock": total_units,
        "inventory_valuation_cost": valuation_cost,
        "inventory_valuation_retail": valuation_retail,
        "critical_stock_count": len(critical_items),
        "critical_items": critical_items,
        "out_of_stock_count": len(out_of_stock_items),
        "out_of_stock_items": out_of_stock_items,
        "channel_distribution": channel_stats
    }

@router.post("/adjust")
def adjust_stock(payload: StockAdjustmentRequest, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    old_stock = product.stock_central
    product.stock_central = max(0, payload.new_stock)
    db.commit()
    db.refresh(product)

    return {
        "message": f"Stock ajustado exitosamente de {old_stock} a {product.stock_central} unidades.",
        "product_id": product.id,
        "sku": product.sku,
        "new_stock": product.stock_central
    }
