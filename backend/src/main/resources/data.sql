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

INSERT INTO items (id, category_id, brand, name, description, price, quantity, is_available, image_url, created_at)
VALUES 
  (1, 1, 'STIHL', 'Kosiarka spalinowa z napędem RM 248', 'Szerokość robocza 51 cm, silnik 4-suwowy 3.2 KM, pojemny kosz 70 l. Idealna do trawników o powierzchni do 2000 m². Centralna, 7-stopniowa regulacja wysokości koszenia.', 90.00, 2, true, '/images/kosiarka.jpg', NOW()),
  (2, 1, 'AL-KO', 'Wertykulator spalinowy Combi Care 38', 'Skutecznie usuwa mech i filc, napowietrza glebę. Wyposażony w wałek z 14 stalowymi nożami, wałek napowietrzający ze sprężynami oraz kosz zbierający 55 l.', 110.00, 1, true, '/images/kosiarka.jpg', NOW()),
  (3, 1, 'Husqvarna', 'Traktorek kosiarka TS 138', 'Szerokość koszenia 97 cm, przekładnia hydrostatyczna sterowana pedałami. Doskonały na rozległe działki powyżej 3000 m².', 280.00, 1, true, '/images/kosiarka.jpg', NOW()),
  (4, 2, 'Honda', 'Glebogryzarka spalinowa FJ 500', 'Mocna glebogryzarka z biegiem wstecznym, szerokość robocza do 80 cm, silnik GX160. Bez trudu spulchnia zbitą i gliniastą glebę pod nowy trawnik.', 140.00, 2, true, '/images/kosiarka.jpg', NOW()),
  (5, 2, 'Wacker Neuson', 'Zagęszczarka gruntu 90 kg VP 1550', 'Płyta wibracyjna do utwardzania podjazdów, ścieżek ogrodowych i układania kostki brukowej. W zestawie dedykowana mata gumowa ochronna.', 120.00, 1, true, '/images/kosiarka.jpg', NOW()),
  (6, 3, 'STIHL', 'Pilarka łańcuchowa MS 261', 'Profesjonalna pilarka spalinowa o mocy 4.1 KM. Długość prowadnicy 40 cm. Niezastąpiona do przygotowania drewna opałowego i ścinki drzew.', 85.00, 3, true, '/images/kosiarka.jpg', NOW()),
  (7, 3, 'STIHL', 'Nożyce spalinowe do żywopłotu HS 45', 'Dwustronna listwa tnąca 60 cm. Precyzyjne cięcie i formowanie krzewów ozdobnych oraz gęstych żywopłotów.', 75.00, 2, true, '/images/kosiarka.jpg', NOW()),
  (8, 4, 'Kärcher', 'Myjka ciśnieniowa K7 Professional', 'Ciśnienie 180 bar, wąż wysokociśnieniowy 10 m, bęben na wąż oraz przystawka T-Racer do bezrozbryzgowego mycia kostki brukowej i tarasów.', 95.00, 2, true, '/images/kosiarka.jpg', NOW()),
  (9, 4, 'Lumag', 'Rębak do gałęzi spalinowy RAMBO HC15', 'Rozdrabniacz spalinowy rębający gałęzie o średnicy do 100 mm. Uzyskane zrębki idealnie nadają się do ściółkowania rabat ogrodowych.', 160.00, 1, true, '/images/kosiarka.jpg', NOW()),
  (10, 10, NULL, 'Usługa: Kompleksowe koszenie trawnika', 'Koszenie kosiarką z koszem lub traktorkiem, docinanie krawędzi podkaszarką oraz wywóz skoszonej biomasy. Cena obejmuje roboczodzień ekipy (do 1500 m²).', 350.00, 2, true, '/images/kosiarka.jpg', NOW()),
  (11, 10, NULL, 'Usługa: Wertykulacja i aeracja trawnika', 'Nacinanie darni na krzyż, wygrabienie filcu, napowietrzanie rurkowe, piaskowanie oraz dosiew nasion regeneracyjnych trawy z nawożeniem.', 420.00, 1, true, '/images/kosiarka.jpg', NOW()),
  (12, 11, NULL, 'Usługa: Cięcie żywopłotów i formowanie krzewów', 'Precyzyjne przycinanie żywopłotów liściastych i iglastych na zadaną wysokość wraz z uprzątnięciem i rozdrobnieniem gałęzi.', 300.00, 2, true, '/images/kosiarka.jpg', NOW()),
  (13, 11, NULL, 'Usługa: Wycinka i cięcie pielęgnacyjne drzew', 'Wycinka sekcyjna metodą alpinistyczną lub z podnośnika koszowego, usuwanie posuszu i gałęzi kolidujących z budynkami.', 600.00, 1, true, '/images/kosiarka.jpg', NOW()),
  (14, 12, NULL, 'Usługa: Zakładanie trawnika z siewu / rolki', 'Glebogryzowanie gruntu, usunięcie kamieni i chwastów, niwelacja terenu łatą, montaż siatki przeciw kretom i wysiew nasion.', 800.00, 1, true, '/images/kosiarka.jpg', NOW()),
  (15, 13, NULL, 'Usługa: Karczowanie i czyszczenie działki', 'Usuwanie samosiejek, gęstych zarośli, frezowanie pni po wycince oraz mulczowanie terenu kosiarką bijakową.', 950.00, 1, true, '/images/kosiarka.jpg', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, email, password_hash, first_name, last_name, phone_number, role, created_at)
VALUES (
  1, 
  'jan.kowalski@example.com', 
  'tajnehaslo123', 
  'Jan', 
  'Kowalski', 
  '600700800', 
  'CLIENT', 
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO reservations (id, user_id, item_id, start_time, end_time, total_price, status, created_at)
VALUES 
  (101, 1, 1, '2026-10-01 09:00:00', '2026-10-03 18:00:00', 180.00, 'COMPLETED', '2026-09-28 14:00:00'),
  (102, 1, 10, '2026-10-12 08:00:00', '2026-10-12 16:00:00', 350.00, 'COMPLETED', '2026-10-08 11:30:00'),
  (103, 1, 4, '2026-10-20 10:00:00', '2026-10-22 18:00:00', 280.00, 'CANCELLED', '2026-10-18 16:15:00'),
  (106, 1, 1, '2026-11-14 08:00:00', '2026-11-17 18:00:00', 270.00, 'CONFIRMED', NOW()),
  (107, 1, 1, '2026-11-15 08:00:00', '2026-11-16 18:00:00', 180.00, 'CONFIRMED', NOW()),
  (108, 1, 2, '2026-11-18 09:00:00', '2026-11-21 18:00:00', 330.00, 'CONFIRMED', NOW()),
  (104, 1, 5, '2026-11-20 09:00:00', '2026-11-23 17:00:00', 360.00, 'CONFIRMED', NOW()),
  (109, 1, 10, '2026-11-19 08:00:00', '2026-11-20 16:00:00', 700.00, 'CONFIRMED', NOW()),
  (110, 1, 10, '2026-11-19 08:00:00', '2026-11-20 16:00:00', 700.00, 'PENDING', NOW()),
  (105, 1, 12, '2026-11-28 08:00:00', '2026-11-28 16:00:00', 300.00, 'PENDING', NOW())
ON CONFLICT (id) DO NOTHING;