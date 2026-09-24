from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from .database import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(150), nullable=False)
    brand = Column(String(100), default="Nácar Derm")
    category = Column(String(80), nullable=False)  # Serum, Limpiador, Solar, Hidratante, Exfoliante
    description = Column(Text, nullable=True)
    
    # Precios
    base_price = Column(Float, nullable=False)
    current_dynamic_price = Column(Float, nullable=False)
    cost_price = Column(Float, nullable=False)
    min_price = Column(Float, nullable=False)  # Floor de precio
    max_price = Column(Float, nullable=False)  # Ceiling de precio
    auto_pricing_enabled = Column(Boolean, default=True)

    # Inventario central unificado
    stock_central = Column(Integer, default=0, nullable=False)
    min_safety_stock = Column(Integer, default=10, nullable=False)
    lead_time_days = Column(Integer, default=5, nullable=False)  # Días que tarda el proveedor en resurtir

    # Atributos cosméticos & INCI
    inci_ingredients = Column(Text, nullable=True)  # Lista separada por comas
    active_ingredients = Column(String(255), nullable=True)  # e.g., "Retinol 0.3%, Ácido Hialurónico"
    skin_type = Column(String(100), default="Todo tipo de piel")
    image_url = Column(String(255), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relaciones
    sales = relationship("SaleHistory", back_populates="product", cascade="all, delete-orphan")
    order_items = relationship("OrderItem", back_populates="product")
    supplier_orders = relationship("SupplierOrder", back_populates="product")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_code = Column(String(50), unique=True, index=True, nullable=False)
    channel = Column(String(50), nullable=False)  # "WEB_ECOMMERCE", "POS_STORE", "MOBILE_APP"
    delivery_type = Column(String(50), default="SHIPPING")  # "SHIPPING", "CLICK_AND_COLLECT"
    status = Column(String(50), default="PAID")  # "PAID", "READY_FOR_PICKUP", "COMPLETED", "CANCELLED"
    
    customer_name = Column(String(120), default="Cliente Mostrador")
    customer_email = Column(String(120), default="cliente@nacarderm.mx")
    customer_phone = Column(String(50), nullable=True)
    pickup_store = Column(String(100), default="Sucursal Matriz - CDMX")
    
    total_amount = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    unit_price = Column(Float, nullable=False)
    subtotal = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")


class SaleHistory(Base):
    __tablename__ = "sales_history"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    date = Column(DateTime, nullable=False, index=True)
    quantity_sold = Column(Integer, nullable=False)
    channel = Column(String(50), nullable=False)  # "WEB", "POS", "APP"
    unit_price = Column(Float, nullable=False)
    was_promotion = Column(Boolean, default=False)

    product = relationship("Product", back_populates="sales")


class SupplierOrder(Base):
    __tablename__ = "supplier_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_code = Column(String(50), unique=True, index=True, nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity_ordered = Column(Integer, nullable=False)
    status = Column(String(50), default="SUGGESTED")  # "SUGGESTED", "ORDERED", "RECEIVED"
    supplier_name = Column(String(120), default="Laboratorios Dermocosmética MX")
    unit_cost = Column(Float, nullable=False)
    total_cost = Column(Float, nullable=False)
    ml_reason = Column(Text, nullable=True)  # Explicación del modelo ML para la orden de compra
    created_at = Column(DateTime, default=datetime.utcnow)
    estimated_arrival = Column(DateTime, nullable=True)

    product = relationship("Product", back_populates="supplier_orders")


class CartItem(Base):
    __tablename__ = "cart_items"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), index=True, nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    added_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product")
