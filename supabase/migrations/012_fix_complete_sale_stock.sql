-- Fix complete_sale RPC: Remove invalid stock_quantity update on product_variants
CREATE OR REPLACE FUNCTION public.complete_sale(
  p_invoice_number TEXT,
  p_total_amount DECIMAL,
  p_discount_amount DECIMAL,
  p_paid_amount DECIMAL,
  p_change_amount DECIMAL,
  p_payment_method payment_method,
  p_notes TEXT,
  p_items JSONB, -- Array of {product_id, variant_id, variant_name, product_name, quantity, unit_price, total_price, addons}
  p_customer_id UUID DEFAULT NULL,
  p_vat_amount DECIMAL DEFAULT 0,
  p_sscl_amount DECIMAL DEFAULT 0,
  p_is_credit BOOLEAN DEFAULT FALSE,
  p_shift_cashier_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_sale_id UUID;
  v_item JSONB;
  v_cashier_id UUID;
  v_credit_amount DECIMAL;
BEGIN
  v_cashier_id := auth.uid();
  
  IF v_cashier_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to complete a sale';
  END IF;

  -- Create the sale record
  INSERT INTO public.sales (
    invoice_number, cashier_id, total_amount, discount_amount,
    paid_amount, change_amount, payment_method, notes,
    customer_id, vat_amount, sscl_amount, is_credit, shift_cashier_name
  )
  VALUES (
    p_invoice_number, v_cashier_id, p_total_amount, p_discount_amount,
    p_paid_amount, p_change_amount, p_payment_method, p_notes,
    p_customer_id, p_vat_amount, p_sscl_amount, p_is_credit, p_shift_cashier_name
  )
  RETURNING id INTO v_sale_id;

  -- Insert sale items and create stock movements
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Insert sale item
    INSERT INTO public.sale_items (
      sale_id, product_id, variant_id, variant_name, product_name, quantity, unit_price, total_price, addons
    )
    VALUES (
      v_sale_id,
      (v_item->>'product_id')::UUID,
      NULLIF(v_item->>'variant_id', '')::UUID,
      v_item->>'variant_name',
      v_item->>'product_name',
      (v_item->>'quantity')::INTEGER,
      (v_item->>'unit_price')::DECIMAL,
      (v_item->>'total_price')::DECIMAL,
      (v_item->'addons')::JSONB
    );

    -- Create stock movement (this automatically updates the main product stock via trigger)
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

  -- If it's a credit sale (paid < total), create ledger entry
  IF p_is_credit AND p_customer_id IS NOT NULL THEN
    v_credit_amount := p_total_amount - p_paid_amount;
    
    IF v_credit_amount > 0 THEN
      INSERT INTO public.customer_ledgers (
        customer_id, sale_id, type, amount, notes, created_by
      ) VALUES (
        p_customer_id, v_sale_id, 'credit_sale', v_credit_amount, 'Unpaid balance for Invoice ' || p_invoice_number, v_cashier_id
      );
    END IF;
  END IF;

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
      'is_credit', p_is_credit,
      'customer_id', p_customer_id,
      'items_count', jsonb_array_length(p_items)
    )
  );

  RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
