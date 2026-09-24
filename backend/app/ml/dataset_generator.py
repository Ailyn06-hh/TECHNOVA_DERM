import random
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
from ..models import Product, SaleHistory

def generate_historical_sales(db: Session, days: int = 180):
    """
    Genera 180 días de transacciones realistas para cada producto en la base de datos.
    Modela:
    - Patrón semanal (Viernes-Sábado +35%)
    - Efecto quincena mexicana (días 14-16 y 29-31 +50%)
    - Canales omnicanal: WEB (45%), POS (35%), APP (20%)
    - Elasticidad de precio
    """
    products = db.query(Product).all()
    if not products:
        return

    # Limpiar ventas previas si existen
    db.query(SaleHistory).delete()
    db.commit()

    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=days)

    records = []
    
    # Categorías y su velocidad base de venta diaria
    base_velocities = {
        "Serum": 7.5,
        "Protector Solar": 9.0,
        "Limpiador": 8.0,
        "Hidratante": 6.5,
        "Exfoliante": 4.5
    }

    current = start_date
    while current <= end_date:
        day_of_week = current.weekday()  # 0=Lunes, 4=Viernes, 5=Sábado, 6=Domingo
        day_of_month = current.day

        # Multiplicadores de estacionalidad
        weekend_mult = 1.35 if day_of_week in (4, 5) else (1.1 if day_of_week == 6 else 0.9)
        quincena_mult = 1.55 if day_of_month in (14, 15, 16, 29, 30, 31) else 1.0

        for product in products:
            base_vol = base_velocities.get(product.category, 6.0)
            
            # Factor aleatorio con distribución de Poisson / normal
            expected_sales = base_vol * weekend_mult * quincena_mult
            # Ruido estocástico
            noise = np.random.normal(1.0, 0.15)
            daily_total = max(1, int(round(expected_sales * noise)))

            # Repartir entre los 3 canales omnicanal
            # 45% WEB, 35% POS, 20% APP
            web_qty = max(0, int(round(daily_total * 0.45)))
            pos_qty = max(0, int(round(daily_total * 0.35)))
            app_qty = max(0, daily_total - (web_qty + pos_qty))

            channels_data = [
                ("WEB", web_qty),
                ("POS", pos_qty),
                ("APP", app_qty)
            ]

            for channel, qty in channels_data:
                if qty > 0:
                    dt = datetime(current.year, current.month, current.day, random.randint(9, 21), random.randint(0, 59))
                    records.append(SaleHistory(
                        product_id=product.id,
                        date=dt,
                        quantity_sold=qty,
                        channel=channel,
                        unit_price=product.base_price,
                        was_promotion=(random.random() < 0.1)
                    ))

        current += timedelta(days=1)

    db.bulk_save_objects(records)
    db.commit()
    print(f"Generados {len(records)} registros históricos de ventas omnicanal para {len(products)} productos.")
