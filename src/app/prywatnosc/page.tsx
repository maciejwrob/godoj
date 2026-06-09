import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Polityka Prywatności — Godoj.co",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Strona Godoj.co
      </Link>

      <h1 className="mb-2 text-3xl font-bold">Polityka Prywatności Godoj.co</h1>
      <p className="mb-10 text-sm text-text-secondary">
        Ostatnia aktualizacja: 9 czerwca 2026 r.
      </p>

      <div className="prose-legal space-y-8 text-text-secondary [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-text-primary [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:font-semibold [&_h3]:text-text-primary [&_p]:mb-3 [&_p]:leading-relaxed [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-1">

        <section>
          <h2>1. Administrator danych</h2>
          <p>
            Administratorem Twoich danych osobowych jest Maciej Wróblewski,
            kontakt: maciej.wrob@gmail.com (dalej: &bdquo;Administrator&rdquo;).
          </p>
        </section>

        <section>
          <h2>2. Jakie dane zbieramy</h2>

          <h3>2.1. Dane podane przez Ciebie</h3>
          <ul>
            <li>Adres e-mail (logowanie)</li>
            <li>Imię / pseudonim (wyświetlane w aplikacji)</li>
            <li>Język ojczysty i język interfejsu (ustawienia)</li>
            <li>Poziom językowy, cele nauki, zainteresowania (onboarding)</li>
          </ul>

          <h3>2.2. Dane generowane podczas korzystania</h3>
          <ul>
            <li>
              <strong>Transkrypcje rozmów</strong> — tekstowy zapis rozmów
              z AI tutorem. Nie nagrywamy audio.
            </li>
            <li>
              <strong>Analizy lekcji</strong> — oceny, komentarze, lista
              słownictwa, rekomendacje poziomu (generowane automatycznie
              przez AI)
            </li>
            <li>
              <strong>Postępy nauki</strong> — XP, poziom, serie, statystyki
            </li>
            <li>
              <strong>Dane techniczne</strong> — czas trwania lekcji,
              data i godzina korzystania
            </li>
          </ul>

          <h3>2.3. Dane płatnicze</h3>
          <p>
            Dane kart płatniczych przetwarzane są wyłącznie przez Stripe.
            Nie mamy dostępu do pełnych numerów kart. Przechowujemy jedynie
            identyfikator klienta Stripe i informacje o subskrypcji (plan,
            status, data odnowienia).
          </p>
        </section>

        <section>
          <h2>3. W jakim celu przetwarzamy dane</h2>
          <ul>
            <li>
              <strong>Świadczenie usługi</strong> — logowanie, prowadzenie
              lekcji, analiza postępów, generowanie podpowiedzi i ocen
              (podstawa: art. 6 ust. 1 lit. b RODO — wykonanie umowy)
            </li>
            <li>
              <strong>Płatności</strong> — obsługa subskrypcji i doładowań
              (podstawa: art. 6 ust. 1 lit. b RODO — wykonanie umowy)
            </li>
            <li>
              <strong>Komunikacja serwisowa</strong> — link do logowania,
              powiadomienia o zmianach w usłudze, przypomnienia o lekcjach
              (podstawa: art. 6 ust. 1 lit. b RODO — wykonanie umowy)
            </li>
            <li>
              <strong>Doskonalenie usługi</strong> — analiza zagregowanych,
              zanonimizowanych statystyk w celu poprawy jakości tutoringu
              (podstawa: art. 6 ust. 1 lit. f RODO — uzasadniony interes)
            </li>
            <li>
              <strong>Marketing</strong> — wysyłanie informacji o nowych
              funkcjach i promocjach, wyłącznie za Twoją zgodą
              (podstawa: art. 6 ust. 1 lit. a RODO — zgoda)
            </li>
          </ul>
        </section>

        <section>
          <h2>4. Komu udostępniamy dane</h2>
          <p>
            Twoje dane przetwarzane są przez następujących dostawców usług
            (podmioty przetwarzające):
          </p>
          <ul>
            <li>
              <strong>Supabase Inc.</strong> (USA) — baza danych,
              uwierzytelnianie. Dane przechowywane na serwerach w UE
              (Frankfurt).
            </li>
            <li>
              <strong>Anthropic PBC</strong> (USA) — analiza lekcji,
              generowanie podpowiedzi i ocen (Claude API). Transkrypcje
              przesyłane do przetworzenia, nie przechowywane długoterminowo
              przez Anthropic.
            </li>
            <li>
              <strong>ElevenLabs Inc.</strong> (USA) — rozpoznawanie i
              synteza mowy w czasie rzeczywistym. Audio przetwarzane w locie,
              nie jest przechowywane.
            </li>
            <li>
              <strong>Stripe Inc.</strong> (USA) — obsługa płatności.
              Stripe jest niezależnym administratorem danych płatniczych.
            </li>
            <li>
              <strong>Resend Inc.</strong> (USA) — wysyłka e-maili
              transakcyjnych (linki logowania, powiadomienia).
            </li>
            <li>
              <strong>Vercel Inc.</strong> (USA) — hosting aplikacji.
              Serwery edge w lokalizacji najbliższej użytkownikowi.
            </li>
          </ul>
          <p>
            Nie sprzedajemy Twoich danych osobom trzecim. Nie udostępniamy
            ich podmiotom zewnętrznym w celach reklamowych.
          </p>
        </section>

        <section>
          <h2>5. Transfer danych poza EOG</h2>
          <p>
            Część naszych dostawców ma siedzibę w USA. Transfer danych odbywa
            się na podstawie standardowych klauzul umownych (SCC) przyjętych
            przez Komisję Europejską oraz, w stosownych przypadkach, programu
            EU-U.S. Data Privacy Framework.
          </p>
        </section>

        <section>
          <h2>6. Jak długo przechowujemy dane</h2>
          <ul>
            <li>
              <strong>Dane konta</strong> — przez okres korzystania z Serwisu
              i do 30 dni po usunięciu konta
            </li>
            <li>
              <strong>Transkrypcje lekcji</strong> — przez okres korzystania
              z Serwisu. Usuwane wraz z kontem.
            </li>
            <li>
              <strong>Dane płatnicze</strong> — zgodnie z wymogami prawa
              podatkowego (5 lat od końca roku podatkowego)
            </li>
            <li>
              <strong>Logi techniczne</strong> — do 90 dni
            </li>
          </ul>
        </section>

        <section>
          <h2>7. Twoje prawa (RODO)</h2>
          <p>Masz prawo do:</p>
          <ul>
            <li>
              <strong>Dostępu</strong> — możesz poprosić o kopię swoich
              danych
            </li>
            <li>
              <strong>Sprostowania</strong> — możesz poprawić nieprawidłowe
              dane w ustawieniach konta lub kontaktując się z nami
            </li>
            <li>
              <strong>Usunięcia</strong> (&bdquo;prawo do bycia zapomnianym&rdquo;) —
              możesz poprosić o usunięcie konta i wszystkich danych
            </li>
            <li>
              <strong>Ograniczenia przetwarzania</strong> — w określonych
              sytuacjach
            </li>
            <li>
              <strong>Przenoszenia danych</strong> — możesz otrzymać swoje
              dane w formacie nadającym się do odczytu maszynowego
            </li>
            <li>
              <strong>Sprzeciwu</strong> — wobec przetwarzania opartego na
              uzasadnionym interesie
            </li>
            <li>
              <strong>Cofnięcia zgody</strong> — w każdej chwili, bez wpływu
              na legalność wcześniejszego przetwarzania
            </li>
          </ul>
          <p>
            Aby skorzystać z tych praw, napisz na maciej.wrob@gmail.com.
            Odpowiemy w ciągu 30 dni.
          </p>
          <p>
            Masz również prawo złożyć skargę do Prezesa Urzędu Ochrony
            Danych Osobowych (PUODO).
          </p>
        </section>

        <section>
          <h2>8. Pliki cookies</h2>

          <h3>8.1. Jakich cookies używamy</h3>
          <p>Serwis używa wyłącznie niezbędnych plików cookies:</p>
          <ul>
            <li>
              <strong>Ciastka sesji</strong> (Supabase Auth) — utrzymanie
              zalogowanego stanu. Wygasają po wylogowaniu lub po 7 dniach
              nieaktywności.
            </li>
            <li>
              <strong>Ciastka Stripe</strong> — niezbędne do bezpiecznego
              przetwarzania płatności. Ustawiane tylko na stronie płatności.
            </li>
            <li>
              <strong>Preferencje lokalne</strong> (localStorage) — język
              interfejsu, aktywny język nauki. Przechowywane tylko w Twojej
              przeglądarce, nie na naszych serwerach.
            </li>
          </ul>

          <h3>8.2. Czego NIE używamy</h3>
          <p>
            Nie używamy plików cookies marketingowych, analitycznych,
            śledzących ani reklamowych. Nie korzystamy z Google Analytics,
            Facebook Pixel ani żadnych narzędzi profilowania.
          </p>
          <p>
            Ponieważ używamy wyłącznie cookies niezbędnych do działania
            usługi, nie wymagamy dodatkowej zgody na cookies zgodnie z art. 5
            ust. 3 dyrektywy ePrivacy.
          </p>
        </section>

        <section>
          <h2>9. Bezpieczeństwo</h2>
          <p>
            Stosujemy odpowiednie środki techniczne i organizacyjne w celu
            ochrony danych:
          </p>
          <ul>
            <li>Szyfrowanie danych w transmisji (HTTPS/TLS)</li>
            <li>
              Uwierzytelnianie bez hasła (magic links) — brak ryzyka
              wycieku haseł
            </li>
            <li>
              Szyfrowanie danych w spoczynku (baza danych Supabase)
            </li>
            <li>
              Row-Level Security (RLS) — każdy użytkownik ma dostęp
              wyłącznie do swoich danych
            </li>
            <li>
              Dane płatnicze przetwarzane wyłącznie przez certyfikowanego
              dostawcę (Stripe, PCI DSS Level 1)
            </li>
          </ul>
        </section>

        <section>
          <h2>10. Moderacja treści i bezpieczeństwo AI</h2>
          <p>
            AI tutor posiada wbudowane filtry bezpieczeństwa, które
            uniemożliwiają generowanie treści nielegalnych, szkodliwych
            lub nieodpowiednich. Tutor jest zaprogramowany wyłącznie do
            prowadzenia rozmów edukacyjnych w zakresie nauki języków.
          </p>
          <p>
            Operator zastrzega sobie prawo do przeglądu transkrypcji
            w przypadku podejrzenia naruszenia{" "}
            <Link href="/regulamin" className="text-primary hover:underline">
              Regulaminu
            </Link>{" "}
            lub prawa.
          </p>
        </section>

        <section>
          <h2>11. Dzieci</h2>
          <p>
            Serwis oferuje tryb dla dzieci (Godoj Kids), dostępny
            wyłącznie pod nadzorem rodzica lub opiekuna prawnego, który
            tworzy i zarządza kontem dziecka ze swojego konta. Nie
            zbieramy danych dzieci bezpośrednio — wszystkie dane są
            powiązane z kontem rodzica.
          </p>
        </section>

        <section>
          <h2>12. Zmiany Polityki Prywatności</h2>
          <p>
            Możemy aktualizować niniejszą Politykę Prywatności. O istotnych
            zmianach poinformujemy drogą e-mailową. Aktualna wersja jest
            zawsze dostępna pod adresem{" "}
            <Link href="/prywatnosc" className="text-primary hover:underline">
              godoj.co/prywatnosc
            </Link>
            .
          </p>
        </section>

        <section>
          <h2>13. Kontakt</h2>
          <p>
            W sprawach dotyczących ochrony danych osobowych prosimy
            o kontakt:
          </p>
          <p>
            Maciej Wróblewski
            <br />
            E-mail: maciej.wrob@gmail.com
          </p>
        </section>
      </div>
    </main>
  );
}
