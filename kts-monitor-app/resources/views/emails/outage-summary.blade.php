<h2>KTS Monitor összefoglaló riasztás</h2>

<p>
    Tömeges kiesést észleltünk. Az alábbi monitorozott oldalak váltottak most elérhetetlen állapotba.
</p>

<p><strong>Érintett oldalak száma:</strong> {{ $count }}</p>
<p><strong>Összesítés ideje:</strong> {{ $generatedAt }}</p>

<table cellpadding="6" cellspacing="0" border="1" style="border-collapse: collapse; width: 100%;">
    <thead>
        <tr>
            <th align="left">Oldal neve</th>
            <th align="left">URL</th>
            <th align="left">Státuszkód</th>
            <th align="left">Észlelés ideje</th>
            <th align="left">Hiba</th>
        </tr>
    </thead>
    <tbody>
        @foreach($outages as $item)
            <tr>
                <td>{{ $item['monitor']->name }}</td>
                <td>{{ $item['monitor']->url }}</td>
                <td>{{ $item['status_code'] }}</td>
                <td>{{ $item['detected_at'] }}</td>
                <td>
                    @if(!empty($item['error_message']))
                        {{ $item['error_message'] }}
                    @elseif((int) $item['status_code'] === 0)
                        Nem elérhető (időtúllépés / hálózati hiba / DNS hiba).
                    @else
                        -
                    @endif
                </td>
            </tr>
        @endforeach
    </tbody>
</table>

<p>
    Javaslat: ellenőrizd a közös infrastruktúrát (hálózat, DNS, reverse proxy, upstream szerverek),
    mert tömeges kiesés esetén gyakran központi komponens hibája áll a háttérben.
</p>