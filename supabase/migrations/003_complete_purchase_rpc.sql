-- ============================================
-- 7 Minutes POS — Complete Purchase RPC
-- ============================================

CREATE OR REPLACE FUNCTION public.complete_purchase(
  p_supplier_id UUID,
  p_purchase_number TEXT,
  p_total_amount DECIMAL,
  p_notes TEXT,
  p_items JSONB -- Array of {product_id, quantity, unit_price, total_price}
)
RETURNS UUID AS $$
DECLARE
  v_purchase_id UUID;
  v_item JSONB;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to complete a purchase';
  END IF;

  -- Create the purchase record (automatically 'received')
  INSERT INTO public.purchases (
    supplier_id, purchase_number, total_amount, status, notes, created_by
  )
  VALUES (
    p_supplier_id, p_purchase_number, p_total_amount, 'received', p_notes, v_user_id
  )
  RETURNING id INTO v_purchase_id;

  -- Insert purchase items and create stock movements
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Insert purchase item
    INSERT INTO public.purchase_items (
      purchase_id, product_id, quantity, unit_price, total_price
    )
    VALUES (
      v_purchase_id,
      (v_item->>'product_id')::UUID,
      (v_item->>'quantity')::INTEGER,
      (v_item->>'unit_price')::DECIMAL,
      (v_item->>'total_price')::DECIMAL
    );

    -- Create stock movement (the trigger will increase product stock)
    INSERT INTO public.stock_movements (
      product_id, type, quantity, reference_id, notes, created_by
    )
    VALUES (
      (v_item->>'product_id')::UUID,
      'purchase',
      (v_item->>'quantity')::INTEGER,
      v_purchase_id,
      'Purchase Order: ' || p_purchase_number,
      v_user_id
    );
  END LOOP;

  -- Log to audit
  INSERT INTO public.audit_logs (user_id, action, resource, resource_id, new_values)
  VALUES (
    v_user_id,
    'create',
    'purchases',
    v_purchase_id,
    jsonb_build_object(
      'purchase_number', p_purchase_number,
      'total_amount', p_total_amount,
      'items_count', jsonb_array_length(p_items)
    )
  );

  RETURN v_purchase_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
