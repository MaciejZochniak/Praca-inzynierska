INSERT INTO categories (id, name, description, created_at)
VALUES 
  (1, 'Kosiarki i aeratory', 'Maszyny do regularnej pielęgnacji i napowietrzania trawnika', NOW()),
  (2, 'Glebogryzarki i zagęszczarki', 'Ciężki sprzęt do rekultywacji gruntu, spulchniania i prac ziemnych', NOW()),
  (3, 'Pilarki i nożyce', 'Urządzenia do formowania żywopłotów, cięcia gałęzi i wycinki drzew', NOW()),
  (4, 'Narzędzia ogrodowe i myjki', 'Myjki ciśnieniowe, dmuchawy do liści, opryskiwacze i rozdrabniacze', NOW()),
  (10, 'Koszenie i wertykulacja', 'Kompleksowe usługi koszenia trawników i działek oraz regeneracji darni', NOW()),
  (11, 'Cięcie i pielęgnacja drzew/krzewów', 'Profesjonalne formowanie koron, żywopłotów i wycinka arborystyczna', NOW()),
  (12, 'Przygotowanie terenu i siew', 'Glebogryzowanie, niwelacja terenu i profesjonalne zakładanie trawników', NOW()),
  (13, 'Karczowanie i porządkowanie działki', 'Czyszczenie zaniedbanych parceli, usuwanie pni i wywóz biomasy', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO items (id, category_id, name, description, price, is_available, image_url, created_at)
VALUES 
  (1, 1, 'Kosiarka spalinowa z napędem STIHL', 'Szerokość robocza 51 cm, silnik 4-suwowy 3.2 KM, pojemny kosz 70 l. Idealna do trawników do 2000 m².', 90.00, true, '/images/kosiarka.jpg', NOW()),
  (2, 1, 'Wertykulator spalinowy AL-KO Combi', 'Usuwa mech i filc, napowietrza glebę. Wyposażony w wałek z 14 stalowymi nożami i kosz zbierający.', 110.00, true, '/images/kosiarka.jpg', NOW()),
  (3, 1, 'Traktorek kosiarka Husqvarna TS 138', 'Szerokość koszenia 97 cm, przekładnia hydrostatyczna. Doskonały na działki powyżej 3000 m².', 280.00, true, '/images/kosiarka.jpg', NOW()),
  (4, 2, 'Glebogryzarka spalinowa Honda FJ 500', 'Mocna glebogryzarka z biegiem wstecznym, szerokość robocza do 80 cm. Spulchnia zbitą i gliniastą glebę.', 140.00, true, '/images/kosiarka.jpg', NOW()),
  (5, 2, 'Zagęszczarka gruntu 90 kg Wacker Neuson', 'Płyta wibracyjna do utwardzania podjazdów, ścieżek ogrodowych i układania kostki brukowej. W zestawie mata gumowa.', 120.00, true, '/images/kosiarka.jpg', NOW()),
  (6, 3, 'Pilarka łańcuchowa STIHL MS 261', 'Profesjonalna pilarka spalinowa o mocy 4.1 KM. Długość prowadnicy 40 cm. Do przygotowania drewna i ścinki.', 85.00, true, '/images/kosiarka.jpg', NOW()),
  (7, 3, 'Nożyce spalinowe do żywopłotu STIHL HS 45', 'Dwustronna listwa tnąca 60 cm. Precyzyjne cięcie i formowanie krzewów ozdobnych oraz gęstych żywopłotów.', 75.00, true, '/images/kosiarka.jpg', NOW()),
  (8, 4, 'Myjka ciśnieniowa Kärcher K7 Professional', 'Ciśnienie 180 bar, wąż 10 m, bęben na wąż, przystawka T-Racer do mycia kostki brukowej i tarasów.', 95.00, true, '/images/kosiarka.jpg', NOW()),
  (9, 4, 'Rębak do gałęzi spalinowy Lumag RAMBO', 'Rozdrabniacz rębający gałęzie o średnicy do 100 mm. Zrębki idealne do ściółkowania rabat.', 160.00, true, '/images/kosiarka.jpg', NOW()),
  (10, 10, 'Usługa: Kompleksowe koszenie trawnika', 'Koszenie kosiarką z koszem lub traktorkiem, docinanie krawędzi podkaszarką oraz wywóz skoszonej trawy.', 350.00, true, '/images/kosiarka.jpg', NOW()),
  (11, 10, 'Usługa: Wertykulacja i aeracja trawnika', 'Nacinanie darni, wygrabienie filcu, napowietrzanie i opcjonalny dosiew nasion regeneracyjnych trawy.', 420.00, true, '/images/kosiarka.jpg', NOW()),
  (12, 11, 'Usługa: Cięcie żywopłotów i formowanie krzewów', 'Precyzyjne przycinanie żywopłotów liściastych i iglastych na zadaną wysokość, uprzątnięcie i rozdrobnienie gałęzi.', 300.00, true, '/images/kosiarka.jpg', NOW()),
  (13, 11, 'Usługa: Wycinka i cięcie pielęgnacyjne drzew', 'Wycinka sekcyjna metodą alpinistyczną lub z podnośnika, usuwanie suchych gałęzi zagrażających budynkom.', 600.00, true, '/images/kosiarka.jpg', NOW()),
  (14, 12, 'Usługa: Zakładanie trawnika z siewu / rolki', 'Glebogryzowanie gruntu, usunięcie kamieni i chwastów, niwelacja terenu siatką niwelacyjną i wysiew nasion kwalifikowanych.', 800.00, true, '/images/kosiarka.jpg', NOW()),
  (15, 13, 'Usługa: Karczowanie i czyszczenie zarośniętej działki', 'Usuwanie samosiejek, gęstych zarośli, frezowanie pni, mulczowanie terenu kosiarką bijakową.', 950.00, true, '/images/kosiarka.jpg', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, email, password_hash, first_name, last_name, phone_number, role, created_at)
VALUES (
  1, 
  'jan.kowalski@example.com', 
  '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG', 
  'Jan', 
  'Kowalski', 
  '600700800', 
  'CLIENT', 
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO reservations (id, user_id, item_id, start_time, end_time, total_price, status, created_at)
VALUES (101, 1, 1, '2026-10-01 09:00:00', '2026-10-03 18:00:00', 180.00, 'COMPLETED', '2026-09-28 14:00:00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO reservations_items (id, reservation_id, item_id, quantity, unit_price)
VALUES (101, 101, 1, 1, 90.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO reservations (id, user_id, item_id, start_time, end_time, total_price, status, created_at)
VALUES (102, 1, 10, '2026-10-12 08:00:00', '2026-10-12 16:00:00', 350.00, 'COMPLETED', '2026-10-08 11:30:00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO reservations_items (id, reservation_id, item_id, quantity, unit_price)
VALUES (102, 102, 10, 1, 350.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO reservations (id, user_id, item_id, start_time, end_time, total_price, status, created_at)
VALUES (103, 1, 4, '2026-10-20 10:00:00', '2026-10-22 18:00:00', 280.00, 'CANCELLED', '2026-10-18 16:15:00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO reservations_items (id, reservation_id, item_id, quantity, unit_price)
VALUES (103, 103, 4, 1, 140.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO reservations (id, user_id, item_id, start_time, end_time, total_price, status, created_at)
VALUES (104, 1, 5, '2026-11-20 09:00:00', '2026-11-23 17:00:00', 360.00, 'CONFIRMED', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO reservations_items (id, reservation_id, item_id, quantity, unit_price)
VALUES (104, 104, 5, 1, 120.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO reservations (id, user_id, item_id, start_time, end_time, total_price, status, created_at)
VALUES (105, 1, 12, '2026-11-28 08:00:00', '2026-11-28 16:00:00', 300.00, 'PENDING', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO reservations_items (id, reservation_id, item_id, quantity, unit_price)
VALUES (105, 105, 12, 1, 300.00)
ON CONFLICT (id) DO NOTHING;