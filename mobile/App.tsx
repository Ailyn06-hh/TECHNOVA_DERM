import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { mobileApi } from './src/services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'routine' | 'cart' | 'orders'>('catalog');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [myRoutine, setMyRoutine] = useState<number[]>([]); // product IDs in user's routine

  const loadCatalog = async () => {
    try {
      setLoading(true);
      const data = await mobileApi.getProducts();
      setProducts(data);
    } catch (err: any) {
      console.log("Error cargando catálogo móvil:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  const addToCart = (product: any) => {
    if (product.stock_central <= 0) {
      Alert.alert("Agotado", "Este producto no tiene piezas disponibles en el almacén central.");
      return;
    }
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === product.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx].quantity += 1;
        return updated;
      }
      return [...prev, { product, quantity: 1 }];
    });
    Alert.alert("¡Agregado!", `${product.name} se agregó al carrito sincronizado.`);
  };

  const toggleRoutine = (productId: number) => {
    setMyRoutine((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  // Evaluar choques de ingredientes en la rutina seleccionada
  const routineProducts = products.filter((p) => myRoutine.includes(p.id));
  const routineIngredients = routineProducts
    .map((p) => (p.inci_ingredients || "") + " " + (p.active_ingredients || ""))
    .join(" ")
    .toLowerCase();

  const hasRetinol = routineIngredients.includes("retinol");
  const hasVitC = routineIngredients.includes("ascorbic") || routineIngredients.includes("vitamina c");
  const hasBHA = routineIngredients.includes("salicylic") || routineIngredients.includes("salicílico");

  const routineConflicts = [];
  if (hasRetinol && hasVitC) {
    routineConflicts.push("Alerta: Retinol + Vitamina C combinados. Se aconseja alternar (Vit C por la mañana y Retinol por la noche).");
  }
  if (hasRetinol && hasBHA) {
    routineConflicts.push("Alerta: Retinol + Ácido Salicílico (BHA). Riesgo de sobreexfoliación.");
  }

  const cartTotal = cart.reduce((acc, item) => acc + item.product.current_dynamic_price * item.quantity, 0);

  const handleCheckout = async (deliveryType: 'SHIPPING' | 'CLICK_AND_COLLECT') => {
    if (cart.length === 0) return;
    try {
      const payload = {
        channel: 'MOBILE_APP',
        delivery_type: deliveryType,
        customer_name: 'Usuario App Móvil Nácar',
        customer_email: 'movil@nacarderm.mx',
        pickup_store: deliveryType === 'CLICK_AND_COLLECT' ? 'Sucursal Matriz - CDMX' : undefined,
        items: cart.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
        })),
      };

      const result = await mobileApi.createOrder(payload);
      Alert.alert(
        "¡Pedido Exitoso!",
        `Código de pedido: ${result.order_code}\nTotal: $${result.total_amount} MXN\nEl stock central se descontó al instante.`
      );
      setCart([]);
      loadCatalog();
      setActiveTab('orders');
      const updatedOrders = await mobileApi.getOrders().catch(() => []);
      setOrders(updatedOrders);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF7F5" />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>N</Text>
          </View>
          <View>
            <Text style={styles.brandTitle}>NÁCAR SKINCARE</Text>
            <Text style={styles.brandSubtitle}>App Cliente · E-Business Omnicanal</Text>
          </View>
        </View>

        <View style={styles.omniBadge}>
          <View style={styles.pulseDot} />
          <Text style={styles.omniText}>Stock Único</Text>
        </View>
      </View>

      {/* Main Content Area */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#1A1715" />
            <Text style={styles.loadingText}>Sincronizando con Backend Central...</Text>
          </View>
        ) : activeTab === 'catalog' ? (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.heroCard}>
              <Text style={styles.heroTag}>⚡ MACHINE LEARNING DEMAND</Text>
              <Text style={styles.heroTitle}>Precios Dinámicos en Tiempo Real</Text>
              <Text style={styles.heroDesc}>
                Los precios y el stock que ves en esta app están enlazados con la tienda web y la tienda física al instante.
              </Text>
            </View>

            <Text style={styles.sectionHeader}>Catálogo de Dermocosmética</Text>

            {products.map((item) => {
              const isDiscounted = item.current_dynamic_price < item.base_price;
              const isPremium = item.current_dynamic_price > item.base_price;
              const isOut = item.stock_central <= 0;

              return (
                <View key={item.id} style={styles.productCard}>
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.productImage} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Text style={styles.placeholderText}>NÁCAR</Text>
                    </View>
                  )}

                  <View style={styles.productInfo}>
                    <View style={styles.metaRow}>
                      <Text style={styles.categoryText}>{item.category.toUpperCase()}</Text>
                      <Text style={[styles.stockBadge, isOut && styles.stockBadgeOut]}>
                        {isOut ? "Agotado" : `${item.stock_central} disp.`}
                      </Text>
                    </View>

                    <Text style={styles.productName}>{item.name}</Text>
                    <Text style={styles.activeText}>{item.active_ingredients}</Text>

                    <View style={styles.priceRow}>
                      <View>
                        <Text style={styles.priceText}>
                          ${item.current_dynamic_price.toFixed(2)} MXN
                        </Text>
                        {item.current_dynamic_price !== item.base_price && (
                          <Text style={styles.oldPriceText}>${item.base_price.toFixed(2)}</Text>
                        )}
                      </View>

                      <View style={styles.btnRow}>
                        <TouchableOpacity
                          style={[styles.routineBtn, myRoutine.includes(item.id) && styles.routineBtnActive]}
                          onPress={() => toggleRoutine(item.id)}
                        >
                          <Text style={styles.routineBtnText}>
                            {myRoutine.includes(item.id) ? "En Rutina ✓" : "+ Rutina"}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.addBtn, isOut && styles.addBtnDisabled]}
                          disabled={isOut}
                          onPress={() => addToCart(item)}
                        >
                          <Text style={styles.addBtnText}>+ Carrito</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        ) : activeTab === 'routine' ? (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.sectionHeader}>Mi Rutina & Safety Score</Text>
            <Text style={styles.subtext}>
              Analizador de compatibilidad química (SkinSync). Te alerta si combinas activos incompatibles.
            </Text>

            {routineConflicts.length > 0 && (
              <View style={styles.alertCard}>
                <Text style={styles.alertTitle}>⚠️ Alerta de Incompatibilidad Química</Text>
                {routineConflicts.map((c, i) => (
                  <Text key={i} style={styles.alertDesc}>• {c}</Text>
                ))}
              </View>
            )}

            {routineProducts.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No has agregado productos a tu rutina.</Text>
                <Text style={styles.emptySub}>Ve al catálogo y presiona "+ Rutina" en tus productos.</Text>
              </View>
            ) : (
              routineProducts.map((p) => (
                <View key={p.id} style={styles.routineItemCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productName}>{p.name}</Text>
                    <Text style={styles.activeText}>{p.active_ingredients}</Text>
                  </View>
                  <TouchableOpacity onPress={() => toggleRoutine(p.id)}>
                    <Text style={styles.removeText}>Quitar</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        ) : activeTab === 'cart' ? (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.sectionHeader}>Mi Carrito Inteligente</Text>
            <Text style={styles.subtext}>Sincronizado omnicanal con la cuenta del servidor.</Text>

            {cart.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>Tu carrito está vacío.</Text>
              </View>
            ) : (
              <>
                {cart.map((i) => (
                  <View key={i.product.id} style={styles.cartItemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.productName}>{i.product.name}</Text>
                      <Text style={styles.subtext}>
                        {i.quantity} x ${i.product.current_dynamic_price.toFixed(2)}
                      </Text>
                    </View>
                    <Text style={styles.itemSubtotal}>
                      ${(i.product.current_dynamic_price * i.quantity).toFixed(2)}
                    </Text>
                  </View>
                ))}

                <View style={styles.totalBox}>
                  <Text style={styles.totalLabel}>Total a Pagar:</Text>
                  <Text style={styles.totalValue}>${cartTotal.toFixed(2)} MXN</Text>
                </View>

                <TouchableOpacity
                  style={styles.checkoutBtn}
                  onPress={() => handleCheckout('CLICK_AND_COLLECT')}
                >
                  <Text style={styles.checkoutBtnText}>Comprar con Click & Collect (Tienda)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.checkoutBtn, styles.checkoutBtnAlt]}
                  onPress={() => handleCheckout('SHIPPING')}
                >
                  <Text style={styles.checkoutBtnAltText}>Comprar con Envío a Domicilio</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.sectionHeader}>Mis Pedidos Omnicanal</Text>
            <TouchableOpacity onPress={async () => setOrders(await mobileApi.getOrders().catch(() => []))}>
              <Text style={styles.refreshText}>↻ Actualizar lista de pedidos</Text>
            </TouchableOpacity>

            {orders.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No hay pedidos registrados aún desde la app móvil.</Text>
              </View>
            ) : (
              orders.map((o) => (
                <View key={o.id} style={styles.orderCard}>
                  <View style={styles.metaRow}>
                    <Text style={styles.orderCode}>{o.order_code}</Text>
                    <Text style={styles.orderStatus}>{o.status}</Text>
                  </View>
                  <Text style={styles.subtext}>Tipo: {o.delivery_type}</Text>
                  <Text style={styles.subtext}>Total: ${o.total_amount.toFixed(2)} MXN</Text>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>

      {/* Bottom Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'catalog' && styles.tabBtnActive]}
          onPress={() => setActiveTab('catalog')}
        >
          <Text style={[styles.tabText, activeTab === 'catalog' && styles.tabTextActive]}>🛍️ Catálogo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'routine' && styles.tabBtnActive]}
          onPress={() => setActiveTab('routine')}
        >
          <Text style={[styles.tabText, activeTab === 'routine' && styles.tabTextActive]}>🧪 Mi Rutina</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'cart' && styles.tabBtnActive]}
          onPress={() => setActiveTab('cart')}
        >
          <Text style={[styles.tabText, activeTab === 'cart' && styles.tabTextActive]}>
            🛒 Carrito ({cart.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'orders' && styles.tabBtnActive]}
          onPress={async () => {
            setActiveTab('orders');
            setOrders(await mobileApi.getOrders().catch(() => []));
          }}
        >
          <Text style={[styles.tabText, activeTab === 'orders' && styles.tabTextActive]}>📦 Pedidos</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EADFD7',
    backgroundColor: '#FAF7F5',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1A1715',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  brandTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1715',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 10,
    color: '#7C5A47',
  },
  omniBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2E7D32',
  },
  omniText: {
    fontSize: 10,
    color: '#2E7D32',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 12,
    color: '#7C5A47',
  },
  heroCard: {
    backgroundColor: '#1A1715',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  heroTag: {
    color: '#F4A261',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  heroDesc: {
    color: '#DBC8BC',
    fontSize: 11,
    lineHeight: 16,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1715',
    marginBottom: 4,
  },
  subtext: {
    fontSize: 12,
    color: '#7C5A47',
    marginBottom: 12,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EADFD7',
    marginBottom: 14,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: 160,
  },
  imagePlaceholder: {
    width: '100%',
    height: 160,
    backgroundColor: '#F5EFEB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 24,
    color: '#C4A897',
    fontWeight: 'bold',
  },
  productInfo: {
    padding: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 10,
    color: '#7C5A47',
    fontWeight: '600',
  },
  stockBadge: {
    fontSize: 10,
    color: '#2A9D8F',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    fontWeight: 'bold',
  },
  stockBadgeOut: {
    color: '#D32F2F',
    backgroundColor: '#FFEBEE',
  },
  productName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A1715',
    marginBottom: 4,
  },
  activeText: {
    fontSize: 11,
    color: '#7C5A47',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5EFEB',
  },
  priceText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1A1715',
  },
  oldPriceText: {
    fontSize: 10,
    color: '#9E9E9E',
    textDecorationLine: 'line-through',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 6,
  },
  routineBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F5EFEB',
  },
  routineBtnActive: {
    backgroundColor: '#DBC8BC',
  },
  routineBtnText: {
    fontSize: 11,
    color: '#1A1715',
    fontWeight: '600',
  },
  addBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1A1715',
  },
  addBtnDisabled: {
    backgroundColor: '#CCCCCC',
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  alertCard: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FFE0B2',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 4,
  },
  alertDesc: {
    fontSize: 11,
    color: '#BF360C',
    lineHeight: 16,
  },
  emptyBox: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#7C5A47',
    fontWeight: '600',
  },
  emptySub: {
    fontSize: 11,
    color: '#A1887F',
    marginTop: 4,
  },
  routineItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EADFD7',
    marginBottom: 8,
  },
  removeText: {
    color: '#D32F2F',
    fontSize: 11,
    fontWeight: 'bold',
  },
  cartItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EADFD7',
    marginBottom: 8,
  },
  itemSubtotal: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1A1715',
  },
  totalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#EADFD7',
    marginTop: 10,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1715',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1715',
  },
  checkoutBtn: {
    backgroundColor: '#1A1715',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  checkoutBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  checkoutBtnAlt: {
    backgroundColor: '#EADFD7',
  },
  checkoutBtnAltText: {
    color: '#1A1715',
    fontWeight: 'bold',
    fontSize: 13,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EADFD7',
    marginBottom: 10,
  },
  orderCode: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1A1715',
  },
  orderStatus: {
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  refreshText: {
    fontSize: 11,
    color: '#2A9D8F',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#EADFD7',
    backgroundColor: '#FAF7F5',
    paddingVertical: 8,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  tabBtnActive: {
    borderTopWidth: 2,
    borderTopColor: '#1A1715',
  },
  tabText: {
    fontSize: 11,
    color: '#7C5A47',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#1A1715',
    fontWeight: 'bold',
  },
});
