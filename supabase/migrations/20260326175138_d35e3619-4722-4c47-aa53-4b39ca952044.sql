DELETE FROM trading_accounts WHERE id = 'e23a579e-0732-4dde-aaeb-147d851e9030' AND connection_status = 'pending' AND provider_account_id IS NULL;

INSERT INTO user_account_limits (user_id, max_accounts)
VALUES ('7d9f42ea-f35c-40e1-8bba-bf56919142b5', 2)
ON CONFLICT (user_id) DO UPDATE SET max_accounts = 2, updated_at = now();