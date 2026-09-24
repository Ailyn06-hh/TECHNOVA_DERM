import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Product, Order, OrderItem, SaleHistory
from ..schemas import OrderCreate, OrderResponse, OrderItemResponse

router = APIRouter(prefix="/orders", tags=["Pedidos Omnicanal"])

@router.post("/create", response_model=OrderResponse)
def create_omnichannel_order(payload: OrderCreate, db: Session = Depends(get_db)):
    """
    Crea un pedido omnicanal (Web, POS o App).
    Garantiza consistencia transaccional atómica:
    Verifica y descuenta el stock centralizado para evitar sobreventas en cualquier canal.
    """
    if not payload.items:
        raise HTTPException(status_code=400, detail="El pedido debe contener al menos un producto.")

    # 1. Validar disponibilidad de stock central de forma atómica
    product_map = {}
    for item_data in payload.items:
        product = db.query(Product).filter(Product.id == item_data.product_id).with_for_update().first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Producto ID {item_data.product_id} no existe.")
        
        if product.stock_central < item_data.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Stock insuficiente para '{product.name}' (SKU: {product.sku}). Disponible central: {product.stock_central}, Solicitado: {item_data.quantity}."
            )
        product_map[item_data.product_id] = product

    # 2. Generar código de pedido y determinar estado
    order_code = f"NAC-{uuid.uuid4().hex[:8].upper()}"
    status = "COMPLETED" if payload.channel == "POS_STORE" else (
        "READY_FOR_PICKUP" if payload.delivery_type == "CLICK_AND_COLLECT" else "PAID"
    )

    new_order = Order(
        order_code=order_code,
        channel=payload.channel,
        delivery_type=payload.delivery_type,
        status=status,
        customer_name=payload.customer_name,
        customer_email=payload.customer_email,
        customer_phone=payload.customer_phone,
        pickup_store=payload.pickup_store,
        total_amount=0.0
    )
    db.add(new_order)
    db.flush()

    total_order = 0.0
    order_items_resp = []

    # 3. Descontar stock y registrar ítems
    for item_data in payload.items:
        prod = product_map[item_data.product_id]
        
        # Descuento atómico del stock central
        prod.stock_central -= item_data.quantity
        
        # El precio que se cobra es el dynamic price actual en el canal
        unit_price = prod.current_dynamic_price
        subtotal = round(unit_price * item_data.quantity, 2)
        total_order += subtotal

        order_item = OrderItem(
            order_id=new_order.id,
            product_id=prod.id,
            quantity=item_data.quantity,
            unit_price=unit_price,
            subtotal=subtotal
        )
        db.add(order_item)

        # Registrar en historial de ventas
        channel_code = "POS" if payload.channel == "POS_STORE" else ("APP" if payload.channel == "MOBILE_APP" else "WEB")
        sale_record = SaleHistory(
            product_id=prod.id,
            date=datetime.utcnow(),
            quantity_sold=item_data.quantity,
            channel=channel_code,
            unit_price=unit_price,
            was_promotion=(unit_price < prod.base_price)
        )
        db.add(sale_record)

        order_items_resp.append(OrderItemResponse(
            id=0,
            product_id=prod.id,
            product_name=prod.name,
            product_sku=prod.sku,
            quantity=item_data.quantity,
            unit_price=unit_price,
            subtotal=subtotal
        ))

    new_order.total_amount = round(total_order, 2)
    db.commit()
    db.refresh(new_order)

    # Actualizar IDs en la respuesta
    for idx, item in enumerate(new_order.items):
        order_items_resp[idx].id = item.id

    return OrderResponse(
        id=new_order.id,
        order_code=new_order.order_code,
        channel=new_order.channel,
        delivery_type=new_order.delivery_type,
        status=new_order.status,
        customer_name=new_order.customer_name,
        customer_email=new_order.customer_email,
        customer_phone=new_order.customer_phone,
        pickup_store=new_order.pickup_store,
        total_amount=new_order.total_amount,
        created_at=new_order.created_at,
        items=order_items_resp
    )

@router.get("", response_model=List[OrderResponse])
def get_orders(
    channel: Optional[str] = None,
    delivery_type: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Order).order_by(Order.created_at.desc())
    if channel:
        query = query.filter(Order.channel == channel)
    if delivery_type:
        query = query.filter(Order.delivery_type == delivery_type)
    if status:
        query = query.filter(Order.status == status)

    orders = query.limit(100).all()
    results = []
    for o in orders:
        items_resp = [
            OrderItemResponse(
                id=i.id,
                product_id=i.product_id,
                product_name=i.product.name if i.product else "N/A",
                product_sku=i.product.sku if i.product else "N/A",
                quantity=i.quantity,
                unit_price=i.unit_price,
                subtotal=i.subtotal
            ) for i in o.items
        ]
        results.append(OrderResponse(
            id=o.id,
            order_code=o.order_code,
            channel=o.channel,
            delivery_type=o.delivery_type,
            status=o.status,
            customer_name=o.customer_name,
            customer_email=o.customer_email,
            customer_phone=o.customer_phone,
            pickup_store=o.pickup_store,
            total_amount=o.total_amount,
            created_at=o.created_at,
            items=items_resp
        ))
    return results

@router.post("/pickup/{order_code}/deliver")
def mark_click_and_collect_delivered(order_code: str, db: Session = Depends(get_db)):
    """
    Permite al cajero del POS entregar el pedido comprado en web o app que el cliente viene a recoger a tienda.
    """
    order = db.query(Order).filter(Order.order_code == order_code).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado.")
    
    order.status = "COMPLETED"
    db.commit()
    return {"message": f"Pedido {order_code} entregado con éxito al cliente en mostrador."}
