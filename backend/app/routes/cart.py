from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Product, CartItem
from ..schemas import CartItemAdd, CartItemResponse, ProductResponse

router = APIRouter(prefix="/cart", tags=["Carrito Omnicanal"])

@router.get("/{session_id}", response_model=List[CartItemResponse])
def get_cart(session_id: str, db: Session = Depends(get_db)):
    """
    Obtiene el carrito persistente del servidor para una sesión/usuario.
    Se comparte de forma omnicanal entre Web y App móvil.
    """
    items = db.query(CartItem).filter(CartItem.session_id == session_id).all()
    results = []
    for item in items:
        prod_resp = ProductResponse.model_validate(item.product)
        subtotal = round(item.product.current_dynamic_price * item.quantity, 2)
        results.append(CartItemResponse(
            id=item.id,
            session_id=item.session_id,
            product_id=item.product_id,
            product=prod_resp,
            quantity=item.quantity,
            subtotal=subtotal
        ))
    return results

@router.post("/add", response_model=List[CartItemResponse])
def add_to_cart(payload: CartItemAdd, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    if product.stock_central <= 0:
        raise HTTPException(status_code=400, detail=f"'{product.name}' está agotado en inventario central.")

    existing = db.query(CartItem).filter(
        CartItem.session_id == payload.session_id,
        CartItem.product_id == payload.product_id
    ).first()

    if existing:
        new_qty = existing.quantity + payload.quantity
        if new_qty > product.stock_central:
            raise HTTPException(status_code=400, detail=f"No puedes agregar más unidades que las disponibles ({product.stock_central} disp.).")
        existing.quantity = new_qty
    else:
        if payload.quantity > product.stock_central:
            raise HTTPException(status_code=400, detail=f"Stock insuficiente. Solo hay {product.stock_central} unidades.")
        item = CartItem(
            session_id=payload.session_id,
            product_id=payload.product_id,
            quantity=payload.quantity
        )
        db.add(item)

    db.commit()
    return get_cart(payload.session_id, db)

@router.delete("/{session_id}/item/{product_id}")
def remove_from_cart(session_id: str, product_id: int, db: Session = Depends(get_db)):
    db.query(CartItem).filter(
        CartItem.session_id == session_id,
        CartItem.product_id == product_id
    ).delete()
    db.commit()
    return {"message": "Producto removido del carrito omnicanal."}

@router.delete("/{session_id}/clear")
def clear_cart(session_id: str, db: Session = Depends(get_db)):
    db.query(CartItem).filter(CartItem.session_id == session_id).delete()
    db.commit()
    return {"message": "Carrito vaciado."}
