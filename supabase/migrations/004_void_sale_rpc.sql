-- ============================================
-- 7 Minutes POS — Void Sale RPC
-- ============================================

CREATE OR REPLACE FUNCTION public.void_sale(
  p_sale_id UUID,
  p_status public.sale_status, -- 'void' or 'refunded'
  p_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_current_status public.sale_status;
  v_invoice_number TEXT;
  v_item RECORD;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to void a sale';
  END IF;

  -- Get current sale
  SELECT status, invoice_number INTO v_current_status, v_invoice_number
  FROM public.sales
  WHERE id = p_sale_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sale not found';
  END IF;

  IF v_current_status != 'completed' THEN
    RAISE EXCEPTION 'Only completed sales can be voided or refunded';
  END IF;

  -- Update sale status
  UPDATE public.sales
  SET 
    status = p_status,
    notes = COALESCE(notes, '') || CHR(10) || 'Status changed to ' || p_status || ' by user. Reason: ' || p_reason,
    updated_at = NOW()
  WHERE id = p_sale_id;

  -- Create stock movements for each item to return stock
  FOR v_item IN SELECT product_id, quantity FROM public.sale_items WHERE sale_id = p_sale_id
  LOOP
    INSERT INTO public.stock_movements (
      product_id, type, quantity, reference_id, notes, created_by
    )
    VALUES (
      v_item.product_id,
      'return',
      v_item.quantity,
      p_sale_id,
      'Restocked from ' || p_status || ' sale: ' || v_invoice_number,
      v_user_id
    );
  END LOOP;

  -- Log to audit
  INSERT INTO public.audit_logs (user_id, action, resource, resource_id, new_values)
  VALUES (
    v_user_id,
    CASE WHEN p_status = 'void' THEN 'void_sale' ELSE 'refund' END,
    'sales',
    p_sale_id,
    jsonb_build_object(
      'invoice_number', v_invoice_number,
      'new_status', p_status,
      'reason', p_reason
    )
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
