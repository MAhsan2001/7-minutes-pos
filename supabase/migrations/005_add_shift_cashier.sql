-- ============================================
-- 7 Minutes POS — Database Migration
-- Version: 1.1 (Add Shift Cashier Name)
-- ============================================

-- 1. Add column to sales table
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS shift_cashier_name TEXT;

-- 2. Update the complete_sale RPC to accept and save p_shift_cashier_name
CREATE OR REPLACE FUNCTION public.complete_sale(
  p_invoice_number TEXT,
  p_total_amount DECIMAL,
  p_discount_amount DECIMAL,
  p_paid_amount DECIMAL,
  p_change_amount DECIMAL,
  p_payment_method payment_method,
  p_notes TEXT,
  p_items JSONB, -- Array of {product_id, product_name, quantity, unit_price, total_price}
  p_shift_cashier_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_sale_id UUID;
  v_item JSONB;
  v_cashier_id UUID;
BEGIN
  v_cashier_id := auth.uid();
  
  IF v_cashier_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to complete a sale';
  END IF;

  -- Create the sale record
  INSERT INTO public.sales (
    invoice_number, cashier_id, total_amount, discount_amount,
    paid_amount, change_amount, payment_method, notes, shift_cashier_name
  )
  VALUES (
    p_invoice_number, v_cashier_id, p_total_amount, p_discount_amount,
    p_paid_amount, p_change_amount, p_payment_method, p_notes, p_shift_cashier_name
  )
  RETURNING id INTO v_sale_id;

  -- Insert sale items and create stock movements
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Insert sale item
    INSERT INTO public.sale_items (
      sale_id, product_id, product_name, quantity, unit_price, total_price
    )
    VALUES (
      v_sale_id,
      (v_item->>'product_id')::UUID,
      v_item->>'product_name',
      (v_item->>'quantity')::INTEGER,
      (v_item->>'unit_price')::DECIMAL,
      (v_item->>'total_price')::DECIMAL
    );

    -- Create stock movement (the trigger will update product stock)
    INSERT INTO public.stock_movements (
      product_id, type, quantity, reference_id, notes, created_by
    )
    VALUES (
      (v_item->>'product_id')::UUID,
      'sale',
      (v_item->>'quantity')::INTEGER,
      v_sale_id,
      'Sale: ' || p_invoice_number,
      v_cashier_id
    );
  END LOOP;

  -- Log to audit
  INSERT INTO public.audit_logs (user_id, action, resource, resource_id, new_values)
  VALUES (
    v_cashier_id,
    'create',
    'sales',
    v_sale_id,
    jsonb_build_object(
      'invoice_number', p_invoice_number,
      'total_amount', p_total_amount,
      'payment_method', p_payment_method,
      'shift_cashier_name', p_shift_cashier_name,
      'items_count', jsonb_array_length(p_items)
    )
  );

  RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
