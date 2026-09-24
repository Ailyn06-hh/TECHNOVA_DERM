from typing import Dict, List
import numpy as np
from sqlalchemy.orm import Session
from ..models import Product
from .demand_forecaster import forecaster

class DynamicPricingEngine:
    """
    Motor cuantitativo de Dynamic Pricing omnicanal.
    Ajusta precios en tiempo real correlacionando la velocidad de demanda
    proyectada por el modelo de ML con el nivel de stock en almacén central.
    """

    def calculate_recommendation(self, db: Session, product: Product) -> dict:
        # Obtener predicción de demanda del modelo de ML
        forecast_data = forecaster.forecast_product(db, product, horizon_days=14)
        avg_demand = max(0.5, forecast_data["avg_daily_demand_forecast"])
        days_left = product.stock_central / avg_demand

        base = product.base_price
        cost = product.cost_price
        floor = product.min_price
        ceiling = product.max_price
        current = product.current_dynamic_price

        # Margen mínimo de seguridad (la MiPyME nunca vende a pérdida)
        absolute_min = max(floor, cost * 1.15)  # Mínimo 15% de margen sobre costo

        # Determinar estrategia
        if days_left <= (product.lead_time_days * 1.5) and product.stock_central <= (product.min_safety_stock * 1.5):
            # Régimen 1: Escasez y alta presión de demanda
            strategy = "SCARCITY_PREMIUM"
            # Ajuste de +8% a +15% según qué tan severa es la escasez
            scarcity_factor = min(0.15, max(0.06, (1.0 - (days_left / (product.lead_time_days * 1.5))) * 0.15))
            target_price = base * (1.0 + scarcity_factor)
            reason = f"Inventario bajo ({product.stock_central} u., quiebre en ~{int(days_left)} días) con alta demanda ML. Aumento de margen de +{round(scarcity_factor*100, 1)}% para conservar stock y maximizar utilidad."

        elif days_left > 35 or product.stock_central > (product.min_safety_stock * 3.5):
            # Régimen 2: Sobreinventario / Baja rotación
            strategy = "EXCESS_STOCK_CLEARANCE"
            # Descuento táctico de -10% a -22%
            excess_factor = min(0.22, max(0.08, ((days_left - 35) / 50.0) * 0.20))
            target_price = base * (1.0 - excess_factor)
            reason = f"Exceso de inventario (~{int(days_left)} días de cobertura). Descuento dinámico del -{round(excess_factor*100, 1)}% para liberar capital de trabajo y acelerar rotación."

        else:
            # Régimen 3: Equilibrado / Óptimo
            strategy = "NEUTRAL"
            target_price = base
            reason = f"Inventario equilibrado (~{int(days_left)} días de stock). Precio nominal de lista recomendado."

        # Aplicar límites duros (Price Floor & Ceiling)
        recommended_price = float(np.clip(target_price, absolute_min, ceiling))
        recommended_price = round(recommended_price, 2)

        change_pct = round(((recommended_price - current) / current) * 100, 1)
        margin_pct = round(((recommended_price - cost) / recommended_price) * 100, 1)

        return {
            "product_id": product.id,
            "sku": product.sku,
            "name": product.name,
            "current_price": current,
            "base_price": base,
            "recommended_price": recommended_price,
            "price_change_percent": change_pct,
            "stock_current": product.stock_central,
            "predicted_daily_demand": avg_demand,
            "days_of_stock_left": round(days_left, 1),
            "strategy_applied": strategy,
            "margin_percentage": margin_pct,
            "reason": reason
        }

    def get_all_recommendations(self, db: Session) -> List[dict]:
        products = db.query(Product).all()
        return [self.calculate_recommendation(db, p) for p in products]

    def apply_pricing(self, db: Session, product_id: int, new_price: float) -> Product:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise ValueError(f"Producto con ID {product_id} no encontrado")

        # Asegurar límites
        min_allowed = max(product.min_price, product.cost_price * 1.10)
        final_price = float(np.clip(new_price, min_allowed, product.max_price))
        product.current_dynamic_price = round(final_price, 2)
        db.commit()
        db.refresh(product)
        return product

    def apply_all_recommendations(self, db: Session) -> int:
        """
        Aplica automáticamente todas las recomendaciones a los productos
        con auto_pricing_enabled activado.
        """
        products = db.query(Product).filter(Product.auto_pricing_enabled == True).all()
        updated_count = 0
        for p in products:
            rec = self.calculate_recommendation(db, p)
            if abs(rec["recommended_price"] - p.current_dynamic_price) > 0.5:
                p.current_dynamic_price = rec["recommended_price"]
                updated_count += 1
        db.commit()
        return updated_count

pricing_engine = DynamicPricingEngine()
