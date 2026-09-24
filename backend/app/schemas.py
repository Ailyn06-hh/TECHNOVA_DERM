from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

# Base Product Schemas
class ProductBase(BaseModel):
    sku: str
    name: str
    brand: str
    category: str
    description: Optional[str] = None
    base_price: float
    current_dynamic_price: float
    cost_price: float
    min_price: float
    max_price: float
    auto_pricing_enabled: bool = True
    stock_central: int
    min_safety_stock: int
    lead_time_days: int
    inci_ingredients: Optional[str] = None
    active_ingredients: Optional[str] = None
    skin_type: Optional[str] = "Todo tipo de piel"
    image_url: Optional[str] = None

class ProductResponse(ProductBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Order Item Schemas
class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)

class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    quantity: int
    unit_price: float
    subtotal: float

    class Config:
        from_attributes = True

# Order Schemas
class OrderCreate(BaseModel):
    channel: str = Field(description="'WEB_ECOMMERCE', 'POS_STORE', 'MOBILE_APP'")
    delivery_type: str = Field(default="SHIPPING", description="'SHIPPING' or 'CLICK_AND_COLLECT'")
    customer_name: str = "Cliente Mostrador"
    customer_email: str = "cliente@nacarderm.mx"
    customer_phone: Optional[str] = None
    pickup_store: Optional[str] = "Sucursal Matriz - CDMX"
    items: List[OrderItemCreate]

class OrderResponse(BaseModel):
    id: int
    order_code: str
    channel: str
    delivery_type: str
    status: str
    customer_name: str
    customer_email: str
    customer_phone: Optional[str]
    pickup_store: Optional[str]
    total_amount: float
    created_at: datetime
    items: List[OrderItemResponse]

    class Config:
        from_attributes = True

# Dynamic Pricing Schemas
class PricingRecommendation(BaseModel):
    product_id: int
    sku: str
    name: str
    current_price: float
    base_price: float
    recommended_price: float
    price_change_percent: float
    stock_current: int
    predicted_daily_demand: float
    days_of_stock_left: float
    strategy_applied: str  # "SCARCITY_PREMIUM", "EXCESS_STOCK_CLEARANCE", "NEUTRAL"
    margin_percentage: float
    reason: str

class ApplyPricingRequest(BaseModel):
    product_id: int
    new_price: float

# ML Forecast Schemas
class DailyForecast(BaseModel):
    date: str
    day_name: str
    predicted_demand: float
    is_quincena: bool
    is_weekend: bool

class ProductForecastResponse(BaseModel):
    product_id: int
    sku: str
    name: str
    stock_central: int
    min_safety_stock: int
    lead_time_days: int
    avg_daily_demand_forecast: float
    runout_date: Optional[str]
    days_until_runout: Optional[int]
    stock_risk_level: str  # "CRITICAL", "MODERATE", "HEALTHY", "OVERSTOCK"
    suggested_reorder_qty: int
    forecast_curve_14d: List[DailyForecast]
    historical_sales_last_14d: List[dict]

# Cart Schemas
class CartItemAdd(BaseModel):
    session_id: str
    product_id: int
    quantity: int = 1

class CartItemResponse(BaseModel):
    id: int
    session_id: str
    product_id: int
    product: ProductResponse
    quantity: int
    subtotal: float

    class Config:
        from_attributes = True

# Supplier Order Schema
class SupplierOrderResponse(BaseModel):
    id: int
    order_code: str
    product_id: int
    product_name: Optional[str] = None
    quantity_ordered: int
    status: str
    supplier_name: str
    unit_cost: float
    total_cost: float
    ml_reason: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
