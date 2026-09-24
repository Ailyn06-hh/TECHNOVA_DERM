import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sqlalchemy.orm import Session
from ..models import Product, SaleHistory

class DemandForecaster:
    """
    Motor de Machine Learning real basado en Random Forest de scikit-learn
    para predicción de demanda de inventario omnicanal.
    """
    def __init__(self):
        self.models: Dict[int, RandomForestRegressor] = {}
        self.last_trained: Optional[datetime] = None

    def _extract_features_dataframe(self, df_daily: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
        """
        Crea matriz de características (features) para el modelo de ML.
        """
        df = df_daily.copy()
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date').reset_index(drop=True)

        df['day_of_week'] = df['date'].dt.dayofweek
        df['day_of_month'] = df['date'].dt.day
        df['is_weekend'] = df['day_of_week'].isin([4, 5, 6]).astype(int)
        df['is_quincena'] = df['day_of_month'].isin([14, 15, 16, 29, 30, 31]).astype(int)

        # Lags y medias móviles
        df['lag_1'] = df['quantity_sold'].shift(1)
        df['lag_7'] = df['quantity_sold'].shift(7)
        df['rolling_7d_mean'] = df['quantity_sold'].shift(1).rolling(window=7, min_periods=1).mean()
        df['rolling_14d_mean'] = df['quantity_sold'].shift(1).rolling(window=14, min_periods=1).mean()

        # Rellenar nulos iniciales de lags
        df = df.bfill().ffill()

        features = ['day_of_week', 'day_of_month', 'is_weekend', 'is_quincena', 'lag_1', 'lag_7', 'rolling_7d_mean', 'rolling_14d_mean']
        X = df[features]
        y = df['quantity_sold']
        return X, y

    def train_models(self, db: Session):
        """
        Entrena un modelo Random Forest por cada SKU en el catálogo.
        """
        products = db.query(Product).all()
        if not products:
            return

        for product in products:
            # Obtener ventas históricas agrupadas por día
            sales = db.query(SaleHistory).filter(SaleHistory.product_id == product.id).all()
            if len(sales) < 14:
                continue

            # Convertir a DataFrame y agrupar por fecha
            data = [{"date": s.date.date(), "quantity_sold": s.quantity_sold} for s in sales]
            df = pd.DataFrame(data).groupby("date", as_index=False).sum()

            if len(df) < 14:
                continue

            X, y = self._extract_features_dataframe(df)

            model = RandomForestRegressor(
                n_estimators=70,
                max_depth=8,
                random_state=42,
                n_jobs=-1
            )
            model.fit(X, y)
            self.models[product.id] = model

        self.last_trained = datetime.utcnow()
        print(f"Modelos de ML entrenados para {len(self.models)} productos.")

    def forecast_product(self, db: Session, product: Product, horizon_days: int = 14) -> dict:
        """
        Genera la predicción futura día por día recursivamente para los próximos `horizon_days`.
        Calcula fecha de agotamiento (runout date) y stock de seguridad sugerido.
        """
        # Asegurar modelo entrenado
        if product.id not in self.models:
            self.train_models(db)

        # Si aún no hay modelo, estimar con media fallback
        model = self.models.get(product.id)

        sales = db.query(SaleHistory).filter(SaleHistory.product_id == product.id).all()
        data = [{"date": s.date.date(), "quantity_sold": s.quantity_sold} for s in sales]
        df_history = pd.DataFrame(data).groupby("date", as_index=False).sum().sort_values("date")

        # Últimos 14 días históricos para visualización en el dashboard
        recent_history = []
        if not df_history.empty:
            last_records = df_history.tail(14).to_dict(orient="records")
            for r in last_records:
                d = pd.to_datetime(r["date"])
                recent_history.append({
                    "date": d.strftime("%Y-%m-%d"),
                    "day_name": d.strftime("%a"),
                    "actual_sales": int(r["quantity_sold"])
                })

        # Predicción a futuro
        forecast_curve = []
        current_date = datetime.utcnow().date()
        
        # Historial de ventas para inicializar lags
        recent_sales = list(df_history['quantity_sold'].tail(14).values) if not df_history.empty else [5.0] * 14
        if len(recent_sales) < 14:
            recent_sales = [5.0] * (14 - len(recent_sales)) + recent_sales

        cum_predicted = 0.0
        runout_day_index = None

        spanish_days = {
            "Mon": "Lun", "Tue": "Mar", "Wed": "Mié", "Thu": "Jue",
            "Fri": "Vie", "Sat": "Sáb", "Sun": "Dom"
        }

        for day_offset in range(1, horizon_days + 1):
            target_date = current_date + timedelta(days=day_offset)
            dow = target_date.weekday()
            dom = target_date.day
            is_wknd = 1 if dow in (4, 5, 6) else 0
            is_quin = 1 if dom in (14, 15, 16, 29, 30, 31) else 0

            lag_1 = recent_sales[-1]
            lag_7 = recent_sales[-7] if len(recent_sales) >= 7 else lag_1
            roll_7 = np.mean(recent_sales[-7:])
            roll_14 = np.mean(recent_sales[-14:])

            feat_row = pd.DataFrame([{
                'day_of_week': dow,
                'day_of_month': dom,
                'is_weekend': is_wknd,
                'is_quincena': is_quin,
                'lag_1': lag_1,
                'lag_7': lag_7,
                'rolling_7d_mean': roll_7,
                'rolling_14d_mean': roll_14
            }])

            if model:
                pred_val = float(model.predict(feat_row)[0])
            else:
                pred_val = float(roll_7 * (1.3 if is_wknd else 1.0) * (1.4 if is_quin else 1.0))

            pred_val = max(0.5, round(pred_val, 1))
            recent_sales.append(pred_val)

            # Control de quiebre de stock acumulado
            cum_predicted += pred_val
            if runout_day_index is None and cum_predicted >= product.stock_central:
                runout_day_index = day_offset

            day_en = target_date.strftime("%a")
            day_es = spanish_days.get(day_en, day_en)

            forecast_curve.append({
                "date": target_date.strftime("%Y-%m-%d"),
                "day_name": f"{day_es} {target_date.day}",
                "predicted_demand": pred_val,
                "is_quincena": bool(is_quin),
                "is_weekend": bool(is_wknd)
            })

        avg_daily = round(float(np.mean([f["predicted_demand"] for f in forecast_curve])), 2)

        # Cálculo de fecha de agotamiento (Runout Date)
        if runout_day_index is not None:
            runout_dt = current_date + timedelta(days=runout_day_index)
            runout_str = runout_dt.strftime("%Y-%m-%d")
            days_left = runout_day_index
        else:
            # Si no se agota en 14 días, proyectar linealmente
            projected_days = int(product.stock_central / avg_daily) if avg_daily > 0 else 99
            days_left = projected_days
            runout_dt = current_date + timedelta(days=projected_days)
            runout_str = runout_dt.strftime("%Y-%m-%d") if projected_days < 90 else None

        # Semáforo de riesgo de inventario
        # Lead time es el tiempo que tarda el proveedor
        if days_left <= product.lead_time_days:
            risk_level = "CRITICAL"  # Riesgo inminente: se agotará antes de que llegue resurtido
        elif days_left <= (product.lead_time_days * 2):
            risk_level = "MODERATE"
        elif days_left > 40:
            risk_level = "OVERSTOCK"
        else:
            risk_level = "HEALTHY"

        # Sugerencia de Reorden por Punto de Reorden (ROP)
        # ROP = (Demanda Diaria * Lead Time) + Stock de Seguridad
        lead_time_demand = avg_daily * product.lead_time_days
        rop = lead_time_demand + product.min_safety_stock

        if product.stock_central <= rop:
            # Cantidad sugerida para cubrir 14 días adicionales + rellenar hasta stock de seguridad
            needed = (rop - product.stock_central) + (avg_daily * 14)
            suggested_reorder_qty = int(np.ceil(needed))
        else:
            suggested_reorder_qty = 0

        return {
            "product_id": product.id,
            "sku": product.sku,
            "name": product.name,
            "stock_central": product.stock_central,
            "min_safety_stock": product.min_safety_stock,
            "lead_time_days": product.lead_time_days,
            "avg_daily_demand_forecast": avg_daily,
            "runout_date": runout_str,
            "days_until_runout": days_left,
            "stock_risk_level": risk_level,
            "suggested_reorder_qty": suggested_reorder_qty,
            "forecast_curve_14d": forecast_curve,
            "historical_sales_last_14d": recent_history
        }

# Instancia singleton del predictor
forecaster = DemandForecaster()
