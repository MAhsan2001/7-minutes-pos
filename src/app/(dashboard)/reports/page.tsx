"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { formatCurrency, cn } from "@/lib/utils";
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Package,
  Receipt,
  Loader2,
  PieChart as PieChartIcon
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { format, subDays, startOfDay, endOfDay, startOfMonth, startOfYear } from "date-fns";

const DATE_RANGES = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Last 7 Days", value: "7days" },
  { label: "Last 30 Days", value: "30days" },
  { label: "This Month", value: "month" },
  { label: "This Year", value: "year" },
];

const COLORS = ['#e11d48', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState("7days");
  const [isLoading, setIsLoading] = useState(true);
  const [salesData, setSalesData] = useState<any[]>([]);

  const supabase = createClient();

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  async function fetchReportData() {
    setIsLoading(true);
    try {
      const now = new Date();
      let startDate = new Date();
      let endDate = endOfDay(now);

      switch (dateRange) {
        case "today":
          startDate = startOfDay(now);
          break;
        case "yesterday":
          startDate = startOfDay(subDays(now, 1));
          endDate = endOfDay(subDays(now, 1));
          break;
        case "7days":
          startDate = startOfDay(subDays(now, 6));
          break;
        case "30days":
          startDate = startOfDay(subDays(now, 29));
          break;
        case "month":
          startDate = startOfMonth(now);
          break;
        case "year":
          startDate = startOfYear(now);
          break;
      }

      const { data, error } = await supabase
        .from("sales")
        .select(`
          id,
          total_amount,
          created_at,
          payment_method,
          sale_items (
            product_id,
            product_name,
            quantity,
            total_price,
            product:products(
              category:categories(name)
            )
          )
        `)
        .eq("status", "completed")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (error) throw error;
      setSalesData(data || []);
    } catch (error) {
      console.error("Error fetching report data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  // --- AGGREGATIONS ---
  const { totalRevenue, totalTransactions, trendData, topProducts, categoryData } = useMemo(() => {
    let rev = 0;
    const dailyMap: Record<string, number> = {};
    const productMap: Record<string, { quantity: number, revenue: number }> = {};
    const categoryMap: Record<string, number> = {};

    salesData.forEach(sale => {
      rev += Number(sale.total_amount);
      
      // Trend Data
      const dateStr = format(new Date(sale.created_at), dateRange === 'today' || dateRange === 'yesterday' ? 'HH:00' : 'MMM dd');
      dailyMap[dateStr] = (dailyMap[dateStr] || 0) + Number(sale.total_amount);

      // Items Data
      sale.sale_items.forEach((item: any) => {
        // Product Aggregation
        if (!productMap[item.product_name]) {
          productMap[item.product_name] = { quantity: 0, revenue: 0 };
        }
        productMap[item.product_name].quantity += item.quantity;
        productMap[item.product_name].revenue += Number(item.total_price);

        // Category Aggregation
        const catName = item.product?.category?.name || "Uncategorized";
        categoryMap[catName] = (categoryMap[catName] || 0) + Number(item.total_price);
      });
    });

    // Format Trend Data
    const formattedTrend = Object.entries(dailyMap)
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => {
        if (dateRange === 'today' || dateRange === 'yesterday') return a.date.localeCompare(b.date);
        return 0; // Keeping insertion order for dates if already sorted from DB
      });

    // Format Top Products
    const formattedProducts = Object.entries(productMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5); // Top 5

    // Format Category Data
    const formattedCategories = Object.entries(categoryMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      totalRevenue: rev,
      totalTransactions: salesData.length,
      trendData: formattedTrend,
      topProducts: formattedProducts,
      categoryData: formattedCategories
    };
  }, [salesData, dateRange]);


  return (
    <ProtectedRoute resource="reports" action="read">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">Reports & Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Visualize business performance and track top sellers.
            </p>
          </div>
          <div className="flex bg-card border border-border p-1 rounded-xl shadow-sm">
            {DATE_RANGES.map((range) => (
              <button
                key={range.value}
                onClick={() => setDateRange(range.value)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                  dateRange === range.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-primary/10 text-primary rounded-lg">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-sm font-medium text-muted-foreground">Total Revenue</h3>
                <p className="text-3xl font-heading font-bold text-foreground mt-1">
                  {formatCurrency(totalRevenue)}
                </p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-secondary/10 text-secondary-foreground rounded-lg">
                    <Receipt className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-sm font-medium text-muted-foreground">Total Transactions</h3>
                <p className="text-3xl font-heading font-bold text-foreground mt-1">
                  {totalTransactions}
                </p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-success/10 text-success rounded-lg">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-sm font-medium text-muted-foreground">Average Order Value</h3>
                <p className="text-3xl font-heading font-bold text-foreground mt-1">
                  {totalTransactions > 0 ? formatCurrency(totalRevenue / totalTransactions) : formatCurrency(0)}
                </p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-warning/10 text-warning rounded-lg">
                    <Package className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-sm font-medium text-muted-foreground">Items Sold</h3>
                <p className="text-3xl font-heading font-bold text-foreground mt-1">
                  {topProducts.reduce((sum, p) => sum + p.quantity, 0)}<span className="text-sm font-normal text-muted-foreground ml-1">(Top 5)</span>
                </p>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Sales Trend */}
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm lg:col-span-2">
                <h3 className="font-heading font-bold text-lg mb-6 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Sales Trend
                </h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#e11d48" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#e11d48" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888888' }} dy={10} />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: '#888888' }} 
                        tickFormatter={(value) => `Rs.${value/1000}k`}
                      />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-card rounded-lg p-3 shadow-lg border-none">
                                <p className="text-muted-foreground text-xs font-medium mb-1">{label}</p>
                                <p className="text-foreground font-bold text-sm">
                                  Revenue: <span className="text-primary">{formatCurrency(payload[0].value as number)}</span>
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area type="monotone" dataKey="total" stroke="#e11d48" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Products */}
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <h3 className="font-heading font-bold text-lg mb-6 flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  Top 5 Products (Revenue)
                </h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topProducts} layout="vertical" margin={{ left: 50 }}>
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: '#888888', fontWeight: 500 }} 
                        width={80}
                      />
                      <Tooltip 
                        cursor={false}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-card rounded-lg p-3 shadow-lg border-none">
                                <p className="text-muted-foreground text-xs font-medium mb-1">{payload[0].payload.name}</p>
                                <p className="text-foreground font-bold text-sm">
                                  Revenue: <span className="text-primary">{formatCurrency(payload[0].value as number)}</span>
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="revenue" fill="#e11d48" radius={[0, 4, 4, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <h3 className="font-heading font-bold text-lg mb-6 flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-primary" />
                  Category Breakdown
                </h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-card rounded-lg p-3 shadow-lg border-none">
                                <p className="text-muted-foreground text-xs font-medium mb-1">{payload[0].name}</p>
                                <p className="text-foreground font-bold text-sm">
                                  Value: <span className="text-primary">{formatCurrency(payload[0].value as number)}</span>
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend 
                        layout="vertical" 
                        verticalAlign="middle" 
                        align="right"
                        wrapperStyle={{ fontSize: '12px', color: 'hsl(var(--foreground))' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
