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
('usr_test_member3', 'Bob Johnson', 'bob@test.com', NOW(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob', '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_test_member4', 'Alice Williams', 'alice@test.com', NOW(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice', '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_test_member5', 'Charlie Brown', 'charlie@test.com', NOW(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=charlie', '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_test_member6', 'Diana Prince', 'diana@test.com', NOW(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=diana', '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_test_member7', 'Edward Norton', 'edward@test.com', NOW(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=edward', '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_test_member8', 'Fiona Gallagher', 'fiona@test.com', NOW(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=fiona', '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_test_member9', 'George Lucas', 'george@test.com', NOW(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=george', '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_test_member10', 'Helen Troy', 'helen@test.com', NOW(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=helen', '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_test_member11', 'Ian Malcolm', 'ian@test.com', NOW(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=ian', '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_test_member12', 'Jessica Jones', 'jessica@test.com', NOW(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=jessica', '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_test_member13', 'Kevin Hart', 'kevin@test.com', NOW(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=kevin', '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_test_member14', 'Laura Croft', 'laura@test.com', NOW(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=laura', '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_test_member15', 'Michael Scott', 'michael@test.com', NOW(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=michael', '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_test_member16', 'Nancy Drew', 'nancy@test.com', NOW(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=nancy', '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_test_member17', 'Oliver Queen', 'oliver@test.com', NOW(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=oliver', '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_test_member18', 'Pam Beesly', 'pam@test.com', NOW(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=pam', '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_test_member19', 'Quincy Jones', 'quincy@test.com', NOW(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=quincy', '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_test_member20', 'Rachel Green', 'rachel@test.com', NOW(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=rachel', '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_test_member21', 'Steve Rogers', 'steve@test.com', NOW(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=steve', '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_test_member22', 'Tina Fey', 'tina@test.com', NOW(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=tina', '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_test_member23', 'Uma Thurman', 'uma@test.com', NOW(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=uma', '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_test_member24', 'Victor Stone', 'victor@test.com', NOW(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=victor', '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_test_member25', 'Wanda Maximoff', 'wanda@test.com', NOW(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=wanda', '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_test_member26', 'Xavier Charles', 'xavier@test.com', NOW(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=xavier', '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_test_member27', 'Yoda Master', 'yoda@test.com', NOW(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=yoda', '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_test_member28', 'Zoe Saldana', 'zoe@test.com', NOW(), 'https://api.dicebear.com/7.x/avataaars/svg?seed=zoe', '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW());

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
('acc_test_gym', 'FitZone Gym', '123 Main St', 'Premier fitness center with state-of-the-art equipment', 'New York', 'NY', 'https://api.dicebear.com/7.x/initials/svg?seed=FZ', 'USA', '10001', 'https://fitzone.com', 'info@fitzone.com', '+19999999999', 'America/New_York', 'vdr_test_admin', 'fitzone-gym', '{"features": ["pool", "sauna", "personal_training"]}', 'Fitness', 'FitZone LLC', NOW(), NOW()),
('acc_test_dance', 'Dance Academy', '456 Broadway', 'Professional dance instruction for all ages', 'Los Angeles', 'CA', 'https://api.dicebear.com/7.x/initials/svg?seed=DA', 'USA', '90210', 'https://danceacademy.com', 'info@danceacademy.com', '+19999999999', 'America/Los_Angeles', 'vdr_test_admin', 'dance-academy', '{"features": ["ballet", "hip_hop", "jazz"]}', 'Dance', 'Dance Academy Inc', NOW(), NOW());

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
('mbr_test_bob', 'usr_test_member3', 'bob@test.com', '+19999999999', 'BOB2024', 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob', 'cus_test_bob', NOW(), NOW(), 'Bob', 'Johnson', 'male', '1992-11-08'::timestamp),
('mbr_test_alice', 'usr_test_member4', 'alice@test.com', '+19999999998', 'ALICE2024', 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice', 'cus_test_alice', NOW(), NOW(), 'Alice', 'Williams', 'female', '1985-03-15'::timestamp),
('mbr_test_charlie', 'usr_test_member5', 'charlie@test.com', '+19999999997', 'CHARLIE2024', 'https://api.dicebear.com/7.x/avataaars/svg?seed=charlie', 'cus_test_charlie', NOW(), NOW(), 'Charlie', 'Brown', 'male', '1990-07-22'::timestamp),
('mbr_test_diana', 'usr_test_member6', 'diana@test.com', '+19999999996', 'DIANA2024', 'https://api.dicebear.com/7.x/avataaars/svg?seed=diana', 'cus_test_diana', NOW(), NOW(), 'Diana', 'Prince', 'female', '1988-09-30'::timestamp),
('mbr_test_edward', 'usr_test_member7', 'edward@test.com', '+19999999995', 'EDWARD2024', 'https://api.dicebear.com/7.x/avataaars/svg?seed=edward', 'cus_test_edward', NOW(), NOW(), 'Edward', 'Norton', 'male', '1987-12-05'::timestamp),
('mbr_test_fiona', 'usr_test_member8', 'fiona@test.com', '+19999999994', 'FIONA2024', 'https://api.dicebear.com/7.x/avataaars/svg?seed=fiona', 'cus_test_fiona', NOW(), NOW(), 'Fiona', 'Gallagher', 'female', '1991-01-18'::timestamp),
('mbr_test_george', 'usr_test_member9', 'george@test.com', '+19999999993', 'GEORGE2024', 'https://api.dicebear.com/7.x/avataaars/svg?seed=george', 'cus_test_george', NOW(), NOW(), 'George', 'Lucas', 'male', '1984-05-14'::timestamp),
('mbr_test_helen', 'usr_test_member10', 'helen@test.com', '+19999999992', 'HELEN2024', 'https://api.dicebear.com/7.x/avataaars/svg?seed=helen', 'cus_test_helen', NOW(), NOW(), 'Helen', 'Troy', 'female', '1989-08-11'::timestamp),
('mbr_test_ian', 'usr_test_member11', 'ian@test.com', '+19999999991', 'IAN2024', 'https://api.dicebear.com/7.x/avataaars/svg?seed=ian', 'cus_test_ian', NOW(), NOW(), 'Ian', 'Malcolm', 'male', '1986-04-27'::timestamp),
('mbr_test_jessica', 'usr_test_member12', 'jessica@test.com', '+19999999990', 'JESSICA2024', 'https://api.dicebear.com/7.x/avataaars/svg?seed=jessica', 'cus_test_jessica', NOW(), NOW(), 'Jessica', 'Jones', 'female', '1993-06-03'::timestamp),
('mbr_test_kevin', 'usr_test_member13', 'kevin@test.com', '+19999999989', 'KEVIN2024', 'https://api.dicebear.com/7.x/avataaars/svg?seed=kevin', 'cus_test_kevin', NOW(), NOW(), 'Kevin', 'Hart', 'male', '1982-11-20'::timestamp),
('mbr_test_laura', 'usr_test_member14', 'laura@test.com', '+19999999988', 'LAURA2024', 'https://api.dicebear.com/7.x/avataaars/svg?seed=laura', 'cus_test_laura', NOW(), NOW(), 'Laura', 'Croft', 'female', '1994-02-14'::timestamp),
('mbr_test_michael', 'usr_test_member15', 'michael@test.com', '+19999999987', 'MICHAEL2024', 'https://api.dicebear.com/7.x/avataaars/svg?seed=michael', 'cus_test_michael', NOW(), NOW(), 'Michael', 'Scott', 'male', '1975-03-15'::timestamp),
('mbr_test_nancy', 'usr_test_member16', 'nancy@test.com', '+19999999986', 'NANCY2024', 'https://api.dicebear.com/7.x/avataaars/svg?seed=nancy', 'cus_test_nancy', NOW(), NOW(), 'Nancy', 'Drew', 'female', '1995-04-16'::timestamp),
('mbr_test_oliver', 'usr_test_member17', 'oliver@test.com', '+19999999985', 'OLIVER2024', 'https://api.dicebear.com/7.x/avataaars/svg?seed=oliver', 'cus_test_oliver', NOW(), NOW(), 'Oliver', 'Queen', 'male', '1983-05-16'::timestamp),
('mbr_test_pam', 'usr_test_member18', 'pam@test.com', '+19999999984', 'PAM2024', 'https://api.dicebear.com/7.x/avataaars/svg?seed=pam', 'cus_test_pam', NOW(), NOW(), 'Pam', 'Beesly', 'female', '1981-06-17'::timestamp),
('mbr_test_quincy', 'usr_test_member19', 'quincy@test.com', '+19999999983', 'QUINCY2024', 'https://api.dicebear.com/7.x/avataaars/svg?seed=quincy', 'cus_test_quincy', NOW(), NOW(), 'Quincy', 'Jones', 'male', '1978-07-18'::timestamp),
('mbr_test_rachel', 'usr_test_member20', 'rachel@test.com', '+19999999982', 'RACHEL2024', 'https://api.dicebear.com/7.x/avataaars/svg?seed=rachel', 'cus_test_rachel', NOW(), NOW(), 'Rachel', 'Green', 'female', '1987-08-19'::timestamp),
('mbr_test_steve', 'usr_test_member21', 'steve@test.com', '+19999999981', 'STEVE2024', 'https://api.dicebear.com/7.x/avataaars/svg?seed=steve', 'cus_test_steve', NOW(), NOW(), 'Steve', 'Rogers', 'male', '1976-09-20'::timestamp),
('mbr_test_tina', 'usr_test_member22', 'tina@test.com', '+19999999980', 'TINA2024', 'https://api.dicebear.com/7.x/avataaars/svg?seed=tina', 'cus_test_tina', NOW(), NOW(), 'Tina', 'Fey', 'female', '1979-10-21'::timestamp),
('mbr_test_uma', 'usr_test_member23', 'uma@test.com', '+19999999979', 'UMA2024', 'https://api.dicebear.com/7.x/avataaars/svg?seed=uma', 'cus_test_uma', NOW(), NOW(), 'Uma', 'Thurman', 'female', '1978-11-22'::timestamp),
('mbr_test_victor', 'usr_test_member24', 'victor@test.com', '+19999999978', 'VICTOR2024', 'https://api.dicebear.com/7.x/avataaars/svg?seed=victor', 'cus_test_victor', NOW(), NOW(), 'Victor', 'Stone', 'male', '1996-12-23'::timestamp),
('mbr_test_wanda', 'usr_test_member25', 'wanda@test.com', '+19999999977', 'WANDA2024', 'https://api.dicebear.com/7.x/avataaars/svg?seed=wanda', 'cus_test_wanda', NOW(), NOW(), 'Wanda', 'Maximoff', 'female', '1997-01-24'::timestamp),
('mbr_test_xavier', 'usr_test_member26', 'xavier@test.com', '+19999999976', 'XAVIER2024', 'https://api.dicebear.com/7.x/avataaars/svg?seed=xavier', 'cus_test_xavier', NOW(), NOW(), 'Xavier', 'Charles', 'male', '1974-02-25'::timestamp),
('mbr_test_yoda', 'usr_test_member27', 'yoda@test.com', '+19999999975', 'YODA2024', 'https://api.dicebear.com/7.x/avataaars/svg?seed=yoda', 'cus_test_yoda', NOW(), NOW(), 'Yoda', 'Master', 'male', '1973-03-26'::timestamp),
('mbr_test_zoe', 'usr_test_member28', 'zoe@test.com', '+19999999974', 'ZOE2024', 'https://api.dicebear.com/7.x/avataaars/svg?seed=zoe', 'cus_test_zoe', NOW(), NOW(), 'Zoe', 'Saldana', 'female', '1998-04-27'::timestamp);

-- =========================================
-- MEMBER LOCATIONS (Member enrollments)
-- =========================================
INSERT INTO member_locations (location_id, member_id, points, status, invite_date, invite_accepted_date) VALUES
('acc_test_gym', 'mbr_test_john', 150, 'active', NOW() - INTERVAL '30 days', NOW() - INTERVAL '29 days'),
('acc_test_gym', 'mbr_test_jane', 200, 'active', NOW() - INTERVAL '45 days', NOW() - INTERVAL '44 days'),
('acc_test_dance', 'mbr_test_bob', 75, 'active', NOW() - INTERVAL '20 days', NOW() - INTERVAL '19 days'),
-- Admin location members (for testing admin support bot)
('acc_test_admin', 'mbr_test_john', 100, 'active', NOW() - INTERVAL '60 days', NOW() - INTERVAL '59 days'),
('acc_test_admin', 'mbr_test_jane', 125, 'active', NOW() - INTERVAL '50 days', NOW() - INTERVAL '49 days'),
('acc_test_admin', 'mbr_test_bob', 80, 'active', NOW() - INTERVAL '40 days', NOW() - INTERVAL '39 days'),
-- Additional members for gym
('acc_test_gym', 'mbr_test_alice', 180, 'active', NOW() - INTERVAL '25 days', NOW() - INTERVAL '24 days'),
('acc_test_gym', 'mbr_test_charlie', 95, 'active', NOW() - INTERVAL '35 days', NOW() - INTERVAL '34 days'),
('acc_test_gym', 'mbr_test_diana', 220, 'active', NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days'),
('acc_test_gym', 'mbr_test_edward', 160, 'active', NOW() - INTERVAL '45 days', NOW() - INTERVAL '44 days'),
('acc_test_gym', 'mbr_test_fiona', 75, 'active', NOW() - INTERVAL '55 days', NOW() - INTERVAL '54 days'),
('acc_test_gym', 'mbr_test_george', 190, 'active', NOW() - INTERVAL '20 days', NOW() - INTERVAL '19 days'),
('acc_test_gym', 'mbr_test_helen', 135, 'active', NOW() - INTERVAL '30 days', NOW() - INTERVAL '29 days'),
('acc_test_gym', 'mbr_test_ian', 110, 'active', NOW() - INTERVAL '40 days', NOW() - INTERVAL '39 days'),
('acc_test_gym', 'mbr_test_jessica', 250, 'active', NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days'),
('acc_test_gym', 'mbr_test_kevin', 85, 'active', NOW() - INTERVAL '50 days', NOW() - INTERVAL '49 days'),
('acc_test_gym', 'mbr_test_laura', 175, 'active', NOW() - INTERVAL '28 days', NOW() - INTERVAL '27 days'),
('acc_test_gym', 'mbr_test_michael', 140, 'active', NOW() - INTERVAL '38 days', NOW() - INTERVAL '37 days'),
('acc_test_gym', 'mbr_test_nancy', 200, 'active', NOW() - INTERVAL '18 days', NOW() - INTERVAL '17 days'),
('acc_test_gym', 'mbr_test_oliver', 120, 'active', NOW() - INTERVAL '42 days', NOW() - INTERVAL '41 days'),
('acc_test_gym', 'mbr_test_pam', 165, 'active', NOW() - INTERVAL '32 days', NOW() - INTERVAL '31 days'),
-- Additional members for dance academy
('acc_test_dance', 'mbr_test_quincy', 90, 'active', NOW() - INTERVAL '48 days', NOW() - INTERVAL '47 days'),
('acc_test_dance', 'mbr_test_rachel', 155, 'active', NOW() - INTERVAL '26 days', NOW() - INTERVAL '25 days'),
('acc_test_dance', 'mbr_test_steve', 130, 'active', NOW() - INTERVAL '36 days', NOW() - INTERVAL '35 days'),
('acc_test_dance', 'mbr_test_tina', 185, 'active', NOW() - INTERVAL '22 days', NOW() - INTERVAL '21 days'),
('acc_test_dance', 'mbr_test_uma', 105, 'active', NOW() - INTERVAL '44 days', NOW() - INTERVAL '43 days'),
('acc_test_dance', 'mbr_test_victor', 240, 'active', NOW() - INTERVAL '12 days', NOW() - INTERVAL '11 days'),
('acc_test_dance', 'mbr_test_wanda', 170, 'active', NOW() - INTERVAL '24 days', NOW() - INTERVAL '23 days'),
('acc_test_dance', 'mbr_test_xavier', 115, 'active', NOW() - INTERVAL '46 days', NOW() - INTERVAL '45 days'),
('acc_test_dance', 'mbr_test_yoda', 195, 'active', NOW() - INTERVAL '16 days', NOW() - INTERVAL '15 days'),
('acc_test_dance', 'mbr_test_zoe', 145, 'active', NOW() - INTERVAL '34 days', NOW() - INTERVAL '33 days');

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
INSERT INTO member_contracts (id, member_id, contract_id, location_id, signature, created_at, updated_at) VALUES
('mc_john_gym_waiver', 'mbr_test_john', 'contract_gym_waiver', 'acc_test_gym', 'John Doe Signature', NOW(), NOW()),
('mc_john_gym_membership', 'mbr_test_john', 'contract_gym_membership', 'acc_test_gym', 'John Doe Signature', NOW(), NOW()),
('mc_jane_gym_waiver', 'mbr_test_jane', 'contract_gym_waiver', 'acc_test_gym', 'Jane Smith Signature', NOW(), NOW()),
('mc_bob_dance_waiver', 'mbr_test_bob', 'contract_dance_waiver', 'acc_test_dance', 'Bob Johnson Signature', NOW(), NOW());

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
-- MEMBER PLANS (Membership offerings by location)
-- =========================================
INSERT INTO member_plans (id, name, description, family, interval, interval_threshold, type, currency, price, total_class_limit, class_limit_interval, class_limit_threshold, location_id, created_at, updated_at) VALUES
-- Admin location plans (for testing)
('plan_admin_basic', 'Admin Basic Plan', 'Basic administrative access plan', false, 'month', 1, 'recurring', 'USD', 9900, NULL, NULL, NULL, 'acc_test_admin', NOW(), NOW()),
('plan_admin_premium', 'Admin Premium Plan', 'Premium administrative access with extra features', false, 'month', 1, 'recurring', 'USD', 19900, NULL, NULL, NULL, 'acc_test_admin', NOW(), NOW()),

-- FitZone Gym plans
('plan_gym_basic', 'Basic Membership', 'Access to gym equipment and basic facilities', false, 'month', 1, 'recurring', 'USD', 4900, NULL, NULL, NULL, 'acc_test_gym', NOW(), NOW()),
('plan_gym_premium', 'Premium Membership', 'Full gym access including all classes and personal training sessions', false, 'month', 1, 'recurring', 'USD', 7900, NULL, NULL, NULL, 'acc_test_gym', NOW(), NOW()),
('plan_gym_family', 'Family Membership', 'Premium membership for up to 4 family members', true, 'month', 1, 'recurring', 'USD', 12900, NULL, NULL, NULL, 'acc_test_gym', NOW(), NOW()),
('plan_gym_annual', 'Annual Premium', 'Premium membership paid annually with discount', false, 'year', 1, 'recurring', 'USD', 79900, NULL, NULL, NULL, 'acc_test_gym', NOW(), NOW()),
('plan_gym_10pack', '10-Class Package', 'Package of 10 group fitness classes', false, 'month', 1, 'one-time', 'USD', 18000, 10, 'month', 3, 'acc_test_gym', NOW(), NOW()),
('plan_gym_5pack', '5-Session PT Package', 'Package of 5 personal training sessions', false, 'month', 1, 'one-time', 'USD', 35000, 5, 'month', 2, 'acc_test_gym', NOW(), NOW()),

-- Dance Academy plans
('plan_dance_beginner', 'Beginner Monthly', 'Monthly unlimited beginner classes', false, 'month', 1, 'recurring', 'USD', 8900, NULL, NULL, NULL, 'acc_test_dance', NOW(), NOW()),
('plan_dance_intermediate', 'Intermediate Monthly', 'Monthly unlimited intermediate classes', false, 'month', 1, 'recurring', 'USD', 10900, NULL, NULL, NULL, 'acc_test_dance', NOW(), NOW()),
('plan_dance_advanced', 'Advanced Monthly', 'Monthly unlimited advanced classes including specialty workshops', false, 'month', 1, 'recurring', 'USD', 13900, NULL, NULL, NULL, 'acc_test_dance', NOW(), NOW()),
('plan_dance_drop_in', 'Drop-in Classes', 'Single class drop-in rate', false, 'day', 1, 'one-time', 'USD', 2500, 1, 'week', 1, 'acc_test_dance', NOW(), NOW()),
('plan_dance_8pack', '8-Class Package', 'Package of 8 classes, any level', false, 'month', 1, 'one-time', 'USD', 18000, 8, 'month', 3, 'acc_test_dance', NOW(), NOW()),
('plan_dance_youth', 'Youth Monthly (Under 18)', 'Monthly unlimited classes for youth under 18', false, 'month', 1, 'recurring', 'USD', 6900, NULL, NULL, NULL, 'acc_test_dance', NOW(), NOW());

-- =========================================
-- MEMBER SUBSCRIPTIONS (Active recurring memberships)
-- =========================================
INSERT INTO member_subscriptions (id, member_id, member_plan_id, location_id, status, start_date, current_period_start, current_period_end, payment_method, metadata, created_at, updated_at) VALUES
-- John's subscriptions
('sub_john_gym', 'mbr_test_john', 'plan_gym_premium', 'acc_test_gym', 'active', NOW() - INTERVAL '2 months', NOW() - INTERVAL '1 month', NOW() + INTERVAL '1 month', 'card', '{"auto_renew": true, "preferred_billing_date": 15}', NOW(), NOW()),
('sub_john_admin', 'mbr_test_john', 'plan_admin_premium', 'acc_test_admin', 'active', NOW() - INTERVAL '3 months', NOW() - INTERVAL '1 month', NOW() + INTERVAL '1 month', 'card', '{"auto_renew": true}', NOW(), NOW()),

-- Jane's subscriptions  
('sub_jane_gym', 'mbr_test_jane', 'plan_gym_basic', 'acc_test_gym', 'active', NOW() - INTERVAL '1 month', NOW() - INTERVAL '15 days', NOW() + INTERVAL '15 days', 'card', '{"auto_renew": true, "billing_day": 1}', NOW(), NOW()),

-- Bob's subscriptions
('sub_bob_dance', 'mbr_test_bob', 'plan_dance_advanced', 'acc_test_dance', 'active', NOW() - INTERVAL '6 weeks', NOW() - INTERVAL '2 weeks', NOW() + INTERVAL '2 weeks', 'card', '{"auto_renew": true, "student_discount": true}', NOW(), NOW()),
('sub_bob_admin', 'mbr_test_bob', 'plan_admin_basic', 'acc_test_admin', 'active', NOW() - INTERVAL '1 month', NOW() - INTERVAL '5 days', NOW() + INTERVAL '25 days', 'card', '{"auto_renew": false}', NOW(), NOW());

-- =========================================
-- MEMBER PACKAGES (Purchased class packages/credits)
-- =========================================
INSERT INTO member_packages (id, member_plan_id, location_id, member_id, start_date, expire_date, status, payment_method, total_class_attended, total_class_limit, metadata, created_at, updated_at) VALUES
-- John's packages
('pkg_john_gym_pt', 'plan_gym_5pack', 'acc_test_gym', 'mbr_test_john', NOW() - INTERVAL '3 weeks', NOW() + INTERVAL '5 weeks', 'active', 'card', 2, 5, '{"purchased_price": 35000, "trainer_preference": "Alex Rodriguez"}', NOW(), NOW()),

-- Jane's packages
('pkg_jane_gym_classes', 'plan_gym_10pack', 'acc_test_gym', 'mbr_test_jane', NOW() - INTERVAL '1 month', NOW() + INTERVAL '2 months', 'active', 'card', 6, 10, '{"purchased_price": 18000, "class_preferences": ["Group Fitness", "Cardio"]}', NOW(), NOW()),

-- Bob's packages
('pkg_bob_dance_extra', 'plan_dance_8pack', 'acc_test_dance', 'mbr_test_bob', NOW() - INTERVAL '2 weeks', NOW() + INTERVAL '10 weeks', 'active', 'card', 3, 8, '{"purchased_price": 18000, "class_level": "advanced", "workshop_access": true}', NOW(), NOW()),

-- Expired package example
('pkg_john_dance_old', 'plan_dance_drop_in', 'acc_test_dance', 'mbr_test_john', NOW() - INTERVAL '2 months', NOW() - INTERVAL '1 month', 'expired', 'card', 1, 1, '{"purchased_price": 2500}', NOW() - INTERVAL '2 months', NOW());

-- =========================================
-- INTEGRATIONS (Third-party service integrations)
-- =========================================
INSERT INTO integrations (id, service, api_key, secret_key, access_token, refresh_token, expires_at, account_id, metadata, created_at, updated_at, location_id) VALUES
-- Stripe integration for FitZone Gym (main payment processing location)
('int_stripe_gym', 'stripe', 'pk_test_51RuSdMAPm3T5SOduzE6wrQnTP36xP1h6TQnoJyTLCzV9PxDVKCqUmJFoTkxbgkN3RibtWtgdfFU8jEbXSrjdkMGE00IZNWxqsT', 'sk_test_51RuSdMAPm3T5SOdufDNNJUEQWhUWhAV5xVUNCktPYBP2dSQKveZpJrkuxToVqG0e4lpZwhkyUw1RIuRMej0N8rLP00lfwtsdx8', 'sk_test_51RuSdMAPm3T5SOdufDNNJUEQWhUWhAV5xVUNCktPYBP2dSQKveZpJrkuxToVqG0e4lpZwhkyUw1RIuRMej0N8rLP00lfwtsdx8', 'rt_Sq8vjBpEN9SgvBAXIybF2qMEyG33EfdOQhvzpcbbA9rYEXrw', NULL, 'acct_1RuSdMAPm3T5SOdu', '{"scope": "read_write", "connected_at": "2024-08-10", "webhook_endpoint": "https://monstro.com/webhooks/stripe"}', NOW() - INTERVAL '2 months', NOW() - INTERVAL '1 week', 'acc_test_gym'),

-- Stripe integration for Dance Academy
('int_stripe_dance', 'stripe', 'pk_test_51RuSdMAPm3T5SOduzE6wrQnTP36xP1h6TQnoJyTLCzV9PxDVKCqUmJFoTkxbgkN3RibtWtgdfFU8jEbXSrjdkMGE00IZNWxqsT', 'sk_test_51RuSdMAPm3T5SOdufDNNJUEQWhUWhAV5xVUNCktPYBP2dSQKveZpJrkuxToVqG0e4lpZwhkyUw1RIuRMej0N8rLP00lfwtsdx8', 'sk_test_51RuSdMAPm3T5SOdufDNNJUEQWhUWhAV5xVUNCktPYBP2dSQKveZpJrkuxToVqG0e4lpZwhkyUw1RIuRMej0N8rLP00lfwtsdx8', 'rt_Sq8vjBpEN9SgvBAXIybF2qMEyG33EfdOQhvzpcbbA9rYEXrw', NULL, 'acct_1RuSdMAPm3T5SOdu', '{"scope": "read_write", "connected_at": "2024-09-15", "webhook_endpoint": "https://monstro.com/webhooks/stripe"}', NOW() - INTERVAL '1 month', NOW() - INTERVAL '3 days', 'acc_test_dance'),

-- Admin location integration (for testing admin features)
('int_stripe_admin', 'stripe', 'pk_test_51RuSdMAPm3T5SOduzE6wrQnTP36xP1h6TQnoJyTLCzV9PxDVKCqUmJFoTkxbgkN3RibtWtgdfFU8jEbXSrjdkMGE00IZNWxqsT', 'sk_test_51RuSdMAPm3T5SOdufDNNJUEQWhUWhAV5xVUNCktPYBP2dSQKveZpJrkuxToVqG0e4lpZwhkyUw1RIuRMej0N8rLP00lfwtsdx8', 'sk_test_51RuSdMAPm3T5SOdufDNNJUEQWhUWhAV5xVUNCktPYBP2dSQKveZpJrkuxToVqG0e4lpZwhkyUw1RIuRMej0N8rLP00lfwtsdx8', 'rt_Sq8vjBpEN9SgvBAXIybF2qMEyG33EfdOQhvzpcbbA9rYEXrw', NULL, 'acct_1RuSdMAPm3T5SOdu', '{"scope": "read_write", "connected_at": "2024-07-01", "webhook_endpoint": "https://monstro.com/webhooks/stripe", "admin_integration": true}', NOW() - INTERVAL '4 months', NOW() - INTERVAL '2 weeks', 'acc_test_admin');

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
('field_dance_allergies', 'Allergies/Medical Conditions', 'text', 'acc_test_dance', 'List any allergies or medical conditions', 'Important for safety during classes', '[]'::jsonb, NOW(), NOW()),
-- Additional custom fields for gym to stretch table width
('field_gym_fitness_goals', 'Primary Fitness Goals and Objectives', 'select', 'acc_test_gym', 'Select your main fitness goals', 'What are your primary fitness objectives?', '[{"value": "weight_loss", "label": "Weight Loss and Fat Reduction"}, {"value": "muscle_gain", "label": "Muscle Building and Strength Training"}, {"value": "endurance", "label": "Cardiovascular Endurance and Stamina"}, {"value": "flexibility", "label": "Flexibility and Mobility Improvement"}, {"value": "general_health", "label": "General Health and Wellness"}]'::jsonb, NOW(), NOW()),
('field_gym_workout_frequency', 'Preferred Workout Frequency Per Week', 'select', 'acc_test_gym', 'How many days per week do you plan to workout?', 'Your preferred training frequency', '[{"value": "1-2", "label": "1-2 days per week (Beginner)"}, {"value": "3-4", "label": "3-4 days per week (Intermediate)"}, {"value": "5-6", "label": "5-6 days per week (Advanced)"}, {"value": "7", "label": "7 days per week (Elite)"}]'::jsonb, NOW(), NOW()),
('field_gym_equipment_experience', 'Experience Level with Gym Equipment', 'select', 'acc_test_gym', 'How familiar are you with gym equipment?', 'Your experience level with fitness equipment', '[{"value": "novice", "label": "Novice - Need guidance with all equipment"}, {"value": "beginner", "label": "Beginner - Familiar with basic machines"}, {"value": "intermediate", "label": "Intermediate - Comfortable with most equipment"}, {"value": "advanced", "label": "Advanced - Expert with all gym equipment"}]'::jsonb, NOW(), NOW()),
('field_gym_referral_source', 'How Did You Hear About Our Gym?', 'select', 'acc_test_gym', 'Select how you found us', 'Marketing attribution and referral tracking', '[{"value": "google_search", "label": "Google Search"}, {"value": "social_media", "label": "Social Media (Facebook, Instagram, etc.)"}, {"value": "friend_family", "label": "Friend or Family Recommendation"}, {"value": "local_advertising", "label": "Local Advertising (Billboard, Newspaper)"}, {"value": "online_review", "label": "Online Review (Yelp, Google Reviews)"}, {"value": "walk_in", "label": "Walked In / Saw the Building"}, {"value": "other", "label": "Other"}]'::jsonb, NOW(), NOW()),
('field_gym_previous_gym_experience', 'Previous Gym Membership Experience', 'text', 'acc_test_gym', 'List any previous gym memberships', 'Help us understand your fitness background', '[]'::jsonb, NOW(), NOW()),
('field_gym_dietary_restrictions', 'Dietary Restrictions and Preferences', 'text', 'acc_test_gym', 'Any dietary restrictions or preferences?', 'Important for nutrition guidance and recommendations', '[]'::jsonb, NOW(), NOW()),
('field_gym_availability_schedule', 'Preferred Workout Times and Schedule', 'text', 'acc_test_gym', 'What times work best for your workouts?', 'Your preferred training schedule and availability', '[]'::jsonb, NOW(), NOW()),
-- Additional custom fields for dance academy
('field_dance_previous_training', 'Previous Dance Training and Experience', 'text', 'acc_test_dance', 'Describe any previous dance training', 'Help us place you in the appropriate class level', '[]'::jsonb, NOW(), NOW()),
('field_dance_favorite_styles', 'Favorite Dance Styles and Genres', 'select', 'acc_test_dance', 'Select your favorite dance styles', 'What dance styles interest you most?', '[{"value": "ballet", "label": "Classical Ballet"}, {"value": "jazz", "label": "Jazz Dance"}, {"value": "hip_hop", "label": "Hip Hop and Street Dance"}, {"value": "contemporary", "label": "Contemporary and Modern Dance"}, {"value": "tap", "label": "Tap Dance"}, {"value": "musical_theater", "label": "Musical Theater"}, {"value": "folk_traditional", "label": "Folk and Traditional Dance"}, {"value": "other", "label": "Other"}]'::jsonb, NOW(), NOW()),
('field_dance_performance_goals', 'Performance and Competition Goals', 'text', 'acc_test_dance', 'Any performance or competition aspirations?', 'Understanding your dance aspirations helps us guide you', '[]'::jsonb, NOW(), NOW()),
('field_dance_costume_measurements', 'Costume Measurements and Sizing', 'text', 'acc_test_dance', 'Current measurements for costume fitting', 'Required for recital costumes and special performances', '[]'::jsonb, NOW(), NOW()),
('field_dance_emergency_medical_info', 'Emergency Medical Information and Conditions', 'text', 'acc_test_dance', 'Any medical conditions we should be aware of?', 'Critical for safety during intense dance sessions', '[]'::jsonb, NOW(), NOW()),
('field_dance_transportation_method', 'Transportation Method to Classes', 'select', 'acc_test_dance', 'How do you get to dance classes?', 'Help us understand transportation logistics', '[{"value": "parent_driven", "label": "Driven by Parent/Guardian"}, {"value": "public_transportation", "label": "Public Transportation (Bus, Train)"}, {"value": "walking_biking", "label": "Walking or Biking"}, {"value": "carpool", "label": "Carpool with Other Students"}, {"value": "school_bus", "label": "School Bus"}, {"value": "other", "label": "Other"}]'::jsonb, NOW(), NOW());

-- =========================================
-- MEMBER CUSTOM FIELDS (Custom field values for members)
-- =========================================
INSERT INTO member_custom_fields (member_id, custom_field_id, value, created_at, updated_at) VALUES
('mbr_test_john', 'field_gym_emergency', 'Jane Doe - 555-0101', NOW(), NOW()),
('mbr_test_john', 'field_gym_membership_type', 'premium', NOW(), NOW()),
('mbr_test_jane', 'field_gym_emergency', 'Bob Smith - 555-0102', NOW(), NOW()),
('mbr_test_jane', 'field_gym_membership_type', 'basic', NOW(), NOW()),
('mbr_test_bob', 'field_dance_experience', 'advanced', NOW(), NOW()),
('mbr_test_bob', 'field_dance_allergies', 'None', NOW(), NOW()),
-- Additional custom field values for gym members
('mbr_test_john', 'field_gym_fitness_goals', 'muscle_gain', NOW(), NOW()),
('mbr_test_john', 'field_gym_workout_frequency', '5-6', NOW(), NOW()),
('mbr_test_john', 'field_gym_equipment_experience', 'advanced', NOW(), NOW()),
('mbr_test_john', 'field_gym_referral_source', 'friend_family', NOW(), NOW()),
('mbr_test_john', 'field_gym_previous_gym_experience', 'FitZone Gym (2 years), Planet Fitness (1 year)', NOW(), NOW()),
('mbr_test_john', 'field_gym_dietary_restrictions', 'None', NOW(), NOW()),
('mbr_test_john', 'field_gym_availability_schedule', 'Evenings after work, weekends anytime', NOW(), NOW()),
('mbr_test_jane', 'field_gym_fitness_goals', 'weight_loss', NOW(), NOW()),
('mbr_test_jane', 'field_gym_workout_frequency', '3-4', NOW(), NOW()),
('mbr_test_jane', 'field_gym_equipment_experience', 'intermediate', NOW(), NOW()),
('mbr_test_jane', 'field_gym_referral_source', 'google_search', NOW(), NOW()),
('mbr_test_jane', 'field_gym_previous_gym_experience', 'Local YMCA (6 months)', NOW(), NOW()),
('mbr_test_jane', 'field_gym_dietary_restrictions', 'Vegetarian, no dairy', NOW(), NOW()),
('mbr_test_jane', 'field_gym_availability_schedule', 'Mornings before work, some lunch breaks', NOW(), NOW()),
('mbr_test_alice', 'field_gym_fitness_goals', 'general_health', NOW(), NOW()),
('mbr_test_alice', 'field_gym_workout_frequency', '3-4', NOW(), NOW()),
('mbr_test_alice', 'field_gym_equipment_experience', 'beginner', NOW(), NOW()),
('mbr_test_alice', 'field_gym_referral_source', 'social_media', NOW(), NOW()),
('mbr_test_alice', 'field_gym_previous_gym_experience', 'First gym membership', NOW(), NOW()),
('mbr_test_alice', 'field_gym_dietary_restrictions', 'Gluten-free', NOW(), NOW()),
('mbr_test_alice', 'field_gym_availability_schedule', 'Weekends and Wednesday evenings', NOW(), NOW()),
('mbr_test_charlie', 'field_gym_fitness_goals', 'endurance', NOW(), NOW()),
('mbr_test_charlie', 'field_gym_workout_frequency', '5-6', NOW(), NOW()),
('mbr_test_charlie', 'field_gym_equipment_experience', 'intermediate', NOW(), NOW()),
('mbr_test_charlie', 'field_gym_referral_source', 'online_review', NOW(), NOW()),
('mbr_test_charlie', 'field_gym_previous_gym_experience', 'CrossFit gym (1 year)', NOW(), NOW()),
('mbr_test_charlie', 'field_gym_dietary_restrictions', 'None', NOW(), NOW()),
('mbr_test_charlie', 'field_gym_availability_schedule', 'Early mornings, lunch breaks', NOW(), NOW()),
('mbr_test_diana', 'field_gym_fitness_goals', 'muscle_gain', NOW(), NOW()),
('mbr_test_diana', 'field_gym_workout_frequency', '5-6', NOW(), NOW()),
('mbr_test_diana', 'field_gym_equipment_experience', 'advanced', NOW(), NOW()),
('mbr_test_diana', 'field_gym_referral_source', 'friend_family', NOW(), NOW()),
('mbr_test_diana', 'field_gym_previous_gym_experience', 'Powerhouse Gym (3 years)', NOW(), NOW()),
('mbr_test_diana', 'field_gym_dietary_restrictions', 'Keto diet', NOW(), NOW()),
('mbr_test_diana', 'field_gym_availability_schedule', 'Evenings and weekends', NOW(), NOW()),
('mbr_test_edward', 'field_gym_fitness_goals', 'flexibility', NOW(), NOW()),
('mbr_test_edward', 'field_gym_workout_frequency', '3-4', NOW(), NOW()),
('mbr_test_edward', 'field_gym_equipment_experience', 'intermediate', NOW(), NOW()),
('mbr_test_edward', 'field_gym_referral_source', 'walk_in', NOW(), NOW()),
('mbr_test_edward', 'field_gym_previous_gym_experience', 'Yoga studio (2 years)', NOW(), NOW()),
('mbr_test_edward', 'field_gym_dietary_restrictions', 'Vegan', NOW(), NOW()),
('mbr_test_edward', 'field_gym_availability_schedule', 'Mornings and early afternoons', NOW(), NOW()),
('mbr_test_fiona', 'field_gym_fitness_goals', 'weight_loss', NOW(), NOW()),
('mbr_test_fiona', 'field_gym_workout_frequency', '3-4', NOW(), NOW()),
('mbr_test_fiona', 'field_gym_equipment_experience', 'beginner', NOW(), NOW()),
('mbr_test_fiona', 'field_gym_referral_source', 'local_advertising', NOW(), NOW()),
('mbr_test_fiona', 'field_gym_previous_gym_experience', 'None', NOW(), NOW()),
('mbr_test_fiona', 'field_gym_dietary_restrictions', 'Low carb', NOW(), NOW()),
('mbr_test_fiona', 'field_gym_availability_schedule', 'Evenings after 6pm', NOW(), NOW()),
('mbr_test_george', 'field_gym_fitness_goals', 'muscle_gain', NOW(), NOW()),
('mbr_test_george', 'field_gym_workout_frequency', '5-6', NOW(), NOW()),
('mbr_test_george', 'field_gym_equipment_experience', 'advanced', NOW(), NOW()),
('mbr_test_george', 'field_gym_referral_source', 'friend_family', NOW(), NOW()),
('mbr_test_george', 'field_gym_previous_gym_experience', 'Gold''s Gym (5 years)', NOW(), NOW()),
('mbr_test_george', 'field_gym_dietary_restrictions', 'High protein', NOW(), NOW()),
('mbr_test_george', 'field_gym_availability_schedule', 'Early mornings before work', NOW(), NOW()),
('mbr_test_helen', 'field_gym_fitness_goals', 'general_health', NOW(), NOW()),
('mbr_test_helen', 'field_gym_workout_frequency', '3-4', NOW(), NOW()),
('mbr_test_helen', 'field_gym_equipment_experience', 'intermediate', NOW(), NOW()),
('mbr_test_helen', 'field_gym_referral_source', 'social_media', NOW(), NOW()),
('mbr_test_helen', 'field_gym_previous_gym_experience', '24 Hour Fitness (1 year)', NOW(), NOW()),
('mbr_test_helen', 'field_gym_dietary_restrictions', 'Mediterranean diet', NOW(), NOW()),
('mbr_test_helen', 'field_gym_availability_schedule', 'Lunch breaks and evenings', NOW(), NOW()),
('mbr_test_ian', 'field_gym_fitness_goals', 'endurance', NOW(), NOW()),
('mbr_test_ian', 'field_gym_workout_frequency', '5-6', NOW(), NOW()),
('mbr_test_ian', 'field_gym_equipment_experience', 'advanced', NOW(), NOW()),
('mbr_test_ian', 'field_gym_referral_source', 'online_review', NOW(), NOW()),
('mbr_test_ian', 'field_gym_previous_gym_experience', 'Running club (3 years)', NOW(), NOW()),
('mbr_test_ian', 'field_gym_dietary_restrictions', 'None', NOW(), NOW()),
('mbr_test_ian', 'field_gym_availability_schedule', 'Weekends and early mornings', NOW(), NOW()),
('mbr_test_jessica', 'field_gym_fitness_goals', 'muscle_gain', NOW(), NOW()),
('mbr_test_jessica', 'field_gym_workout_frequency', '5-6', NOW(), NOW()),
('mbr_test_jessica', 'field_gym_equipment_experience', 'intermediate', NOW(), NOW()),
('mbr_test_jessica', 'field_gym_referral_source', 'friend_family', NOW(), NOW()),
('mbr_test_jessica', 'field_gym_previous_gym_experience', 'Home workouts (2 years)', NOW(), NOW()),
('mbr_test_jessica', 'field_gym_dietary_restrictions', 'Paleo', NOW(), NOW()),
('mbr_test_jessica', 'field_gym_availability_schedule', 'Evenings after work', NOW(), NOW()),
('mbr_test_kevin', 'field_gym_fitness_goals', 'weight_loss', NOW(), NOW()),
('mbr_test_kevin', 'field_gym_workout_frequency', '3-4', NOW(), NOW()),
('mbr_test_kevin', 'field_gym_equipment_experience', 'beginner', NOW(), NOW()),
('mbr_test_kevin', 'field_gym_referral_source', 'google_search', NOW(), NOW()),
('mbr_test_kevin', 'field_gym_previous_gym_experience', 'None', NOW(), NOW()),
('mbr_test_kevin', 'field_gym_dietary_restrictions', 'Diabetic - low sugar', NOW(), NOW()),
('mbr_test_kevin', 'field_gym_availability_schedule', 'Weekends only', NOW(), NOW()),
('mbr_test_laura', 'field_gym_fitness_goals', 'flexibility', NOW(), NOW()),
('mbr_test_laura', 'field_gym_workout_frequency', '3-4', NOW(), NOW()),
('mbr_test_laura', 'field_gym_equipment_experience', 'intermediate', NOW(), NOW()),
('mbr_test_laura', 'field_gym_referral_source', 'social_media', NOW(), NOW()),
('mbr_test_laura', 'field_gym_previous_gym_experience', 'Pilates studio (2 years)', NOW(), NOW()),
('mbr_test_laura', 'field_gym_dietary_restrictions', 'None', NOW(), NOW()),
('mbr_test_laura', 'field_gym_availability_schedule', 'Mornings and lunch breaks', NOW(), NOW()),
('mbr_test_michael', 'field_gym_fitness_goals', 'general_health', NOW(), NOW()),
('mbr_test_michael', 'field_gym_workout_frequency', '3-4', NOW(), NOW()),
('mbr_test_michael', 'field_gym_equipment_experience', 'novice', NOW(), NOW()),
('mbr_test_michael', 'field_gym_referral_source', 'friend_family', NOW(), NOW()),
('mbr_test_michael', 'field_gym_previous_gym_experience', 'None', NOW(), NOW()),
('mbr_test_michael', 'field_gym_dietary_restrictions', 'Heart healthy diet', NOW(), NOW()),
('mbr_test_michael', 'field_gym_availability_schedule', 'Evenings and weekends', NOW(), NOW()),
('mbr_test_nancy', 'field_gym_fitness_goals', 'endurance', NOW(), NOW()),
('mbr_test_nancy', 'field_gym_workout_frequency', '5-6', NOW(), NOW()),
('mbr_test_nancy', 'field_gym_equipment_experience', 'advanced', NOW(), NOW()),
('mbr_test_nancy', 'field_gym_referral_source', 'online_review', NOW(), NOW()),
('mbr_test_nancy', 'field_gym_previous_gym_experience', 'Marathon training (4 years)', NOW(), NOW()),
('mbr_test_nancy', 'field_gym_dietary_restrictions', 'None', NOW(), NOW()),
('mbr_test_nancy', 'field_gym_availability_schedule', 'Early mornings and evenings', NOW(), NOW()),
('mbr_test_oliver', 'field_gym_fitness_goals', 'muscle_gain', NOW(), NOW()),
('mbr_test_oliver', 'field_gym_workout_frequency', '5-6', NOW(), NOW()),
('mbr_test_oliver', 'field_gym_equipment_experience', 'advanced', NOW(), NOW()),
('mbr_test_oliver', 'field_gym_referral_source', 'walk_in', NOW(), NOW()),
('mbr_test_oliver', 'field_gym_previous_gym_experience', 'Bodybuilding gym (6 years)', NOW(), NOW()),
('mbr_test_oliver', 'field_gym_dietary_restrictions', 'High protein, low carb', NOW(), NOW()),
('mbr_test_oliver', 'field_gym_availability_schedule', 'Evenings after 5pm', NOW(), NOW()),
('mbr_test_pam', 'field_gym_fitness_goals', 'weight_loss', NOW(), NOW()),
('mbr_test_pam', 'field_gym_workout_frequency', '3-4', NOW(), NOW()),
('mbr_test_pam', 'field_gym_equipment_experience', 'intermediate', NOW(), NOW()),
('mbr_test_pam', 'field_gym_referral_source', 'friend_family', NOW(), NOW()),
('mbr_test_pam', 'field_gym_previous_gym_experience', 'Weight Watchers gym (1 year)', NOW(), NOW()),
('mbr_test_pam', 'field_gym_dietary_restrictions', 'Calorie counting', NOW(), NOW()),
('mbr_test_pam', 'field_gym_availability_schedule', 'Lunch breaks and evenings', NOW(), NOW()),
-- Additional custom field values for dance academy members
('mbr_test_quincy', 'field_dance_previous_training', 'Community center jazz classes (2 years)', NOW(), NOW()),
('mbr_test_quincy', 'field_dance_favorite_styles', 'jazz', NOW(), NOW()),
('mbr_test_quincy', 'field_dance_performance_goals', 'Local talent shows and community performances', NOW(), NOW()),
('mbr_test_quincy', 'field_dance_costume_measurements', 'Height: 5''8", Waist: 32", Chest: 38", Inseam: 30"', NOW(), NOW()),
('mbr_test_quincy', 'field_dance_emergency_medical_info', 'Seasonal allergies', NOW(), NOW()),
('mbr_test_quincy', 'field_dance_transportation_method', 'public_transportation', NOW(), NOW()),
('mbr_test_rachel', 'field_dance_previous_training', 'Ballet school (4 years), private lessons (1 year)', NOW(), NOW()),
('mbr_test_rachel', 'field_dance_favorite_styles', 'ballet', NOW(), NOW()),
('mbr_test_rachel', 'field_dance_performance_goals', 'Professional ballet company, international competitions', NOW(), NOW()),
('mbr_test_rachel', 'field_dance_costume_measurements', 'Height: 5''4", Waist: 24", Chest: 32", Inseam: 28"', NOW(), NOW()),
('mbr_test_rachel', 'field_dance_emergency_medical_info', 'Asthma - carries inhaler', NOW(), NOW()),
('mbr_test_rachel', 'field_dance_transportation_method', 'parent_driven', NOW(), NOW()),
('mbr_test_steve', 'field_dance_previous_training', 'High school drama club (3 years)', NOW(), NOW()),
('mbr_test_steve', 'field_dance_favorite_styles', 'musical_theater', NOW(), NOW()),
('mbr_test_steve', 'field_dance_performance_goals', 'Broadway shows and musical theater productions', NOW(), NOW()),
('mbr_test_steve', 'field_dance_costume_measurements', 'Height: 5''10", Waist: 34", Chest: 40", Inseam: 32"', NOW(), NOW()),
('mbr_test_steve', 'field_dance_emergency_medical_info', 'None', NOW(), NOW()),
('mbr_test_steve', 'field_dance_transportation_method', 'carpool', NOW(), NOW()),
('mbr_test_tina', 'field_dance_previous_training', 'Hip hop dance crew (5 years), street dance workshops', NOW(), NOW()),
('mbr_test_tina', 'field_dance_favorite_styles', 'hip_hop', NOW(), NOW()),
('mbr_test_tina', 'field_dance_performance_goals', 'Dance competitions, music videos, professional choreography', NOW(), NOW()),
('mbr_test_tina', 'field_dance_costume_measurements', 'Height: 5''6", Waist: 26", Chest: 34", Inseam: 29"', NOW(), NOW()),
('mbr_test_tina', 'field_dance_emergency_medical_info', 'Mild scoliosis - monitored by physician', NOW(), NOW()),
('mbr_test_tina', 'field_dance_transportation_method', 'public_transportation', NOW(), NOW()),
('mbr_test_uma', 'field_dance_previous_training', 'Contemporary dance workshops (2 years)', NOW(), NOW()),
('mbr_test_uma', 'field_dance_favorite_styles', 'contemporary', NOW(), NOW()),
('mbr_test_uma', 'field_dance_performance_goals', 'Modern dance company, experimental performances', NOW(), NOW()),
('mbr_test_uma', 'field_dance_costume_measurements', 'Height: 5''7", Waist: 25", Chest: 33", Inseam: 30"', NOW(), NOW()),
('mbr_test_uma', 'field_dance_emergency_medical_info', 'None', NOW(), NOW()),
('mbr_test_uma', 'field_dance_transportation_method', 'walking_biking', NOW(), NOW()),
('mbr_test_victor', 'field_dance_previous_training', 'None - complete beginner excited to learn!', NOW(), NOW()),
('mbr_test_victor', 'field_dance_favorite_styles', 'hip_hop', NOW(), NOW()),
('mbr_test_victor', 'field_dance_performance_goals', 'School talent shows, dance battles with friends', NOW(), NOW()),
('mbr_test_victor', 'field_dance_costume_measurements', 'Height: 5''2", Waist: 28", Chest: 36", Inseam: 26"', NOW(), NOW()),
('mbr_test_victor', 'field_dance_emergency_medical_info', 'ADHD medication', NOW(), NOW()),
('mbr_test_victor', 'field_dance_transportation_method', 'parent_driven', NOW(), NOW()),
('mbr_test_wanda', 'field_dance_previous_training', 'Irish step dance (6 years), wants to try ballet', NOW(), NOW()),
('mbr_test_wanda', 'field_dance_favorite_styles', 'ballet', NOW(), NOW()),
('mbr_test_wanda', 'field_dance_performance_goals', 'Irish dancing competitions, ballet recitals', NOW(), NOW()),
('mbr_test_wanda', 'field_dance_costume_measurements', 'Height: 5''3", Waist: 23", Chest: 31", Inseam: 27"', NOW(), NOW()),
('mbr_test_wanda', 'field_dance_emergency_medical_info', 'None', NOW(), NOW()),
('mbr_test_wanda', 'field_dance_transportation_method', 'school_bus', NOW(), NOW()),
('mbr_test_xavier', 'field_dance_previous_training', 'Military precision marching band (4 years)', NOW(), NOW()),
('mbr_test_xavier', 'field_dance_favorite_styles', 'tap', NOW(), NOW()),
('mbr_test_xavier', 'field_dance_performance_goals', 'Military ceremonies, precision dance teams', NOW(), NOW()),
('mbr_test_xavier', 'field_dance_costume_measurements', 'Height: 6''0", Waist: 36", Chest: 42", Inseam: 34"', NOW(), NOW()),
('mbr_test_xavier', 'field_dance_emergency_medical_info', 'Knee surgery (2018) - full recovery', NOW(), NOW()),
('mbr_test_xavier', 'field_dance_transportation_method', 'public_transportation', NOW(), NOW()),
('mbr_test_yoda', 'field_dance_previous_training', 'Tai Chi and martial arts (20+ years)', NOW(), NOW()),
('mbr_test_yoda', 'field_dance_favorite_styles', 'contemporary', NOW(), NOW()),
('mbr_test_yoda', 'field_dance_performance_goals', 'Mind-body connection through movement, meditation through dance', NOW(), NOW()),
('mbr_test_yoda', 'field_dance_costume_measurements', 'Height: 5''5", Waist: 30", Chest: 38", Inseam: 28"', NOW(), NOW()),
('mbr_test_yoda', 'field_dance_emergency_medical_info', 'Arthritis in hands - gentle modifications needed', NOW(), NOW()),
('mbr_test_yoda', 'field_dance_transportation_method', 'walking_biking', NOW(), NOW()),
('mbr_test_zoe', 'field_dance_previous_training', 'Gymnastics (8 years), cheerleading (3 years)', NOW(), NOW()),
('mbr_test_zoe', 'field_dance_favorite_styles', 'jazz', NOW(), NOW()),
('mbr_test_zoe', 'field_dance_performance_goals', 'Cheer competitions, dance team captain', NOW(), NOW()),
('mbr_test_zoe', 'field_dance_costume_measurements', 'Height: 5''1", Waist: 22", Chest: 30", Inseam: 25"', NOW(), NOW()),
('mbr_test_zoe', 'field_dance_emergency_medical_info', 'None', NOW(), NOW()),
('mbr_test_zoe', 'field_dance_transportation_method', 'parent_driven', NOW(), NOW());

-- =========================================
-- SUPPORT ASSISTANTS (AI support assistants)
-- =========================================
INSERT INTO support_assistants (id, location_id, name, prompt, temperature, initial_message, model, status, available_tools, persona, created_at, updated_at) VALUES
('sbot_admin', 'acc_test_admin', 'Admin Support Assistant', 'You are a helpful customer support assistant for Monstro Admin. You have access to member information tools to help with administrative tasks, billing queries, and general support. You can create support tickets and escalate to human agents when needed.', 20, 'Hi! I''m the Admin Support Assistant. I can help with administrative questions, account management, and technical support. What can I assist you with today?', 'gpt', 'Active', ARRAY[
  '{"name": "get_member_status", "description": "Get member subscription and package status information", "category": "member_info", "parameters": {"type": "object", "properties": {"memberId": {"type": "string", "description": "The member ID to look up"}}, "required": ["memberId"]}}',
  '{"name": "get_member_billing", "description": "Get member billing and payment information", "category": "member_info", "parameters": {"type": "object", "properties": {"memberId": {"type": "string", "description": "The member ID to look up"}}, "required": ["memberId"]}}',
  '{"name": "create_support_ticket", "description": "Create a support ticket for tracking issues", "category": "support", "parameters": {"type": "object", "properties": {"title": {"type": "string", "description": "Brief title"}, "description": {"type": "string", "description": "Detailed description"}, "priority": {"type": "number", "minimum": 1, "maximum": 3, "description": "Priority level"}}, "required": ["title", "description"]}}',
  '{"name": "escalate_to_human", "description": "Escalate to human agent", "category": "support", "parameters": {"type": "object", "properties": {"reason": {"type": "string", "description": "Reason for escalation"}, "urgency": {"type": "string", "enum": ["low", "medium", "high"], "description": "Urgency level"}}, "required": ["reason", "urgency"]}}'
]::jsonb[], '{"name": "Admin Assistant", "responseStyle": "Professional and helpful", "personalityTraits": ["efficient", "knowledgeable", "supportive"]}'::jsonb, NOW(), NOW()),
('sbot_gym', 'acc_test_gym', 'FitZone Support Assistant', 'You are a helpful customer support assistant for FitZone Gym. You can help members with their membership status, billing questions, class bookings, and gym-related inquiries. You can create support tickets and escalate complex issues to our staff.', 30, 'Hi! I''m the FitZone Support Assistant. I can help with your membership, class schedules, billing questions, and facility information. How can I assist you today?', 'gpt', 'Active', ARRAY[
  '{"name": "get_member_status", "description": "Get member subscription and package status information", "category": "member_info", "parameters": {"type": "object", "properties": {"memberId": {"type": "string", "description": "The member ID to look up"}}, "required": ["memberId"]}}',
  '{"name": "get_member_billing", "description": "Get member billing and payment information", "category": "member_info", "parameters": {"type": "object", "properties": {"memberId": {"type": "string", "description": "The member ID to look up"}}, "required": ["memberId"]}}',
  '{"name": "get_member_bookable_sessions", "description": "Get available classes and sessions to book", "category": "member_info", "parameters": {"type": "object", "properties": {"memberId": {"type": "string", "description": "The member ID to look up"}}, "required": ["memberId"]}}',
  '{"name": "search_knowledge_base", "description": "Search gym policies and information", "category": "knowledge", "parameters": {"type": "object", "properties": {"query": {"type": "string", "description": "Search query"}}, "required": ["query"]}}',
  '{"name": "create_support_ticket", "description": "Create a support ticket", "category": "support", "parameters": {"type": "object", "properties": {"title": {"type": "string"}, "description": {"type": "string"}, "priority": {"type": "number", "minimum": 1, "maximum": 3}}, "required": ["title", "description"]}}',
  '{"name": "escalate_to_human", "description": "Escalate to human trainer", "category": "support", "parameters": {"type": "object", "properties": {"reason": {"type": "string"}, "urgency": {"type": "string", "enum": ["low", "medium", "high"]}}, "required": ["reason", "urgency"]}}'
]::jsonb[], '{"name": "FitZone Assistant", "responseStyle": "Energetic and motivational", "personalityTraits": ["encouraging", "fitness-focused", "friendly"]}'::jsonb, NOW(), NOW()),
('sbot_dance', 'acc_test_dance', 'Dance Academy Support Assistant', 'You are a helpful customer support assistant for Dance Academy. You help students and parents with class information, billing, scheduling, and dance-related questions. You can escalate complex issues to our instructors.', 25, 'Hello! I''m the Dance Academy Support Assistant. I can help with class schedules, billing, registration, and dance program information. What would you like to know?', 'gpt', 'Active', ARRAY[
  '{"name": "get_member_status", "description": "Get student enrollment and package status", "category": "member_info", "parameters": {"type": "object", "properties": {"memberId": {"type": "string", "description": "The student ID to look up"}}, "required": ["memberId"]}}',
  '{"name": "get_member_billing", "description": "Get billing and payment information", "category": "member_info", "parameters": {"type": "object", "properties": {"memberId": {"type": "string", "description": "The student ID to look up"}}, "required": ["memberId"]}}',
  '{"name": "get_member_bookable_sessions", "description": "Get available dance classes to book", "category": "member_info", "parameters": {"type": "object", "properties": {"memberId": {"type": "string", "description": "The student ID to look up"}}, "required": ["memberId"]}}',
  '{"name": "search_knowledge_base", "description": "Search dance academy policies and info", "category": "knowledge", "parameters": {"type": "object", "properties": {"query": {"type": "string", "description": "Search query"}}, "required": ["query"]}}',
  '{"name": "create_support_ticket", "description": "Create a support ticket", "category": "support", "parameters": {"type": "object", "properties": {"title": {"type": "string"}, "description": {"type": "string"}, "priority": {"type": "number", "minimum": 1, "maximum": 3}}, "required": ["title", "description"]}}',
  '{"name": "escalate_to_human", "description": "Escalate to dance instructor", "category": "support", "parameters": {"type": "object", "properties": {"reason": {"type": "string"}, "urgency": {"type": "string", "enum": ["low", "medium", "high"]}}, "required": ["reason", "urgency"]}}'
]::jsonb[], '{"name": "Dance Assistant", "responseStyle": "Graceful and encouraging", "personalityTraits": ["artistic", "patient", "inspiring"]}'::jsonb, NOW(), NOW());

-- =========================================
-- SUPPORT TRIGGERS (Automated escalation triggers)
-- =========================================
INSERT INTO support_triggers (id, support_assistant_id, name, trigger_type, trigger_phrases, tool_call, examples, requirements, is_active, created_at, updated_at) VALUES
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
INSERT INTO support_conversations (id, support_assistant_id, location_id, member_id, category, is_vendor_active, taken_over_at, metadata, created_at, updated_at) VALUES
-- Active conversation with vendor takeover
('sconv_john_gym', 'sbot_gym', 'acc_test_gym', 'mbr_test_john', 'Billing', true, NOW() - INTERVAL '15 minutes', ('{"takeoverReason": "Billing dispute requiring personal attention", "takeoverUrgency": "medium", "takeoverAt": "' || (NOW() - INTERVAL '15 minutes')::text || '", "createdBy": "sbot_gym", "memberImpact": "billing", "estimatedResolution": "24 hours"}')::jsonb, NOW() - INTERVAL '1 hour', NOW()),
-- Bot-only conversation (simple inquiry)
('sconv_jane_gym', 'sbot_gym', 'acc_test_gym', 'mbr_test_jane', 'General', false, NULL, '{"resolutionType": "automated", "satisfactionRating": 5}'::jsonb, NOW() - INTERVAL '2 hours', NOW()),
-- Dance academy conversation with instructor takeover
('sconv_bob_dance', 'sbot_dance', 'acc_test_dance', 'mbr_test_bob', 'Classes', true, NOW() - INTERVAL '30 minutes', '{"takeoverReason": "Class level assessment needed", "takeoverUrgency": "low", "instructorSpecialty": "ballet", "createdBy": "sbot_dance", "assessmentType": "skill_level", "currentClass": "Ballet Fundamentals"}'::jsonb, NOW() - INTERVAL '45 minutes', NOW()),
-- Recently resolved conversation that was handed back to bot
('sconv_admin_resolved', 'sbot_admin', 'acc_test_admin', 'mbr_test_john', 'Enterprise', false, NULL, ('{"handedBackAt": "' || (NOW() - INTERVAL '10 minutes')::text || '", "handedBackBy": "usr_test_admin", "originalTakeoverReason": "Complex account setup", "createdBy": "sbot_admin", "resolutionTime": "2.5 hours", "complexity": "high", "leadType": "enterprise"}')::jsonb, NOW() - INTERVAL '3 hours', NOW());

-- =========================================
-- SUPPORT MESSAGES (Conversation history)
-- =========================================
INSERT INTO support_messages (id, conversation_id, content, role, channel, metadata, created_at) VALUES
-- John's gym conversation with takeover scenario
('smsg_john_1', 'sconv_john_gym', 'Hi, I have a problem with my billing. I was charged twice this month.', 'user', 'WebChat', '{}'::jsonb, NOW() - INTERVAL '1 hour'),
('smsg_john_2', 'sconv_john_gym', 'I''m sorry to hear about the billing issue. Let me check your account details and help resolve this for you.', 'assistant', 'WebChat', '{}'::jsonb, NOW() - INTERVAL '59 minutes'),
('smsg_john_3', 'sconv_john_gym', 'I''ve reviewed your account and I can see there may have been a processing error. This requires careful review of your payment history.', 'assistant', 'WebChat', '{}'::jsonb, NOW() - INTERVAL '58 minutes'),
('smsg_john_4', 'sconv_john_gym', 'I need to speak with someone about this. This is really frustrating.', 'user', 'WebChat', '{}'::jsonb, NOW() - INTERVAL '20 minutes'),
('smsg_john_5', 'sconv_john_gym', 'A support agent has joined the conversation to help with: Billing dispute requiring personal attention', 'system', 'System', '{"takeoverReason": "Billing dispute requiring personal attention", "takeoverUrgency": "medium", "vendorId": "usr_test_vendor"}'::jsonb, NOW() - INTERVAL '15 minutes'),
('smsg_john_6', 'sconv_john_gym', 'Hi John! I''m Mike from FitZone. I can see you''ve been charged twice this month. Let me look into this right away and get this sorted out for you.', 'staff', 'WebChat', '{"vendorId": "usr_test_vendor", "agentName": "Mike Thompson"}'::jsonb, NOW() - INTERVAL '14 minutes'),
('smsg_john_7', 'sconv_john_gym', 'Thank you! That would be great. I really appreciate the personal attention.', 'user', 'WebChat', '{}'::jsonb, NOW() - INTERVAL '13 minutes'),

-- Jane's automated resolution
('smsg_jane_1', 'sconv_jane_gym', 'What are your gym hours this week?', 'user', 'WebChat', '{}'::jsonb, NOW() - INTERVAL '2 hours'),
('smsg_jane_2', 'sconv_jane_gym', 'Our gym hours this week are Monday-Friday: 5:00 AM - 11:00 PM, Saturday-Sunday: 6:00 AM - 10:00 PM. Is there anything specific you''d like to know about our facilities or services?', 'assistant', 'WebChat', '{}'::jsonb, NOW() - INTERVAL '2 hours' + INTERVAL '1 minute'),
('smsg_jane_3', 'sconv_jane_gym', 'Perfect, thank you! That''s all I needed.', 'user', 'WebChat', '{}'::jsonb, NOW() - INTERVAL '2 hours' + INTERVAL '2 minutes'),
('smsg_jane_4', 'sconv_jane_gym', 'You''re welcome! Feel free to reach out if you have any other questions. Have a great workout!', 'assistant', 'WebChat', '{}'::jsonb, NOW() - INTERVAL '2 hours' + INTERVAL '3 minutes'),

-- Bob's dance academy conversation with instructor takeover
('smsg_bob_1', 'sconv_bob_dance', 'I think my skill level has improved. Can I move up to a more advanced ballet class?', 'user', 'WebChat', '{}'::jsonb, NOW() - INTERVAL '45 minutes'),
('smsg_bob_2', 'sconv_bob_dance', 'That''s wonderful to hear about your progress! Class advancement depends on several factors including technique, strength, and experience. Let me connect you with one of our instructors who can properly assess your readiness.', 'assistant', 'WebChat', '{}'::jsonb, NOW() - INTERVAL '44 minutes'),
('smsg_bob_3', 'sconv_bob_dance', 'A support agent has joined the conversation to help with: Class level assessment needed', 'system', 'System', '{"takeoverReason": "Class level assessment needed", "takeoverUrgency": "low", "vendorId": "usr_test_staff"}'::jsonb, NOW() - INTERVAL '30 minutes'),
('smsg_bob_4', 'sconv_bob_dance', 'Hi Bob! I''m Carlos, one of the ballet instructors. I''d love to help assess your readiness for advancement. Can you tell me how long you''ve been in your current class and what techniques you''ve been working on?', 'staff', 'WebChat', '{"vendorId": "usr_test_staff", "agentName": "Carlos Martinez", "specialty": "ballet"}'::jsonb, NOW() - INTERVAL '29 minutes'),
('smsg_bob_5', 'sconv_bob_dance', 'I''ve been in Ballet Fundamentals for about 6 months. I''ve been working on my positions, basic jumps, and we just started simple adagio combinations.', 'user', 'WebChat', '{}'::jsonb, NOW() - INTERVAL '25 minutes'),

-- Admin conversation that was handed back (John contacting admin support)
('smsg_admin_1', 'sconv_admin_resolved', 'Hi, I''m a business owner looking to understand your enterprise features. I might need multiple locations under one account.', 'user', 'WebChat', '{}'::jsonb, NOW() - INTERVAL '3 hours'),
('smsg_admin_2', 'sconv_admin_resolved', 'I''d be happy to help you understand our enterprise features and multi-location setup. This is a complex topic that would benefit from direct assistance. Let me connect you with our admin team.', 'assistant', 'WebChat', '{}'::jsonb, NOW() - INTERVAL '3 hours' + INTERVAL '1 minute'),
('smsg_admin_3', 'sconv_admin_resolved', 'A support agent has joined the conversation to help with: Complex account setup', 'system', 'System', '{"takeoverReason": "Complex account setup", "takeoverUrgency": "medium", "vendorId": "usr_test_admin"}'::jsonb, NOW() - INTERVAL '2 hours' + INTERVAL '30 minutes'),
('smsg_admin_4', 'sconv_admin_resolved', 'Hi John! I''m here to help with your enterprise inquiry. I''ve reviewed your needs and can set up a multi-location account structure for you. Would you like me to prepare a demo?', 'staff', 'WebChat', '{"vendorId": "usr_test_admin", "agentName": "Admin User"}'::jsonb, NOW() - INTERVAL '1 hour'),
('smsg_admin_5', 'sconv_admin_resolved', 'That would be fantastic! Thank you for the personalized assistance.', 'user', 'WebChat', '{}'::jsonb, NOW() - INTERVAL '20 minutes'),
('smsg_admin_6', 'sconv_admin_resolved', 'The conversation has been handed back to the support bot.', 'system', 'System', ('{"handedBackBy": "usr_test_admin", "handedBackAt": "' || (NOW() - INTERVAL '10 minutes')::text || '"}')::jsonb, NOW() - INTERVAL '10 minutes');

-- =========================================
-- SUCCESS MESSAGE
-- =========================================
DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'MONSTRO TEST DATA SEED COMPLETED';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Created test data for:';
    RAISE NOTICE '- 34 Users (admin, vendor, staff, 28 members)';
    RAISE NOTICE '- 3 Vendors (admin, gym and dance studio)';
    RAISE NOTICE '- 3 Locations (Admin HQ, FitZone Gym, Dance Academy)';
    RAISE NOTICE '- 4 Staff members (trainers and dance instructors)';
    RAISE NOTICE '- 28 Members (John, Jane, Bob + 25 additional diverse members)';
    RAISE NOTICE '- 4 Programs (PT, Group Fitness, Ballet, Hip Hop)';
    RAISE NOTICE '- 10 Program sessions (class schedules)';
    RAISE NOTICE '- 4 Contracts (waivers and agreements)';
    RAISE NOTICE '- 3 Invoices (billing records)';
    RAISE NOTICE '- 3 Transactions (payment records)';
    RAISE NOTICE '- 5 Member tags (VIP, New, Premium, Advanced, Beginner)';
    RAISE NOTICE '- 14 Custom fields (Emergency Contact, Membership Type, Experience, Allergies + 10 additional fields for table width)';
    RAISE NOTICE '- Member tag assignments and custom field values';
    RAISE NOTICE '- Authentication sessions and OAuth accounts';
    RAISE NOTICE '';
    RAISE NOTICE 'SUPPORT ASSISTANT TEST DATA:';
    RAISE NOTICE '- 3 Support assistants (Admin, FitZone Gym, Dance Academy)';
    RAISE NOTICE '- 7 Support triggers (escalation, billing, injury, equipment, etc.)';
    RAISE NOTICE '- 4 Support conversations (with integrated metadata)';
    RAISE NOTICE '- 16 Support messages (realistic conversation flows)';
    RAISE NOTICE '- Agent information tracking (agentId, agentName in messages)';
    RAISE NOTICE '';
    RAISE NOTICE 'TAKEOVER & HANDOFF SCENARIOS:';
    RAISE NOTICE '- Active vendor takeover (John gym billing issue - ticket in progress)';
    RAISE NOTICE '- Instructor takeover (Bob dance class assessment - ticket open)';
    RAISE NOTICE '- Completed handoff cycle (admin multi-location setup - ticket resolved)';
    RAISE NOTICE '- Automated resolution (Jane gym hours inquiry - simple resolution)';
    RAISE NOTICE '';
    RAISE NOTICE 'MEMBER PLANS & SUBSCRIPTIONS:';
    RAISE NOTICE '- 12 Member plans (Basic/Premium memberships, class packages)';
    RAISE NOTICE '- 5 Active member subscriptions (John, Jane, Bob across locations)';
    RAISE NOTICE '- 4 Member packages (class credits, PT sessions, expired example)';
    RAISE NOTICE '- Realistic pricing in cents (e.g. $79 = 7900 cents)';
    RAISE NOTICE '- Mix of monthly/annual subscriptions and one-time packages';
    RAISE NOTICE '';
    RAISE NOTICE 'INTEGRATIONS:';
    RAISE NOTICE '- 3 Stripe integrations (all locations with test keys)';
    RAISE NOTICE '- Same Stripe test account for all locations';
    RAISE NOTICE '- Webhook endpoints configured for payment processing';
    RAISE NOTICE '- Ready for Stripe test mode functionality';
    RAISE NOTICE '';
    RAISE NOTICE 'SCHEMA UPDATES:';
    RAISE NOTICE '- support_bots table renamed to support_assistants';
    RAISE NOTICE '- Persona data moved to JSONB field in support_assistants';
    RAISE NOTICE '- support_conversations simplified (removed vendor_id, title, status, priority)';
    RAISE NOTICE '- Added location_id and category to conversations';
    RAISE NOTICE '- Added agentId and agentName to messages';
    RAISE NOTICE '- All locations owned by admin@test.com (vdr_test_admin)';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'You can now test your application locally!';
    RAISE NOTICE '=========================================';
END $$;