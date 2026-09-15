import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Product } from '../../types';
import { Package, Plus, AlertTriangle, Boxes, ArrowUp, ArrowDown, Search } from 'lucide-react';
import { inventoryService } from '../../firebase/services';

export const ProductsPage: React.FC = () => {
  const { tenant, user, canAccess } = useAuth();
  const { showToast } = useNotifications();

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);

  // Add Product Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('General');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [stock, setStock] = useState('0');
  const [lowStockLimit, setLowStockLimit] = useState('10');
  const [unit, setUnit] = useState('Pcs');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Adjust Stock Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<'ADD' | 'REDUCE'>('ADD');
  const [adjustQty, setAdjustQty] = useState('1');
  const [adjustReason, setAdjustReason] = useState('');

  useEffect(() => {
    if (!tenant?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = inventoryService.subscribeProducts(tenant.id, (list) => {
      setAllProducts(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [tenant?.id]);

  const products = allProducts.filter(p => {
    if (lowStockFilter && p.stock > p.lowStockLimit) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sku || !tenant?.id) return;
    setIsSubmitting(true);
    try {
      await inventoryService.createProduct(tenant.id, {
        name,
        sku,
        category,
        purchasePrice: parseFloat(purchasePrice) || 0,
        sellingPrice: parseFloat(sellingPrice) || 0,
        stock: parseInt(stock) || 0,
        lowStockLimit: parseInt(lowStockLimit) || 10,
        unit,
      });

      showToast(`Product "${name}" added to catalog.`, 'success');
      setAddModalOpen(false);
      setName('');
      setSku('');
      setPurchasePrice('');
      setSellingPrice('');
      setStock('0');
    } catch (err: any) {
      showToast(err.message || 'Failed to add product', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !adjustQty || !tenant?.id) return;
    setIsSubmitting(true);

    try {
      await inventoryService.adjustStock(
        tenant.id,
        selectedProduct.id,
        adjustType,
        parseInt(adjustQty) || 1,
        adjustReason,
        user?.name || 'Staff'
      );

      showToast(`Stock adjusted for ${selectedProduct.name}`, 'success');
      setAdjustModalOpen(false);
      setAdjustQty('1');
      setAdjustReason('');
    } catch (err: any) {
      showToast(err.message || 'Failed to adjust stock', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currency = tenant?.currency || '₹';
  const lowStockCount = products.filter(p => p.stock <= p.lowStockLimit).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Products & Inventory</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage stock items, purchase & selling price rates, and real-time replenishment alerts
          </p>
        </div>

        {canAccess('products', 'add') && (
          <button
            onClick={() => setAddModalOpen(true)}
            className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        )}
      </div>

      {/* Low stock warning banner */}
      {lowStockCount > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              <strong>{lowStockCount} items</strong> are below the minimum safety threshold!
            </span>
          </div>
          <button
            onClick={() => setLowStockFilter(!lowStockFilter)}
            className="text-xs font-bold text-amber-800 underline hover:text-black"
          >
            {lowStockFilter ? 'Show All Products' : 'Filter Low Stock Items'}
          </button>
        </div>
      )}

      {/* Filter bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search product name, SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Item Details</th>
                <th className="py-3 px-4">SKU / Code</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Purchase Price</th>
                <th className="py-3 px-4 text-right">Selling Price</th>
                <th className="py-3 px-4 text-right">Current Stock</th>
                <th className="py-3 px-4 text-right">Stock Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="py-8 text-center text-gray-400">Loading catalog...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-gray-400">No products found.</td></tr>
              ) : (
                products.map(p => {
                  const isLow = p.stock <= p.lowStockLimit;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/60">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold">
                            <Package className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{p.name}</p>
                            <span className="text-[10px] text-gray-400">Unit: {p.unit}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-gray-700">{p.sku}</td>
                      <td className="py-3.5 px-4 text-gray-600">{p.category}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-gray-600">{currency}{p.purchasePrice}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-gray-900">{currency}{p.sellingPrice}</td>
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`font-mono font-black text-sm ${
                            isLow ? 'text-rose-600' : 'text-gray-900'
                          }`}
                        >
                          {p.stock} {p.unit}
                        </span>
                        {isLow && (
                          <span className="block text-[9px] font-bold text-rose-600 uppercase">
                            Low Stock (&le;{p.lowStockLimit})
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedProduct(p);
                            setAdjustModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-gray-100 hover:bg-brand-50 hover:text-brand-700 rounded-lg text-xs font-bold text-gray-700 transition-colors"
                        >
                          Adjust Stock
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-base text-gray-900">Add Item to Catalog</h3>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Basmati Rice 25kg"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">SKU / Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="RBR-25"
                    value={sku}
                    onChange={e => setSku(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Category</label>
                  <input
                    type="text"
                    placeholder="Grains"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Purchase Price ({currency})</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={purchasePrice}
                    onChange={e => setPurchasePrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Selling Price ({currency})</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={sellingPrice}
                    onChange={e => setSellingPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Stock</label>
                  <input
                    type="number"
                    value={stock}
                    onChange={e => setStock(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Low Limit</label>
                  <input
                    type="number"
                    value={lowStockLimit}
                    onChange={e => setLowStockLimit(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Unit</label>
                  <select
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold"
                  >
                    <option value="Pcs">Pcs</option>
                    <option value="Box">Box</option>
                    <option value="Kg">Kg</option>
                    <option value="Ltr">Ltr</option>
                    <option value="Mtr">Mtr</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="flex-1 py-2.5 px-4 border border-gray-300 rounded-xl text-xs font-bold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20"
                >
                  {isSubmitting ? 'Saving...' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {adjustModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-base text-gray-900">Adjust Inventory Stock</h3>
            <p className="text-xs text-gray-500">
              Product: <strong>{selectedProduct.name}</strong> (Current Stock: {selectedProduct.stock} {selectedProduct.unit})
            </p>

            <form onSubmit={handleAdjustStock} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAdjustType('ADD')}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1 ${
                    adjustType === 'ADD'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-gray-100 text-gray-700 border-gray-200'
                  }`}
                >
                  <ArrowUp className="w-4 h-4" />
                  + Add Stock (Inflow)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('REDUCE')}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1 ${
                    adjustType === 'REDUCE'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-gray-100 text-gray-700 border-gray-200'
                  }`}
                >
                  <ArrowDown className="w-4 h-4" />
                  - Reduce (Damage/Loss)
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Quantity to {adjustType === 'ADD' ? 'Add' : 'Reduce'} ({selectedProduct.unit}) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustQty}
                  onChange={e => setAdjustQty(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-black text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Reason / Reference Note</label>
                <input
                  type="text"
                  placeholder="e.g. Received new shipment from ABC Wholesale"
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="flex-1 py-2.5 px-4 border border-gray-300 rounded-xl text-xs font-bold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20"
                >
                  {isSubmitting ? 'Updating...' : 'Confirm Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
