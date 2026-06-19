-- =========================================================================
-- WIPE TEST DATA (Transactions Only)
-- This script safely deletes all test transactions while KEEPING your 
-- Categories, Products, Customers, Suppliers, and Promotions intact.
-- =========================================================================

-- 1. Delete all sale records
DELETE FROM sale_items;
DELETE FROM sales;

-- 2. Delete all purchase records
DELETE FROM purchase_items;
DELETE FROM purchases;

-- 3. Delete all stock history
DELETE FROM stock_movements;

-- 4. Delete all customer debts and payments
DELETE FROM customer_ledgers;

-- 5. Delete all daily shift tallies and expenses
DELETE FROM daily_tally;

-- 6. Delete all price change history
DELETE FROM price_history;

-- 7. Delete all audit logs
DELETE FROM audit_logs;

-- =========================================================================
-- RESET BALANCES
-- =========================================================================

-- 1. Reset all Customer Udhar/Credit balances to exactly Rs. 0
UPDATE customers SET total_credit_due = 0;

-- 2. Reset all Product Stock quantities to exactly 0 
-- (If you want to keep the current stock amounts, delete the line below)
UPDATE products SET stock_quantity = 0;

-- Done!
