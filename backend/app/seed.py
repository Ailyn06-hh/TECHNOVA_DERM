import os
import sys

# Asegurar path para ejecución directa
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine, Base
from app.models import Product, Order, OrderItem, SaleHistory, SupplierOrder, CartItem
from app.ml.dataset_generator import generate_historical_sales
from app.ml.demand_forecaster import forecaster
from app.ml.dynamic_pricing import pricing_engine

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Si ya hay productos, no duplicar
        existing = db.query(Product).count()
        if existing > 0:
            print(f"La base de datos ya contiene {existing} productos. Reentrenando modelos...")
            forecaster.train_models(db)
            return

        print("Poblando catálogo de productos dermocosméticos de Nácar...")

        sample_products = [
            Product(
                sku="NAC-SRM-01",
                name="Sérum Regenerador Retinol Puro 0.3%",
                brand="Nácar Derm",
                category="Serum",
                description="Tratamiento nocturno antiedad con retinol microencapsulado de liberación prolongada.",
                base_price=649.0,
                current_dynamic_price=649.0,
                cost_price=260.0,
                min_price=380.0,
                max_price=850.0,
                stock_central=14,  # Stock bajo para disparar alerta ML de escasez (CRITICAL)
                min_safety_stock=15,
                lead_time_days=7,
                inci_ingredients="Aqua, Caprylic/Capric Triglyceride, Retinol, Sodium Hyaluronate, Tocopherol, Glycerin, Phenoxyethanol",
                active_ingredients="Retinol 0.3%, Ácido Hialurónico",
                skin_type="Piel madura / Normal",
                image_url="https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80"
            ),
            Product(
                sku="NAC-SRM-02",
                name="Sérum Iluminador Vitamina C 15% + Ferúlico",
                brand="Nácar Derm",
                category="Serum",
                description="Antioxidante diario de alta potencia. Protege contra radicales libres y unifica el tono.",
                base_price=589.0,
                current_dynamic_price=589.0,
                cost_price=220.0,
                min_price=350.0,
                max_price=790.0,
                stock_central=45,  # Stock saludable
                min_safety_stock=12,
                lead_time_days=5,
                inci_ingredients="Aqua, Ascorbic Acid, Ferulic Acid, Tocopherol, Propylene Glycol, Panthenol",
                active_ingredients="Vitamina C Pura (Ácido L-Ascórbico 15%), Ácido Ferúlico 0.5%",
                skin_type="Todo tipo de piel / Piel opaca",
                image_url="https://images.unsplash.com/photo-1608248597359-002d91e30909?w=600&auto=format&fit=crop&q=80"
            ),
            Product(
                sku="NAC-SOL-03",
                name="Fotoprotector Fluido Mineral FPS 50+ Invisible",
                brand="Nácar Derm",
                category="Protector Solar",
                description="Bloqueador solar mineral con óxido de zinc no comedogénico. Acabado toque seco mate.",
                base_price=499.0,
                current_dynamic_price=499.0,
                cost_price=180.0,
                min_price=300.0,
                max_price=690.0,
                stock_central=85,  # Alto stock pero altísima rotación
                min_safety_stock=20,
                lead_time_days=4,
                inci_ingredients="Aqua, Zinc Oxide, Titanium Dioxide, Dimethicone, Silica, Niacinamide, Glycerin",
                active_ingredients="Óxido de Zinc 18%, Niacinamida 2%",
                skin_type="Piel grasa / Mixta / Sensible",
                image_url="https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&auto=format&fit=crop&q=80"
            ),
            Product(
                sku="NAC-LMP-04",
                name="Limpiador Suave Espumoso de Ceramidas",
                brand="Nácar Derm",
                category="Limpiador",
                description="Gel limpiador syndet pH 5.5 que remueve impurezas protegiendo la barrera cutánea.",
                base_price=349.0,
                current_dynamic_price=349.0,
                cost_price=110.0,
                min_price=200.0,
                max_price=480.0,
                stock_central=120,  # Sobreinventario para disparar descuento por dynamic pricing
                min_safety_stock=20,
                lead_time_days=3,
                inci_ingredients="Aqua, Sodium Cocoyl Isethionate, Ceramide NP, Ceramide AP, Phytosphingosine, Cholesterol, Glycerin",
                active_ingredients="Complejo de 3 Ceramidas esenciales + Fitoesfingosina",
                skin_type="Piel sensible / Seca / Todo tipo",
                image_url="https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=80"
            ),
            Product(
                sku="NAC-EXF-05",
                name="Tónico Exfoliante BHA Ácido Salicílico 2%",
                brand="Nácar Derm",
                category="Exfoliante",
                description="Exfoliante químico que penetra y desobstruye los poros, regulando el sebo y puntos negros.",
                base_price=429.0,
                current_dynamic_price=429.0,
                cost_price=140.0,
                min_price=260.0,
                max_price=590.0,
                stock_central=8,  # Stock muy crítico (quiebre en 2 días)
                min_safety_stock=10,
                lead_time_days=5,
                inci_ingredients="Aqua, Methylpropanediol, Salicylic Acid, Camellia Sinensis Leaf Extract, Sodium Hydroxide, Tetrasodium EDTA",
                active_ingredients="Ácido Salicílico 2%, Extracto de Té Verde",
                skin_type="Piel grasa / Con tendencia acnéica",
                image_url="https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&auto=format&fit=crop&q=80"
            ),
            Product(
                sku="NAC-HID-06",
                name="Gel Crema Hidratante con Niacinamida 5%",
                brand="Nácar Derm",
                category="Hidratante",
                description="Hidratación profunda ultraligera en textura gel con ácido poliglutámico y niacinamida.",
                base_price=459.0,
                current_dynamic_price=459.0,
                cost_price=150.0,
                min_price=270.0,
                max_price=620.0,
                stock_central=50,
                min_safety_stock=15,
                lead_time_days=4,
                inci_ingredients="Aqua, Niacinamide, Polyglutamic Acid, Panthenol, Betaine, Carbomer, Phenoxyethanol",
                active_ingredients="Niacinamida 5%, Ácido Poliglutámico 1%, Provitamina B5",
                skin_type="Piel mixta a grasa",
                image_url="https://images.unsplash.com/photo-1598662779094-110c2bad80b5?w=600&auto=format&fit=crop&q=80"
            )
        ]

        db.bulk_save_objects(sample_products)
        db.commit()

        # Generar 180 días de ventas históricas transaccionales
        print("Generando dataset de ventas históricas transaccionales (quincenas, fines de semana, canales)...")
        generate_historical_sales(db, days=180)

        # Entrenar modelos de Machine Learning (RandomForest) con scikit-learn
        print("Entrenando modelos de Machine Learning con scikit-learn...")
        forecaster.train_models(db)

        # Aplicar precios dinámicos recomendados
        print("Calculando precios dinámicos en tiempo real con motor de Dynamic Pricing...")
        pricing_engine.apply_all_recommendations(db)

        print("¡Base de datos Nácar inicializada exitosamente con datos e Inteligencia Artificial!")

    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
