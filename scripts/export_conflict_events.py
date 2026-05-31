from __future__ import annotations

import ast
import html
import json
import re
import sqlite3
from pathlib import Path

import folium
from branca.element import Element


ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "data" / "processed" / "database.sqlite"
OUT_PATH = ROOT / "dashboard" / "public" / "data" / "conflict_events_2026.json"
MAP_OUT_PATH = ROOT / "dashboard" / "public" / "data" / "operational_map_2026.html"
MAX_EVENTS = 120


def main() -> None:
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row

    events = export_conflictsapp_strikes(con)
    events.extend(export_conflictsapp_targets(con))
    events.extend(export_iranwarlive_strikes(con))
    events.extend(export_gdeltcloud_events(con))
    events.sort(
        key=lambda e: (
            severity_rank(e["severity"]),
            e["fatalities"],
            e["confidence"],
            e["date"],
        ),
        reverse=True,
    )

    selected_events = events[:MAX_EVENTS]
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(selected_events, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    write_folium_map(selected_events)
    print(f"Wrote {len(selected_events)} real 2026 conflict events to {OUT_PATH}")
    print(f"Wrote Folium operational map to {MAP_OUT_PATH}")


def export_conflictsapp_strikes(con: sqlite3.Connection) -> list[dict]:
    event_lookup = conflictsapp_event_lookup(con)
    rows = con.execute(
        """
        select
          id, sourceeventid, actor, priority, category, type, status,
          timestamp, "from", "to", label, severity
        from conflictsapp_map_strikes
        where timestamp between '2026-01-01' and '2026-12-31'
          and "to" is not null
        """
    ).fetchall()

    events = []
    for row in rows:
        lon, lat = parse_position(row["to"])
        if not in_map_bounds(lat, lon):
            continue
        detail = event_lookup.get(row["sourceeventid"] or "")
        summary = clean_text((detail or {}).get("summary") or row["label"] or "")
        event_type = normalize_type(row["type"], row["category"], row["label"])
        location = label_target(row["label"]) or infer_location_from_coords(lat, lon) or "Strike target"
        confidence = 0.84 if (detail or {}).get("verified") else 0.68

        events.append(
            {
                "id": f"conflictsapp-strike-{row['id']}",
                "date": row["timestamp"][:10],
                "time": row["timestamp"][11:16] + "Z",
                "type": event_type,
                "severity": normalize_severity(row["severity"]),
                "title": row["label"] or f"{event_type.title()} - {location}",
                "location": location,
                "country": infer_country(lat, lon, summary),
                "lat": round(lat, 5),
                "lon": round(lon, 5),
                "fatalities": 0,
                "injured": 0,
                "actors": [row["actor"]] if row["actor"] else [],
                "source": "conflictsapp_map_strikes",
                "url": first_source_url((detail or {}).get("sources")),
                "confidence": confidence,
                "summary": summary[:420] + ("..." if len(summary) > 420 else ""),
                "metadata": {
                    "weapon": row["type"] or "unknown",
                    "target": location,
                    "infrastructure": row["category"] or "strike",
                    "keywords": build_keywords(["conflictsapp", event_type, row["actor"], row["priority"], row["status"]]),
                    "modelScore": confidence,
                },
            }
        )

    return events


def export_conflictsapp_targets(con: sqlite3.Connection) -> list[dict]:
    event_lookup = conflictsapp_event_lookup(con)
    rows = con.execute(
        """
        select
          id, sourceeventid, actor, priority, category, type, status,
          timestamp, position, name, description
        from conflictsapp_map_targets
        where timestamp between '2026-01-01' and '2026-12-31'
          and position is not null
          and upper(status) in ('STRUCK', 'DESTROYED', 'DAMAGED')
        """
    ).fetchall()

    events = []
    for row in rows:
        lon, lat = parse_position(row["position"])
        if not in_map_bounds(lat, lon):
            continue
        detail = event_lookup.get(row["sourceeventid"] or "")
        summary = clean_text((detail or {}).get("summary") or row["description"] or row["name"] or "")
        event_type = normalize_type(row["type"], row["category"], row["description"])
        confidence = 0.82 if (detail or {}).get("verified") else 0.66

        events.append(
            {
                "id": f"conflictsapp-target-{row['id']}",
                "date": row["timestamp"][:10],
                "time": row["timestamp"][11:16] + "Z",
                "type": event_type,
                "severity": "HIGH" if row["status"] == "STRUCK" else "CRITICAL",
                "title": row["name"] or f"{event_type.title()} target",
                "location": row["name"] or infer_location_from_coords(lat, lon) or "Target site",
                "country": infer_country(lat, lon, summary),
                "lat": round(lat, 5),
                "lon": round(lon, 5),
                "fatalities": 0,
                "injured": 0,
                "actors": [row["actor"]] if row["actor"] else [],
                "source": "conflictsapp_map_targets",
                "url": first_source_url((detail or {}).get("sources")),
                "confidence": confidence,
                "summary": summary[:420] + ("..." if len(summary) > 420 else ""),
                "metadata": {
                    "weapon": row["type"] or "target",
                    "target": row["name"] or "infrastructure",
                    "infrastructure": row["category"] or "target",
                    "keywords": build_keywords(["conflictsapp", event_type, row["actor"], row["status"], row["category"]]),
                    "modelScore": confidence,
                },
            }
        )

    return events


def conflictsapp_event_lookup(con: sqlite3.Connection) -> dict[str, dict]:
    rows = con.execute(
        """
        select id, summary, fullcontent, verified, sources, tags
        from conflictsapp_events
        where timestamp between '2026-01-01' and '2026-12-31'
        """
    ).fetchall()
    return {
        row["id"]: {
            "summary": row["summary"] or row["fullcontent"],
            "verified": bool(row["verified"]),
            "sources": row["sources"],
            "tags": row["tags"],
        }
        for row in rows
    }


def export_iranwarlive_strikes(con: sqlite3.Connection) -> list[dict]:
    rows = con.execute(
        """
        select
          event_id, timestamp, latitude, longitude, strike_type,
          target_description, source_url, verified_by, casualties,
          escalation_context, verification_status
        from iranwarlive_strikes
        where timestamp between '2026-01-01' and '2026-12-31'
          and latitude is not null
          and longitude is not null
          and longitude between 12 and 76
          and latitude between 12 and 42
        """
    ).fetchall()

    events = []
    for row in rows:
        fatalities = parse_casualties(row["casualties"])
        confidence = confidence_from_verification(row["verified_by"], row["verification_status"])
        event_type = normalize_type(row["strike_type"], row["target_description"])
        description = clean_text(row["target_description"] or row["escalation_context"] or "")
        location = infer_location(description) or infer_location_from_coords(row["latitude"], row["longitude"]) or "Strike location"

        events.append(
            {
                "id": row["event_id"],
                "date": row["timestamp"][:10],
                "time": row["timestamp"][11:16] + "Z",
                "type": event_type,
                "severity": infer_severity(fatalities, confidence),
                "title": f"{event_type.title()} - {location}",
                "location": location,
                "country": infer_country(row["latitude"], row["longitude"], description),
                "lat": round(float(row["latitude"]), 5),
                "lon": round(float(row["longitude"]), 5),
                "fatalities": fatalities,
                "injured": 0,
                "actors": actors_from_text(description),
                "source": "iranwarlive_strikes",
                "url": normalize_url(row["source_url"]),
                "confidence": confidence,
                "summary": description[:420] + ("..." if len(description) > 420 else ""),
                "metadata": {
                    "weapon": row["strike_type"] or "unknown",
                    "target": target_from_text(description),
                    "infrastructure": row["escalation_context"] or "strike report",
                    "keywords": build_keywords(["iranwarlive", event_type, row["strike_type"], row["verified_by"]]),
                    "modelScore": confidence,
                },
            }
        )

    return events


def export_gdeltcloud_events(con: sqlite3.Connection) -> list[dict]:
    events = []
    table_rows = con.execute(
        "select name from sqlite_master where type='table' and name like 'gdeltcloud_events_%_2026'"
    ).fetchall()
    for table_row in table_rows:
        table_name = table_row["name"]
        rows = con.execute(
            f"""
            select
              id, url, primary_story_url, title, summary, event_date,
              category, subcategory, actors, has_fatalities, fatalities,
              civilian_targeting_label, geo_country, geo_location,
              geo_latitude, geo_longitude, metrics_confidence,
              metrics_article_count, metrics_goldstein_scale, query_country
            from {table_name}
            where event_date between '2026-01-01' and '2026-12-31'
              and geo_latitude is not null
              and geo_longitude is not null
              and geo_longitude between 12 and 76
              and geo_latitude between 12 and 42
            """
        ).fetchall()

        for row in rows:
            fatalities = int(round(float(row["fatalities"] or 0)))
            confidence = clamp01(float(row["metrics_confidence"] or 0) / 100)
            if confidence == 0:
                confidence = 0.62 if row["has_fatalities"] else 0.45
            event_type = normalize_type(row["subcategory"], row["category"], row["summary"])
            summary = clean_text(row["summary"] or row["title"] or "")

            events.append(
                {
                    "id": row["id"],
                    "date": row["event_date"],
                    "time": "00:00Z",
                    "type": event_type,
                    "severity": infer_severity(fatalities, confidence),
                    "title": row["title"] or f"{event_type.title()} - {row['geo_location']}",
                    "location": row["geo_location"] or row["geo_country"] or "Geocoded location",
                    "country": row["geo_country"] or row["query_country"] or "Unknown",
                    "lat": round(float(row["geo_latitude"]), 5),
                    "lon": round(float(row["geo_longitude"]), 5),
                    "fatalities": fatalities,
                    "injured": 0,
                    "actors": parse_gdelt_actors(row["actors"]),
                    "source": table_name,
                    "url": normalize_url(row["primary_story_url"]) or normalize_url(row["url"]),
                    "confidence": round(confidence, 3),
                    "summary": summary[:420] + ("..." if len(summary) > 420 else ""),
                    "metadata": {
                        "weapon": row["subcategory"] or row["category"] or "unknown",
                        "target": row["civilian_targeting_label"] or "unknown",
                        "infrastructure": row["category"] or "conflict event",
                        "keywords": build_keywords(["gdeltcloud", event_type, row["category"], row["subcategory"]]),
                        "modelScore": round(confidence, 3),
                    },
                }
            )

    return events


def write_folium_map(events: list[dict]) -> None:
    fmap = folium.Map(
        location=[31.8, 46.5],
        zoom_start=5,
        min_zoom=4,
        max_zoom=9,
        tiles=None,
        control_scale=False,
        zoom_control=True,
        prefer_canvas=True,
    )
    folium.TileLayer(
        tiles="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        attr="&copy; OpenStreetMap &copy; CARTO",
        name="Dark OSINT",
        control=False,
    ).add_to(fmap)

    add_country_overlays(fmap)

    for event in events:
        color = severity_color(event["severity"])
        popup = folium.Popup(popup_html(event, color), max_width=380)
        event_id = json.dumps(event["id"])

        if event["severity"] == "CRITICAL":
            icon = folium.DivIcon(
                html=f'<div class="ev-crit" style="--ec:{color}"></div>',
                icon_size=(28, 28),
                icon_anchor=(14, 14),
                popup_anchor=(0, -14),
            )
            marker = folium.Marker(
                location=[event["lat"], event["lon"]],
                icon=icon,
                popup=popup,
                tooltip=f"⚠ CRITICAL / {event['type']} / {event['location']}",
            )
        elif event["severity"] == "HIGH":
            icon = folium.DivIcon(
                html=f'<div class="ev-high" style="--ec:{color}"></div>',
                icon_size=(22, 22),
                icon_anchor=(11, 11),
                popup_anchor=(0, -11),
            )
            marker = folium.Marker(
                location=[event["lat"], event["lon"]],
                icon=icon,
                popup=popup,
                tooltip=f"HIGH / {event['type']} / {event['location']}",
            )
        else:
            radius = 5 if event["severity"] == "MEDIUM" else 4
            marker = folium.CircleMarker(
                location=[event["lat"], event["lon"]],
                radius=radius,
                color=color,
                weight=1.2,
                fill=True,
                fill_color=color,
                fill_opacity=0.78,
                popup=popup,
                tooltip=f"{event['severity']} / {event['type']} / {event['location']}",
            )

        marker.add_to(fmap)
        marker_name = marker.get_name()
        fmap.get_root().script.add_child(
            Element(
                f"""
                setTimeout(function() {{
                    if (typeof {marker_name} !== 'undefined') {{
                        {marker_name}.on('click', function() {{
                          window.parent.postMessage({{ type: 'selectConflictEvent', id: {event_id} }}, '*');
                        }});
                    }}
                }}, 500);
                """
            )
        )

        if event["severity"] in {"CRITICAL", "HIGH"}:
            folium.Circle(
                location=[event["lat"], event["lon"]],
                radius=55000 if event["severity"] == "CRITICAL" else 32000,
                color=color,
                weight=0.5,
                fill=True,
                fill_color=color,
                fill_opacity=0.055,
            ).add_to(fmap)

    fmap.get_root().header.add_child(Element(map_css()))
    fmap.get_root().html.add_child(Element(map_legend_html()))
    fmap.save(MAP_OUT_PATH)


# Realistic simplified border polygons [lat, lon]
_COUNTRIES = [
    {
        "name": "IRAN", "color": "#d34b47", "fill_opacity": 0.065, "label": [32.5, 53.0],
        "coords": [
            [39.78,44.04],[39.44,45.61],[38.27,48.08],[37.10,50.17],[36.91,52.07],
            [36.85,53.83],[37.15,55.73],[35.65,58.44],[33.97,60.86],[30.94,61.83],
            [27.93,60.84],[26.70,59.62],[25.29,58.64],[25.01,57.61],[26.01,56.98],
            [26.66,56.08],[27.60,53.36],[28.47,51.29],[30.42,48.44],[31.71,48.00],
            [33.10,46.16],[34.15,45.45],[35.26,45.37],[36.18,44.77],[37.08,44.71],
            [38.27,44.62],[39.78,44.04],
        ],
    },
    {
        "name": "IRAQ", "color": "#d6a24a", "fill_opacity": 0.060, "label": [33.2, 43.8],
        "coords": [
            [37.38,42.36],[37.10,43.99],[35.60,43.15],[34.69,42.35],[33.40,41.15],
            [33.10,46.16],[31.71,48.00],[30.42,48.44],[29.50,47.70],[29.00,47.70],
            [29.00,46.20],[28.50,44.00],[29.00,39.20],[29.50,38.70],[30.00,38.50],
            [32.00,38.80],[33.38,38.80],[37.38,42.36],
        ],
    },
    {
        "name": "SYRIA", "color": "#c8cdd8", "fill_opacity": 0.055, "label": [35.0, 38.5],
        "coords": [
            [37.20,36.60],[37.00,37.50],[37.38,42.36],[33.38,38.80],[32.50,36.80],
            [32.50,35.90],[33.10,36.40],[33.30,35.80],[34.60,36.60],[36.50,36.20],
            [37.20,36.60],
        ],
    },
    {
        "name": "TURKEY", "color": "#8899aa", "fill_opacity": 0.045, "label": [38.8, 35.5],
        "coords": [
            [41.50,26.00],[42.00,28.50],[41.80,30.00],[41.30,32.00],[41.20,34.00],
            [41.00,36.50],[40.00,36.00],[37.20,36.60],[36.50,36.20],[36.60,35.70],
            [36.30,33.80],[36.80,32.80],[37.00,29.00],[36.70,26.50],[38.00,26.30],
            [40.00,25.50],[41.50,26.00],
        ],
    },
    {
        "name": "ISRAEL", "color": "#d6a24a", "fill_opacity": 0.12, "label": [31.5, 35.1],
        "coords": [
            [33.30,35.80],[33.10,35.30],[31.90,35.40],[31.50,34.90],
            [29.50,34.90],[29.70,35.00],[30.50,35.40],[31.90,35.50],
            [32.50,35.40],[33.30,35.80],
        ],
    },
    {
        "name": "LEBANON", "color": "#d6a24a", "fill_opacity": 0.10, "label": [33.8, 35.8],
        "coords": [
            [34.70,35.10],[34.60,36.60],[33.10,36.40],[33.10,35.10],[34.70,35.10],
        ],
    },
    {
        "name": "JORDAN", "color": "#9aabb8", "fill_opacity": 0.055, "label": [31.0, 36.8],
        "coords": [
            [33.38,38.80],[32.00,38.80],[29.50,38.70],[29.00,39.20],
            [28.50,35.00],[29.50,34.90],[31.50,34.90],[32.50,36.00],
            [33.10,36.40],[33.30,35.80],[33.38,38.80],
        ],
    },
    {
        "name": "SAUDI ARABIA", "color": "#58b8c8", "fill_opacity": 0.038, "label": [24.5, 44.5],
        "coords": [
            [29.00,39.20],[28.50,44.00],[29.00,46.20],[29.00,47.70],[28.50,48.50],
            [26.00,50.50],[24.00,51.60],[22.70,51.60],[22.70,55.50],[20.00,57.50],
            [17.50,54.00],[15.00,50.00],[14.80,43.00],[16.00,42.00],[18.00,40.00],
            [19.00,38.50],[22.50,37.00],[26.00,37.50],[29.00,37.50],[29.00,39.20],
        ],
    },
    {
        "name": "KUWAIT", "color": "#58b8c8", "fill_opacity": 0.09, "label": [29.5, 47.6],
        "coords": [
            [30.10,46.50],[29.50,47.70],[29.00,47.70],[28.50,48.50],[28.50,46.50],[30.10,46.50],
        ],
    },
    {
        "name": "UAE / OMAN", "color": "#58b8c8", "fill_opacity": 0.055, "label": [23.5, 55.5],
        "coords": [
            [24.00,51.60],[22.70,51.60],[22.70,55.50],[23.60,58.60],[24.90,58.00],
            [24.50,56.50],[25.10,56.40],[26.00,56.40],[26.10,56.10],[24.00,51.60],
        ],
    },
    {
        "name": "YEMEN", "color": "#7a8a96", "fill_opacity": 0.040, "label": [16.0, 46.5],
        "coords": [
            [18.00,40.00],[16.00,42.00],[14.80,43.00],[15.00,50.00],[17.50,54.00],
            [12.60,45.00],[12.20,44.00],[13.00,43.50],[13.00,42.00],[15.00,41.00],
            [17.00,40.00],[18.00,40.00],
        ],
    },
]


def add_country_overlays(fmap: folium.Map) -> None:
    for c in _COUNTRIES:
        folium.Polygon(
            locations=c["coords"],
            color=c["color"],
            weight=0.9,
            fill=True,
            fill_color=c["color"],
            fill_opacity=c["fill_opacity"],
            dash_array="4 4",
            tooltip=c["name"],
        ).add_to(fmap)
        # Country name label
        folium.Marker(
            location=c["label"],
            icon=folium.DivIcon(
                html=f'<div class="country-lbl">{c["name"]}</div>',
                icon_size=(130, 18),
                icon_anchor=(65, 9),
            ),
        ).add_to(fmap)


def popup_html(event: dict, color: str) -> str:
    title = html.escape(str(event["title"]))
    summary = html.escape(str(event["summary"]))
    source = html.escape(str(event["source"]))
    location = html.escape(str(event["location"]))
    country = html.escape(str(event["country"]))
    url = event.get("url")
    link = (
        f"<a class='osint-link' href='{html.escape(url)}' target='_blank' rel='noopener'>VER REFERENCIA →</a>"
        if url else ""
    )
    actors_raw = event.get("actors", [])
    actors_str = " · ".join(actors_raw)[:60] if actors_raw else ""
    actors_block = (
        f"<div class='osint-actors'>ACTORES: {html.escape(actors_str)}</div>"
        if actors_str else ""
    )
    return f"""
    <div class="osint-popup">
      <div class="osint-kicker" style="color:{color}">{event['severity']} &middot; {event['type']}</div>
      <div class="osint-title">{title}</div>
      <div class="osint-meta">{event['date']} {event['time']} &middot; {location}, {country}</div>
      <div class="osint-divider"></div>
      <div class="osint-summary">{summary}</div>
      <div class="osint-stats">
        <div class="osint-stat">
          <div class="osint-stat-lbl">MUERTES</div>
          <div class="osint-stat-val" style="color:#d34b47">{event['fatalities']}</div>
        </div>
        <div class="osint-stat">
          <div class="osint-stat-lbl">CONFIANZA</div>
          <div class="osint-stat-val" style="color:{color}">{round(event['confidence'] * 100)}%</div>
        </div>
      </div>
      {actors_block}
      <div class="osint-source">FUENTE: {source}</div>
      {link}
    </div>
    """


def map_css() -> str:
    return """
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

      html, body, #map {
        background: #05080b !important;
        font-family: Inter, ui-sans-serif, system-ui, sans-serif;
      }
      .leaflet-container {
        background: #05080b !important;
        color: rgba(255,255,255,.72);
        font-family: Inter, ui-sans-serif, system-ui, sans-serif;
      }
      .leaflet-control-zoom a {
        background: rgba(10,14,18,.90) !important;
        color: rgba(88,184,200,.88) !important;
        border-color: rgba(255,255,255,.10) !important;
        font-family: Inter, sans-serif;
      }
      .leaflet-popup-content-wrapper, .leaflet-popup-tip {
        background: rgba(8,12,17,.96) !important;
        color: rgba(255,255,255,.74) !important;
        border: 1px solid rgba(255,255,255,.09);
        box-shadow: 0 24px 64px rgba(0,0,0,.60);
        border-radius: 4px !important;
      }
      .leaflet-popup-content { margin: 0; padding: 0; }
      .leaflet-popup-close-button {
        color: rgba(255,255,255,.32) !important;
        top: 8px !important; right: 10px !important; font-size: 15px !important;
      }
      .leaflet-tooltip {
        background: rgba(8,12,17,.90);
        border: 1px solid rgba(255,255,255,.09);
        color: rgba(255,255,255,.65);
        font-size: 9px;
        letter-spacing: .12em;
        font-family: 'JetBrains Mono', ui-monospace, monospace;
        border-radius: 2px;
        box-shadow: 0 8px 24px rgba(0,0,0,.35);
      }
      .leaflet-tooltip::before { display: none; }

      /* ── Country labels ─────────────────────────────────── */
      .country-lbl {
        font-family: 'JetBrains Mono', ui-monospace, monospace;
        font-size: 8.5px;
        letter-spacing: .22em;
        color: rgba(255,255,255,.20);
        text-align: center;
        white-space: nowrap;
        pointer-events: none;
        text-transform: uppercase;
        text-shadow: 0 1px 3px rgba(0,0,0,.8);
      }

      /* ── CRITICAL pulse marker ──────────────────────────── */
      .ev-crit {
        position: relative;
        width: 12px; height: 12px;
        border-radius: 50%;
        background: var(--ec, #d34b47);
        box-shadow: 0 0 7px var(--ec, #d34b47);
      }
      .ev-crit::before, .ev-crit::after {
        content: '';
        position: absolute;
        inset: -5px;
        border-radius: 50%;
        border: 1.5px solid var(--ec, #d34b47);
        opacity: 0;
        animation: ev-ring 2.1s ease-out infinite;
      }
      .ev-crit::after { animation-delay: 1.05s; }

      /* ── HIGH pulse marker ──────────────────────────────── */
      .ev-high {
        position: relative;
        width: 9px; height: 9px;
        border-radius: 50%;
        background: var(--ec, #d6a24a);
        box-shadow: 0 0 5px var(--ec, #d6a24a);
      }
      .ev-high::before {
        content: '';
        position: absolute;
        inset: -4px;
        border-radius: 50%;
        border: 1px solid var(--ec, #d6a24a);
        opacity: 0;
        animation: ev-ring 2.8s ease-out infinite;
      }

      @keyframes ev-ring {
        0%   { opacity: 0.85; transform: scale(0.55); }
        100% { opacity: 0;    transform: scale(2.6);  }
      }

      /* ── Popup ──────────────────────────────────────────── */
      .osint-popup { width: 294px; padding: 14px 15px; }
      .osint-kicker {
        font-family: 'JetBrains Mono', ui-monospace, monospace;
        font-size: 9px; letter-spacing: .20em; text-transform: uppercase;
      }
      .osint-title {
        margin-top: 6px; font-size: 13px; line-height: 1.25;
        font-weight: 600; color: rgba(255,255,255,.86);
      }
      .osint-meta {
        margin-top: 5px; font-size: 9px; letter-spacing: .12em;
        color: rgba(255,255,255,.33);
        font-family: 'JetBrains Mono', ui-monospace, monospace;
      }
      .osint-divider {
        height: 1px; background: rgba(255,255,255,.08); margin: 10px 0;
      }
      .osint-summary {
        font-size: 10px; line-height: 1.5; color: rgba(255,255,255,.52);
      }
      .osint-stats {
        display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 10px;
      }
      .osint-stat {
        border: 1px solid rgba(255,255,255,.09);
        background: rgba(255,255,255,.04);
        padding: 6px 8px; border-radius: 3px;
      }
      .osint-stat-lbl {
        font-size: 8px; letter-spacing: .16em;
        color: rgba(255,255,255,.30);
        font-family: 'JetBrains Mono', ui-monospace, monospace;
      }
      .osint-stat-val { font-size: 14px; font-weight: 600; margin-top: 2px; }
      .osint-actors {
        margin-top: 9px; font-size: 9px; letter-spacing: .10em;
        color: rgba(255,255,255,.30);
        font-family: 'JetBrains Mono', ui-monospace, monospace;
      }
      .osint-source {
        margin-top: 9px; font-size: 9px; color: rgba(88,184,200,.68);
        font-family: 'JetBrains Mono', ui-monospace, monospace;
        letter-spacing: .12em;
      }
      .osint-link {
        display: inline-block; margin-top: 8px;
        color: #58b8c8; font-size: 9px; letter-spacing: .14em;
        text-decoration: none;
        border-bottom: 1px solid rgba(88,184,200,.28);
        font-family: 'JetBrains Mono', ui-monospace, monospace;
      }
      .osint-link:hover { color: #88d4e0; border-bottom-color: rgba(88,184,200,.55); }

      /* ── Legend ─────────────────────────────────────────── */
      .osint-legend {
        position: absolute; top: 12px; right: 12px; z-index: 999;
        border: 1px solid rgba(255,255,255,.09);
        background: rgba(8,12,17,.84);
        backdrop-filter: blur(12px);
        padding: 10px 12px; border-radius: 3px;
        color: rgba(255,255,255,.54);
        font-size: 9px; letter-spacing: .16em;
        box-shadow: 0 18px 48px rgba(0,0,0,.42);
        font-family: 'JetBrains Mono', ui-monospace, monospace;
      }
      .osint-dot {
        display: inline-block; width: 8px; height: 8px;
        border-radius: 50%; margin-right: 6px; vertical-align: middle;
      }
    </style>
    """


def map_legend_html() -> str:
    return """
    <div class="osint-legend">
      <div style="margin-bottom:8px;color:rgba(255,255,255,.32);font-size:8px;letter-spacing:.18em">SEVERIDAD / 2026</div>
      <div><span class="osint-dot" style="background:#d34b47;box-shadow:0 0 5px #d34b47"></span>CRITICAL</div>
      <div style="margin-top:5px"><span class="osint-dot" style="background:#d6a24a;box-shadow:0 0 4px #d6a24a"></span>HIGH</div>
      <div style="margin-top:5px"><span class="osint-dot" style="background:#58b8c8"></span>MEDIUM</div>
      <div style="margin-top:5px"><span class="osint-dot" style="background:rgba(255,255,255,.42)"></span>LOW</div>
      <div style="margin-top:9px;padding-top:8px;border-top:1px solid rgba(255,255,255,.08);color:rgba(255,255,255,.26);font-size:8px">
        STRIKES &middot; TARGETS &middot; GDELT
      </div>
    </div>
    """


def severity_color(severity: str) -> str:
    if severity == "CRITICAL":
        return "#d34b47"
    if severity == "HIGH":
        return "#d6a24a"
    if severity == "MEDIUM":
        return "#58b8c8"
    return "#d9e1e5"


def normalize_type(*values: str | None) -> str:
    value = " ".join(v.lower() for v in values if v)
    if "drone" in value or "uav" in value:
        return "DRONE"
    if "missile" in value or "rocket" in value or "shelling" in value:
        return "MISSILE"
    if "air" in value or "strike" in value or "explosion" in value:
        return "AIRSTRIKE"
    if "maritime" in value or "naval" in value or "tanker" in value:
        return "MARITIME"
    if "cyber" in value:
        return "CYBER"
    return "GROUND"


def infer_severity(fatalities: int, confidence: float) -> str:
    if fatalities >= 25 or confidence >= 0.9:
        return "CRITICAL"
    if fatalities >= 5 or confidence >= 0.75:
        return "HIGH"
    if fatalities > 0 or confidence >= 0.55:
        return "MEDIUM"
    return "LOW"


def parse_casualties(value: str | None) -> int:
    if not value:
        return 0
    match = re.search(r"\d+", str(value))
    return int(match.group(0)) if match else 0


def parse_position(value: str | None) -> tuple[float, float]:
    if not value:
        return 0.0, 0.0
    parsed = ast.literal_eval(value)
    return float(parsed[0]), float(parsed[1])


def in_map_bounds(lat: float, lon: float) -> bool:
    return 12 <= lat <= 42 and 12 <= lon <= 76


def normalize_severity(value: str | None) -> str:
    upper = (value or "MEDIUM").upper()
    if upper in {"LOW", "MEDIUM", "HIGH", "CRITICAL"}:
        return upper
    return "MEDIUM"


def label_target(value: str | None) -> str | None:
    if not value:
        return None
    if "→" in value:
        return clean_text(value.split("→")[-1])[:64]
    if "->" in value:
        return clean_text(value.split("->")[-1])[:64]
    return None


def first_source_url(value: str | None) -> str | None:
    if not value:
        return None
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        parsed = value
    if isinstance(parsed, list):
        for item in parsed:
            if isinstance(item, str) and item.startswith(("http://", "https://")):
                return item
            if isinstance(item, dict):
                url = item.get("url") or item.get("href")
                if isinstance(url, str) and url.startswith(("http://", "https://")):
                    return url
    if isinstance(parsed, str) and parsed.startswith(("http://", "https://")):
        return parsed
    return None


def confidence_from_verification(*values: str | None) -> float:
    value = " ".join(v.lower() for v in values if v)
    if "high" in value or "multi-source" in value:
        return 0.86
    if "verified" in value or "news wire" in value:
        return 0.74
    if "low" in value:
        return 0.42
    return 0.6


def parse_gdelt_actors(value: str | None) -> list[str]:
    if not value:
        return []
    try:
        parsed = ast.literal_eval(value)
    except (ValueError, SyntaxError):
        return []
    actors = []
    for item in parsed:
        name = item.get("name") if isinstance(item, dict) else None
        if name and name not in actors:
            actors.append(name)
    return actors[:3]


def infer_location(text: str) -> str | None:
    patterns = [
        r"\bin ([A-Z][A-Za-z' -]{2,40})(?:,|\.|$)",
        r"\bnear ([A-Z][A-Za-z' -]{2,40})(?:,|\.|$)",
        r"\bthe ([A-Z][A-Za-z' -]{2,40}) (?:compound|facility|airport|base|school)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return clean_text(match.group(1))[:48]
    return None


def infer_location_from_coords(lat: float, lon: float) -> str | None:
    if 33.7 <= lat <= 34.1 and 35.3 <= lon <= 35.7:
        return "Beirut"
    if 35.55 <= lat <= 35.85 and 51.25 <= lon <= 51.55:
        return "Tehran"
    if 32.0 <= lat <= 32.2 and 34.7 <= lon <= 34.9:
        return "Tel Aviv"
    return None


def infer_country(lat: float, lon: float, text: str) -> str:
    lowered = text.lower()
    if "lebanon" in lowered or 33 <= lat <= 35 and 35 <= lon <= 37:
        return "Lebanon"
    if "israel" in lowered or 29 <= lat <= 34 and 34 <= lon <= 36:
        return "Israel"
    if "iran" in lowered or 25 <= lat <= 40 and 44 <= lon <= 64:
        return "Iran"
    if "iraq" in lowered or 29 <= lat <= 38 and 38 <= lon <= 49:
        return "Iraq"
    return "Regional"


def actors_from_text(text: str) -> list[str]:
    actors = []
    for actor in ["Israel", "US", "Iran", "IRGC", "Hezbollah", "Houthis", "Hamas"]:
        if actor.lower() in text.lower():
            actors.append(actor)
    return actors[:3]


def target_from_text(text: str) -> str:
    lowered = text.lower()
    for target in ["school", "airport", "base", "compound", "refinery", "port", "infrastructure", "civilian"]:
        if target in lowered:
            return target
    return "unknown"


def build_keywords(values: list[str | None]) -> list[str]:
    keywords = []
    for value in values:
        if not value:
            continue
        cleaned = str(value).replace("_", " ").lower()
        if cleaned not in keywords:
            keywords.append(cleaned)
    return keywords[:5]


def normalize_url(value: str | None) -> str | None:
    if not value or not value.startswith(("http://", "https://")):
        return None
    return value


def clean_text(value: str) -> str:
    return " ".join(value.replace("\n", " ").split())


def clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def severity_rank(severity: str) -> int:
    return {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}.get(severity, 0)


if __name__ == "__main__":
    main()
