import { forwardRef, Fragment } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { CartItem, Customer } from "@/lib/types";
import { APP_NAME } from "@/lib/utils/constants";
import { calculateInclusiveTaxes } from "@/lib/utils/tax";

interface A4InvoiceProps {
  invoiceNumber: string;
  items: CartItem[];
  totalAmount: number; // Gross Subtotal
  discountAmount?: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod: string;
  date: Date;
  cashierName?: string;
  customer?: Customer | null;
  bakeryName?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  showLogo?: boolean;
}

export const A4Invoice = forwardRef<HTMLDivElement, A4InvoiceProps>(
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
      cashierName = "Admin",
      customer,
      bakeryName = APP_NAME.toUpperCase(),
      address = "123 Main Street, Colombo, Sri Lanka",
      phone = "Tel: 011-XXXXXXX",
      email,
      logo,
      showLogo = true,
    },
    ref
  ) => {
    const finalTotal = totalAmount - discountAmount;
    const { baseAmount, ssclAmount, vatAmount } = calculateInclusiveTaxes(finalTotal);

    return (
      <div
        ref={ref}
        className="a4-invoice bg-white text-black p-6 sm:p-10 mx-auto w-full print:p-8 print:m-0"
        style={{
          fontFamily: "Arial, sans-serif",
        }}
      >
        <style type="text/css" media="print">
          {`@page { margin: 10mm; size: auto; }`}
        </style>
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-[#d1d5db] pb-6 mb-6">
          <div className="flex items-center gap-4">
            {showLogo && logo && (
              <img src={logo} alt="Logo" className="w-24 h-24 object-contain" />
            )}
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-[#111827] mb-2">{bakeryName}</h1>
              <p className="text-sm text-[#4b5563]">{address}</p>
              <p className="text-sm text-[#4b5563]">{phone}</p>
              {email && <p className="text-sm text-[#4b5563]">{email}</p>}
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-4xl font-bold text-[#d1d5db] uppercase tracking-widest mb-2">Invoice</h2>
            <p className="text-sm font-medium text-[#111827]">Invoice #: {invoiceNumber}</p>
            <p className="text-sm text-[#4b5563]">Date: {formatDate(date.toISOString())}</p>
            <p className="text-sm text-[#4b5563]">Time: {date.toLocaleTimeString()}</p>
            <p className="text-sm text-[#4b5563]">Cashier: {cashierName}</p>
          </div>
        </div>

        {/* Bill To */}
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase text-[#6b7280] mb-2">Bill To</h3>
          {customer ? (
            <div>
              <p className="text-lg font-bold text-[#111827]">{customer.name}</p>
              {customer.address && <p className="text-sm text-[#4b5563]">{customer.address}</p>}
              {customer.phone && <p className="text-sm text-[#4b5563]">{customer.phone}</p>}
              {customer.vat_number && <p className="text-sm text-[#4b5563]">VAT: {customer.vat_number}</p>}
            </div>
          ) : (
            <div>
              <p className="text-lg font-bold text-[#111827]">Walk-in Customer</p>
            </div>
          )}
        </div>

        {/* Items Table */}
        <table className="w-full text-left mb-8 border-collapse">
          <thead>
            <tr className="border-b-2 border-[#111827]">
              <th className="py-3 px-2 text-sm font-bold text-[#111827] uppercase">Item Description</th>
              <th className="py-3 px-2 text-sm font-bold text-[#111827] uppercase text-center">Qty</th>
              <th className="py-3 px-2 text-sm font-bold text-[#111827] uppercase text-right">Unit Price</th>
              <th className="py-3 px-2 text-sm font-bold text-[#111827] uppercase text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item, idx) => {
              const addonsTotal = item.addons?.reduce((sum, a) => sum + a.price, 0) || 0;
              const baseUnitPrice = item.unit_price - addonsTotal;
              const baseAmount = baseUnitPrice * item.quantity;
              
              return (
                <Fragment key={idx}>
                  <tr className="hover:bg-[#f9fafb]">
                    <td className="py-4 px-2 text-sm text-[#111827] font-medium">
                      <div>{item.product_name}</div>
                      {item.variant_name && (
                        <div className="text-xs text-[#6b7280] mt-1">
                          ({item.variant_name})
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-2 text-sm text-[#4b5563] text-center">{item.quantity}</td>
                    <td className="py-4 px-2 text-sm text-[#4b5563] text-right">
                      {formatCurrency(baseUnitPrice)}
                    </td>
                    <td className="py-4 px-2 text-sm text-[#111827] font-medium text-right">
                      {formatCurrency(baseAmount)}
                    </td>
                  </tr>
                  
                  {item.addons && item.addons.map((addon) => (
                    <tr key={`${idx}-${addon.id}`} className="hover:bg-[#f9fafb] text-[#4b5563]">
                      <td className="py-2 px-2 text-sm pl-6">
                        + {addon.name}
                      </td>
                      <td className="py-2 px-2 text-sm text-center">{item.quantity}</td>
                      <td className="py-2 px-2 text-sm text-right">
                        {formatCurrency(addon.price)}
                      </td>
                      <td className="py-2 px-2 text-sm font-medium text-right text-[#111827]">
                        {formatCurrency(addon.price * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>

        {/* Totals Calculation */}
        <div className="flex justify-end mb-12">
          <div className="w-1/2">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-[#f3f4f6] pb-2">
                <span className="text-[#4b5563]">Subtotal:</span>
                <span className="text-[#111827] font-medium">{formatCurrency(totalAmount)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between border-b border-[#f3f4f6] pb-2 text-[#16a34a]">
                  <span>Discount:</span>
                  <span className="font-medium">-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              
              {/* Final Amount */}
              <div className="flex justify-between items-center pt-2">
                <span className="text-lg font-bold text-[#111827]">Total:</span>
                <span className="text-2xl font-bold text-[#111827]">{formatCurrency(finalTotal)}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-[#4b5563]">Amount Paid ({paymentMethod.toUpperCase()}):</span>
                <span className="text-[#111827] font-medium">{formatCurrency(paidAmount)}</span>
              </div>
              
              {(finalTotal - paidAmount) > 0 ? (
                <div className="flex justify-between pt-2 text-red-600 font-bold">
                  <span>Balance Due (Udhar):</span>
                  <span>{formatCurrency(finalTotal - paidAmount)}</span>
                </div>
              ) : (
                <div className="flex justify-between pt-2 text-[#4b5563]">
                  <span>Change:</span>
                  <span className="font-medium">{formatCurrency(changeAmount)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Notes */}
        <div className="border-t border-[#d1d5db] pt-8 mt-auto">
          <div className="text-sm text-[#6b7280] text-center">
            <p className="font-bold mb-1 text-[#374151]">Thank you for your business!</p>
            <p>If you have any questions regarding this invoice, please contact us at {phone}.</p>
          </div>
        </div>
      </div>
    );
  }
);

A4Invoice.displayName = "A4Invoice";
