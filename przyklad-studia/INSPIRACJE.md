---
typ: research
projekt: AVELNORY
runda: 7
temat: przykładowa strona studia — inspiracje i kierunek marki „Werniks”
data: 2026-11-18
autor: Dyrektor Kreatywny
---

# Przykład studia — inspiracje i kierunek

Właściciel: strona przykładowa ma być „totalnie z innej bajki”, nie kopią głównej strony AVELNORY. Poniżej to, co obejrzałem 18.11.2026 na żywych stronach, co z każdej biorę i jaki kierunek z tego wynika.

## Obejrzane strony

| Strona | Co na niej jest (sprawdzone) | Co biorę | Czego nie biorę |
|---|---|---|---|
| [Hyer Quality Detail](https://www.hyerqualitydetail.com/), Tempe, USA | Jasne tło (#EEE), H1 z miastem i usługą: „Tempe, AZ's Premier Automotive Protection and Styling Specialists”, menu ułożone wg trzech filarów Protect / Refine / Enhance, telefon i „free estimate” w pierwszym ekranie. Zarla opisuje jej hero jako tryptyk trzech zbliżeń. | Jasna, „galeryjna” baza zamiast ciemnej hali. H1 = usługa + miasto (SEO lokalne). Usługi pogrupowane w 3 rodziny: lakier, ochrona, wnętrze. | Mega-menu z 25 pozycjami, listy marek folii. |
| [Detail Mavericks ATX](https://detailmavericksatx.com/), Austin, USA | Cały cennik na stronie głównej, ceny w dolarach przy każdym pakiecie ($125–$1 000+), sekcja „Easy Auto Detailing Process”, H2 z frazami lokalnymi. | Pełny cennik z cenami „od” bez „zadzwoń po wycenę”; proces wizyty krok po kroku; H2 z frazami. | Wygląd (Poppins, białe karty) — szablonowy. |
| [CCT Auto Protection Studio](https://www.ceramiccoattexas.com/), Austin, USA | H1 „Paint Protection Film, Ceramic Coating and Window Tint in Austin, TX”, pasek z ofertą i ceną na samej górze, w hero zbliżenie perlącej się wody. | Zdjęcie kropli jako dowód działania powłoki (kadr „krople”); telefon w pierwszym ekranie. | Wersaliki w nagłówkach, czarno-pomarańczowa paleta. |
| [KM0 Detailing Studio](https://www.km0detailingstudio.com/), Costa del Sol, Hiszpania (wyróżnienie Made in Webflow) | Kolejność: usługi → ceny → o nas → opinie → FAQ → kontakt; H1 z regionem; FAQ jako osobna sekcja. | Kolejność sekcji i FAQ z prawdziwymi pytaniami klientów. | 5 wideo w tle, ciemny motyw, wersaliki. |
| [Q Refinish](https://www.qrefinish.com/) (Awwwards Nominee, CSS Winner SOTD wg opisu Webflow) | Krótki, pewny siebie nagłówek „Evolution not Revolution”, dużo powietrza, jeden krój bezszeryfowy, ruch tylko w hero (wideo). | Pewność tonu i powietrze: mało słów w hero, jeden mocny obraz. | Czarne tło i wideo — to bliżej AVELNORY. |
| [Singer Vehicle Design](https://singervehicledesign.com/) (wzorzec spoza detailingu: restomody premium) | Nagłówek w wąskim, lekkim kroju („A Relentless Pursuit of Excellence”), krótkie akapity „filozofii”, produkt pokazany jak eksponat. | Ton „pracowni rzemieślniczej” i pokazywanie przedmiotu jak eksponatu w galerii — stąd felga na obrotowym podeście. | Ciemny motyw, wersaliki. |
| [Przegląd Zarla „Car Detailing Website Design”](https://www.zarla.com/inspiration/car-detailing) (aktualizacja X 2026) | Wnioski z 15 stron: przejrzyste ceny, dowody (realizacje), większość studiów używa ciemnych motywów, żeby lakier „błyszczał”. | Potwierdzenie, że jasna paleta odróżni przykład od rynku i od AVELNORY. | — |
| [Awwwards: RAYTH](https://www.awwwards.com/sites/rayth-the-detailing-center) | Okazało się, że to firma montująca domykacze drzwi, nie detailing. | Nic — odrzucone. | — |

Nie znalazłem polskiego studia detailingu z wyróżnieniem Awwwards; wpis „Autoklinika” w katalogu Awwwards nie potwierdza, że to studio detailingu.

## Kierunek: „Werniks — pracownia detailingu”

**Nazwa.** „Lustro” kojarzy się z hasłem AVELNORY „Z lakieru robisz lustro”, więc studio dostaje nową nazwę: **Werniks** (werniks to bezbarwna warstwa ochronna na obrazie — dokładnie to, czym jest powłoka ceramiczna). Nazwa fikcyjna, oznaczona jako przykład. Folder zostaje `przyklad-studia/`, żeby nie psuć linków z cennika.

**Charakter.** Jasne studio fotograficzne i pracownia rzemieślnicza, nie nocna hala. Auto i felga pokazane jak eksponat na podeście.

**Moodboard (opis, bez kopiowania):**
1. Jasna cyklorama studia fotograficznego, miękkie światło dzienne, cień kontaktowy pod przedmiotem.
2. Toczona, polerowana felga ze srebrnym licem i wiśniowym zaciskiem w głębi.
3. Karta katalogu konserwatora: typograficzna tabela, ceny i czasy jak w specyfikacji.

**Wzorce:** Hyer Quality Detail (jasna baza, H1 z miastem), Detail Mavericks (pełny cennik), Singer (ton pracowni i przedmiot jak eksponat).

## Tokeny

| Rola | Nazwa | Hex |
|---|---|---|
| Tło | kreda | #E7E6E1 |
| Powierzchnie | papier | #F3F3EF |
| Tekst | grafit | #1E1C1B |
| Tekst pomocniczy | popiel | #5C5955 |
| Linie, nieaktywne | srebro | #A9ABA8 |
| Akcent (przyciski, zacisk, sekcja oferty) | wiśnia | #6B1D29 |

- **Typografia:** Fraunces (szeryf o zmiennej grubości i rozmiarze optycznym, OFL) w nagłówkach i cenach; Schibsted Grotesk (OFL) w tekście i formularzach. Oba przycięte do latin + polskie znaki, razem 97 KB.
- **Siatka:** 12 kolumn, margines `clamp(20px, 4vw, 64px)`, maks. 1320 px; tekst wyrównany do lewej, wiersze do ~70 znaków.
- **Zaokrąglenia według hierarchii:** przyciski 999 px (pigułka), pola formularza 6 px, zdjęcia 2 px, tabele 0.
- **Zasady:** jeden zapamiętywalny moment (felga wtacza się do kadru i obraca na podeście, przewijanie obraca ją dalej); reszta spokojna. Bez wersalikowych etykiet, bez kropek „·”, bez monospace, bez strzałek „→”, bez numeracji tam, gdzie nie ma kolejności (numery tylko w procesie wizyty).

## Krytyka planu (frontend-design)

- Pierwszy szkic: kremowe tło + szeryf + terakota — to dokładnie „tik” nr 1 z listy generycznych. Zmieniłem krem na chłodną kredę (szarość), terakotę na wiśnię, a szeryf ustawiłem lekko (waga ~380), nie kontrastowo-modowo.
- Pierwszy pomysł na 3D: obracająca się butelka powłoki — za mało detailingu i za mało ruchu. Felga ma ruch naturalny (toczy się), odbicia na licu i wiśniowy zacisk spina scenę z paletą.
- Ryzyko „broadsheet”: linie tylko w tabelach z danymi, sekcje oddzielone powietrzem, nie kreskami.

## Różnice względem AVELNORY (do porównania obok siebie)

| Element | AVELNORY | Werniks (przykład) |
|---|---|---|
| Tło | czerń / grafit, nocna hala | jasna kreda, studio dzienne |
| Akcent | cyjan | wiśnia |
| Kroje | Archivo Expanded + JetBrains Mono | Fraunces + Schibsted Grotesk |
| 3D | maska z lakierem, sześciokątne świetlówki, polerka | felga na podeście, miękkie softboxy, toczenie |
| Interakcja | kursor-lampa, suwak przed/po | lekkie wychylenie felgi za kursorem, kalkulator, godziny „teraz otwarte” |
| Etykiety | „01 / …” w monospace | brak etykiet nad nagłówkami |
