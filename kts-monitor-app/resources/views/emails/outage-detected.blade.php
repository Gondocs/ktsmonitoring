<h2>KTS Monitor riasztas</h2>
<p>A monitorozott oldal jelenleg lealltnak tunik.</p>
<ul>
    <li><strong>Nev:</strong> {{ $monitor->name }}</li>
    <li><strong>URL:</strong> {{ $monitor->url }}</li>
    <li><strong>Statusz kod:</strong> {{ $statusCode }}</li>
    <li><strong>Ellenorzes ideje:</strong> {{ $checkedAt }}</li>
</ul>
@if(!empty($errorMessage))
    <p><strong>Hiba:</strong> {{ $errorMessage }}</p>
@endif
<p>Keresd a reszletes informaciokat a monitor alkalmazasban.</p>