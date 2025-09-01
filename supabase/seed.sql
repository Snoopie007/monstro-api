-- =========================================
-- MONSTRO APP TEST DATA SEED
-- =========================================
-- This file contains comprehensive test data for local development
-- Run after starting Supabase locally: supabase db reset

-- =========================================
-- USERS (Base authentication users)
-- =========================================
INSERT INTO users (id, name, email, email_verified_at, image, password, created_at, updated_at) VALUES
('usr_test_admin', 'Admin User', 'admin@test.com', NOW(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin', '$2b$10$tvMC80jp16OkgYG7AjSxlel83DzigvfA.jKS1rqbgGC1S/LUSJ1ty', NOW(), NOW()),
('usr_test_vendor', 'Vendor Owner', 'vendor@test.com', NOW(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=vendor', '$2b$10$tvMC80jp16OkgYG7AjSxlel83DzigvfA.jKS1rqbgGC1S/LUSJ1ty', NOW(), NOW()),
('usr_test_staff', 'Staff Member', 'staff@test.com', NOW(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=staff', '$2b$10$tvMC80jp16OkgYG7AjSxlel83DzigvfA.jKS1rqbgGC1S/LUSJ1ty', NOW(), NOW()),
('usr_test_member1', 'John Doe', 'john@test.com', NOW(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=john', '$2b$10$tvMC80jp16OkgYG7AjSxlel83DzigvfA.jKS1rqbgGC1S/LUSJ1ty', NOW(), NOW()),
('usr_test_member2', 'Jane Smith', 'jane@test.com', NOW(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=jane', '$2b$10$tvMC80jp16OkgYG7AjSxlel83DzigvfA.jKS1rqbgGC1S/LUSJ1ty', NOW(), NOW()),
('usr_test_member3', 'Bob Johnson', 'bob@test.com', NOW(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob', '$2b$10$tvMC80jp16OkgYG7AjSxlel83DzigvfA.jKS1rqbgGC1S/LUSJ1ty', NOW(), NOW());

-- =========================================
-- VENDORS (Business owners)
-- =========================================
INSERT INTO vendors (id, first_name, last_name, user_id, stripe_customer_id, email, avatar, phone, created_at, updated_at) VALUES
('vdr_test_admin', 'Admin', 'User', 'usr_test_admin', 'cus_test_admin', 'admin@test.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin', '+1555123450', NOW(), NOW()),
('vdr_test_gym', 'Mike', 'Thompson', 'usr_test_vendor', 'cus_test_gym', 'gym@test.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=mike', '+1555123456', NOW(), NOW()),
('vdr_test_dance', 'Sarah', 'Davis', 'usr_test_vendor', 'cus_test_dance', 'dance@test.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah', '+1555123457', NOW(), NOW());

-- =========================================
-- LOCATIONS (Business locations)
-- =========================================
INSERT INTO locations (id, name, address, about, city, state, logo_url, country, postal_code, website, email, phone, timezone, vendor_id, slug, metadata, industry, legal_name, created_at, updated_at) VALUES
('acc_test_admin', 'Admin Headquarters', '1 Admin Way', 'Central administration and management hub', 'San Francisco', 'CA', 'https://api.dicebear.com/7.x/initials/svg?seed=AH', 'USA', '94105', 'https://admin.monstro.com', 'admin@monstro.com', '+1555123450', 'America/Los_Angeles', 'vdr_test_admin', 'admin-headquarters', '{"features": ["management", "administration", "support"]}', 'Management', 'Monstro Admin LLC', NOW(), NOW()),
('acc_test_gym', 'FitZone Gym', '123 Main St', 'Premier fitness center with state-of-the-art equipment', 'New York', 'NY', 'https://api.dicebear.com/7.x/initials/svg?seed=FZ', 'USA', '10001', 'https://fitzone.com', 'info@fitzone.com', '+1555123456', 'America/New_York', 'vdr_test_gym', 'fitzone-gym', '{"features": ["pool", "sauna", "personal_training"]}', 'Fitness', 'FitZone LLC', NOW(), NOW()),
('acc_test_dance', 'Dance Academy', '456 Broadway', 'Professional dance instruction for all ages', 'Los Angeles', 'CA', 'https://api.dicebear.com/7.x/initials/svg?seed=DA', 'USA', '90210', 'https://danceacademy.com', 'info@danceacademy.com', '+1555123457', 'America/Los_Angeles', 'vdr_test_dance', 'dance-academy', '{"features": ["ballet", "hip_hop", "jazz"]}', 'Dance', 'Dance Academy Inc', NOW(), NOW());

-- =========================================
-- LOCATION STATE (Subscription/payment status)
-- =========================================
INSERT INTO location_state (location_id, plan_id, pkg_id, payment_plan_id, status, agree_to_terms, last_renewal_date, start_date, stripe_subscription_id, settings, created_at, updated_at, usage_percent, tax_rate) VALUES
('acc_test_admin', 0, 0, 0, 'active', true, NOW(), NOW(), 'sub_test_admin', '{"notifications": true, "auto_renewal": true}', NOW(), NOW(), 0, 0),
('acc_test_gym', 1, 1, 1, 'active', true, NOW(), NOW(), 'sub_test_gym', '{"notifications": true, "auto_renewal": true}', NOW(), NOW(), 75, 8),
('acc_test_dance', 2, 2, 2, 'active', true, NOW(), NOW(), 'sub_test_dance', '{"notifications": true, "auto_renewal": true}', NOW(), NOW(), 60, 9);

-- =========================================
-- STAFFS (Employees/instructors)
-- =========================================
INSERT INTO staffs (id, first_name, last_name, email, phone, avatar, user_id, created_at, updated_at) VALUES
('stf_test_trainer1', 'Alex', 'Rodriguez', 'alex@fitzone.com', '+1555123458', 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex', 'usr_test_staff', NOW(), NOW()),
('stf_test_trainer2', 'Emma', 'Wilson', 'emma@fitzone.com', '+1555123459', 'https://api.dicebear.com/7.x/avataaars/svg?seed=emma', 'usr_test_staff', NOW(), NOW()),
('stf_test_dance1', 'Carlos', 'Martinez', 'carlos@danceacademy.com', '+1555123460', 'https://api.dicebear.com/7.x/avataaars/svg?seed=carlos', 'usr_test_staff', NOW(), NOW()),
('stf_test_dance2', 'Lisa', 'Anderson', 'lisa@danceacademy.com', '+1555123461', 'https://api.dicebear.com/7.x/avataaars/svg?seed=lisa', 'usr_test_staff', NOW(), NOW());

-- =========================================
-- STAFF LOCATIONS (Staff assignments)
-- =========================================
INSERT INTO staff_locations (id, staff_id, location_id, status) VALUES
('stfloc_1', 'stf_test_trainer1', 'acc_test_gym', 'active'),
('stfloc_2', 'stf_test_trainer2', 'acc_test_gym', 'active'),
('stfloc_3', 'stf_test_dance1', 'acc_test_dance', 'active'),
('stfloc_4', 'stf_test_dance2', 'acc_test_dance', 'active');

-- =========================================
-- MEMBERS (Customers)
-- =========================================
INSERT INTO members (id, user_id, email, phone, referral_code, avatar, stripe_customer_id, created_at, updated_at, first_name, last_name, gender, dob) VALUES
('mbr_test_john', 'usr_test_member1', 'john@test.com', '+1555123462', 'JOHN2024', 'https://api.dicebear.com/7.x/avataaars/svg?seed=john', 'cus_test_john', NOW(), NOW(), 'John', 'Doe', 'male', '1990-05-15'::timestamp),
('mbr_test_jane', 'usr_test_member2', 'jane@test.com', '+1555123463', 'JANE2024', 'https://api.dicebear.com/7.x/avataaars/svg?seed=jane', 'cus_test_jane', NOW(), NOW(), 'Jane', 'Smith', 'female', '1988-03-22'::timestamp),
('mbr_test_bob', 'usr_test_member3', 'bob@test.com', '+1555123464', 'BOB2024', 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob', 'cus_test_bob', NOW(), NOW(), 'Bob', 'Johnson', 'male', '1992-11-08'::timestamp);

-- =========================================
-- MEMBER LOCATIONS (Member enrollments)
-- =========================================
INSERT INTO member_locations (location_id, member_id, points, status, invite_date, invite_accepted_date) VALUES
('acc_test_gym', 'mbr_test_john', 150, 'active', NOW() - INTERVAL '30 days', NOW() - INTERVAL '29 days'),
('acc_test_gym', 'mbr_test_jane', 200, 'active', NOW() - INTERVAL '45 days', NOW() - INTERVAL '44 days'),
('acc_test_dance', 'mbr_test_bob', 75, 'active', NOW() - INTERVAL '20 days', NOW() - INTERVAL '19 days');

-- =========================================
-- PROGRAMS (Classes/services offered)
-- =========================================
INSERT INTO programs (id, location_id, instructor_id, name, description, icon, capacity, min_age, max_age, status, interval, interval_threshold, cancelation_threshold, allow_waitlist, waitlist_capacity, allow_make_up_class, created_at, updated_at) VALUES
('prog_gym_pt', 'acc_test_gym', 'stf_test_trainer1', 'Personal Training', 'One-on-one fitness training sessions', '🏋️', 1, 16, 80, 'active', 'week', 1, 24, false, 0, true, NOW(), NOW()),
('prog_gym_group', 'acc_test_gym', 'stf_test_trainer2', 'Group Fitness', 'High-energy group workout classes', '💪', 20, 18, 65, 'active', 'week', 2, 24, true, 5, true, NOW(), NOW()),
('prog_dance_ballet', 'acc_test_dance', 'stf_test_dance1', 'Ballet Fundamentals', 'Learn the basics of classical ballet', '🩰', 15, 8, 18, 'active', 'week', 1, 24, true, 3, true, NOW(), NOW()),
('prog_dance_hiphop', 'acc_test_dance', 'stf_test_dance2', 'Hip Hop Dance', 'Contemporary hip hop dance classes', '🕺', 12, 12, 25, 'active', 'week', 1, 24, false, 0, true, NOW(), NOW());

-- =========================================
-- PROGRAM TAGS (Categorization)
-- =========================================
INSERT INTO program_tags (id, name) VALUES
('tag_fitness', 'Fitness'),
('tag_strength', 'Strength Training'),
('tag_cardio', 'Cardio'),
('tag_dance', 'Dance'),
('tag_ballet', 'Ballet'),
('tag_hiphop', 'Hip Hop');

-- =========================================
-- PROGRAM HAS TAGS (Tag associations)
-- =========================================
INSERT INTO program_has_tags (program_id, tag_id) VALUES
('prog_gym_pt', 'tag_fitness'),
('prog_gym_pt', 'tag_strength'),
('prog_gym_group', 'tag_fitness'),
('prog_gym_group', 'tag_cardio'),
('prog_dance_ballet', 'tag_dance'),
('prog_dance_ballet', 'tag_ballet'),
('prog_dance_hiphop', 'tag_dance'),
('prog_dance_hiphop', 'tag_hiphop');

-- =========================================
-- PROGRAM SESSIONS (Class schedules)
-- =========================================
INSERT INTO program_sessions (id, program_id, time, duration, day, created_at, updated_at) VALUES
('pss_pt_mon', 'prog_gym_pt', '09:00:00'::time, 60, 1, NOW(), NOW()),
('pss_pt_wed', 'prog_gym_pt', '09:00:00'::time, 60, 3, NOW(), NOW()),
('pss_pt_fri', 'prog_gym_pt', '09:00:00'::time, 60, 5, NOW(), NOW()),
('pss_group_mon', 'prog_gym_group', '18:00:00'::time, 45, 1, NOW(), NOW()),
('pss_group_wed', 'prog_gym_group', '18:00:00'::time, 45, 3, NOW(), NOW()),
('pss_group_fri', 'prog_gym_group', '18:00:00'::time, 45, 5, NOW(), NOW()),
('pss_ballet_tue', 'prog_dance_ballet', '16:00:00'::time, 90, 2, NOW(), NOW()),
('pss_ballet_thu', 'prog_dance_ballet', '16:00:00'::time, 90, 4, NOW(), NOW()),
('pss_hiphop_mon', 'prog_dance_hiphop', '19:00:00'::time, 60, 1, NOW(), NOW()),
('pss_hiphop_wed', 'prog_dance_hiphop', '19:00:00'::time, 60, 3, NOW(), NOW());

-- =========================================
-- CONTRACTS (Agreements and waivers)
-- =========================================
INSERT INTO contracts (id, content, title, description, is_draft, editable, location_id, type, require_signature, created_at, updated_at) VALUES
('contract_gym_waiver', 'Standard gym liability waiver content...', 'Gym Liability Waiver', 'Standard waiver for gym activities', false, true, 'acc_test_gym', 'waiver', true, NOW(), NOW()),
('contract_gym_membership', 'Membership agreement terms...', 'Gym Membership Agreement', 'Terms and conditions for gym membership', false, true, 'acc_test_gym', 'contract', true, NOW(), NOW()),
('contract_dance_waiver', 'Dance studio liability waiver...', 'Dance Studio Waiver', 'Waiver for dance class participation', false, true, 'acc_test_dance', 'waiver', true, NOW(), NOW()),
('contract_dance_terms', 'Dance class terms and conditions...', 'Dance Class Terms', 'Terms for dance instruction', false, true, 'acc_test_dance', 'contract', true, NOW(), NOW());

-- =========================================
-- MEMBER CONTRACTS (Signed agreements)
-- =========================================
INSERT INTO member_contracts (id, member_id, contract_id, location_id, signed, variables, signature, created_at, updated_at) VALUES
('mc_john_gym_waiver', 'mbr_test_john', 'contract_gym_waiver', 'acc_test_gym', true, '{"date": "2024-01-15"}', 'John Doe Signature', NOW(), NOW()),
('mc_john_gym_membership', 'mbr_test_john', 'contract_gym_membership', 'acc_test_gym', true, '{"start_date": "2024-01-15", "plan": "premium"}', 'John Doe Signature', NOW(), NOW()),
('mc_jane_gym_waiver', 'mbr_test_jane', 'contract_gym_waiver', 'acc_test_gym', true, '{"date": "2024-01-01"}', 'Jane Smith Signature', NOW(), NOW()),
('mc_bob_dance_waiver', 'mbr_test_bob', 'contract_dance_waiver', 'acc_test_dance', true, '{"date": "2024-01-20"}', 'Bob Johnson Signature', NOW(), NOW());

-- =========================================
-- INVOICES (Billing records)
-- =========================================
INSERT INTO member_invoices (id, currency, member_id, location_id, description, items, paid, tax, total, discount, subtotal, due_date, attempt_count, status, metadata, created_at, updated_at, for_period_start, for_period_end) VALUES
('inv_john_monthly', 'USD', 'mbr_test_john', 'acc_test_gym', 'Monthly membership - January 2024', ARRAY['{"name": "Premium Membership", "amount": 9900, "quantity": 1}']::jsonb[], true, 792, 9900, 0, 9900, NOW() + INTERVAL '30 days', 0, 'paid', '{"period": "monthly"}', NOW(), NOW(), NOW() - INTERVAL '30 days', NOW()),
('inv_jane_monthly', 'USD', 'mbr_test_jane', 'acc_test_gym', 'Monthly membership - January 2024', ARRAY['{"name": "Basic Membership", "amount": 7900, "quantity": 1}']::jsonb[], true, 632, 7900, 0, 7900, NOW() + INTERVAL '30 days', 0, 'paid', '{"period": "monthly"}', NOW(), NOW(), NOW() - INTERVAL '30 days', NOW()),
('inv_bob_dance', 'USD', 'mbr_test_bob', 'acc_test_dance', 'Dance class package', ARRAY['{"name": "10-Class Package", "amount": 25000, "quantity": 1}']::jsonb[], false, 2000, 25000, 1000, 24000, NOW() + INTERVAL '15 days', 0, 'unpaid', '{"classes_remaining": 8}', NOW(), NOW(), NOW(), NOW() + INTERVAL '60 days');

-- =========================================
-- TRANSACTIONS (Payment records)
-- =========================================
INSERT INTO transactions (id, description, type, amount, tax_amount, status, location_id, member_id, payment_method, items, charge_date, currency, metadata, refunded, invoice_id, created_at, updated_at) VALUES
('txn_john_payment', 'Monthly membership payment', 'inbound', 9900, 792, 'paid', 'acc_test_gym', 'mbr_test_john', 'card', ARRAY['{"name": "Premium Membership", "amount": 9900}']::jsonb[], NOW() - INTERVAL '5 days', 'USD', '{"stripe_payment_id": "pi_test_123"}', false, 'inv_john_monthly', NOW(), NOW()),
('txn_jane_payment', 'Monthly membership payment', 'inbound', 7900, 632, 'paid', 'acc_test_gym', 'mbr_test_jane', 'card', ARRAY['{"name": "Basic Membership", "amount": 7900}']::jsonb[], NOW() - INTERVAL '3 days', 'USD', '{"stripe_payment_id": "pi_test_456"}', false, 'inv_jane_monthly', NOW(), NOW()),
('txn_bob_payment', 'Dance class package payment', 'inbound', 25000, 2000, 'paid', 'acc_test_dance', 'mbr_test_bob', 'card', ARRAY['{"name": "10-Class Package", "amount": 25000}']::jsonb[], NOW() - INTERVAL '1 day', 'USD', '{"stripe_payment_id": "pi_test_789"}', false, 'inv_bob_dance', NOW(), NOW());

-- =========================================
-- SESSIONS (User authentication sessions)
-- =========================================
INSERT INTO sessions (id, session_token, user_id, expires, ip_address, browser_id, mac_address, created_at, updated_at) VALUES
('ses_admin_1', 'session_token_admin_123', 'usr_test_admin', NOW() + INTERVAL '24 hours', '127.0.0.1', 'chrome_123', 'mac_123', NOW(), NOW()),
('ses_vendor_1', 'session_token_vendor_456', 'usr_test_vendor', NOW() + INTERVAL '24 hours', '127.0.0.1', 'firefox_456', 'mac_456', NOW(), NOW()),
('ses_member_1', 'session_token_member_789', 'usr_test_member1', NOW() + INTERVAL '24 hours', '127.0.0.1', 'safari_789', 'mac_789', NOW(), NOW());

-- =========================================
-- ACCOUNTS (OAuth provider accounts)
-- =========================================
INSERT INTO account (user_id, type, provider, provider_account_id, refresh_token, access_token, expires_at, token_type, scope, id_token, session_state) VALUES
('usr_test_admin', 'oauth', 'google', 'google_123', 'refresh_123', 'access_123', 1640995200, 'Bearer', 'email profile', 'id_token_123', NULL),
('usr_test_vendor', 'oauth', 'github', 'github_456', 'refresh_456', 'access_456', 1640995200, 'Bearer', 'user:email', 'id_token_456', NULL);

-- =========================================
-- MEMBER TAGS (Tags for categorizing members)
-- =========================================
INSERT INTO member_tags (id, name, location_id, created_at, updated_at) VALUES
('tag_gym_vip', 'VIP Member', 'acc_test_gym', NOW(), NOW()),
('tag_gym_new', 'New Member', 'acc_test_gym', NOW(), NOW()),
('tag_gym_premium', 'Premium Member', 'acc_test_gym', NOW(), NOW()),
('tag_dance_advanced', 'Advanced Dancer', 'acc_test_dance', NOW(), NOW()),
('tag_dance_beginner', 'Beginner Dancer', 'acc_test_dance', NOW(), NOW());

-- =========================================
-- MEMBER HAS TAGS (Tag assignments to members)
-- =========================================
INSERT INTO member_has_tags (member_id, tag_id, created_at) VALUES
('mbr_test_john', 'tag_gym_vip', NOW()),
('mbr_test_john', 'tag_gym_premium', NOW()),
('mbr_test_jane', 'tag_gym_new', NOW()),
('mbr_test_bob', 'tag_dance_advanced', NOW());

-- =========================================
-- MEMBER FIELDS (Custom field definitions)
-- =========================================
INSERT INTO member_fields (id, name, type, location_id, placeholder, help_text, options, created_at, updated_at) VALUES
('field_gym_emergency', 'Emergency Contact', 'text', 'acc_test_gym', 'Enter emergency contact name and phone', 'Who should we contact in case of emergency?', '[]'::jsonb, NOW(), NOW()),
('field_gym_membership_type', 'Membership Type', 'select', 'acc_test_gym', 'Select membership type', 'Choose your preferred membership plan', '[{"value": "basic", "label": "Basic"}, {"value": "premium", "label": "Premium"}, {"value": "vip", "label": "VIP"}]'::jsonb, NOW(), NOW()),
('field_dance_experience', 'Dance Experience', 'select', 'acc_test_dance', 'Select your experience level', 'How many years have you been dancing?', '[{"value": "beginner", "label": "Beginner (0-1 years)"}, {"value": "intermediate", "label": "Intermediate (1-3 years)"}, {"value": "advanced", "label": "Advanced (3+ years)"}]'::jsonb, NOW(), NOW()),
('field_dance_allergies', 'Allergies/Medical Conditions', 'text', 'acc_test_dance', 'List any allergies or medical conditions', 'Important for safety during classes', '[]'::jsonb, NOW(), NOW());

-- =========================================
-- MEMBER CUSTOM FIELDS (Custom field values for members)
-- =========================================
INSERT INTO member_custom_fields (member_id, custom_field_id, value, created_at, updated_at) VALUES
('mbr_test_john', 'field_gym_emergency', 'Jane Doe - 555-0101', NOW(), NOW()),
('mbr_test_john', 'field_gym_membership_type', 'premium', NOW(), NOW()),
('mbr_test_jane', 'field_gym_emergency', 'Bob Smith - 555-0102', NOW(), NOW()),
('mbr_test_jane', 'field_gym_membership_type', 'basic', NOW(), NOW()),
('mbr_test_bob', 'field_dance_experience', 'advanced', NOW(), NOW()),
('mbr_test_bob', 'field_dance_allergies', 'None', NOW(), NOW());

-- =========================================
-- SUCCESS MESSAGE
-- =========================================
DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'MONSTRO TEST DATA SEED COMPLETED';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Created test data for:';
    RAISE NOTICE '- 6 Users (admin, vendor, staff, 3 members)';
    RAISE NOTICE '- 3 Vendors (admin, gym and dance studio)';
    RAISE NOTICE '- 3 Locations (Admin HQ, FitZone Gym, Dance Academy)';
    RAISE NOTICE '- 4 Staff members (trainers and dance instructors)';
    RAISE NOTICE '- 3 Members (John, Jane, Bob)';
    RAISE NOTICE '- 4 Programs (PT, Group Fitness, Ballet, Hip Hop)';
    RAISE NOTICE '- 10 Program sessions (class schedules)';
    RAISE NOTICE '- 4 Contracts (waivers and agreements)';
    RAISE NOTICE '- 3 Invoices (billing records)';
    RAISE NOTICE '- 3 Transactions (payment records)';
    RAISE NOTICE '- 5 Member tags (VIP, New, Premium, Advanced, Beginner)';
    RAISE NOTICE '- 4 Custom fields (Emergency Contact, Membership Type, Experience, Allergies)';
    RAISE NOTICE '- Member tag assignments and custom field values';
    RAISE NOTICE '- Authentication sessions and OAuth accounts';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'You can now test your application locally!';
    RAISE NOTICE '=========================================';
END $$;