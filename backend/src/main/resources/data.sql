INSERT INTO categories (id, name, description, created_at)
VALUES (1, 'Test Kategoria 1', 'Opis test 1', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO items (id, category_id, name, description, price, is_available, image_url)
VALUES (1, 1, 'Test Sprzęt 1', 'Opis sprzętu test 1', 100.00, true, '/images/kosiarka.jpg')
ON CONFLICT (id) DO NOTHING;
