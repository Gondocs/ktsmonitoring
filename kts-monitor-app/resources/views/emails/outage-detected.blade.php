<h2>KTS Monitor riasztás</h2>

<p>
    A rendszer leállást vagy elérhetetlenséget észlelt egy monitorozott oldalon.
</p>

<ul>
    <li><strong>Oldal neve:</strong> {{ $monitor->name }}</li>
    <li><strong>URL:</strong> {{ $monitor->url }}</li>
    <li><strong>HTTP státuszkód:</strong> {{ $statusCode }}</li>
    <li><strong>Ellenőrzés időpontja:</strong> {{ $checkedAt }}</li>
</ul>

@if((int) $statusCode === 0)
    <p>
        <strong>Értelmezés:</strong> A <code>0</code> státuszkód általában azt jelenti,
        hogy a céloldal nem volt elérhető (pl. DNS hiba, time-out, hálózati kapcsolat hiba,
        vagy a szerver nem válaszolt időben).
    </p>
@endif

@if(!empty($errorMessage))
    <p><strong>Hiba részlete:</strong> {{ $errorMessage }}</p>
@endif

<p>
    Kérlek ellenőrizd a szolgáltatás állapotát (szerver, hálózat, DNS, SSL),
    majd a monitor alkalmazásban tekintsd meg a részletes naplókat.
</p>