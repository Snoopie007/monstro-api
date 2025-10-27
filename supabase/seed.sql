-- Create a vendor user first
INSERT INTO users (id, name, email, email_verified_at, image, password, created_at, updated_at) 
VALUES ('usr_vendor_demo', 'Demo Vendor', 'vendor@demo.com', NOW(), NULL, '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()) 
ON CONFLICT (id) DO NOTHING;

-- Create the demo vendor
INSERT INTO vendors (id, first_name, last_name, user_id, email, created_at, updated_at) 
VALUES ('vdr_tJE2cshbSh20XuuZqWl7A', 'Demo', 'Vendor', 'usr_vendor_demo', 'vendor@demo.com', NOW(), NOW()) 
ON CONFLICT (id) DO NOTHING;

-- Create the demo location
INSERT INTO locations (id, name, address, about, city, state, country, postal_code, website, email, phone, timezone, vendor_id, slug, industry, legal_name, created_at, updated_at)
VALUES ('acc_BpT7jEb3Q16nOPL3vo7qlw', 'Demo', '76 River St', 'This is a demo location for testing purposes', 'Pittsburgh', 'PA', 'United States', '15212', 'https://demo.example.com', 'demo@example.com', '+1-555-0123', 'America/New_York', 'vdr_tJE2cshbSh20XuuZqWl7A', 'demo', 'Fitness & Recreation', 'Demo Location LLC', NOW(), NOW()) ON CONFLICT (id) DO NOTHING;

-- Create the location state
INSERT INTO location_state (location_id, status, agree_to_terms, last_renewal_date, start_date, settings, usage_percent, tax_rate, created_at, updated_at)
VALUES ('acc_BpT7jEb3Q16nOPL3vo7qlw', 'active', true, NOW(), NOW(), '{"theme": "default", "features": ["membership", "classes", "events"]}'::jsonb, 25, 8, NOW(), NOW()) ON CONFLICT (location_id) DO NOTHING;

-- =========================================
-- USERS (Base authentication users)
-- =========================================
INSERT INTO users (id, name, email, email_verified_at, image, password, created_at, updated_at) VALUES
('usr_BpT7jEb3Q16nOPL3vo7qlw', 'John Doe', 'john@test.com', NOW(), NULL, '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_Cx8mKfD4R27oPQ4wp8rmmx', 'Jane Smith', 'jane@test.com', NOW(), NULL, '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_Dy9nLgE5S38pQR5xq9snny', 'Bob Johnson', 'bob@test.com', NOW(), NULL, '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_Ez0oMhF6T49qRS6yr0tooz', 'Alice Williams', 'alice@test.com', NOW(), NULL, '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_Fa1pNiG7U50rST7zs1uppa', 'Charlie Brown', 'charlie@test.com', NOW(), NULL, '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_Gb2qOjH8V61sTU8at2vqqb', 'Diana Prince', 'diana@test.com', NOW(), NULL, '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_Hc3rPkI9W72tUV9bu3wrrc', 'Edward Norton', 'edward@test.com', NOW(), NULL, '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_Id4sQlJ0X83uVW0cv4xssd', 'Fiona Gallagher', 'fiona@test.com', NOW(), NULL, '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_Je5tRmK1Y94vWX1dw5ytte', 'George Lucas', 'george@test.com', NOW(), NULL, '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_Kf6uSnL2Z05wXY2ex6zuuf', 'Helen Troy', 'helen@test.com', NOW(), NULL, '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_Lg7vToM3A16xYZ3fy7avvg', 'Ian Malcolm', 'ian@test.com', NOW(), NULL, '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_Mh8wUpN4B27yZA4gz8bwwh', 'Jessica Jones', 'jessica@test.com', NOW(), NULL, '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_Ni9xVqO5C38zAB5ha9cxxi', 'Kevin Hart', 'kevin@test.com', NOW(), NULL, '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_Oj0yWrP6D49ABC6ib0dyyj', 'Laura Croft', 'laura@test.com', NOW(), NULL, '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_Pk1zXsQ7E50BCD7jc1ezzk', 'Michael Scott', 'michael@test.com', NOW(), NULL, '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_Ql2AyTrF8G61CDE8kd2faal', 'Nancy Drew', 'nancy@test.com', NOW(), NULL, '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_Rm3BzUsG9H72DEF9le3gbbm', 'Oliver Queen', 'oliver@test.com', NOW(), NULL, '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_Sn4CaVtH0I83EFG0mf4hccn', 'Pam Beesly', 'pam@test.com', NOW(), NULL, '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_To5DbWuI1J94FGH1ng5iddo', 'Quincy Jones', 'quincy@test.com', NOW(), NULL, '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_Up6EcXvJ2K05GHI2oh6jeeo', 'Rachel Green', 'rachel@test.com', NOW(), NULL, '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_Vq7FdYwK3L16HIJ3pi7kffp', 'Steve Rogers', 'steve@test.com', NOW(), NULL, '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_Wr8GeZxL4M27IJK4qj8lggq', 'Tina Fey', 'tina@test.com', NOW(), NULL, '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_Xs9HfAyM5N38JKL5rk9mhhr', 'Uma Thurman', 'uma@test.com', NOW(), NULL, '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_Yt0IgBzN6O49KLM6sl0niis', 'Victor Stone', 'victor@test.com', NOW(), NULL, '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_Zu1JhCaO7P50LMN7tm1ojjt', 'Wanda Maximoff', 'wanda@test.com', NOW(), NULL, '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_Av2KiDbP8Q61MNO8un2pkkv', 'Xavier Charles', 'xavier@test.com', NOW(), NULL, '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_Bw3LjEcQ9R72NOP9vo3qllw', 'Yoda Master', 'yoda@test.com', NOW(), NULL, '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_Cx4MkFdR0S83OPQ0wp4rmmx', 'Zoe Saldana', 'zoe@test.com', NOW(), NULL, '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW());

-- =========================================
-- MEMBERS (Associated with users)
-- =========================================
INSERT INTO members (id, user_id, email, phone, first_name, last_name, gender, first_time, dob, avatar, created_at, updated_at) VALUES
('mbr_BpT7jEb3Q16nOPL3vo7qlw', 'usr_BpT7jEb3Q16nOPL3vo7qlw', 'john@test.com', '+1-555-0001', 'John', 'Doe', 'male', false, '1990-01-15'::timestamp with time zone, 'https://api.dicebear.com/7.x/avataaars/png?seed=john', NOW(), NOW()),
('mbr_Cx8mKfD4R27oPQ4wp8rmmx', 'usr_Cx8mKfD4R27oPQ4wp8rmmx', 'jane@test.com', '+1-555-0002', 'Jane', 'Smith', 'female', false, '1988-03-22'::timestamp with time zone, 'https://api.dicebear.com/7.x/avataaars/png?seed=jane', NOW(), NOW()),
('mbr_Dy9nLgE5S38pQR5xq9snny', 'usr_Dy9nLgE5S38pQR5xq9snny', 'bob@test.com', '+1-555-0003', 'Bob', 'Johnson', 'male', true, '1992-07-10'::timestamp with time zone, 'https://api.dicebear.com/7.x/avataaars/png?seed=bob', NOW(), NOW()),
('mbr_Ez0oMhF6T49qRS6yr0tooz', 'usr_Ez0oMhF6T49qRS6yr0tooz', 'alice@test.com', '+1-555-0004', 'Alice', 'Williams', 'female', false, '1985-11-05'::timestamp with time zone, 'https://api.dicebear.com/7.x/avataaars/png?seed=alice', NOW(), NOW()),
('mbr_Fa1pNiG7U50rST7zs1uppa', 'usr_Fa1pNiG7U50rST7zs1uppa', 'charlie@test.com', '+1-555-0005', 'Charlie', 'Brown', 'male', true, '1995-09-18'::timestamp with time zone, 'https://api.dicebear.com/7.x/avataaars/png?seed=charlie', NOW(), NOW()),
('mbr_Gb2qOjH8V61sTU8at2vqqb', 'usr_Gb2qOjH8V61sTU8at2vqqb', 'diana@test.com', '+1-555-0006', 'Diana', 'Prince', 'female', false, '1987-12-03'::timestamp with time zone, 'https://api.dicebear.com/7.x/avataaars/png?seed=diana', NOW(), NOW()),
('mbr_Hc3rPkI9W72tUV9bu3wrrc', 'usr_Hc3rPkI9W72tUV9bu3wrrc', 'edward@test.com', '+1-555-0007', 'Edward', 'Norton', 'male', true, '1991-04-25'::timestamp with time zone, 'https://api.dicebear.com/7.x/avataaars/png?seed=edward', NOW(), NOW()),
('mbr_Id4sQlJ0X83uVW0cv4xssd', 'usr_Id4sQlJ0X83uVW0cv4xssd', 'fiona@test.com', '+1-555-0008', 'Fiona', 'Gallagher', 'female', false, '1989-08-14'::timestamp with time zone, 'https://api.dicebear.com/7.x/avataaars/png?seed=fiona', NOW(), NOW()),
('mbr_Je5tRmK1Y94vWX1dw5ytte', 'usr_Je5tRmK1Y94vWX1dw5ytte', 'george@test.com', '+1-555-0009', 'George', 'Lucas', 'male', true, '1993-06-30'::timestamp with time zone, 'https://api.dicebear.com/7.x/avataaars/png?seed=george', NOW(), NOW()),
('mbr_Kf6uSnL2Z05wXY2ex6zuuf', 'usr_Kf6uSnL2Z05wXY2ex6zuuf', 'helen@test.com', '+1-555-0010', 'Helen', 'Troy', 'female', false, '1986-02-12'::timestamp with time zone, 'https://api.dicebear.com/7.x/avataaars/png?seed=helen', NOW(), NOW()),
('mbr_Lg7vToM3A16xYZ3fy7avvg', 'usr_Lg7vToM3A16xYZ3fy7avvg', 'ian@test.com', '+1-555-0011', 'Ian', 'Malcolm', 'male', true, '1994-10-08'::timestamp with time zone, 'https://api.dicebear.com/7.x/avataaars/png?seed=ian', NOW(), NOW()),
('mbr_Mh8wUpN4B27yZA4gz8bwwh', 'usr_Mh8wUpN4B27yZA4gz8bwwh', 'jessica@test.com', '+1-555-0012', 'Jessica', 'Jones', 'female', false, '1984-05-17'::timestamp with time zone, 'https://api.dicebear.com/7.x/avataaars/png?seed=jessica', NOW(), NOW()),
('mbr_Ni9xVqO5C38zAB5ha9cxxi', 'usr_Ni9xVqO5C38zAB5ha9cxxi', 'kevin@test.com', '+1-555-0013', 'Kevin', 'Hart', 'male', true, '1996-01-28'::timestamp with time zone, 'https://api.dicebear.com/7.x/avataaars/png?seed=kevin', NOW(), NOW()),
('mbr_Oj0yWrP6D49ABC6ib0dyyj', 'usr_Oj0yWrP6D49ABC6ib0dyyj', 'laura@test.com', '+1-555-0014', 'Laura', 'Croft', 'female', false, '1983-09-11'::timestamp with time zone, 'https://api.dicebear.com/7.x/avataaars/png?seed=laura', NOW(), NOW()),
('mbr_Pk1zXsQ7E50BCD7jc1ezzk', 'usr_Pk1zXsQ7E50BCD7jc1ezzk', 'michael@test.com', '+1-555-0015', 'Michael', 'Scott', 'male', true, '1997-03-04'::timestamp with time zone, 'https://api.dicebear.com/7.x/avataaars/png?seed=michael', NOW(), NOW()),
('mbr_Ql2AyTrF8G61CDE8kd2faal', 'usr_Ql2AyTrF8G61CDE8kd2faal', 'nancy@test.com', '+1-555-0016', 'Nancy', 'Drew', 'female', false, '1982-07-26'::timestamp with time zone, 'https://api.dicebear.com/7.x/avataaars/png?seed=nancy', NOW(), NOW()),
('mbr_Rm3BzUsG9H72DEF9le3gbbm', 'usr_Rm3BzUsG9H72DEF9le3gbbm', 'oliver@test.com', '+1-555-0017', 'Oliver', 'Queen', 'male', true, '1998-11-19'::timestamp with time zone, 'https://api.dicebear.com/7.x/avataaars/png?seed=oliver', NOW(), NOW()),
('mbr_Sn4CaVtH0I83EFG0mf4hccn', 'usr_Sn4CaVtH0I83EFG0mf4hccn', 'pam@test.com', '+1-555-0018', 'Pam', 'Beesly', 'female', false, '1981-04-13'::timestamp with time zone, 'https://api.dicebear.com/7.x/avataaars/png?seed=pam', NOW(), NOW()),
('mbr_To5DbWuI1J94FGH1ng5iddo', 'usr_To5DbWuI1J94FGH1ng5iddo', 'quincy@test.com', '+1-555-0019', 'Quincy', 'Jones', 'male', true, '1999-08-07'::timestamp with time zone, 'https://api.dicebear.com/7.x/avataaars/png?seed=quincy', NOW(), NOW()),
('mbr_Up6EcXvJ2K05GHI2oh6jeeo', 'usr_Up6EcXvJ2K05GHI2oh6jeeo', 'rachel@test.com', '+1-555-0020', 'Rachel', 'Green', 'female', false, '1980-12-21'::timestamp with time zone, 'https://api.dicebear.com/7.x/avataaars/png?seed=rachel', NOW(), NOW()),
('mbr_Vq7FdYwK3L16HIJ3pi7kffp', 'usr_Vq7FdYwK3L16HIJ3pi7kffp', 'steve@test.com', '+1-555-0021', 'Steve', 'Rogers', 'male', true, '2000-02-14'::timestamp with time zone, 'https://api.dicebear.com/7.x/avataaars/png?seed=steve', NOW(), NOW()),
('mbr_Wr8GeZxL4M27IJK4qj8lggq', 'usr_Wr8GeZxL4M27IJK4qj8lggq', 'tina@test.com', '+1-555-0022', 'Tina', 'Fey', 'female', false, '1979-06-09'::timestamp with time zone, 'https://api.dicebear.com/7.x/avataaars/png?seed=tina', NOW(), NOW()),
('mbr_Xs9HfAyM5N38JKL5rk9mhhr', 'usr_Xs9HfAyM5N38JKL5rk9mhhr', 'uma@test.com', '+1-555-0023', 'Uma', 'Thurman', 'female', false, '1978-10-02'::timestamp with time zone, 'https://api.dicebear.com/7.x/avataaars/png?seed=uma', NOW(), NOW()),
('mbr_Yt0IgBzN6O49KLM6sl0niis', 'usr_Yt0IgBzN6O49KLM6sl0niis', 'victor@test.com', '+1-555-0024', 'Victor', 'Stone', 'male', true, '2001-01-16'::timestamp with time zone, 'https://api.dicebear.com/7.x/avataaars/png?seed=victor', NOW(), NOW()),
('mbr_Zu1JhCaO7P50LMN7tm1ojjt', 'usr_Zu1JhCaO7P50LMN7tm1ojjt', 'wanda@test.com', '+1-555-0025', 'Wanda', 'Maximoff', 'female', false, '1977-03-28'::timestamp with time zone, 'https://api.dicebear.com/7.x/avataaars/png?seed=wanda', NOW(), NOW()),
('mbr_Av2KiDbP8Q61MNO8un2pkkv', 'usr_Av2KiDbP8Q61MNO8un2pkkv', 'xavier@test.com', '+1-555-0026', 'Xavier', 'Charles', 'male', true, '2002-05-11'::timestamp with time zone, 'https://api.dicebear.com/7.x/avataaars/png?seed=xavier', NOW(), NOW()),
('mbr_Bw3LjEcQ9R72NOP9vo3qllw', 'usr_Bw3LjEcQ9R72NOP9vo3qllw', 'yoda@test.com', '+1-555-0027', 'Yoda', 'Master', 'male', true, '2003-09-24'::timestamp with time zone, 'https://api.dicebear.com/7.x/avataaars/png?seed=yoda', NOW(), NOW()),
('mbr_Cx4MkFdR0S83OPQ0wp4rmmx', 'usr_Cx4MkFdR0S83OPQ0wp4rmmx', 'zoe@test.com', '+1-555-0028', 'Zoe', 'Saldana', 'female', false, '1976-07-17'::timestamp with time zone, 'https://api.dicebear.com/7.x/avataaars/png?seed=zoe', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- =========================================
-- MEMBER LOCATIONS (Associate members with Demo location)
-- =========================================
INSERT INTO member_locations (location_id, member_id, points, status, invite_date, invite_accepted_date, onboarded, created_at, updated_at) VALUES
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_BpT7jEb3Q16nOPL3vo7qlw', 2847, 'active', NOW() - INTERVAL '30 days', NOW() - INTERVAL '25 days', true, NOW() - INTERVAL '287 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Cx8mKfD4R27oPQ4wp8rmmx', 3921, 'active', NOW() - INTERVAL '45 days', NOW() - INTERVAL '40 days', true, NOW() - INTERVAL '156 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Dy9nLgE5S38pQR5xq9snny', 1456, 'active', NOW() - INTERVAL '15 days', NOW() - INTERVAL '10 days', true, NOW() - INTERVAL '73 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Ez0oMhF6T49qRS6yr0tooz', 4732, 'active', NOW() - INTERVAL '60 days', NOW() - INTERVAL '55 days', true, NOW() - INTERVAL '342 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Fa1pNiG7U50rST7zs1uppa', 892, 'active', NOW() - INTERVAL '10 days', NOW() - INTERVAL '5 days', true, NOW() - INTERVAL '28 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Gb2qOjH8V61sTU8at2vqqb', 3184, 'active', NOW() - INTERVAL '35 days', NOW() - INTERVAL '30 days', true, NOW() - INTERVAL '198 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Hc3rPkI9W72tUV9bu3wrrc', 1673, 'active', NOW() - INTERVAL '20 days', NOW() - INTERVAL '15 days', true, NOW() - INTERVAL '124 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Id4sQlJ0X83uVW0cv4xssd', 4298, 'active', NOW() - INTERVAL '50 days', NOW() - INTERVAL '45 days', true, NOW() - INTERVAL '267 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Je5tRmK1Y94vWX1dw5ytte', 2156, 'active', NOW() - INTERVAL '25 days', NOW() - INTERVAL '20 days', true, NOW() - INTERVAL '91 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Kf6uSnL2Z05wXY2ex6zuuf', 4865, 'active', NOW() - INTERVAL '70 days', NOW() - INTERVAL '65 days', true, NOW() - INTERVAL '315 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Lg7vToM3A16xYZ3fy7avvg', 1329, 'active', NOW() - INTERVAL '18 days', NOW() - INTERVAL '13 days', true, NOW() - INTERVAL '45 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Mh8wUpN4B27yZA4gz8bwwh', 3567, 'active', NOW() - INTERVAL '40 days', NOW() - INTERVAL '35 days', true, NOW() - INTERVAL '234 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Ni9xVqO5C38zAB5ha9cxxi', 1048, 'active', NOW() - INTERVAL '12 days', NOW() - INTERVAL '7 days', true, NOW() - INTERVAL '67 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Oj0yWrP6D49ABC6ib0dyyj', 4521, 'active', NOW() - INTERVAL '65 days', NOW() - INTERVAL '60 days', true, NOW() - INTERVAL '298 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Pk1zXsQ7E50BCD7jc1ezzk', 1794, 'active', NOW() - INTERVAL '22 days', NOW() - INTERVAL '17 days', true, NOW() - INTERVAL '112 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Ql2AyTrF8G61CDE8kd2faal', 3845, 'active', NOW() - INTERVAL '55 days', NOW() - INTERVAL '50 days', true, NOW() - INTERVAL '189 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Rm3BzUsG9H72DEF9le3gbbm', 1267, 'active', NOW() - INTERVAL '16 days', NOW() - INTERVAL '11 days', true, NOW() - INTERVAL '82 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Sn4CaVtH0I83EFG0mf4hccn', 4193, 'active', NOW() - INTERVAL '68 days', NOW() - INTERVAL '63 days', true, NOW() - INTERVAL '329 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_To5DbWuI1J94FGH1ng5iddo', 2034, 'active', NOW() - INTERVAL '24 days', NOW() - INTERVAL '19 days', true, NOW() - INTERVAL '145 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Up6EcXvJ2K05GHI2oh6jeeo', 3276, 'active', NOW() - INTERVAL '38 days', NOW() - INTERVAL '33 days', true, NOW() - INTERVAL '223 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Vq7FdYwK3L16HIJ3pi7kffp', 1582, 'active', NOW() - INTERVAL '19 days', NOW() - INTERVAL '14 days', true, NOW() - INTERVAL '56 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Wr8GeZxL4M27IJK4qj8lggq', 3698, 'active', NOW() - INTERVAL '48 days', NOW() - INTERVAL '43 days', true, NOW() - INTERVAL '276 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Xs9HfAyM5N38JKL5rk9mhhr', 2759, 'active', NOW() - INTERVAL '32 days', NOW() - INTERVAL '27 days', true, NOW() - INTERVAL '167 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Yt0IgBzN6O49KLM6sl0niis', 1635, 'active', NOW() - INTERVAL '21 days', NOW() - INTERVAL '16 days', true, NOW() - INTERVAL '103 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Zu1JhCaO7P50LMN7tm1ojjt', 3912, 'active', NOW() - INTERVAL '52 days', NOW() - INTERVAL '47 days', true, NOW() - INTERVAL '245 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Av2KiDbP8Q61MNO8un2pkkv', 1143, 'active', NOW() - INTERVAL '14 days', NOW() - INTERVAL '9 days', true, NOW() - INTERVAL '34 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Bw3LjEcQ9R72NOP9vo3qllw', 967, 'active', NOW() - INTERVAL '11 days', NOW() - INTERVAL '6 days', true, NOW() - INTERVAL '19 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Cx4MkFdR0S83OPQ0wp4rmmx', 3456, 'active', NOW() - INTERVAL '42 days', NOW() - INTERVAL '37 days', true, NOW() - INTERVAL '212 days', NOW())
ON CONFLICT (location_id, member_id) DO NOTHING;
  

-- =========================================
-- USERS (Staff users)
-- =========================================
INSERT INTO users (id, name, email, email_verified_at, image, password, created_at, updated_at) VALUES
('usr_Fa1pNiG7U50rST7zs1uppa', 'Michael Brown', 'michael@test.com', NOW(), NULL, '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_Gb2qOjH8V61sTU8at2vqqb', 'Sarah Davis', 'sarah@test.com', NOW(), NULL, '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_Hc3rPkI9W72tUV9bu3wrrc', 'David Miller', 'david@test.com', NOW(), NULL, '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW()),
('usr_Id4sQlJ0X83uVW0cv4xssd', 'Jessica Wilson', 'jessica@test.com', NOW(), NULL, '$2b$10$tXgr7ASWD5QzLczEmrN7huzvO9OjayHyxrS6Shys01Eo.DQ1WNdku', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- =========================================
-- STAFFS (Employees/instructors)
-- =========================================
INSERT INTO staffs (id, first_name, last_name, email, phone, avatar, user_id, created_at, updated_at) VALUES
('stf_Fa1pNiG7U50rST7zs1uppa', 'Michael', 'Brown', 'michael@yogastudio.com', '+19999999999', 'https://api.dicebear.com/7.x/avataaars/png?seed=michael', 'usr_Fa1pNiG7U50rST7zs1uppa', NOW(), NOW()),
('stf_Gb2qOjH8V61sTU8at2vqqb', 'Sarah', 'Davis', 'sarah@pilatesstudio.com', '+19999999999', 'https://api.dicebear.com/7.x/avataaars/png?seed=sarah', 'usr_Gb2qOjH8V61sTU8at2vqqb', NOW(), NOW()),
('stf_Hc3rPkI9W72tUV9bu3wrrc', 'David', 'Miller', 'david@boxinggym.com', '+19999999999', 'https://api.dicebear.com/7.x/avataaars/png?seed=david', 'usr_Hc3rPkI9W72tUV9bu3wrrc', NOW(), NOW()),
('stf_Id4sQlJ0X83uVW0cv4xssd', 'Jessica', 'Wilson', 'jessica@swimclub.com', '+19999999999', 'https://api.dicebear.com/7.x/avataaars/png?seed=jessica', 'usr_Id4sQlJ0X83uVW0cv4xssd', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- =========================================
-- STAFF LOCATIONS (Staff assignments)
-- =========================================
INSERT INTO staff_locations (id, staff_id, location_id, status) VALUES
('Fa1pNiG7U50rST7zs1uppa', 'stf_Fa1pNiG7U50rST7zs1uppa', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'active'),
('Gb2qOjH8V61sTU8at2vqqb', 'stf_Gb2qOjH8V61sTU8at2vqqb', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'active'),
('Hc3rPkI9W72tUV9bu3wrrc', 'stf_Hc3rPkI9W72tUV9bu3wrrc', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'active'),
('Id4sQlJ0X83uVW0cv4xssd', 'stf_Id4sQlJ0X83uVW0cv4xssd', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'active');


-- =========================================
-- PROGRAMS (Classes/services offered)
-- =========================================
INSERT INTO programs (id, location_id, instructor_id, name, description, icon, capacity, min_age, max_age, status, interval, interval_threshold, cancelation_threshold, allow_waitlist, waitlist_capacity, allow_make_up_class, created_at, updated_at) VALUES
('Fa1pNiG7U50rST7zs1uppa', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'stf_Fa1pNiG7U50rST7zs1uppa', 'Personal Training', 'One-on-one fitness training sessions', '🏋️', 1, 16, 80, 'active', 'week', 1, 24, false, 0, true, NOW(), NOW()),
('Gb2qOjH8V61sTU8at2vqqb', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'stf_Gb2qOjH8V61sTU8at2vqqb', 'Group Fitness', 'High-energy group workout classes', '💪', 20, 18, 65, 'active', 'week', 2, 24, true, 5, true, NOW(), NOW()),
('Hc3rPkI9W72tUV9bu3wrrc', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'stf_Hc3rPkI9W72tUV9bu3wrrc', 'Ballet Fundamentals', 'Learn the basics of classical ballet', '🩰', 15, 8, 18, 'active', 'week', 1, 24, true, 3, true, NOW(), NOW()),
('Id4sQlJ0X83uVW0cv4xssd', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'stf_Id4sQlJ0X83uVW0cv4xssd', 'Hip Hop Dance', 'Contemporary hip hop dance classes', '🕺', 12, 12, 25, 'active', 'week', 1, 24, false, 0, true, NOW(), NOW());


-- =========================================
-- MEMBER PLANS (Recurring and One-time plans)
-- =========================================
INSERT INTO member_plans (id, name, description, location_id, type, interval, interval_threshold, currency, price, created_at, updated_at) VALUES
('pln_01JDQR8XYZABCDEFGHIJKLMN', 'All Programs Monthly', 'Monthly subscription with access to all programs', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'recurring', 'month', 1, 'USD', 19900, NOW(), NOW()),
('pln_01JDQR8XYZABCDEFGHIJKLMO', 'All Programs Package', 'One-time purchase with access to all programs', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'one-time', 'month', 1, 'USD', 100000, NOW(), NOW());

-- =========================================
-- PLAN PROGRAMS (Link plans to all programs)
-- =========================================
INSERT INTO plan_programs (plan_id, program_id) VALUES
-- Recurring plan includes all programs
('pln_01JDQR8XYZABCDEFGHIJKLMN', 'Fa1pNiG7U50rST7zs1uppa'), -- Personal Training
('pln_01JDQR8XYZABCDEFGHIJKLMN', 'Gb2qOjH8V61sTU8at2vqqb'), -- Group Fitness
('pln_01JDQR8XYZABCDEFGHIJKLMN', 'Hc3rPkI9W72tUV9bu3wrrc'), -- Ballet Fundamentals
('pln_01JDQR8XYZABCDEFGHIJKLMN', 'Id4sQlJ0X83uVW0cv4xssd'), -- Hip Hop Dance
-- One-time plan includes all programs
('pln_01JDQR8XYZABCDEFGHIJKLMO', 'Fa1pNiG7U50rST7zs1uppa'), -- Personal Training
('pln_01JDQR8XYZABCDEFGHIJKLMO', 'Gb2qOjH8V61sTU8at2vqqb'), -- Group Fitness
('pln_01JDQR8XYZABCDEFGHIJKLMO', 'Hc3rPkI9W72tUV9bu3wrrc'), -- Ballet Fundamentals
('pln_01JDQR8XYZABCDEFGHIJKLMO', 'Id4sQlJ0X83uVW0cv4xssd'); -- Hip Hop Dance

-- =========================================
-- PROGRAM SESSIONS (Scheduled classes for each program)
-- =========================================

-- Personal Training Sessions (1-on-1, flexible scheduling)
INSERT INTO program_sessions (id, program_id, time, duration, day, created_at, updated_at) VALUES
('c2Vzc19wZXJzb25hbF9tb3JuaW5n', 'Fa1pNiG7U50rST7zs1uppa', '09:00:00', 60, 1, NOW(), NOW()), -- Monday 9 AM
('c2Vzc19wZXJzb25hbF9hZnRlcm5vb24', 'Fa1pNiG7U50rST7zs1uppa', '14:00:00', 60, 1, NOW(), NOW()), -- Monday 2 PM
('c2Vzc19wZXJzb25hbF9ldmVuaW5n', 'Fa1pNiG7U50rST7zs1uppa', '18:00:00', 60, 1, NOW(), NOW()), -- Monday 6 PM
('c2Vzc19wZXJzb25hbF93ZWRfbW9ybmluZw', 'Fa1pNiG7U50rST7zs1uppa', '09:00:00', 60, 3, NOW(), NOW()), -- Wednesday 9 AM
('c2Vzc19wZXJzb25hbF93ZWRfYWZ0ZXJub29u', 'Fa1pNiG7U50rST7zs1uppa', '14:00:00', 60, 3, NOW(), NOW()), -- Wednesday 2 PM
('c2Vzc19wZXJzb25hbF9mcmVfbW9ybmluZw', 'Fa1pNiG7U50rST7zs1uppa', '09:00:00', 60, 5, NOW(), NOW()), -- Friday 9 AM
('c2Vzc19wZXJzb25hbF9mcmVfZXZlbmluZw', 'Fa1pNiG7U50rST7zs1uppa', '18:00:00', 60, 5, NOW(), NOW()); -- Friday 6 PM

-- Group Fitness Sessions (High-energy group classes)
INSERT INTO program_sessions (id, program_id, time, duration, day, created_at, updated_at) VALUES
('c2Vzc19ncm91cF9tb3JuaW5n', 'Gb2qOjH8V61sTU8at2vqqb', '07:00:00', 45, 1, NOW(), NOW()), -- Monday 7 AM
('c2Vzc19ncm91cF9sdW5jaA', 'Gb2qOjH8V61sTU8at2vqqb', '12:00:00', 30, 1, NOW(), NOW()), -- Monday 12 PM
('c2Vzc19ncm91cF9ldmVuaW5n', 'Gb2qOjH8V61sTU8at2vqqb', '19:00:00', 45, 1, NOW(), NOW()), -- Monday 7 PM
('c2Vzc19ncm91cF90dWVfbW9ybmluZw', 'Gb2qOjH8V61sTU8at2vqqb', '07:00:00', 45, 2, NOW(), NOW()), -- Tuesday 7 AM
('c2Vzc19ncm91cF90dWVfZXZlbmluZw', 'Gb2qOjH8V61sTU8at2vqqb', '19:00:00', 45, 2, NOW(), NOW()), -- Tuesday 7 PM
('c2Vzc19ncm91cF93ZWRfbHVuY2g', 'Gb2qOjH8V61sTU8at2vqqb', '12:00:00', 30, 3, NOW(), NOW()), -- Wednesday 12 PM
('c2Vzc19ncm91cF93ZWRfZXZlbmluZw', 'Gb2qOjH8V61sTU8at2vqqb', '19:00:00', 45, 3, NOW(), NOW()), -- Wednesday 7 PM
('c2Vzc19ncm91cF90aHVfbW9ybmluZw', 'Gb2qOjH8V61sTU8at2vqqb', '07:00:00', 45, 4, NOW(), NOW()), -- Thursday 7 AM
('c2Vzc19ncm91cF90aHVfZXZlbmluZw', 'Gb2qOjH8V61sTU8at2vqqb', '19:00:00', 45, 4, NOW(), NOW()), -- Thursday 7 PM
('c2Vzc19ncm91cF9mcmVfbW9ybmluZw', 'Gb2qOjH8V61sTU8at2vqqb', '07:00:00', 45, 5, NOW(), NOW()), -- Friday 7 AM
('c2Vzc19ncm91cF9zYXRfbW9ybmluZw', 'Gb2qOjH8V61sTU8at2vqqb', '09:00:00', 60, 6, NOW(), NOW()); -- Saturday 9 AM

-- Ballet Fundamentals Sessions (Classical ballet for ages 8-18)
INSERT INTO program_sessions (id, program_id, time, duration, day, created_at, updated_at) VALUES
('c2Vzc19iYWxsZXRfYmVnaW5uZXI', 'Hc3rPkI9W72tUV9bu3wrrc', '16:00:00', 60, 1, NOW(), NOW()), -- Monday 4 PM
('c2Vzc19iYWxsZXRfaW50ZXJtZWRpYXRl', 'Hc3rPkI9W72tUV9bu3wrrc', '17:00:00', 60, 1, NOW(), NOW()), -- Monday 5 PM
('c2Vzc19iYWxsZXRfYmVnaW5uZXJfdHVl', 'Hc3rPkI9W72tUV9bu3wrrc', '16:00:00', 60, 2, NOW(), NOW()), -- Tuesday 4 PM
('c2Vzc19iYWxsZXRfaW50ZXJtZWRpYXRlX3R1ZQ', 'Hc3rPkI9W72tUV9bu3wrrc', '17:00:00', 60, 2, NOW(), NOW()), -- Tuesday 5 PM
('c2Vzc19iYWxsZXRfYmVnaW5uZXJfd2Vk', 'Hc3rPkI9W72tUV9bu3wrrc', '16:00:00', 60, 3, NOW(), NOW()), -- Wednesday 4 PM
('c2Vzc19iYWxsZXRfaW50ZXJtZWRpYXRlX3dlZA', 'Hc3rPkI9W72tUV9bu3wrrc', '17:00:00', 60, 3, NOW(), NOW()), -- Wednesday 5 PM
('c2Vzc19iYWxsZXRfYmVnaW5uZXJfdGh1', 'Hc3rPkI9W72tUV9bu3wrrc', '16:00:00', 60, 4, NOW(), NOW()), -- Thursday 4 PM
('c2Vzc19iYWxsZXRfaW50ZXJtZWRpYXRlX3RodQ', 'Hc3rPkI9W72tUV9bu3wrrc', '17:00:00', 60, 4, NOW(), NOW()), -- Thursday 5 PM
('c2Vzc19iYWxsZXRfc2F0dXJkYXk', 'Hc3rPkI9W72tUV9bu3wrrc', '10:00:00', 90, 6, NOW(), NOW()); -- Saturday 10 AM

-- Hip Hop Dance Sessions (Contemporary hip hop for ages 12-25)
INSERT INTO program_sessions (id, program_id, time, duration, day, created_at, updated_at) VALUES
('c2Vzc19oaXBob3BfdGVlbg', 'Id4sQlJ0X83uVW0cv4xssd', '18:00:00', 60, 1, NOW(), NOW()), -- Monday 6 PM
('c2Vzc19oaXBob3BfYWR1bHQ', 'Id4sQlJ0X83uVW0cv4xssd', '20:00:00', 60, 1, NOW(), NOW()), -- Monday 8 PM
('c2Vzc19oaXBob3BfdGVlbl90dWU', 'Id4sQlJ0X83uVW0cv4xssd', '18:00:00', 60, 2, NOW(), NOW()), -- Tuesday 6 PM
('c2Vzc19oaXBob3BfYWR1bHRfdHVl', 'Id4sQlJ0X83uVW0cv4xssd', '20:00:00', 60, 2, NOW(), NOW()), -- Tuesday 8 PM
('c2Vzc19oaXBob3BfdGVlbl93ZWQ', 'Id4sQlJ0X83uVW0cv4xssd', '18:00:00', 60, 3, NOW(), NOW()), -- Wednesday 6 PM
('c2Vzc19oaXBob3BfYWR1bHRfd2Vk', 'Id4sQlJ0X83uVW0cv4xssd', '20:00:00', 60, 3, NOW(), NOW()), -- Wednesday 8 PM
('c2Vzc19oaXBob3BfdGVlbl90aHU', 'Id4sQlJ0X83uVW0cv4xssd', '18:00:00', 60, 4, NOW(), NOW()), -- Thursday 6 PM
('c2Vzc19oaXBob3BfYWR1bHRfdGh1', 'Id4sQlJ0X83uVW0cv4xssd', '20:00:00', 60, 4, NOW(), NOW()), -- Thursday 8 PM
('c2Vzc19oaXBob3BfZnJpZGF5', 'Id4sQlJ0X83uVW0cv4xssd', '19:00:00', 90, 5, NOW(), NOW()), -- Friday 7 PM
('c2Vzc19oaXBob3Bfc2F0dXJkYXk', 'Id4sQlJ0X83uVW0cv4xssd', '14:00:00', 90, 6, NOW(), NOW()); -- Saturday 2 PM


-- =========================================
-- MEMBER POINTS HISTORY (Points earned this month)
-- =========================================
INSERT INTO member_points_history (location_id, member_id, points, type, created_at, updated_at) VALUES
-- John Doe - 150 points this month
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_BpT7jEb3Q16nOPL3vo7qlw', 50, 'attendance', NOW() - INTERVAL '5 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_BpT7jEb3Q16nOPL3vo7qlw', 30, 'achievement', NOW() - INTERVAL '3 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_BpT7jEb3Q16nOPL3vo7qlw', 70, 'bonus', NOW() - INTERVAL '1 day', NOW()),

-- Jane Smith - 200 points this month
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Cx8mKfD4R27oPQ4wp8rmmx', 80, 'attendance', NOW() - INTERVAL '6 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Cx8mKfD4R27oPQ4wp8rmmx', 50, 'achievement', NOW() - INTERVAL '4 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Cx8mKfD4R27oPQ4wp8rmmx', 70, 'referral', NOW() - INTERVAL '2 days', NOW()),

-- Bob Johnson - 120 points this month
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Dy9nLgE5S38pQR5xq9snny', 40, 'attendance', NOW() - INTERVAL '7 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Dy9nLgE5S38pQR5xq9snny', 30, 'achievement', NOW() - INTERVAL '5 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Dy9nLgE5S38pQR5xq9snny', 50, 'bonus', NOW() - INTERVAL '1 day', NOW()),

-- Alice Williams - 180 points this month
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Ez0oMhF6T49qRS6yr0tooz', 60, 'attendance', NOW() - INTERVAL '8 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Ez0oMhF6T49qRS6yr0tooz', 40, 'achievement', NOW() - INTERVAL '6 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Ez0oMhF6T49qRS6yr0tooz', 80, 'social', NOW() - INTERVAL '3 days', NOW()),

-- Charlie Brown - 100 points this month
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Fa1pNiG7U50rST7zs1uppa', 35, 'attendance', NOW() - INTERVAL '9 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Fa1pNiG7U50rST7zs1uppa', 25, 'achievement', NOW() - INTERVAL '7 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Fa1pNiG7U50rST7zs1uppa', 40, 'bonus', NOW() - INTERVAL '2 days', NOW()),

-- Diana Prince - 160 points this month
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Gb2qOjH8V61sTU8at2vqqb', 55, 'attendance', NOW() - INTERVAL '10 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Gb2qOjH8V61sTU8at2vqqb', 35, 'achievement', NOW() - INTERVAL '8 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Gb2qOjH8V61sTU8at2vqqb', 70, 'referral', NOW() - INTERVAL '4 days', NOW()),

-- Edward Norton - 140 points this month
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Hc3rPkI9W72tUV9bu3wrrc', 45, 'attendance', NOW() - INTERVAL '11 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Hc3rPkI9W72tUV9bu3wrrc', 35, 'achievement', NOW() - INTERVAL '9 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Hc3rPkI9W72tUV9bu3wrrc', 60, 'social', NOW() - INTERVAL '5 days', NOW()),

-- Fiona Gallagher - 190 points this month
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Id4sQlJ0X83uVW0cv4xssd', 65, 'attendance', NOW() - INTERVAL '12 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Id4sQlJ0X83uVW0cv4xssd', 45, 'achievement', NOW() - INTERVAL '10 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Id4sQlJ0X83uVW0cv4xssd', 80, 'bonus', NOW() - INTERVAL '6 days', NOW()),

-- George Lucas - 130 points this month
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Je5tRmK1Y94vWX1dw5ytte', 50, 'attendance', NOW() - INTERVAL '13 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Je5tRmK1Y94vWX1dw5ytte', 30, 'achievement', NOW() - INTERVAL '11 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Je5tRmK1Y94vWX1dw5ytte', 50, 'referral', NOW() - INTERVAL '7 days', NOW()),

-- Helen Troy - 170 points this month
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Kf6uSnL2Z05wXY2ex6zuuf', 60, 'attendance', NOW() - INTERVAL '14 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Kf6uSnL2Z05wXY2ex6zuuf', 40, 'achievement', NOW() - INTERVAL '12 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Kf6uSnL2Z05wXY2ex6zuuf', 70, 'social', NOW() - INTERVAL '8 days', NOW()),

-- Ian Malcolm - 110 points this month
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Lg7vToM3A16xYZ3fy7avvg', 40, 'attendance', NOW() - INTERVAL '15 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Lg7vToM3A16xYZ3fy7avvg', 30, 'achievement', NOW() - INTERVAL '13 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Lg7vToM3A16xYZ3fy7avvg', 40, 'bonus', NOW() - INTERVAL '9 days', NOW()),

-- Jessica Jones - 200 points this month
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Mh8wUpN4B27yZA4gz8bwwh', 70, 'attendance', NOW() - INTERVAL '16 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Mh8wUpN4B27yZA4gz8bwwh', 50, 'achievement', NOW() - INTERVAL '14 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Mh8wUpN4B27yZA4gz8bwwh', 80, 'referral', NOW() - INTERVAL '10 days', NOW()),

-- Kevin Hart - 90 points this month
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Ni9xVqO5C38zAB5ha9cxxi', 30, 'attendance', NOW() - INTERVAL '17 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Ni9xVqO5C38zAB5ha9cxxi', 20, 'achievement', NOW() - INTERVAL '15 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Ni9xVqO5C38zAB5ha9cxxi', 40, 'bonus', NOW() - INTERVAL '11 days', NOW()),

-- Laura Croft - 150 points this month
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Oj0yWrP6D49ABC6ib0dyyj', 50, 'attendance', NOW() - INTERVAL '18 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Oj0yWrP6D49ABC6ib0dyyj', 30, 'achievement', NOW() - INTERVAL '16 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Oj0yWrP6D49ABC6ib0dyyj', 70, 'social', NOW() - INTERVAL '12 days', NOW()),

-- Michael Scott - 120 points this month
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Pk1zXsQ7E50BCD7jc1ezzk', 45, 'attendance', NOW() - INTERVAL '19 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Pk1zXsQ7E50BCD7jc1ezzk', 25, 'achievement', NOW() - INTERVAL '17 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Pk1zXsQ7E50BCD7jc1ezzk', 50, 'referral', NOW() - INTERVAL '13 days', NOW()),

-- Nancy Drew - 180 points this month
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Ql2AyTrF8G61CDE8kd2faal', 60, 'attendance', NOW() - INTERVAL '20 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Ql2AyTrF8G61CDE8kd2faal', 40, 'achievement', NOW() - INTERVAL '18 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Ql2AyTrF8G61CDE8kd2faal', 80, 'bonus', NOW() - INTERVAL '14 days', NOW()),

-- Oliver Queen - 100 points this month
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Rm3BzUsG9H72DEF9le3gbbm', 35, 'attendance', NOW() - INTERVAL '21 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Rm3BzUsG9H72DEF9le3gbbm', 25, 'achievement', NOW() - INTERVAL '19 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Rm3BzUsG9H72DEF9le3gbbm', 40, 'social', NOW() - INTERVAL '15 days', NOW()),

-- Pam Beesly - 160 points this month
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Sn4CaVtH0I83EFG0mf4hccn', 55, 'attendance', NOW() - INTERVAL '22 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Sn4CaVtH0I83EFG0mf4hccn', 35, 'achievement', NOW() - INTERVAL '20 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Sn4CaVtH0I83EFG0mf4hccn', 70, 'referral', NOW() - INTERVAL '16 days', NOW()),

-- Quincy Jones - 140 points this month
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_To5DbWuI1J94FGH1ng5iddo', 50, 'attendance', NOW() - INTERVAL '23 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_To5DbWuI1J94FGH1ng5iddo', 30, 'achievement', NOW() - INTERVAL '21 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_To5DbWuI1J94FGH1ng5iddo', 60, 'bonus', NOW() - INTERVAL '17 days', NOW()),

-- Rachel Green - 190 points this month
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Up6EcXvJ2K05GHI2oh6jeeo', 65, 'attendance', NOW() - INTERVAL '24 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Up6EcXvJ2K05GHI2oh6jeeo', 45, 'achievement', NOW() - INTERVAL '22 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Up6EcXvJ2K05GHI2oh6jeeo', 80, 'social', NOW() - INTERVAL '18 days', NOW()),

-- Steve Rogers - 110 points this month
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Vq7FdYwK3L16HIJ3pi7kffp', 40, 'attendance', NOW() - INTERVAL '25 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Vq7FdYwK3L16HIJ3pi7kffp', 30, 'achievement', NOW() - INTERVAL '23 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Vq7FdYwK3L16HIJ3pi7kffp', 40, 'referral', NOW() - INTERVAL '19 days', NOW()),

-- Tina Fey - 170 points this month
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Wr8GeZxL4M27IJK4qj8lggq', 60, 'attendance', NOW() - INTERVAL '26 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Wr8GeZxL4M27IJK4qj8lggq', 40, 'achievement', NOW() - INTERVAL '24 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Wr8GeZxL4M27IJK4qj8lggq', 70, 'bonus', NOW() - INTERVAL '20 days', NOW()),

-- Uma Thurman - 130 points this month
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Xs9HfAyM5N38JKL5rk9mhhr', 50, 'attendance', NOW() - INTERVAL '27 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Xs9HfAyM5N38JKL5rk9mhhr', 30, 'achievement', NOW() - INTERVAL '25 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Xs9HfAyM5N38JKL5rk9mhhr', 50, 'social', NOW() - INTERVAL '21 days', NOW()),

-- Victor Stone - 100 points this month
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Yt0IgBzN6O49KLM6sl0niis', 35, 'attendance', NOW() - INTERVAL '28 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Yt0IgBzN6O49KLM6sl0niis', 25, 'achievement', NOW() - INTERVAL '26 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Yt0IgBzN6O49KLM6sl0niis', 40, 'referral', NOW() - INTERVAL '22 days', NOW()),

-- Wanda Maximoff - 150 points this month
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Zu1JhCaO7P50LMN7tm1ojjt', 50, 'attendance', NOW() - INTERVAL '29 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Zu1JhCaO7P50LMN7tm1ojjt', 30, 'achievement', NOW() - INTERVAL '27 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Zu1JhCaO7P50LMN7tm1ojjt', 70, 'bonus', NOW() - INTERVAL '23 days', NOW()),

-- Xavier Charles - 90 points this month
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Av2KiDbP8Q61MNO8un2pkkv', 30, 'attendance', NOW() - INTERVAL '30 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Av2KiDbP8Q61MNO8un2pkkv', 20, 'achievement', NOW() - INTERVAL '28 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Av2KiDbP8Q61MNO8un2pkkv', 40, 'social', NOW() - INTERVAL '24 days', NOW()),

-- Yoda Master - 120 points this month
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Bw3LjEcQ9R72NOP9vo3qllw', 45, 'attendance', NOW() - INTERVAL '31 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Bw3LjEcQ9R72NOP9vo3qllw', 25, 'achievement', NOW() - INTERVAL '29 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Bw3LjEcQ9R72NOP9vo3qllw', 50, 'referral', NOW() - INTERVAL '25 days', NOW()),

-- Zoe Saldana - 160 points this month
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Cx4MkFdR0S83OPQ0wp4rmmx', 55, 'attendance', NOW() - INTERVAL '32 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Cx4MkFdR0S83OPQ0wp4rmmx', 35, 'achievement', NOW() - INTERVAL '30 days', NOW()),
('acc_BpT7jEb3Q16nOPL3vo7qlw', 'mbr_Cx4MkFdR0S83OPQ0wp4rmmx', 70, 'bonus', NOW() - INTERVAL '26 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- =========================================
-- MEMBER SUBSCRIPTIONS (Recurring plans)
-- =========================================
INSERT INTO member_subscriptions (id, member_id, member_plan_id, location_id, status, start_date, current_period_start, current_period_end, payment_method, created_at, updated_at) VALUES
('sub_01JDQR8XYZABCDEFGHIJKLMN', 'mbr_BpT7jEb3Q16nOPL3vo7qlw', 'pln_01JDQR8XYZABCDEFGHIJKLMN', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'active', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days', NOW() + INTERVAL '1 day', 'card', NOW() - INTERVAL '30 days', NOW()),
('sub_01JDQR8XYZABCDEFGHIJKLMO', 'mbr_Cx8mKfD4R27oPQ4wp8rmmx', 'pln_01JDQR8XYZABCDEFGHIJKLMN', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'active', NOW() - INTERVAL '45 days', NOW() - INTERVAL '15 days', NOW() + INTERVAL '15 days', 'card', NOW() - INTERVAL '45 days', NOW()),
('sub_01JDQR8XYZABCDEFGHIJKLMQ', 'mbr_Bw3LjEcQ9R72NOP9vo3qllw', 'pln_01JDQR8XYZABCDEFGHIJKLMN', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'active', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days', NOW() + INTERVAL '23 days', 'card', NOW() - INTERVAL '7 days', NOW());

-- =========================================
-- MEMBER PACKAGES (One-time plans)
-- =========================================
INSERT INTO member_packages (id, member_plan_id, member_id, location_id, status, start_date, payment_method, total_class_limit, expire_date, created_at, updated_at) VALUES
('pkg_01JDQR8XYZABCDEFGHIJKLMN', 'pln_01JDQR8XYZABCDEFGHIJKLMO', 'mbr_Dy9nLgE5S38pQR5xq9snny', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'active', NOW() - INTERVAL '15 days', 'card', 50, NOW() + INTERVAL '1 year', NOW() - INTERVAL '15 days', NOW()),
('pkg_01JDQR8XYZABCDEFGHIJKLMO', 'pln_01JDQR8XYZABCDEFGHIJKLMO', 'mbr_Ez0oMhF6T49qRS6yr0tooz', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'active', NOW() - INTERVAL '60 days', 'card', 50, NOW() + INTERVAL '1 year', NOW() - INTERVAL '60 days', NOW());



-- =========================================
-- MEMBER INVOICES (Billing records for members)
-- =========================================

-- John Doe - Monthly Subscription Invoices (12 months)
INSERT INTO member_invoices (id, member_id, location_id, description, items, paid, tax, total, discount, subtotal, due_date, status, member_subscription_id, for_period_start, for_period_end, created_at, updated_at) VALUES
('inv_01JDQR8XYZABCDEFGHIJKLMN', 'mbr_BpT7jEb3Q16nOPL3vo7qlw', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'Monthly Subscription - All Programs', ARRAY['{"name": "All Programs Monthly", "description": "Access to Personal Training, Group Fitness, Ballet, and Hip Hop", "amount": 19900, "quantity": 1}']::jsonb[], true, 1592, 21492, 0, 19900, NOW() - INTERVAL '11 months' + INTERVAL '15 days', 'paid', 'sub_01JDQR8XYZABCDEFGHIJKLMN', NOW() - INTERVAL '11 months', NOW() - INTERVAL '10 months', NOW() - INTERVAL '11 months', NOW() - INTERVAL '11 months'),
('inv_01JDQR8XYZABCDEFGHIJKLM2', 'mbr_BpT7jEb3Q16nOPL3vo7qlw', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'Monthly Subscription - All Programs', ARRAY['{"name": "All Programs Monthly", "description": "Access to Personal Training, Group Fitness, Ballet, and Hip Hop", "amount": 19900, "quantity": 1}']::jsonb[], true, 1592, 21492, 0, 19900, NOW() - INTERVAL '10 months' + INTERVAL '15 days', 'paid', 'sub_01JDQR8XYZABCDEFGHIJKLMN', NOW() - INTERVAL '10 months', NOW() - INTERVAL '9 months', NOW() - INTERVAL '10 months', NOW() - INTERVAL '10 months'),
('inv_01JDQR8XYZABCDEFGHIJKLM3', 'mbr_BpT7jEb3Q16nOPL3vo7qlw', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'Monthly Subscription - All Programs', ARRAY['{"name": "All Programs Monthly", "description": "Access to Personal Training, Group Fitness, Ballet, and Hip Hop", "amount": 19900, "quantity": 1}']::jsonb[], true, 1592, 21492, 0, 19900, NOW() - INTERVAL '9 months' + INTERVAL '15 days', 'paid', 'sub_01JDQR8XYZABCDEFGHIJKLMN', NOW() - INTERVAL '9 months', NOW() - INTERVAL '8 months', NOW() - INTERVAL '9 months', NOW() - INTERVAL '9 months'),
('inv_01JDQR8XYZABCDEFGHIJKLM4', 'mbr_BpT7jEb3Q16nOPL3vo7qlw', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'Monthly Subscription - All Programs', ARRAY['{"name": "All Programs Monthly", "description": "Access to Personal Training, Group Fitness, Ballet, and Hip Hop", "amount": 19900, "quantity": 1}']::jsonb[], true, 1592, 21492, 0, 19900, NOW() - INTERVAL '8 months' + INTERVAL '15 days', 'paid', 'sub_01JDQR8XYZABCDEFGHIJKLMN', NOW() - INTERVAL '8 months', NOW() - INTERVAL '7 months', NOW() - INTERVAL '8 months', NOW() - INTERVAL '8 months'),
('inv_01JDQR8XYZABCDEFGHIJKLM5', 'mbr_BpT7jEb3Q16nOPL3vo7qlw', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'Monthly Subscription - All Programs', ARRAY['{"name": "All Programs Monthly", "description": "Access to Personal Training, Group Fitness, Ballet, and Hip Hop", "amount": 19900, "quantity": 1}']::jsonb[], true, 1592, 21492, 0, 19900, NOW() - INTERVAL '7 months' + INTERVAL '15 days', 'paid', 'sub_01JDQR8XYZABCDEFGHIJKLMN', NOW() - INTERVAL '7 months', NOW() - INTERVAL '6 months', NOW() - INTERVAL '7 months', NOW() - INTERVAL '7 months'),
('inv_01JDQR8XYZABCDEFGHIJKLM6', 'mbr_BpT7jEb3Q16nOPL3vo7qlw', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'Monthly Subscription - All Programs', ARRAY['{"name": "All Programs Monthly", "description": "Access to Personal Training, Group Fitness, Ballet, and Hip Hop", "amount": 19900, "quantity": 1}']::jsonb[], true, 1592, 21492, 0, 19900, NOW() - INTERVAL '6 months' + INTERVAL '15 days', 'paid', 'sub_01JDQR8XYZABCDEFGHIJKLMN', NOW() - INTERVAL '6 months', NOW() - INTERVAL '5 months', NOW() - INTERVAL '6 months', NOW() - INTERVAL '6 months'),
('inv_01JDQR8XYZABCDEFGHIJKLM7', 'mbr_BpT7jEb3Q16nOPL3vo7qlw', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'Monthly Subscription - All Programs', ARRAY['{"name": "All Programs Monthly", "description": "Access to Personal Training, Group Fitness, Ballet, and Hip Hop", "amount": 19900, "quantity": 1}']::jsonb[], true, 1592, 21492, 0, 19900, NOW() - INTERVAL '5 months' + INTERVAL '15 days', 'paid', 'sub_01JDQR8XYZABCDEFGHIJKLMN', NOW() - INTERVAL '5 months', NOW() - INTERVAL '4 months', NOW() - INTERVAL '5 months', NOW() - INTERVAL '5 months'),
('inv_01JDQR8XYZABCDEFGHIJKLM8', 'mbr_BpT7jEb3Q16nOPL3vo7qlw', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'Monthly Subscription - All Programs', ARRAY['{"name": "All Programs Monthly", "description": "Access to Personal Training, Group Fitness, Ballet, and Hip Hop", "amount": 19900, "quantity": 1}']::jsonb[], true, 1592, 21492, 0, 19900, NOW() - INTERVAL '4 months' + INTERVAL '15 days', 'paid', 'sub_01JDQR8XYZABCDEFGHIJKLMN', NOW() - INTERVAL '4 months', NOW() - INTERVAL '3 months', NOW() - INTERVAL '4 months', NOW() - INTERVAL '4 months'),
('inv_01JDQR8XYZABCDEFGHIJKLM9', 'mbr_BpT7jEb3Q16nOPL3vo7qlw', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'Monthly Subscription - All Programs', ARRAY['{"name": "All Programs Monthly", "description": "Access to Personal Training, Group Fitness, Ballet, and Hip Hop", "amount": 19900, "quantity": 1}']::jsonb[], true, 1592, 21492, 0, 19900, NOW() - INTERVAL '3 months' + INTERVAL '15 days', 'paid', 'sub_01JDQR8XYZABCDEFGHIJKLMN', NOW() - INTERVAL '3 months', NOW() - INTERVAL '2 months', NOW() - INTERVAL '3 months', NOW() - INTERVAL '3 months'),
('inv_01JDQR8XYZABCDEFGHIJKLMA', 'mbr_BpT7jEb3Q16nOPL3vo7qlw', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'Monthly Subscription - All Programs', ARRAY['{"name": "All Programs Monthly", "description": "Access to Personal Training, Group Fitness, Ballet, and Hip Hop", "amount": 19900, "quantity": 1}']::jsonb[], true, 1592, 21492, 0, 19900, NOW() - INTERVAL '2 months' + INTERVAL '15 days', 'paid', 'sub_01JDQR8XYZABCDEFGHIJKLMN', NOW() - INTERVAL '2 months', NOW() - INTERVAL '1 month', NOW() - INTERVAL '2 months', NOW() - INTERVAL '2 months'),
('inv_01JDQR8XYZABCDEFGHIJKLMB', 'mbr_BpT7jEb3Q16nOPL3vo7qlw', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'Monthly Subscription - All Programs', ARRAY['{"name": "All Programs Monthly", "description": "Access to Personal Training, Group Fitness, Ballet, and Hip Hop", "amount": 19900, "quantity": 1}']::jsonb[], true, 1592, 21492, 0, 19900, NOW() - INTERVAL '1 month' + INTERVAL '15 days', 'paid', 'sub_01JDQR8XYZABCDEFGHIJKLMN', NOW() - INTERVAL '1 month', NOW(), NOW() - INTERVAL '1 month', NOW() - INTERVAL '1 month'),
('inv_01JDQR8XYZABCDEFGHIJKLMQ', 'mbr_BpT7jEb3Q16nOPL3vo7qlw', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'Monthly Subscription - All Programs', ARRAY['{"name": "All Programs Monthly", "description": "Access to Personal Training, Group Fitness, Ballet, and Hip Hop", "amount": 19900, "quantity": 1}']::jsonb[], true, 1592, 21492, 0, 19900, NOW() + INTERVAL '15 days', 'paid', 'sub_01JDQR8XYZABCDEFGHIJKLMN', NOW(), NOW() + INTERVAL '1 month', NOW(), NOW());

-- Jane Smith - Monthly Subscription Invoices (2 months)
INSERT INTO member_invoices (id, member_id, location_id, description, items, paid, tax, total, discount, subtotal, due_date, status, member_subscription_id, for_period_start, for_period_end, created_at, updated_at) VALUES
('inv_01JDQR8XYZABCDEFGHIJKLMZ', 'mbr_Cx8mKfD4R27oPQ4wp8rmmx', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'Monthly Subscription - All Programs', ARRAY['{"name": "All Programs Monthly", "description": "Access to Personal Training, Group Fitness, Ballet, and Hip Hop", "amount": 19900, "quantity": 1}']::jsonb[], true, 1592, 21492, 0, 19900, NOW() - INTERVAL '45 days' + INTERVAL '15 days', 'paid', 'sub_01JDQR8XYZABCDEFGHIJKLMO', NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days' + INTERVAL '1 month', NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days'),
('inv_01JDQR8XYZABCDEFGHIJKLMY', 'mbr_Cx8mKfD4R27oPQ4wp8rmmx', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'Monthly Subscription - All Programs', ARRAY['{"name": "All Programs Monthly", "description": "Access to Personal Training, Group Fitness, Ballet, and Hip Hop", "amount": 19900, "quantity": 1}']::jsonb[], true, 1592, 21492, 0, 19900, NOW() - INTERVAL '15 days' + INTERVAL '15 days', 'paid', 'sub_01JDQR8XYZABCDEFGHIJKLMO', NOW() - INTERVAL '15 days', NOW() + INTERVAL '15 days', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days');

-- Bob Johnson - One-time Package Invoice
INSERT INTO member_invoices (id, member_id, location_id, description, items, paid, tax, total, discount, subtotal, due_date, status, member_package_id, created_at, updated_at) VALUES
('inv_01JDQR8XYZABCDEFGHIJKLMX', 'mbr_Dy9nLgE5S38pQR5xq9snny', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'All Programs Package - One-time Purchase', ARRAY['{"name": "All Programs Package", "description": "One-time access to all programs with 50 class limit", "amount": 100000, "quantity": 1}']::jsonb[], true, 8000, 108000, 0, 100000, NOW() - INTERVAL '15 days' + INTERVAL '30 days', 'paid', 'pkg_01JDQR8XYZABCDEFGHIJKLMN', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days');

-- Alice Williams - One-time Package Invoice
INSERT INTO member_invoices (id, member_id, location_id, description, items, paid, tax, total, discount, subtotal, due_date, status, member_package_id, created_at, updated_at) VALUES
('inv_01JDQR8XYZABCDEFGHIJKLMW', 'mbr_Ez0oMhF6T49qRS6yr0tooz', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'All Programs Package - One-time Purchase', ARRAY['{"name": "All Programs Package", "description": "One-time access to all programs with 50 class limit", "amount": 100000, "quantity": 1}']::jsonb[], true, 8000, 108000, 0, 100000, NOW() - INTERVAL '60 days' + INTERVAL '30 days', 'paid', 'pkg_01JDQR8XYZABCDEFGHIJKLMO', NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days');

-- Yoda Master - Monthly Subscription Invoice
INSERT INTO member_invoices (id, member_id, location_id, description, items, paid, tax, total, discount, subtotal, due_date, status, member_subscription_id, for_period_start, for_period_end, created_at, updated_at) VALUES
('inv_01JDQR8XYZABCDEFGHIJKLMV', 'mbr_Bw3LjEcQ9R72NOP9vo3qllw', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'Monthly Subscription - All Programs', ARRAY['{"name": "All Programs Monthly", "description": "Access to Personal Training, Group Fitness, Ballet, and Hip Hop", "amount": 19900, "quantity": 1}']::jsonb[], true, 1592, 21492, 0, 19900, NOW() - INTERVAL '7 days' + INTERVAL '15 days', 'paid', 'sub_01JDQR8XYZABCDEFGHIJKLMQ', NOW() - INTERVAL '7 days', NOW() + INTERVAL '23 days', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days');

-- =========================================
-- TRANSACTIONS (Payment records)
-- =========================================

-- John Doe Transactions (12 months)
INSERT INTO transactions (id, member_id, location_id, description, type, amount, tax_amount, status, payment_method, invoice_id, subscription_id, charge_date, created_at, updated_at) VALUES
('txn_01JDQR8XYZABCDEFGHIJKLMN', 'mbr_BpT7jEb3Q16nOPL3vo7qlw', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'Monthly Subscription Payment - All Programs', 'inbound', 21492, 1592, 'paid', 'card', 'inv_01JDQR8XYZABCDEFGHIJKLMN', 'sub_01JDQR8XYZABCDEFGHIJKLMN', NOW() - INTERVAL '11 months' + INTERVAL '2 days', NOW() - INTERVAL '11 months' + INTERVAL '2 days', NOW() - INTERVAL '11 months' + INTERVAL '2 days'),
('txn_01JDQR8XYZABCDEFGHIJKLT2', 'mbr_BpT7jEb3Q16nOPL3vo7qlw', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'Monthly Subscription Payment - All Programs', 'inbound', 21492, 1592, 'paid', 'card', 'inv_01JDQR8XYZABCDEFGHIJKLM2', 'sub_01JDQR8XYZABCDEFGHIJKLMN', NOW() - INTERVAL '10 months' + INTERVAL '2 days', NOW() - INTERVAL '10 months' + INTERVAL '2 days', NOW() - INTERVAL '10 months' + INTERVAL '2 days'),
('txn_01JDQR8XYZABCDEFGHIJKLT3', 'mbr_BpT7jEb3Q16nOPL3vo7qlw', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'Monthly Subscription Payment - All Programs', 'inbound', 21492, 1592, 'paid', 'card', 'inv_01JDQR8XYZABCDEFGHIJKLM3', 'sub_01JDQR8XYZABCDEFGHIJKLMN', NOW() - INTERVAL '9 months' + INTERVAL '2 days', NOW() - INTERVAL '9 months' + INTERVAL '2 days', NOW() - INTERVAL '9 months' + INTERVAL '2 days'),
('txn_01JDQR8XYZABCDEFGHIJKLT4', 'mbr_BpT7jEb3Q16nOPL3vo7qlw', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'Monthly Subscription Payment - All Programs', 'inbound', 21492, 1592, 'paid', 'card', 'inv_01JDQR8XYZABCDEFGHIJKLM4', 'sub_01JDQR8XYZABCDEFGHIJKLMN', NOW() - INTERVAL '8 months' + INTERVAL '2 days', NOW() - INTERVAL '8 months' + INTERVAL '2 days', NOW() - INTERVAL '8 months' + INTERVAL '2 days'),
('txn_01JDQR8XYZABCDEFGHIJKLT5', 'mbr_BpT7jEb3Q16nOPL3vo7qlw', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'Monthly Subscription Payment - All Programs', 'inbound', 21492, 1592, 'paid', 'card', 'inv_01JDQR8XYZABCDEFGHIJKLM5', 'sub_01JDQR8XYZABCDEFGHIJKLMN', NOW() - INTERVAL '7 months' + INTERVAL '2 days', NOW() - INTERVAL '7 months' + INTERVAL '2 days', NOW() - INTERVAL '7 months' + INTERVAL '2 days'),
('txn_01JDQR8XYZABCDEFGHIJKLT6', 'mbr_BpT7jEb3Q16nOPL3vo7qlw', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'Monthly Subscription Payment - All Programs', 'inbound', 21492, 1592, 'paid', 'card', 'inv_01JDQR8XYZABCDEFGHIJKLM6', 'sub_01JDQR8XYZABCDEFGHIJKLMN', NOW() - INTERVAL '6 months' + INTERVAL '2 days', NOW() - INTERVAL '6 months' + INTERVAL '2 days', NOW() - INTERVAL '6 months' + INTERVAL '2 days'),
('txn_01JDQR8XYZABCDEFGHIJKLT7', 'mbr_BpT7jEb3Q16nOPL3vo7qlw', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'Monthly Subscription Payment - All Programs', 'inbound', 21492, 1592, 'paid', 'card', 'inv_01JDQR8XYZABCDEFGHIJKLM7', 'sub_01JDQR8XYZABCDEFGHIJKLMN', NOW() - INTERVAL '5 months' + INTERVAL '2 days', NOW() - INTERVAL '5 months' + INTERVAL '2 days', NOW() - INTERVAL '5 months' + INTERVAL '2 days'),
('txn_01JDQR8XYZABCDEFGHIJKLT8', 'mbr_BpT7jEb3Q16nOPL3vo7qlw', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'Monthly Subscription Payment - All Programs', 'inbound', 21492, 1592, 'paid', 'card', 'inv_01JDQR8XYZABCDEFGHIJKLM8', 'sub_01JDQR8XYZABCDEFGHIJKLMN', NOW() - INTERVAL '4 months' + INTERVAL '2 days', NOW() - INTERVAL '4 months' + INTERVAL '2 days', NOW() - INTERVAL '4 months' + INTERVAL '2 days'),
('txn_01JDQR8XYZABCDEFGHIJKLT9', 'mbr_BpT7jEb3Q16nOPL3vo7qlw', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'Monthly Subscription Payment - All Programs', 'inbound', 21492, 1592, 'paid', 'card', 'inv_01JDQR8XYZABCDEFGHIJKLM9', 'sub_01JDQR8XYZABCDEFGHIJKLMN', NOW() - INTERVAL '3 months' + INTERVAL '2 days', NOW() - INTERVAL '3 months' + INTERVAL '2 days', NOW() - INTERVAL '3 months' + INTERVAL '2 days'),
('txn_01JDQR8XYZABCDEFGHIJKLTA', 'mbr_BpT7jEb3Q16nOPL3vo7qlw', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'Monthly Subscription Payment - All Programs', 'inbound', 21492, 1592, 'paid', 'card', 'inv_01JDQR8XYZABCDEFGHIJKLMA', 'sub_01JDQR8XYZABCDEFGHIJKLMN', NOW() - INTERVAL '2 months' + INTERVAL '2 days', NOW() - INTERVAL '2 months' + INTERVAL '2 days', NOW() - INTERVAL '2 months' + INTERVAL '2 days'),
('txn_01JDQR8XYZABCDEFGHIJKLTB', 'mbr_BpT7jEb3Q16nOPL3vo7qlw', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'Monthly Subscription Payment - All Programs', 'inbound', 21492, 1592, 'paid', 'card', 'inv_01JDQR8XYZABCDEFGHIJKLMB', 'sub_01JDQR8XYZABCDEFGHIJKLMN', NOW() - INTERVAL '1 month' + INTERVAL '2 days', NOW() - INTERVAL '1 month' + INTERVAL '2 days', NOW() - INTERVAL '1 month' + INTERVAL '2 days'),
('txn_01JDQR8XYZABCDEFGHIJKLMQ', 'mbr_BpT7jEb3Q16nOPL3vo7qlw', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'Monthly Subscription Payment - All Programs', 'inbound', 21492, 1592, 'paid', 'card', 'inv_01JDQR8XYZABCDEFGHIJKLMQ', 'sub_01JDQR8XYZABCDEFGHIJKLMN', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day');

-- Jane Smith Transactions
INSERT INTO transactions (id, member_id, location_id, description, type, amount, tax_amount, status, payment_method, invoice_id, subscription_id, charge_date, created_at, updated_at) VALUES
('txn_01JDQR8XYZABCDEFGHIJKLMZ', 'mbr_Cx8mKfD4R27oPQ4wp8rmmx', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'Monthly Subscription Payment - All Programs', 'inbound', 21492, 1592, 'paid', 'card', 'inv_01JDQR8XYZABCDEFGHIJKLMZ', 'sub_01JDQR8XYZABCDEFGHIJKLMO', NOW() - INTERVAL '45 days' + INTERVAL '3 days', NOW() - INTERVAL '45 days' + INTERVAL '3 days', NOW() - INTERVAL '45 days' + INTERVAL '3 days'),
('txn_01JDQR8XYZABCDEFGHIJKLMY', 'mbr_Cx8mKfD4R27oPQ4wp8rmmx', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'Monthly Subscription Payment - All Programs', 'inbound', 21492, 1592, 'paid', 'card', 'inv_01JDQR8XYZABCDEFGHIJKLMY', 'sub_01JDQR8XYZABCDEFGHIJKLMO', NOW() - INTERVAL '15 days' + INTERVAL '2 days', NOW() - INTERVAL '15 days' + INTERVAL '2 days', NOW() - INTERVAL '15 days' + INTERVAL '2 days');

-- Bob Johnson Transaction
INSERT INTO transactions (id, member_id, location_id, description, type, amount, tax_amount, status, payment_method, invoice_id, package_id, charge_date, created_at, updated_at) VALUES
('txn_01JDQR8XYZABCDEFGHIJKLMX', 'mbr_Dy9nLgE5S38pQR5xq9snny', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'All Programs Package Payment', 'inbound', 108000, 8000, 'paid', 'card', 'inv_01JDQR8XYZABCDEFGHIJKLMX', 'pkg_01JDQR8XYZABCDEFGHIJKLMN', NOW() - INTERVAL '15 days' + INTERVAL '5 days', NOW() - INTERVAL '15 days' + INTERVAL '5 days', NOW() - INTERVAL '15 days' + INTERVAL '5 days');

-- Alice Williams Transaction
INSERT INTO transactions (id, member_id, location_id, description, type, amount, tax_amount, status, payment_method, invoice_id, package_id, charge_date, created_at, updated_at) VALUES
('txn_01JDQR8XYZABCDEFGHIJKLMW', 'mbr_Ez0oMhF6T49qRS6yr0tooz', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'All Programs Package Payment', 'inbound', 108000, 8000, 'paid', 'card', 'inv_01JDQR8XYZABCDEFGHIJKLMW', 'pkg_01JDQR8XYZABCDEFGHIJKLMO', NOW() - INTERVAL '60 days' + INTERVAL '3 days', NOW() - INTERVAL '60 days' + INTERVAL '3 days', NOW() - INTERVAL '60 days' + INTERVAL '3 days');

-- Yoda Master Transaction
INSERT INTO transactions (id, member_id, location_id, description, type, amount, tax_amount, status, payment_method, invoice_id, subscription_id, charge_date, created_at, updated_at) VALUES
('txn_01JDQR8XYZABCDEFGHIJKLMV', 'mbr_Bw3LjEcQ9R72NOP9vo3qllw', 'acc_BpT7jEb3Q16nOPL3vo7qlw', 'Monthly Subscription Payment - All Programs', 'inbound', 21492, 1592, 'paid', 'card', 'inv_01JDQR8XYZABCDEFGHIJKLMV', 'sub_01JDQR8XYZABCDEFGHIJKLMQ', NOW() - INTERVAL '7 days' + INTERVAL '1 day', NOW() - INTERVAL '7 days' + INTERVAL '1 day', NOW() - INTERVAL '7 days' + INTERVAL '1 day');


-- =========================================
-- GROUPS FOR NEW LOCATION
-- =========================================

-- Create 2 groups for the new location
INSERT INTO groups (id, name, description, location_id, icon, cover_image, metadata, created_at, updated_at) VALUES
('grp_QWJjRGVmR2hpS2xtTm9wUXJzdFV2d1h5eg', 'Community Group 1', 'A general community group for members to connect and share', 'acc_BpT7jEb3Q16nOPL3vo7qlw', '👥', 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800', '{"category": "general", "privacy": "public", "max_members": 100}'::jsonb, NOW() - INTERVAL '30 days', NOW()),
('grp_WFlaW1xdXl9gYWNkZWZnaGlqa2xtbm9wcQ', 'Community Group 2', 'Another community group for discussions and activities', 'acc_BpT7jEb3Q16nOPL3vo7qlw', '🌟', 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800', '{"category": "general", "privacy": "public", "max_members": 150}'::jsonb, NOW() - INTERVAL '25 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- =========================================
-- GROUP MEMBERS
-- =========================================

-- Add members to Group 1
INSERT INTO group_members (group_id, user_id, role, joined_at) VALUES
('grp_QWJjRGVmR2hpS2xtTm9wUXJzdFV2d1h5eg', 'usr_BpT7jEb3Q16nOPL3vo7qlw', 'owner', NOW() - INTERVAL '30 days'),
('grp_QWJjRGVmR2hpS2xtTm9wUXJzdFV2d1h5eg', 'usr_Cx8mKfD4R27oPQ4wp8rmmx', 'admin', NOW() - INTERVAL '28 days'),
('grp_QWJjRGVmR2hpS2xtTm9wUXJzdFV2d1h5eg', 'usr_Bw3LjEcQ9R72NOP9vo3qllw', 'member', NOW() - INTERVAL '25 days'),
('grp_QWJjRGVmR2hpS2xtTm9wUXJzdFV2d1h5eg', 'usr_Ez0oMhF6T49qRS6yr0tooz', 'member', NOW() - INTERVAL '22 days'),
('grp_QWJjRGVmR2hpS2xtTm9wUXJzdFV2d1h5eg', 'usr_Fa1pNiG7U50rST7zs1uppa', 'member', NOW() - INTERVAL '20 days')
ON CONFLICT (group_id, user_id) DO NOTHING;

-- Add members to Group 2
INSERT INTO group_members (group_id, user_id, role, joined_at) VALUES
('grp_WFlaW1xdXl9gYWNkZWZnaGlqa2xtbm9wcQ', 'usr_Gb2qOjH8V61sTU8at2vqqb', 'owner', NOW() - INTERVAL '25 days'),
('grp_WFlaW1xdXl9gYWNkZWZnaGlqa2xtbm9wcQ', 'usr_Hc3rPkI9W72tUV9bu3wrrc', 'admin', NOW() - INTERVAL '23 days'),
('grp_WFlaW1xdXl9gYWNkZWZnaGlqa2xtbm9wcQ', 'usr_Bw3LjEcQ9R72NOP9vo3qllw', 'member', NOW() - INTERVAL '20 days'),
('grp_WFlaW1xdXl9gYWNkZWZnaGlqa2xtbm9wcQ', 'usr_Je5tRmK1Y94vWX1dw5ytte', 'member', NOW() - INTERVAL '18 days'),
('grp_WFlaW1xdXl9gYWNkZWZnaGlqa2xtbm9wcQ', 'usr_Kf6uSnL2Z05wXY2ex6zuuf', 'admin', NOW() - INTERVAL '15 days')
ON CONFLICT (group_id, user_id) DO NOTHING;

-- =========================================
-- GROUP POSTS
-- =========================================

-- Posts for Group 1
INSERT INTO group_posts (id, group_id, user_id, pinned, status, content, attachments, metadata, created_at, updated_at) VALUES
('QWJjRGVmR2hpS2xtTm9wUXJzdFV2d1h5eg', 'grp_QWJjRGVmR2hpS2xtTm9wUXJzdFV2d1h5eg', 'usr_BpT7jEb3Q16nOPL3vo7qlw', true, 'published', 'Welcome to our community! 🎉 

This is a space where we can connect and share experiences. Everyone is welcome here.

Let''s build a supportive community together! 

What would you like to discuss today?', '[]'::jsonb, '{"likes": 12, "comments": 8}'::jsonb, NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),

('RGVmR2hpS2xtTm9wUXJzdFV2d1h5emFiY2Rl', 'grp_QWJjRGVmR2hpS2xtTm9wUXJzdFV2d1h5eg', 'usr_Cx8mKfD4R27oPQ4wp8rmmx', false, 'published', 'Just wanted to share something exciting! 

I''ve been working on a new project and wanted to get some feedback from the community.

Anyone else working on interesting projects?', '[]'::jsonb, '{"likes": 18, "comments": 15}'::jsonb, NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days'),

('R2hpS2xtTm9wUXJzdFV2d1h5emFiY2RlZmdo', 'grp_QWJjRGVmR2hpS2xtTm9wUXJzdFV2d1h5eg', 'usr_Ez0oMhF6T49qRS6yr0tooz', false, 'published', 'Morning update! 

Today I''m focusing on some new goals and wanted to share with everyone.

What are you working on today?', '[]'::jsonb, '{"likes": 9, "comments": 6}'::jsonb, NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),

('S2xtTm9wUXJzdFV2d1h5emFiY2RlZmdoaWpr', 'grp_QWJjRGVmR2hpS2xtTm9wUXJzdFV2d1h5eg', 'usr_Bw3LjEcQ9R72NOP9vo3qllw', false, 'published', 'Wisdom I share with you today. 

Patience and persistence, important they are. Quick results, you seek not. Long-term success, your goal should be.

Work hard, rest well, think clearly. The force of good decisions, may it be with you all.', '[]'::jsonb, '{"likes": 25, "comments": 12}'::jsonb, NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days'),

('Tm9wUXJzdFV2d1h5emFiY2RlZmdoaWprbG1u', 'grp_QWJjRGVmR2hpS2xtTm9wUXJzdFV2d1h5eg', 'usr_Fa1pNiG7U50rST7zs1uppa', false, 'published', 'Weekend check-in! 

Just finished working on something interesting. The energy today is great.

Pro tip: Find someone to collaborate with! Having a partner makes all the difference. 

Anyone want to work together on something?', '[]'::jsonb, '{"likes": 14, "comments": 9}'::jsonb, NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days');

-- Posts for Group 2
INSERT INTO group_posts (id, group_id, user_id, pinned, status, content, attachments, metadata, created_at, updated_at) VALUES
('UXJzdFV2d1h5emFiY2RlZmdoaWprbG1ub3Bx', 'grp_WFlaW1xdXl9gYWNkZWZnaGlqa2xtbm9wcQ', 'usr_Gb2qOjH8V61sTU8at2vqqb', true, 'published', 'Welcome to our second community! 🌱

Here we focus on general discussions and activities. 

Let''s share ideas and support each other in our endeavors.

Remember: Small steps lead to big results. What''s one thing you want to focus on this week?', '[]'::jsonb, '{"likes": 16, "comments": 11}'::jsonb, NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days'),

('cnN0VXZ3WHl6YWJjZGVmaGlqa2xtbm9wcXJz', 'grp_WFlaW1xdXl9gYWNkZWZnaGlqa2xtbm9wcQ', 'usr_Hc3rPkI9W72tUV9bu3wrrc', false, 'published', 'Planning session! 🥗

Working on some new ideas for the week:
- Project planning
- Goal setting
- Resource organization

Planning ahead makes everything so much easier. What are your planning strategies?', '[]'::jsonb, '{"likes": 22, "comments": 18}'::jsonb, NOW() - INTERVAL '22 days', NOW() - INTERVAL '22 days'),

('dXZ3WHl6YWJjZGVmaGlqa2xtbm9wcXJzdHV2', 'grp_WFlaW1xdXl9gYWNkZWZnaGlqa2xtbm9wcQ', 'usr_Je5tRmK1Y94vWX1dw5ytte', false, 'published', 'Mindful Monday! 🧘‍♀️

Started my day with some quiet time and it made such a difference. Taking time to center yourself is so important.

I''ve been using a simple technique:
- 4 counts in
- Hold for 4 counts  
- 4 counts out
- Hold for 4 counts

Anyone else practicing mindfulness? Would love to hear your techniques!', '[]'::jsonb, '{"likes": 19, "comments": 13}'::jsonb, NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),

('d1h5emFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3', 'grp_WFlaW1xdXl9gYWNkZWZnaGlqa2xtbm9wcQ', 'usr_Bw3LjEcQ9R72NOP9vo3qllw', false, 'published', 'Balance in all things, there must be. 🧘‍♂️

Mind, body, and spirit - connected they are. Work well, rest often, think clearly.

Ancient wisdom, I share with you:
- Listen to yourself, you must
- Nourish with good choices, you should  
- Move with purpose, not haste
- Rest as important as action is

The path to success, a journey it is, not a destination. Patience and kindness to yourself, show.', '[]'::jsonb, '{"likes": 28, "comments": 16}'::jsonb, NOW() - INTERVAL '17 days', NOW() - INTERVAL '17 days'),

('eXl6YWJjZGVmaGlqa2xtbm9wcXJzdHV2d3h5', 'grp_WFlaW1xdXl9gYWNkZWZnaGlqa2xtbm9wcQ', 'usr_Kf6uSnL2Z05wXY2ex6zuuf', false, 'published', 'Organization tips! 😴

I''ve been working on improving my daily routine and it''s made such a difference in my productivity and overall mood.

My morning routine:
- No distractions for 1 hour
- Planning and journaling instead
- Clean workspace
- Consistent schedule

Getting organized has been a game changer. What are your best organization tips?', '[]'::jsonb, '{"likes": 17, "comments": 14}'::jsonb, NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days'),

('emFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6', 'grp_WFlaW1xdXl9gYWNkZWZnaGlqa2xtbm9wcQ', 'usr_Hc3rPkI9W72tUV9bu3wrrc', false, 'published', 'Learning challenge! 💧

I''m challenging myself to learn something new every day. I''ve been using a learning app and it''s been eye-opening to see how much I can absorb.

Goal: 30 minutes of learning per day
Current streak: 5 days! 

Anyone want to join me in this learning challenge? We can keep each other accountable!', '[]'::jsonb, '{"likes": 13, "comments": 10}'::jsonb, NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days');