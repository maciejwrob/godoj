import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Regulamin — Godoj.co",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Strona Godoj.co
      </Link>

      <h1 className="mb-2 text-3xl font-bold">Regulamin serwisu Godoj.co</h1>
      <p className="mb-10 text-sm text-text-secondary">
        Ostatnia aktualizacja: 9 czerwca 2026 r.
      </p>

      <div className="prose-legal space-y-8 text-text-secondary [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-text-primary [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:font-semibold [&_h3]:text-text-primary [&_p]:mb-3 [&_p]:leading-relaxed [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-1">

        <section>
          <h2>1. Postanowienia ogólne</h2>
          <p>
            Niniejszy Regulamin określa zasady korzystania z serwisu Godoj.co
            (dalej: &bdquo;Serwis&rdquo;), dostępnego pod adresem https://www.godoj.co.
          </p>
          <p>
            Operatorem Serwisu jest Maciej Wróblewski, prowadzący działalność
            pod adresem e-mail: maciej.wrob@gmail.com (dalej: &bdquo;Operator&rdquo;).
          </p>
          <p>
            Korzystanie z Serwisu oznacza akceptację niniejszego Regulaminu
            oraz{" "}
            <Link href="/prywatnosc" className="text-primary hover:underline">
              Polityki Prywatności
            </Link>
            .
          </p>
        </section>

        <section>
          <h2>2. Definicje</h2>
          <ul>
            <li>
              <strong>Serwis</strong> — aplikacja internetowa Godoj.co
              umożliwiająca naukę języków obcych poprzez rozmowy z AI tutorem.
            </li>
            <li>
              <strong>Użytkownik</strong> — osoba fizyczna korzystająca z
              Serwisu.
            </li>
            <li>
              <strong>Konto</strong> — indywidualne konto Użytkownika w
              Serwisie, tworzone po zalogowaniu za pomocą linku magicznego.
            </li>
            <li>
              <strong>Lekcja</strong> — sesja rozmowy głosowej z AI tutorem.
            </li>
            <li>
              <strong>Subskrypcja</strong> — płatny plan dający dostęp do
              określonej liczby minut rozmów miesięcznie.
            </li>
          </ul>
        </section>

        <section>
          <h2>3. Zasady korzystania z Serwisu</h2>

          <h3>3.1. Rejestracja i logowanie</h3>
          <p>
            Dostęp do Serwisu wymaga podania adresu e-mail. Logowanie odbywa
            się za pomocą linku magicznego wysyłanego na podany adres — nie
            stosujemy haseł. Użytkownik jest odpowiedzialny za bezpieczeństwo
            dostępu do swojej skrzynki e-mail.
          </p>

          <h3>3.2. Okres próbny</h3>
          <p>
            Nowi Użytkownicy otrzymują bezpłatny okres próbny z ograniczoną
            liczbą minut rozmów. Po wyczerpaniu limitu konieczne jest wykupienie
            Subskrypcji.
          </p>

          <h3>3.3. Wymagania techniczne</h3>
          <p>
            Korzystanie z Serwisu wymaga przeglądarki internetowej z obsługą
            JavaScript, dostępu do mikrofonu oraz stabilnego połączenia z
            internetem.
          </p>
        </section>

        <section>
          <h2>4. Subskrypcje i płatności</h2>

          <h3>4.1. Plany subskrypcyjne</h3>
          <p>
            Serwis oferuje płatne plany subskrypcyjne z różną liczbą minut
            rozmów miesięcznie. Aktualne ceny i warunki dostępne są na stronie{" "}
            <Link href="/pricing" className="text-primary hover:underline">
              Cennik
            </Link>
            .
          </p>

          <h3>4.2. Płatności</h3>
          <p>
            Płatności obsługiwane są przez Stripe. Operator nie przechowuje
            danych kart płatniczych — są one przetwarzane wyłącznie przez
            Stripe zgodnie z wymogami PCI DSS.
          </p>

          <h3>4.3. Odnowienie i anulowanie</h3>
          <p>
            Subskrypcje odnawiane są automatycznie na koniec każdego okresu
            rozliczeniowego. Użytkownik może anulować Subskrypcję w dowolnym
            momencie poprzez ustawienia konta lub portal Stripe. Po anulowaniu
            Subskrypcja pozostaje aktywna do końca opłaconego okresu.
          </p>

          <h3>4.4. Zwroty</h3>
          <p>
            Zwroty rozpatrywane są indywidualnie. W celu uzyskania zwrotu
            prosimy o kontakt na adres maciej.wrob@gmail.com.
          </p>
        </section>

        <section>
          <h2>5. Transkrypcje i dane z lekcji</h2>
          <p>
            Podczas lekcji Serwis generuje tekstową transkrypcję rozmowy.
            Transkrypcja jest niezbędna do działania Serwisu — na jej podstawie
            tworzona jest analiza lekcji, ocena postępów, lista nowego
            słownictwa i rekomendacje.
          </p>
          <p>
            Serwis <strong>nie nagrywa audio</strong> rozmów. Dźwięk jest
            przetwarzany w czasie rzeczywistym przez ElevenLabs i nie jest
            przechowywany.
          </p>
          <p>
            Szczegóły dotyczące przetwarzania danych znajdują się w{" "}
            <Link href="/prywatnosc" className="text-primary hover:underline">
              Polityce Prywatności
            </Link>
            .
          </p>
        </section>

        <section>
          <h2>6. Zasady dopuszczalnego użytkowania</h2>
          <p>Użytkownik zobowiązuje się do korzystania z Serwisu wyłącznie
            w celach nauki języków obcych. Zabrania się:</p>
          <ul>
            <li>
              wykorzystywania Serwisu do generowania treści nielegalnych,
              szkodliwych, obraźliwych lub naruszających prawa osób trzecich
            </li>
            <li>
              prób obejścia zabezpieczeń, limitów lub mechanizmów
              bezpieczeństwa AI
            </li>
            <li>
              automatycznego korzystania z Serwisu (boty, skrypty) bez
              pisemnej zgody Operatora
            </li>
            <li>
              udostępniania konta osobom trzecim
            </li>
            <li>
              podejmowania prób wydobycia promptów systemowych lub
              wewnętrznych instrukcji AI
            </li>
          </ul>
          <p>
            Operator zastrzega sobie prawo do zawieszenia lub usunięcia konta
            Użytkownika naruszającego powyższe zasady.
          </p>
        </section>

        <section>
          <h2>7. Własność intelektualna</h2>
          <p>
            Serwis, jego kod źródłowy, interfejs, treści i materiały
            edukacyjne stanowią własność Operatora i są chronione prawem
            autorskim. Użytkownik nie nabywa żadnych praw własności
            intelektualnej do Serwisu.
          </p>
          <p>
            Treści generowane przez AI podczas lekcji (odpowiedzi tutora,
            analizy, komentarze) są tworzone automatycznie i nie stanowią
            utworów w rozumieniu prawa autorskiego.
          </p>
        </section>

        <section>
          <h2>8. Ograniczenie odpowiedzialności</h2>
          <p>
            Serwis jest dostarczany &bdquo;tak jak jest&rdquo; (as is). Operator
            dokłada starań, aby Serwis działał poprawnie, jednak nie
            gwarantuje:
          </p>
          <ul>
            <li>
              nieprzerwanej dostępności Serwisu
            </li>
            <li>
              poprawności merytorycznej treści generowanych przez AI (AI tutor
              może popełniać błędy językowe — nie jest native speakerem)
            </li>
            <li>
              osiągnięcia konkretnych rezultatów nauki
            </li>
          </ul>
          <p>
            Operator nie ponosi odpowiedzialności za szkody wynikające z
            przerw w działaniu Serwisu, błędów AI lub utraty danych, z
            wyjątkiem przypadków wynikających z rażącego niedbalstwa lub
            winy umyślnej.
          </p>
        </section>

        <section>
          <h2>9. Rozwiązanie umowy</h2>
          <p>
            Użytkownik może w każdej chwili zaprzestać korzystania z Serwisu
            i usunąć swoje konto, kontaktując się z Operatorem. Operator
            może rozwiązać umowę z Użytkownikiem naruszającym Regulamin.
          </p>
          <p>
            W przypadku usunięcia konta dane Użytkownika zostaną usunięte
            zgodnie z{" "}
            <Link href="/prywatnosc" className="text-primary hover:underline">
              Polityką Prywatności
            </Link>
            .
          </p>
        </section>

        <section>
          <h2>10. Zmiany Regulaminu</h2>
          <p>
            Operator zastrzega sobie prawo do zmiany Regulaminu. O istotnych
            zmianach Użytkownicy zostaną poinformowani drogą e-mailową z
            co najmniej 14-dniowym wyprzedzeniem. Dalsze korzystanie z Serwisu
            po wejściu zmian w życie oznacza ich akceptację.
          </p>
        </section>

        <section>
          <h2>11. Postanowienia końcowe</h2>
          <p>
            Prawem właściwym dla niniejszego Regulaminu jest prawo polskie.
            W sprawach nieuregulowanych zastosowanie mają przepisy Kodeksu
            cywilnego oraz ustawy o świadczeniu usług drogą elektroniczną.
          </p>
          <p>
            Wszelkie spory będą rozstrzygane przez sąd właściwy dla siedziby
            Operatora, z zastrzeżeniem praw konsumenta do wniesienia sprawy
            do sądu właściwego dla swojego miejsca zamieszkania.
          </p>
          <p>
            Kontakt: maciej.wrob@gmail.com
          </p>
        </section>
      </div>
    </main>
  );
}
