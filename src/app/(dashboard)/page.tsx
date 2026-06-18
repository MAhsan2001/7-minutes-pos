"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Package,
  AlertTriangle,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import { cn, formatCurrency, formatCurrencyShort, formatRelativeTime } from "@/lib/utils";
import { CHART_COLORS, APP_NAME } from "@/lib/utils/constants";
import { useAuthStore } from "@/lib/stores/auth-store";

// ─── Types ───────────────────────────────────────

interface DashboardStats {
  todaySales: number;
  todayChange: number;
  weeklySales: number;
  weeklyChange: number;
  lowStockCount: number;
  estimatedProfit: number;
  profitChange: number;
}

interface RecentSale {
  id: string;
  invoice: string;
  amount: number;
  items: number;
  time: string;
  status: "completed" | "refunded" | "void";
}

interface LowStockItem {
  id: string;
  name: string;
  currentStock: number;
  threshold: number;
  unit: string;
}

interface TopProduct {
  name: string;
  qty: number;
  revenue: number;
}

interface ChartData {
  date: string;
  sales: number;
}

// ─── Stat Card Component ───────────────────────

interface StatCardProps {
  title: string;
  value: string;
  change: number | null;
  changeLabel: string;
  icon: React.ReactNode;
  iconBg: string;
  delay?: number;
  isLoading?: boolean;
  href?: string;
}

function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  iconBg,
  delay = 0,
  isLoading = false,
  href,
}: StatCardProps) {
  const isPositive = change !== null && change >= 0;

  const content = (
    <div
      className={cn(
        "bg-card rounded-xl border border-border p-5 animate-fade-in-up transition-all duration-200",
        href ? "hover:border-primary hover:shadow-md cursor-pointer active:scale-[0.98]" : ""
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {isLoading ? (
            <div className="h-8 w-24 skeleton" />
          ) : (
            <p className="text-2xl font-heading font-bold text-foreground animate-count-up">
              {value}
            </p>
          )}
          
          {isLoading ? (
            <div className="h-4 w-32 skeleton mt-2" />
          ) : (
            <div className="flex items-center gap-1.5">
              {change !== null ? (
                <>
                  {isPositive ? (
                    <ArrowUpRight className="w-4 h-4 text-success" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-destructive" />
                  )}
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      isPositive ? "text-success" : "text-destructive"
                    )}
                  >
                    {isPositive ? "+" : ""}
                    {change.toFixed(1)}%
                  </span>
                </>
              ) : (
                <span className="text-xs font-semibold text-muted-foreground">
                  --%
                </span>
              )}
              <span className="text-xs text-muted-foreground">{changeLabel}</span>
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex items-center justify-center w-12 h-12 rounded-xl",
            iconBg
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block w-full h-full">
        {content}
      </Link>
    );
  }

  return content;
}

// ─── Recent Sales Row ──────────────────────────

function RecentSaleRow({ sale, index }: { sale: RecentSale; index: number }) {
  const statusConfig = {
    completed: { label: "Completed", className: "badge-success" },
    refunded: { label: "Refunded", className: "badge-warning" },
    void: { label: "Void", className: "badge-destructive" },
  };

  const config = statusConfig[sale.status];

  return (
    <div
      className="flex items-center justify-between py-3 px-1 border-b border-border/50 last:border-0 animate-fade-in-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary text-xs font-bold">
          #{sale.invoice.slice(-3)}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            {sale.invoice}
          </p>
          <p className="text-xs text-muted-foreground">
            {sale.items} items • {formatRelativeTime(sale.time)}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-foreground">
          {formatCurrency(sale.amount)}
        </p>
        <span
          className={cn(
            "inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold",
            config.className
          )}
        >
          {config.label}
        </span>
      </div>
    </div>
  );
}

// ─── Low Stock Item Row ────────────────────────

function LowStockRow({ item, index }: { item: LowStockItem; index: number }) {
  const percentage = Math.round((item.currentStock / item.threshold) * 100);
  const isOut = item.currentStock === 0;

  return (
    <div
      className="flex items-center justify-between py-3 px-1 border-b border-border/50 last:border-0 animate-fade-in-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex items-center justify-center w-9 h-9 rounded-lg text-xs font-bold",
            isOut
              ? "bg-destructive/10 text-destructive"
              : "bg-warning/10 text-warning"
          )}
        >
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{item.name}</p>
          <p className="text-xs text-muted-foreground">
            {item.currentStock} / {item.threshold} {item.unit}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              isOut
                ? "bg-destructive"
                : percentage <= 50
                  ? "bg-warning"
                  : "bg-success"
            )}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <span
          className={cn(
            "text-xs font-semibold",
            isOut ? "text-destructive" : "text-warning"
          )}
        >
          {isOut ? "OUT" : `${percentage}%`}
        </span>
      </div>
    </div>
  );
}

// ─── Dashboard Page ────────────────────────────

export default function DashboardPage() {
  const { profile } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);

  useEffect(() => {
    async function fetchDashboardData() {
      setIsLoading(true);
      const supabase = createClient();
      const now = new Date();
      
      // Calculate start of today, yesterday, this week, last week
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).toISOString();
      
      const startOfThisWeek = new Date(now);
      startOfThisWeek.setDate(now.getDate() - 7);
      
      const startOfLastWeek = new Date(now);
      startOfLastWeek.setDate(now.getDate() - 14);

      try {
        // 1. Fetch Sales Data
        const { data: salesData } = await supabase
          .from("sales")
          .select("id, total_amount, created_at, status")
          .gte("created_at", startOfLastWeek.toISOString());

        // Aggregate stats
        let todayTotal = 0;
        let yesterdayTotal = 0;
        let thisWeekTotal = 0;
        let lastWeekTotal = 0;

        // Daily chart data logic (last 7 days)
        const dailyTotals: Record<string, number> = {};
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(now.getDate() - i);
          const dateStr = d.toLocaleDateString('en-US', { weekday: 'short' });
          dailyTotals[dateStr] = 0;
        }

        if (salesData) {
          salesData.forEach((sale) => {
            if (sale.status !== "completed") return;

            const saleDate = new Date(sale.created_at);
            const amount = Number(sale.total_amount);

            if (sale.created_at >= startOfToday) {
              todayTotal += amount;
            } else if (sale.created_at >= startOfYesterday && sale.created_at < startOfToday) {
              yesterdayTotal += amount;
            }

            if (sale.created_at >= startOfThisWeek.toISOString()) {
              thisWeekTotal += amount;
              
              // Add to chart
              const dayName = saleDate.toLocaleDateString('en-US', { weekday: 'short' });
              if (dailyTotals[dayName] !== undefined) {
                dailyTotals[dayName] += amount;
              }
            } else {
              lastWeekTotal += amount;
            }
          });
        }

        // Format chart data
        const formattedChartData = Object.entries(dailyTotals).map(([date, sales]) => ({
          date,
          sales
        }));
        setChartData(formattedChartData);

        const todayChange = yesterdayTotal === 0 ? (todayTotal > 0 ? 100 : 0) : ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100;
        const weeklyChange = lastWeekTotal === 0 ? (thisWeekTotal > 0 ? 100 : 0) : ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100;

        // 2. Fetch Low Stock
        const { data: lowStockData, count: lowStockCount } = await supabase
          .from("products")
          .select("id, name, stock_quantity, low_stock_threshold, unit", { count: 'exact' })
          .eq("is_active", true)
          .lte("stock_quantity", 10) // Custom logic or compare with threshold
          .order("stock_quantity", { ascending: true })
          .limit(5);
          
        // Since Supabase doesn't easily let us filter by column A <= column B in a simple select without an RPC, 
        // we'll filter client side for exact threshold, but use a rough limit on the server to save bandwidth.
        const { data: allProducts } = await supabase.from("products").select("id, name, stock_quantity, low_stock_threshold, unit").eq("is_active", true);
        const actualLowStock = allProducts ? allProducts.filter(p => p.stock_quantity <= p.low_stock_threshold) : [];
        const sortedLowStock = actualLowStock.sort((a, b) => (a.stock_quantity / a.low_stock_threshold) - (b.stock_quantity / b.low_stock_threshold)).slice(0, 5);
        
        setLowStockItems(sortedLowStock.map(p => ({
          id: p.id,
          name: p.name,
          currentStock: p.stock_quantity,
          threshold: p.low_stock_threshold,
          unit: p.unit
        })));

        // 3. Fetch Recent Sales with items count
        const { data: recentSalesData } = await supabase
          .from("sales")
          .select(`
            id,
            invoice_number,
            total_amount,
            created_at,
            status,
            sale_items (count)
          `)
          .order("created_at", { ascending: false })
          .limit(5);

        if (recentSalesData) {
          setRecentSales(recentSalesData.map(s => ({
            id: s.id,
            invoice: s.invoice_number,
            amount: Number(s.total_amount),
            items: s.sale_items[0]?.count || 0,
            time: s.created_at,
            status: s.status as any
          })));
        }

        // 4. Fetch Top Products (from recent sale items)
        const { data: saleItemsData } = await supabase
          .from("sale_items")
          .select("product_id, product_name, quantity, total_price, sales!inner(created_at)")
          .gte("sales.created_at", startOfThisWeek.toISOString());

        if (saleItemsData) {
          const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};
          
          saleItemsData.forEach(item => {
            if (!productMap[item.product_id]) {
              productMap[item.product_id] = { name: item.product_name, qty: 0, revenue: 0 };
            }
            productMap[item.product_id].qty += item.quantity;
            productMap[item.product_id].revenue += Number(item.total_price);
          });

          const top = Object.values(productMap)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
            
          setTopProducts(top);
        }

        // Mock Estimated Profit based on 30% margin of total sales
        const estimatedProfit = thisWeekTotal * 0.3;
        const lastWeekProfit = lastWeekTotal * 0.3;
        const profitChange = lastWeekProfit === 0 ? (estimatedProfit > 0 ? 100 : 0) : ((estimatedProfit - lastWeekProfit) / lastWeekProfit) * 100;

        setStats({
          todaySales: todayTotal,
          todayChange,
          weeklySales: thisWeekTotal,
          weeklyChange,
          lowStockCount: actualLowStock.length,
          estimatedProfit,
          profitChange,
        });

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (profile) {
      fetchDashboardData();
    }
  }, [profile]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome back, {profile?.full_name?.split(' ')[0] || 'User'}! Here&apos;s what&apos;s happening at {APP_NAME} today.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Today's Sales"
          value={formatCurrencyShort(stats?.todaySales || 0)}
          change={stats?.todayChange ?? null}
          changeLabel="vs yesterday"
          icon={<ShoppingCart className="w-6 h-6 text-primary" />}
          iconBg="bg-primary/10"
          delay={0}
          isLoading={isLoading}
          href="/sales"
        />
        <StatCard
          title="Weekly Sales"
          value={formatCurrencyShort(stats?.weeklySales || 0)}
          change={stats?.weeklyChange ?? null}
          changeLabel="vs last week"
          icon={<TrendingUp className="w-6 h-6 text-success" />}
          iconBg="bg-success/10"
          delay={75}
          isLoading={isLoading}
          href="/reports"
        />
        <StatCard
          title="Low Stock Alerts"
          value={stats?.lowStockCount.toString() || "0"}
          change={null}
          changeLabel="items need restock"
          icon={<AlertTriangle className="w-6 h-6 text-warning" />}
          iconBg="bg-warning/10"
          delay={150}
          isLoading={isLoading}
          href="/stock"
        />
        <StatCard
          title="Est. Profit (7d)"
          value={formatCurrencyShort(stats?.estimatedProfit || 0)}
          change={stats?.profitChange ?? null}
          changeLabel="vs last week"
          icon={<DollarSign className="w-6 h-6 text-primary" />}
          iconBg="bg-accent"
          delay={225}
          isLoading={isLoading}
          href="/reports"
        />
      </div>

      {/* Charts + Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Chart */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading font-semibold text-foreground">
                Sales Trend
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Last 7 days
              </p>
            </div>
          </div>
          
          <div className="h-[280px] w-full mt-4">
            {isLoading ? (
              <div className="w-full h-full skeleton rounded-lg" />
            ) : chartData.length > 0 && chartData.some(d => d.sales > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
                    tickFormatter={(value) => `Rs.${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
                  />
                  <Tooltip
                    cursor={false}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-card rounded-lg p-3 shadow-lg border-none">
                            <p className="text-muted-foreground text-xs font-medium mb-1">{payload[0].payload.date}</p>
                            <p className="text-foreground font-bold text-sm">
                              Sales: <span className="text-primary">{formatCurrency(payload[0].value as number)}</span>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="sales" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={index === chartData.length - 1 ? CHART_COLORS.primary : 'var(--color-primary-light)'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center flex-col text-center border-2 border-dashed border-border rounded-lg bg-muted/20">
                <TrendingUp className="w-10 h-10 text-muted-foreground/30 mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No sales data yet</p>
                <p className="text-xs text-muted-foreground/60">Make a sale in the POS to see the chart</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-card rounded-xl border border-border p-5 animate-fade-in-up" style={{ animationDelay: "375ms" }}>
          <h3 className="font-heading font-semibold text-foreground mb-1">
            Top Products
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Last 7 days best sellers</p>

          <div className="space-y-4">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg skeleton shrink-0" />
                  <div className="space-y-1 flex-1">
                    <div className="h-4 w-24 skeleton" />
                    <div className="h-3 w-12 skeleton" />
                  </div>
                  <div className="h-4 w-16 skeleton" />
                </div>
              ))
            ) : topProducts.length > 0 ? (
              topProducts.map((product, index) => (
                <div
                  key={product.name}
                  className="flex items-center gap-3 animate-fade-in-up"
                  style={{ animationDelay: `${400 + index * 50}ms` }}
                >
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-bold shrink-0">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {product.qty} sold
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {formatCurrency(product.revenue)}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No products sold this week.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Sales + Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="bg-card rounded-xl border border-border p-5 animate-fade-in-up" style={{ animationDelay: "450ms" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading font-semibold text-foreground">
                Recent Sales
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Latest transactions
              </p>
            </div>
            <a
              href="/sales"
              className="text-xs font-medium text-primary hover:underline transition-colors"
            >
              View All →
            </a>
          </div>
          <div>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-3 px-1 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg skeleton shrink-0" />
                    <div className="space-y-1">
                      <div className="h-4 w-24 skeleton" />
                      <div className="h-3 w-32 skeleton" />
                    </div>
                  </div>
                  <div className="h-5 w-16 skeleton rounded-full" />
                </div>
              ))
            ) : recentSales.length > 0 ? (
              recentSales.map((sale, index) => (
                <RecentSaleRow key={sale.id} sale={sale} index={index} />
              ))
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground border-2 border-dashed border-border rounded-lg bg-muted/20">
                No recent sales found.
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-card rounded-xl border border-border p-5 animate-fade-in-up" style={{ animationDelay: "525ms" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading font-semibold text-foreground">
                Low Stock Alerts
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Products needing restock
              </p>
            </div>
            <a
              href="/stock"
              className="text-xs font-medium text-primary hover:underline transition-colors"
            >
              Manage Stock →
            </a>
          </div>
          <div>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-3 px-1 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg skeleton shrink-0" />
                    <div className="space-y-1">
                      <div className="h-4 w-24 skeleton" />
                      <div className="h-3 w-16 skeleton" />
                    </div>
                  </div>
                  <div className="h-2 w-16 skeleton rounded-full" />
                </div>
              ))
            ) : lowStockItems.length > 0 ? (
              lowStockItems.map((item, index) => (
                <LowStockRow key={item.id} item={item} index={index} />
              ))
            ) : (
              <div className="py-8 flex flex-col items-center justify-center text-center border-2 border-dashed border-border rounded-lg bg-success/5">
                <Package className="w-8 h-8 text-success/50 mb-2" />
                <p className="text-sm font-medium text-success">Stock is healthy!</p>
                <p className="text-xs text-muted-foreground mt-1">No products are currently running low.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
