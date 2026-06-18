"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePermission } from "@/hooks/use-permission";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { toast } from "sonner";
import type { Product } from "@/lib/types";
import {
  Barcode as BarcodeIcon,
  Search,
  Printer,
  Loader2,
  Package
} from "lucide-react";
import Barcode from "react-barcode";

export default function BarcodesPage() {
  const { hasPermission } = usePermission();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selection state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [printQuantity, setPrintQuantity] = useState<number>(10);

  const supabase = createClient();
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) throw error;
      setProducts(data as Product[]);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
    } finally {
      setIsLoading(false);
    }
  }

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePrint = () => {
    if (!selectedProduct) return;
    
    // Using window.print() will print the entire page, 
    // but we use CSS to hide everything else and only show the print-area
    window.print();
  };

  return (
    <ProtectedRoute resource="products" action="read">
      <div className="flex flex-col lg:flex-row h-[calc(100vh-6rem)] gap-6 overflow-hidden">
        {/* Left Side: Product Selection */}
        <div className="w-full lg:w-1/3 flex flex-col bg-card rounded-2xl border border-border shadow-sm overflow-hidden h-full">
          <div className="p-4 border-b border-border bg-muted/10 shrink-0">
            <h2 className="text-lg font-heading font-bold text-foreground mb-4">Select Product</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search products or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full p-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
                <p className="text-sm text-muted-foreground">Loading products...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                <Package className="w-8 h-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-foreground font-medium">No products found</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => setSelectedProduct(product)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors text-left ${
                      selectedProduct?.id === product.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-foreground"
                    }`}
                  >
                    <div>
                      <p className="font-medium truncate">{product.name}</p>
                      <p className={`text-xs ${selectedProduct?.id === product.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        SKU: {product.sku}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Barcode Generator & Preview */}
        <div className="flex-1 flex flex-col bg-card rounded-2xl border border-border shadow-sm overflow-hidden h-full print:hidden">
          {selectedProduct ? (
            <div className="flex flex-col h-full">
              <div className="p-6 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
                <div>
                  <h1 className="text-2xl font-heading font-bold text-foreground">
                    Barcode Generator
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Generating for <span className="font-bold text-foreground">{selectedProduct.name}</span>
                  </p>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-foreground whitespace-nowrap">Quantity:</label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={printQuantity}
                      onChange={(e) => setPrintQuantity(Number(e.target.value) || 1)}
                      className="w-20 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-center"
                    />
                  </div>
                  <button
                    onClick={handlePrint}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-muted/5">
                <div className="bg-white rounded-xl border border-border shadow-sm p-8 min-h-full">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {Array.from({ length: printQuantity }).map((_, i) => (
                      <div key={i} className="flex flex-col items-center justify-center p-4 border border-dashed border-gray-300 rounded-lg">
                        <Barcode 
                          value={selectedProduct.sku} 
                          width={1.5} 
                          height={40} 
                          fontSize={12} 
                          background="#ffffff"
                          lineColor="#000000"
                          margin={0}
                        />
                        <span className="text-xs font-bold mt-2 text-black text-center line-clamp-1">{selectedProduct.name}</span>
                        <span className="text-xs font-bold text-black mt-0.5">Rs. {selectedProduct.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <BarcodeIcon className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <h2 className="text-xl font-semibold text-foreground">No Product Selected</h2>
              <p className="text-muted-foreground mt-2 max-w-sm">
                Please select a product from the list on the left to generate and print barcodes.
              </p>
            </div>
          )}
        </div>

        {/* Print-only Hidden Area */}
        {selectedProduct && (
          <div className="hidden print:block print:w-full barcode-printable">
            <style type="text/css" media="print">
              {`@page { margin: 10mm; size: auto; }`}
            </style>
            <div className="grid grid-cols-4 gap-4 w-full" style={{ padding: "10mm" }}>
              {Array.from({ length: printQuantity }).map((_, i) => (
                <div key={i} className="flex flex-col items-center justify-center p-2 break-inside-avoid">
                  <Barcode 
                    value={selectedProduct.sku} 
                    width={1.5} 
                    height={40} 
                    fontSize={12} 
                    background="#ffffff"
                    lineColor="#000000"
                    margin={0}
                  />
                  <span className="text-[10px] font-bold mt-1 text-black text-center line-clamp-1 leading-tight">{selectedProduct.name}</span>
                  <span className="text-[10px] font-bold text-black leading-tight">Rs. {selectedProduct.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}
