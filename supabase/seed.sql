-- =========================================
-- MONSTRO APP TEST DATA SEED
-- =========================================
-- This file contains comprehensive test data for local development
-- Run after starting Supabase locally: supabase db reset

-- =========================================
-- USERS (Base authentication users)
-- =========================================
INSERT INTO users (id, name, email, email_verified_at, image, password, created_at, updated_at) VALUES
('usr_test_admin', 'Admin User', 'admin@test.com', NOW(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin', '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_test_vendor', 'Vendor Owner', 'vendor@test.com', NOW(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=vendor', '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_test_staff', 'Staff Member', 'staff@test.com', NOW(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=staff', '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_test_member1', 'John Doe', 'john@test.com', NOW(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=john', '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_test_member2', 'Jane Smith', 'jane@test.com', NOW(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=jane', '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_test_member3', 'Bob Johnson', 'bob@test.com', NOW(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob', '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW());

-- =========================================
-- VENDORS (Business owners)
-- =========================================
INSERT INTO vendors (id, first_name, last_name, user_id, stripe_customer_id, email, avatar, phone, created_at, updated_at) VALUES
('vdr_test_admin', 'Admin', 'User', 'usr_test_admin', 'cus_test_admin', 'admin@test.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin', '+19999999999', NOW(), NOW()),
('vdr_test_gym', 'Mike', 'Thompson', 'usr_test_vendor', 'cus_test_gym', 'gym@test.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=mike', '+19999999999', NOW(), NOW()),
('vdr_test_dance', 'Sarah', 'Davis', 'usr_test_vendor', 'cus_test_dance', 'dance@test.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah', '+19999999999', NOW(), NOW());

-- =========================================
-- LOCATIONS (Business locations)
-- =========================================
INSERT INTO locations (id, name, address, about, city, state, logo_url, country, postal_code, website, email, phone, timezone, vendor_id, slug, metadata, industry, legal_name, created_at, updated_at) VALUES
('acc_test_admin', 'Admin Headquarters', '1 Admin Way', 'Central administration and management hub', 'San Francisco', 'CA', 'https://api.dicebear.com/7.x/initials/svg?seed=AH', 'USA', '94105', 'https://admin.monstro.com', 'admin@monstro.com', '+19999999999', 'America/Los_Angeles', 'vdr_test_admin', 'admin-headquarters', '{"features": ["management", "administration", "support"]}', 'Management', 'Monstro Admin LLC', NOW(), NOW()),
('acc_test_gym', 'FitZone Gym', '123 Main St', 'Premier fitness center with state-of-the-art equipment', 'New York', 'NY', 'https://api.dicebear.com/7.x/initials/svg?seed=FZ', 'USA', '10001', 'https://fitzone.com', 'info@fitzone.com', '+19999999999', 'America/New_York', 'vdr_test_gym', 'fitzone-gym', '{"features": ["pool", "sauna", "personal_training"]}', 'Fitness', 'FitZone LLC', NOW(), NOW()),
('acc_test_dance', 'Dance Academy', '456 Broadway', 'Professional dance instruction for all ages', 'Los Angeles', 'CA', 'https://api.dicebear.com/7.x/initials/svg?seed=DA', 'USA', '90210', 'https://danceacademy.com', 'info@danceacademy.com', '+19999999999', 'America/Los_Angeles', 'vdr_test_dance', 'dance-academy', '{"features": ["ballet", "hip_hop", "jazz"]}', 'Dance', 'Dance Academy Inc', NOW(), NOW());

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
('stf_test_trainer1', 'Alex', 'Rodriguez', 'alex@fitzone.com', '+19999999999', 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex', 'usr_test_staff', NOW(), NOW()),
('stf_test_trainer2', 'Emma', 'Wilson', 'emma@fitzone.com', '+19999999999', 'https://api.dicebear.com/7.x/avataaars/svg?seed=emma', 'usr_test_staff', NOW(), NOW()),
('stf_test_dance1', 'Carlos', 'Martinez', 'carlos@danceacademy.com', '+19999999999', 'https://api.dicebear.com/7.x/avataaars/svg?seed=carlos', 'usr_test_staff', NOW(), NOW()),
('stf_test_dance2', 'Lisa', 'Anderson', 'lisa@danceacademy.com', '+19999999999', 'https://api.dicebear.com/7.x/avataaars/svg?seed=lisa', 'usr_test_staff', NOW(), NOW());

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
('mbr_test_john', 'usr_test_member1', 'john@test.com', '+19999999999', 'JOHN2024', 'https://api.dicebear.com/7.x/avataaars/svg?seed=john', 'cus_test_john', NOW(), NOW(), 'John', 'Doe', 'male', '1990-05-15'::timestamp),
('mbr_test_jane', 'usr_test_member2', 'jane@test.com', '+19999999999', 'JANE2024', 'https://api.dicebear.com/7.x/avataaars/svg?seed=jane', 'cus_test_jane', NOW(), NOW(), 'Jane', 'Smith', 'female', '1988-03-22'::timestamp),
('mbr_test_bob', 'usr_test_member3', 'bob@test.com', '+19999999999', 'BOB2024', 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob', 'cus_test_bob', NOW(), NOW(), 'Bob', 'Johnson', 'male', '1992-11-08'::timestamp);

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
-- SUPPORT BOTS (AI support chatbots)
-- =========================================
INSERT INTO support_bots (id, location_id, name, prompt, temperature, initial_message, model, status, available_tools, created_at, updated_at) VALUES
('sbot_admin', 'acc_test_admin', 'Admin Support Bot', 'You are a helpful customer support assistant for Monstro Admin. You have access to member information tools to help with administrative tasks, billing queries, and general support. You can create support tickets and escalate to human agents when needed.', 20, 'Hi! I''m the Admin Support Bot. I can help with administrative questions, account management, and technical support. What can I assist you with today?', 'gpt', 'Active', ARRAY[
  '{"name": "get_member_status", "description": "Get member subscription and package status information", "category": "member_info", "parameters": {"type": "object", "properties": {"memberId": {"type": "string", "description": "The member ID to look up"}}, "required": ["memberId"]}}',
  '{"name": "get_member_billing", "description": "Get member billing and payment information", "category": "member_info", "parameters": {"type": "object", "properties": {"memberId": {"type": "string", "description": "The member ID to look up"}}, "required": ["memberId"]}}',
  '{"name": "create_support_ticket", "description": "Create a support ticket for tracking issues", "category": "support", "parameters": {"type": "object", "properties": {"title": {"type": "string", "description": "Brief title"}, "description": {"type": "string", "description": "Detailed description"}, "priority": {"type": "number", "minimum": 1, "maximum": 3, "description": "Priority level"}}, "required": ["title", "description"]}}',
  '{"name": "escalate_to_human", "description": "Escalate to human agent", "category": "support", "parameters": {"type": "object", "properties": {"reason": {"type": "string", "description": "Reason for escalation"}, "urgency": {"type": "string", "enum": ["low", "medium", "high"], "description": "Urgency level"}}, "required": ["reason", "urgency"]}}'
]::jsonb[], NOW(), NOW()),
('sbot_gym', 'acc_test_gym', 'FitZone Support Bot', 'You are a helpful customer support assistant for FitZone Gym. You can help members with their membership status, billing questions, class bookings, and gym-related inquiries. You can create support tickets and escalate complex issues to our staff.', 30, 'Hi! I''m the FitZone Support Bot. I can help with your membership, class schedules, billing questions, and facility information. How can I assist you today?', 'gpt', 'Active', ARRAY[
  '{"name": "get_member_status", "description": "Get member subscription and package status information", "category": "member_info", "parameters": {"type": "object", "properties": {"memberId": {"type": "string", "description": "The member ID to look up"}}, "required": ["memberId"]}}',
  '{"name": "get_member_billing", "description": "Get member billing and payment information", "category": "member_info", "parameters": {"type": "object", "properties": {"memberId": {"type": "string", "description": "The member ID to look up"}}, "required": ["memberId"]}}',
  '{"name": "get_member_bookable_sessions", "description": "Get available classes and sessions to book", "category": "member_info", "parameters": {"type": "object", "properties": {"memberId": {"type": "string", "description": "The member ID to look up"}}, "required": ["memberId"]}}',
  '{"name": "search_knowledge_base", "description": "Search gym policies and information", "category": "knowledge", "parameters": {"type": "object", "properties": {"query": {"type": "string", "description": "Search query"}}, "required": ["query"]}}',
  '{"name": "create_support_ticket", "description": "Create a support ticket", "category": "support", "parameters": {"type": "object", "properties": {"title": {"type": "string"}, "description": {"type": "string"}, "priority": {"type": "number", "minimum": 1, "maximum": 3}}, "required": ["title", "description"]}}',
  '{"name": "escalate_to_human", "description": "Escalate to human trainer", "category": "support", "parameters": {"type": "object", "properties": {"reason": {"type": "string"}, "urgency": {"type": "string", "enum": ["low", "medium", "high"]}}, "required": ["reason", "urgency"]}}'
]::jsonb[], NOW(), NOW()),
('sbot_dance', 'acc_test_dance', 'Dance Academy Support Bot', 'You are a helpful customer support assistant for Dance Academy. You help students and parents with class information, billing, scheduling, and dance-related questions. You can escalate complex issues to our instructors.', 25, 'Hello! I''m the Dance Academy Support Bot. I can help with class schedules, billing, registration, and dance program information. What would you like to know?', 'gpt', 'Active', ARRAY[
  '{"name": "get_member_status", "description": "Get student enrollment and package status", "category": "member_info", "parameters": {"type": "object", "properties": {"memberId": {"type": "string", "description": "The student ID to look up"}}, "required": ["memberId"]}}',
  '{"name": "get_member_billing", "description": "Get billing and payment information", "category": "member_info", "parameters": {"type": "object", "properties": {"memberId": {"type": "string", "description": "The student ID to look up"}}, "required": ["memberId"]}}',
  '{"name": "get_member_bookable_sessions", "description": "Get available dance classes to book", "category": "member_info", "parameters": {"type": "object", "properties": {"memberId": {"type": "string", "description": "The student ID to look up"}}, "required": ["memberId"]}}',
  '{"name": "search_knowledge_base", "description": "Search dance academy policies and info", "category": "knowledge", "parameters": {"type": "object", "properties": {"query": {"type": "string", "description": "Search query"}}, "required": ["query"]}}',
  '{"name": "create_support_ticket", "description": "Create a support ticket", "category": "support", "parameters": {"type": "object", "properties": {"title": {"type": "string"}, "description": {"type": "string"}, "priority": {"type": "number", "minimum": 1, "maximum": 3}}, "required": ["title", "description"]}}',
  '{"name": "escalate_to_human", "description": "Escalate to dance instructor", "category": "support", "parameters": {"type": "object", "properties": {"reason": {"type": "string"}, "urgency": {"type": "string", "enum": ["low", "medium", "high"]}}, "required": ["reason", "urgency"]}}'
]::jsonb[], NOW(), NOW());

-- =========================================
-- SUPPORT TRIGGERS (Automated escalation triggers)
-- =========================================
INSERT INTO support_triggers (id, support_bot_id, name, trigger_type, trigger_phrases, tool_call, examples, requirements, is_active, created_at, updated_at) VALUES
-- Admin triggers
('strig_admin_escalate', 'sbot_admin', 'Human Agent Request', 'keyword', ARRAY['human agent', 'speak to someone', 'real person', 'staff member', 'escalate', 'manager'], '{"name": "escalate_to_human", "parameters": {"reason": "Customer requested human assistance", "urgency": "medium"}}'::jsonb, ARRAY['I need to speak to a human agent', 'Can I talk to a real person?', 'I want to speak to your manager'], ARRAY['Clear request for human assistance'], true, NOW(), NOW()),
('strig_admin_billing', 'sbot_admin', 'Billing Issues', 'keyword', ARRAY['billing problem', 'payment failed', 'charge error', 'refund', 'billing dispute'], '{"name": "create_support_ticket", "parameters": {"title": "Billing Issue", "description": "Customer reported billing-related problem", "priority": 2}}'::jsonb, ARRAY['I have a billing problem', 'My payment failed', 'I need a refund'], ARRAY['Billing-related concern identified'], true, NOW(), NOW()),

-- Gym triggers  
('strig_gym_injury', 'sbot_gym', 'Injury Report', 'keyword', ARRAY['injured', 'hurt', 'pain', 'accident', 'medical', 'emergency'], '{"name": "escalate_to_human", "parameters": {"reason": "Potential injury or medical concern reported", "urgency": "high"}}'::jsonb, ARRAY['I got injured during my workout', 'I''m experiencing pain', 'There was an accident'], ARRAY['Immediate staff attention required'], true, NOW(), NOW()),
('strig_gym_equipment', 'sbot_gym', 'Equipment Issues', 'keyword', ARRAY['broken equipment', 'machine not working', 'equipment problem', 'out of order'], '{"name": "create_support_ticket", "parameters": {"title": "Equipment Issue", "description": "Equipment problem reported by member", "priority": 2}}'::jsonb, ARRAY['The treadmill is broken', 'This machine isn''t working', 'Equipment is out of order'], ARRAY['Equipment issue requires maintenance'], true, NOW(), NOW()),
('strig_gym_membership', 'sbot_gym', 'Membership Cancellation', 'keyword', ARRAY['cancel membership', 'quit gym', 'stop membership', 'discontinue'], '{"name": "escalate_to_human", "parameters": {"reason": "Member wants to cancel membership", "urgency": "medium"}}'::jsonb, ARRAY['I want to cancel my membership', 'How do I quit the gym?'], ARRAY['Retention opportunity - human intervention needed'], true, NOW(), NOW()),

-- Dance academy triggers
('strig_dance_recital', 'sbot_dance', 'Recital Questions', 'keyword', ARRAY['recital', 'performance', 'costume', 'rehearsal', 'show'], '{"name": "escalate_to_human", "parameters": {"reason": "Recital-related inquiry requiring instructor input", "urgency": "low"}}'::jsonb, ARRAY['When is the recital?', 'What costume does my child need?', 'Rehearsal schedule questions'], ARRAY['Instructor knowledge required for detailed recital info'], true, NOW(), NOW()),
('strig_dance_skill', 'sbot_dance', 'Skill Assessment', 'keyword', ARRAY['skill level', 'class placement', 'advancement', 'level up', 'evaluation'], '{"name": "escalate_to_human", "parameters": {"reason": "Student skill assessment and class placement inquiry", "urgency": "low"}}'::jsonb, ARRAY['What class level should my child be in?', 'Can my daughter advance to the next level?'], ARRAY['Instructor evaluation needed'], true, NOW(), NOW());

-- =========================================
-- SUPPORT CONVERSATIONS (Sample chat sessions)
-- =========================================
INSERT INTO support_conversations (id, support_bot_id, member_id, vendor_id, is_vendor_active, taken_over_at, metadata, created_at, updated_at) VALUES
-- Active conversation with vendor takeover
('sconv_john_gym', 'sbot_gym', 'mbr_test_john', 'usr_test_vendor', true, NOW() - INTERVAL '15 minutes', ('{"takeoverReason": "Billing dispute requiring personal attention", "takeoverUrgency": "medium", "takeoverAt": "' || (NOW() - INTERVAL '15 minutes')::text || '"}')::jsonb, NOW() - INTERVAL '1 hour', NOW()),
-- Bot-only conversation
('sconv_jane_gym', 'sbot_gym', 'mbr_test_jane', NULL, false, NULL, '{"resolutionType": "automated", "satisfactionRating": 5}'::jsonb, NOW() - INTERVAL '2 hours', NOW()),
-- Dance academy conversation with instructor takeover
('sconv_bob_dance', 'sbot_dance', 'mbr_test_bob', 'usr_test_staff', true, NOW() - INTERVAL '30 minutes', '{"takeoverReason": "Class level assessment needed", "takeoverUrgency": "low", "instructorSpecialty": "ballet"}'::jsonb, NOW() - INTERVAL '45 minutes', NOW()),
-- Recently resolved conversation that was handed back to bot
('sconv_admin_resolved', 'sbot_admin', 'mbr_test_john', NULL, false, NULL, ('{"handedBackAt": "' || (NOW() - INTERVAL '10 minutes')::text || '", "handedBackBy": "usr_test_admin", "originalTakeoverReason": "Complex account setup"}')::jsonb, NOW() - INTERVAL '3 hours', NOW());

-- =========================================
-- SUPPORT MESSAGES (Conversation history)
-- =========================================
INSERT INTO support_messages (id, conversation_id, content, role, channel, metadata, created_at) VALUES
-- John's gym conversation with takeover scenario
('smsg_john_1', 'sconv_john_gym', 'Hi, I have a problem with my billing. I was charged twice this month.', 'user', 'WebChat', '{}'::jsonb, NOW() - INTERVAL '1 hour'),
('smsg_john_2', 'sconv_john_gym', 'I''m sorry to hear about the billing issue. Let me check your account details and help resolve this for you.', 'ai', 'WebChat', '{}'::jsonb, NOW() - INTERVAL '59 minutes'),
('smsg_john_3', 'sconv_john_gym', 'I''ve reviewed your account and I can see there may have been a processing error. This requires careful review of your payment history.', 'ai', 'WebChat', '{}'::jsonb, NOW() - INTERVAL '58 minutes'),
('smsg_john_4', 'sconv_john_gym', 'I need to speak with someone about this. This is really frustrating.', 'user', 'WebChat', '{}'::jsonb, NOW() - INTERVAL '20 minutes'),
('smsg_john_5', 'sconv_john_gym', 'A support agent has joined the conversation to help with: Billing dispute requiring personal attention', 'system', 'System', '{"takeoverReason": "Billing dispute requiring personal attention", "takeoverUrgency": "medium", "vendorId": "usr_test_vendor"}'::jsonb, NOW() - INTERVAL '15 minutes'),
('smsg_john_6', 'sconv_john_gym', 'Hi John! I''m Mike from FitZone. I can see you''ve been charged twice this month. Let me look into this right away and get this sorted out for you.', 'vendor', 'WebChat', '{"vendorId": "usr_test_vendor", "agentName": "Mike Thompson"}'::jsonb, NOW() - INTERVAL '14 minutes'),
('smsg_john_7', 'sconv_john_gym', 'Thank you! That would be great. I really appreciate the personal attention.', 'user', 'WebChat', '{}'::jsonb, NOW() - INTERVAL '13 minutes'),

-- Jane's automated resolution
('smsg_jane_1', 'sconv_jane_gym', 'What are your gym hours this week?', 'user', 'WebChat', '{}'::jsonb, NOW() - INTERVAL '2 hours'),
('smsg_jane_2', 'sconv_jane_gym', 'Our gym hours this week are Monday-Friday: 5:00 AM - 11:00 PM, Saturday-Sunday: 6:00 AM - 10:00 PM. Is there anything specific you''d like to know about our facilities or services?', 'ai', 'WebChat', '{}'::jsonb, NOW() - INTERVAL '2 hours' + INTERVAL '1 minute'),
('smsg_jane_3', 'sconv_jane_gym', 'Perfect, thank you! That''s all I needed.', 'user', 'WebChat', '{}'::jsonb, NOW() - INTERVAL '2 hours' + INTERVAL '2 minutes'),
('smsg_jane_4', 'sconv_jane_gym', 'You''re welcome! Feel free to reach out if you have any other questions. Have a great workout!', 'ai', 'WebChat', '{}'::jsonb, NOW() - INTERVAL '2 hours' + INTERVAL '3 minutes'),

-- Bob's dance academy conversation with instructor takeover
('smsg_bob_1', 'sconv_bob_dance', 'I think my skill level has improved. Can I move up to a more advanced ballet class?', 'user', 'WebChat', '{}'::jsonb, NOW() - INTERVAL '45 minutes'),
('smsg_bob_2', 'sconv_bob_dance', 'That''s wonderful to hear about your progress! Class advancement depends on several factors including technique, strength, and experience. Let me connect you with one of our instructors who can properly assess your readiness.', 'ai', 'WebChat', '{}'::jsonb, NOW() - INTERVAL '44 minutes'),
('smsg_bob_3', 'sconv_bob_dance', 'A support agent has joined the conversation to help with: Class level assessment needed', 'system', 'System', '{"takeoverReason": "Class level assessment needed", "takeoverUrgency": "low", "vendorId": "usr_test_staff"}'::jsonb, NOW() - INTERVAL '30 minutes'),
('smsg_bob_4', 'sconv_bob_dance', 'Hi Bob! I''m Carlos, one of the ballet instructors. I''d love to help assess your readiness for advancement. Can you tell me how long you''ve been in your current class and what techniques you''ve been working on?', 'vendor', 'WebChat', '{"vendorId": "usr_test_staff", "agentName": "Carlos Martinez", "specialty": "ballet"}'::jsonb, NOW() - INTERVAL '29 minutes'),
('smsg_bob_5', 'sconv_bob_dance', 'I''ve been in Ballet Fundamentals for about 6 months. I''ve been working on my positions, basic jumps, and we just started simple adagio combinations.', 'user', 'WebChat', '{}'::jsonb, NOW() - INTERVAL '25 minutes'),

-- Admin conversation that was handed back (John contacting admin support)
('smsg_admin_1', 'sconv_admin_resolved', 'Hi, I''m a business owner looking to understand your enterprise features. I might need multiple locations under one account.', 'user', 'WebChat', '{}'::jsonb, NOW() - INTERVAL '3 hours'),
('smsg_admin_2', 'sconv_admin_resolved', 'I''d be happy to help you understand our enterprise features and multi-location setup. This is a complex topic that would benefit from direct assistance. Let me connect you with our admin team.', 'ai', 'WebChat', '{}'::jsonb, NOW() - INTERVAL '3 hours' + INTERVAL '1 minute'),
('smsg_admin_3', 'sconv_admin_resolved', 'A support agent has joined the conversation to help with: Complex account setup', 'system', 'System', '{"takeoverReason": "Complex account setup", "takeoverUrgency": "medium", "vendorId": "usr_test_admin"}'::jsonb, NOW() - INTERVAL '2 hours' + INTERVAL '30 minutes'),
('smsg_admin_4', 'sconv_admin_resolved', 'Hi John! I''m here to help with your enterprise inquiry. I''ve reviewed your needs and can set up a multi-location account structure for you. Would you like me to prepare a demo?', 'vendor', 'WebChat', '{"vendorId": "usr_test_admin", "agentName": "Admin User"}'::jsonb, NOW() - INTERVAL '1 hour'),
('smsg_admin_5', 'sconv_admin_resolved', 'That would be fantastic! Thank you for the personalized assistance.', 'user', 'WebChat', '{}'::jsonb, NOW() - INTERVAL '20 minutes'),
('smsg_admin_6', 'sconv_admin_resolved', 'The conversation has been handed back to the support bot.', 'system', 'System', ('{"handedBackBy": "usr_test_admin", "handedBackAt": "' || (NOW() - INTERVAL '10 minutes')::text || '"}')::jsonb, NOW() - INTERVAL '10 minutes');

-- =========================================
-- SUPPORT TICKETS (Created from escalated conversations)
-- =========================================
INSERT INTO support_tickets (id, conversation_id, title, description, status, priority, assigned_to, metadata, created_at, updated_at) VALUES
('sticket_john_billing', 'sconv_john_gym', 'Duplicate Billing Charge', 'Member was charged twice for monthly membership. Requires refund processing and account review.', 'in_progress', 2, 'usr_test_vendor', '{"createdBy": "sbot_gym", "memberImpact": "billing", "estimatedResolution": "24 hours"}'::jsonb, NOW() - INTERVAL '15 minutes', NOW()),
('sticket_bob_assessment', 'sconv_bob_dance', 'Ballet Class Level Assessment', 'Student requesting advancement to intermediate ballet class. Instructor evaluation in progress.', 'open', 3, 'usr_test_staff', '{"createdBy": "sbot_dance", "assessmentType": "skill_level", "currentClass": "Ballet Fundamentals"}'::jsonb, NOW() - INTERVAL '30 minutes', NOW()),
('sticket_admin_setup', 'sconv_admin_resolved', 'Enterprise Account Inquiry', 'Business owner inquiry about enterprise features and multi-location account setup. Successfully resolved with demo preparation.', 'resolved', 2, 'usr_test_admin', '{"createdBy": "sbot_admin", "resolutionTime": "2.5 hours", "complexity": "high", "leadType": "enterprise"}'::jsonb, NOW() - INTERVAL '2 hours' + INTERVAL '30 minutes', NOW());

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
    RAISE NOTICE '';
    RAISE NOTICE 'SUPPORT BOT TEST DATA:';
    RAISE NOTICE '- 3 Support bots (Admin, FitZone Gym, Dance Academy)';
    RAISE NOTICE '- 7 Support triggers (escalation, billing, injury, equipment, etc.)';
    RAISE NOTICE '- 4 Support conversations (with takeover/handoff scenarios)';
    RAISE NOTICE '- 16 Support messages (realistic conversation flows)';
    RAISE NOTICE '- 3 Support tickets (billing, assessment, admin setup)';
    RAISE NOTICE '';
    RAISE NOTICE 'TAKEOVER & HANDOFF SCENARIOS:';
    RAISE NOTICE '- Active vendor takeover (John gym billing issue)';
    RAISE NOTICE '- Instructor takeover (Bob dance class assessment)';
    RAISE NOTICE '- Completed handoff cycle (admin multi-location setup)';
    RAISE NOTICE '- Automated resolution (Jane gym hours inquiry)';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'You can now test your application locally!';
    RAISE NOTICE '=========================================';
END $$;