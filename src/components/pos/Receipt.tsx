import { forwardRef, Fragment } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { CartItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/utils/constants";
import { QRCodeCanvas } from "qrcode.react";

interface ReceiptProps {
  invoiceNumber: string;
  items: CartItem[];
  totalAmount: number; // This is the Gross Subtotal
  discountAmount?: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod: string;
  date: Date;
  cashierName?: string;
  width?: "58mm" | "80mm";
  bakeryName?: string;
  address?: string;
  phone?: string;
  email?: string;
  headerMessage?: string;
  footerMessage?: string;
  logo?: string;
  showLogo?: boolean;
  fontFamily?: string;
  fontSize?: string;
  customerName?: string;
}

export const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(
  (
    {
      invoiceNumber,
      items,
      totalAmount,
      discountAmount = 0,
      paidAmount,
      changeAmount,
      paymentMethod,
      date,
      cashierName = "Cashier",
      width = "80mm",
      bakeryName = APP_NAME.toUpperCase(),
      address = "Mount Lavinia, Sri Lanka",
      phone = "Tel: 011-XXXXXXX",
      email = "7miinutes@gmail.com",
      headerMessage = "Welcome!",
      footerMessage = "Thank you! Come again!",
      logo,
      showLogo = true,
      fontFamily = "'Arial', sans-serif",
      fontSize = "text-sm",
      customerName,
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "receipt-printable tracking-tight bg-white text-black p-4 hidden print:block",
          fontSize,
          width === "58mm" ? "receipt-58mm" : "receipt-80mm"
        )}
        style={{ fontFamily: "'Courier New', Courier, monospace" }}
      >
        <style type="text/css" media="print">
          {`@page { margin: 0; size: 80mm auto; }`}
        </style>
        {/* Header */}
        <div className="text-center mb-4 flex flex-col items-center">
          {showLogo && logo && (
            <img src={logo} alt="Logo" className="w-32 object-contain mb-2 grayscale bg-white" />
          )}
          <h1 className="font-bold text-xl mb-1 tracking-widest uppercase">{bakeryName}</h1>
          <div className="text-xs leading-snug">
            <p>{address}</p>
            <p>Ph.No.: {phone}</p>
            {email && <p>Email: {email}</p>}
          </div>
        </div>

        <div className="text-center font-bold text-sm uppercase tracking-widest mb-4">
          Invoice
        </div>

        {/* Meta Info */}
        <div className="text-xs mb-3 flex justify-between">
          <div className="flex flex-col">
            <span>Date: {formatDate(date.toISOString())}</span>
            <span>Time: {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
            <span>Invoice No: {invoiceNumber}</span>
            <span>Cashier: {cashierName}</span>
          </div>
          <div className="flex flex-col text-right">
            <span className="font-bold">Customer</span>
            <span>{customerName || "Walk-in"}</span>
          </div>
        </div>

        {/* Items Table Header */}
        <div className="border-t border-b border-dashed border-black py-1 mb-2 text-xs font-bold">
          <div className="flex w-full">
            <span className="w-6">#</span>
            <span className="flex-1">Item Name</span>
          </div>
          <div className="flex w-full pl-6 mt-1 text-right">
            <span className="flex-1 text-left">Quantity</span>
            <span className="w-20">Price</span>
            <span className="w-24">Amount</span>
          </div>
        </div>

        {/* Items List */}
        <div className="text-xs space-y-3 mb-3 border-b border-dashed border-black pb-3">
          {items.map((item, idx) => {
            const addonsTotal = item.addons?.reduce((sum, a) => sum + a.price, 0) || 0;
            const baseUnitPrice = item.unit_price - addonsTotal;
            
            return (
              <div key={idx} className="flex flex-col">
                <div className="flex w-full font-bold">
                  <span className="w-6">{idx + 1}</span>
                  <span className="flex-1">
                    {item.product_name}
                    {item.variant_name && <span className="font-normal text-[10px] block">({item.variant_name})</span>}
                  </span>
                </div>
                <div className="flex w-full pl-6 mt-0.5 text-right">
                  <span className="flex-1 text-left">{item.quantity}</span>
                  <span className="w-20">{formatCurrency(baseUnitPrice).replace("Rs.", "").trim()}</span>
                  <span className="w-24">{formatCurrency(baseUnitPrice * item.quantity).replace("Rs.", "").trim()}</span>
                </div>

                {item.addons && item.addons.map((addon, aIdx) => (
                  <div key={`${idx}-${addon.id}`} className="flex flex-col mt-1">
                    <div className="flex w-full pl-6 text-[10px]">
                      <span className="flex-1">+ {addon.name}</span>
                    </div>
                    <div className="flex w-full pl-6 mt-0.5 text-right">
                      <span className="flex-1 text-left">{item.quantity}</span>
                      <span className="w-20">{formatCurrency(addon.price).replace("Rs.", "").trim()}</span>
                      <span className="w-24">{formatCurrency(addon.price * item.quantity).replace("Rs.", "").trim()}</span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Totals */}
        <div className="text-xs font-bold w-full flex flex-col items-end space-y-1 mb-4 pr-1">
          <div className="flex w-full justify-between items-center mb-1">
            <span>Total Items: {items.reduce((sum, i) => sum + i.quantity, 0)}</span>
            <span className="w-24 text-right text-sm">{formatCurrency(totalAmount).replace("Rs.", "").trim()}</span>
          </div>
          
          {discountAmount > 0 && (
            <div className="flex w-full justify-end">
              <span className="w-24 text-left">Discount</span>
              <span className="w-4 text-center">:</span>
              <span className="w-24 text-right">-{formatCurrency(discountAmount).replace("Rs.", "").trim()}</span>
            </div>
          )}
          
          <div className="flex w-full justify-end mt-1">
            <span className="w-24 text-left">Total</span>
            <span className="w-4 text-center">:</span>
            <span className="w-24 text-right">{formatCurrency(totalAmount - discountAmount).replace("Rs.", "").trim()}</span>
          </div>
          
          <div className="flex w-full justify-end">
            <span className="w-24 text-left">Received</span>
            <span className="w-4 text-center">:</span>
            <span className="w-24 text-right">{formatCurrency(paidAmount).replace("Rs.", "").trim()}</span>
          </div>
          
          <div className="flex w-full justify-end">
            <span className="w-24 text-left">Balance</span>
            <span className="w-4 text-center">:</span>
            <span className="w-24 text-right border-b-2 border-black pb-0.5">{formatCurrency(changeAmount).replace("Rs.", "").trim()}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] mt-6 flex flex-col items-center">
          <p className="font-bold text-[14px] leading-tight mb-2 uppercase">{footerMessage}</p>
          
          {/* Instagram Section */}
          <div className="mt-3 mb-4 flex flex-col items-center">
            <p className="font-bold text-xs uppercase mb-1">Follow us on Instagram</p>
            <p className="font-bold text-[14px] mb-2">@7MIINUTES</p>
            <QRCodeCanvas 
              value="https://www.instagram.com/7miinutes?utm_source=qr&igsh=cnVnd3AzNWJoNnRm" 
              size={90}
              level="M"
              includeMargin={false}
            />
          </div>

          <p className="border-t border-dashed border-black pt-2 w-full mt-2">Powered By @SanTech Solution</p>
          <p>0712805199</p>
        </div>
      </div>
    );
  }
);

Receipt.displayName = "Receipt";
