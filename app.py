import datetime as dt
import random

import folium
import numpy as np
import pandas as pd
import streamlit as st
import streamlit.components.v1 as components
import httpx
from sklearn.ensemble import IsolationForest

USGS_STATION = "07194880"
USGS_PARAM = "00060"
USGS_NAME = "Osage Creek near Bentonville, AR"
USGS_LAT = 36.3128
USGS_LON = -94.2819
USGS_CACHE_TTL = 900
OFFLINE_WINDOW = dt.timedelta(minutes=45)

st.set_page_config(page_title="HydroWatch AR", layout="wide")

st.markdown(
    """
    <style>
    [data-testid="stMetric"] {
        background: linear-gradient(135deg, rgba(21, 101, 192, 0.25), rgba(33, 150, 243, 0.08));
        border: 1px solid rgba(100, 181, 246, 0.4);
        border-radius: 10px;
        padding: 16px 18px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
    }
    [data-testid="stMetricLabel"] {
        color: #90caf9 !important;
        font-weight: 600;
    }
    [data-testid="stMetricValue"] {
        font-weight: 800;
    }
    [data-testid="stMetricDelta"] {
        color: #4fc3f7 !important;
    }
    .block-container {
        padding-top: 1.8rem;
    }
    h1, h2, h3 {
        letter-spacing: 0.02em;
    }
    .usgs-hero {
        background: linear-gradient(135deg, #0d47a1, #1565c0 55%, #1e88e5);
        border: 2px solid #64b5f6;
        border-radius: 14px;
        padding: 20px 26px;
        color: #ffffff;
        box-shadow: 0 4px 18px rgba(13, 71, 161, 0.45);
    }
    .usgs-hero-label {
        font-size: 0.9rem;
        letter-spacing: 0.03em;
        color: #bbdefb;
        font-weight: 600;
    }
    .usgs-hero-value {
        font-size: 3.2rem;
        line-height: 1.1;
        font-weight: 800;
    }
    .usgs-hero-value span {
        font-size: 1.4rem;
        font-weight: 600;
        color: #bbdefb;
    }
    .usgs-hero-status {
        font-size: 0.95rem;
        font-weight: 700;
        letter-spacing: 0.02em;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

ZONES = {
    "Zone 1": {"city": "Bentonville", "lat": 36.3729, "lon": -94.2088},
    "Zone 2": {"city": "Rogers", "lat": 36.3321, "lon": -94.1185},
    "Zone 3": {"city": "Bella Vista", "lat": 36.4815, "lon": -94.2733},
    "Zone 4": {"city": "Centerton", "lat": 36.3598, "lon": -94.2853},
    "Zone 5": {"city": "Siloam Springs", "lat": 36.1881, "lon": -94.5405},
}
LEAK_ZONE = "Zone 4"
OFF_PEAK_HOURS = {2, 3, 4}

if "dispatch_log" not in st.session_state:
    st.session_state.dispatch_log = []
if "work_order_seq" not in st.session_state:
    st.session_state.work_order_seq = 0


def flow_baseline(hour: int, zone_index: int) -> float:
    morning = 90 * np.exp(-((hour - 7) ** 2) / 10)
    midday = 55 * np.exp(-((hour - 13) ** 2) / 18)
    evening = 80 * np.exp(-((hour - 19) ** 2) / 14)
    base = 140 + morning + midday + evening
    return base + zone_index * 8


@st.cache_data(show_spinner=False)
def generate_synthetic_flow_data() -> pd.DataFrame:
    rng = np.random.default_rng(42)
    timestamps = pd.date_range(end=pd.Timestamp.now().floor("h"), periods=24, freq="h")
    rows = []

    for timestamp in timestamps:
        hour = timestamp.hour
        for idx, (zone, info) in enumerate(ZONES.items()):
            flow = flow_baseline(hour, idx) + rng.normal(0, 4)
            leak = zone == LEAK_ZONE and hour in OFF_PEAK_HOURS
            if leak:
                flow += 240 + rng.uniform(20, 40)

            rows.append(
                {
                    "timestamp": timestamp,
                    "zone": zone,
                    "city": info["city"],
                    "hour": hour,
                    "flow": flow,
                    "leak": leak,
                }
            )

    return pd.DataFrame(rows)


@st.cache_resource(show_spinner=False)
def train_isolation_forest() -> IsolationForest:
    df = generate_synthetic_flow_data()
    model = IsolationForest(n_estimators=50, contamination=0.08, random_state=42)
    model.fit(df.loc[~df["leak"], ["flow", "hour"]])
    return model


def detect_anomalies(df: pd.DataFrame, model: IsolationForest) -> pd.DataFrame:
    scored = df.copy()
    scored["anomaly"] = model.predict(scored[["flow", "hour"]])
    scored["alert"] = (scored["anomaly"] == -1) & scored["hour"].isin(OFF_PEAK_HOURS)

    expected = scored.loc[~scored["alert"]].groupby(["zone", "hour"])["flow"].median()
    scored["expected"] = (
        scored[["zone", "hour"]]
        .apply(tuple, axis=1)
        .map(expected)
        .fillna(scored["flow"].median())
    )
    scored["loss_galhr"] = (scored["flow"] - scored["expected"]).clip(lower=0) * 60
    return scored


def build_map(df: pd.DataFrame, alerts: pd.DataFrame) -> folium.Map:
    latest = df.sort_values("timestamp").groupby("zone").tail(1).set_index("zone")
    alert_zones = set(alerts["zone"])
    fmap = folium.Map(location=[36.31, -94.30], zoom_start=10, tiles="OpenStreetMap")

    for zone, info in ZONES.items():
        row = latest.loc[zone]
        color = "#dc3545" if zone in alert_zones else "#198754"
        popup = folium.Popup(
            f"<b>{zone}</b> - {info['city']}<br>Latest flow: {row['flow']:.1f} gal/min",
            max_width=240,
        )
        folium.CircleMarker(
            location=[info["lat"], info["lon"]],
            radius=13,
            color=color,
            fill=True,
            fill_color=color,
            fill_opacity=0.7,
            popup=popup,
            tooltip=zone,
        ).add_to(fmap)

    return fmap


@st.cache_data(ttl=USGS_CACHE_TTL, show_spinner=False)
def fetch_live_usgs_flow() -> pd.DataFrame:
    end = dt.datetime.now()
    start = end - dt.timedelta(hours=24)
    url = (
        f"https://waterservices.usgs.gov/nwis/iv/"
        f"?format=json&sites={USGS_STATION}&parameterCd={USGS_PARAM}"
        f"&startDT={start:%Y-%m-%dT%H:%M}&endDT={end:%Y-%m-%dT%H:%M}"
        f"&siteStatus=all"
    )
    try:
        r = httpx.get(url, timeout=30)
        r.raise_for_status()
        payload = r.json()
    except Exception:
        return pd.DataFrame()

    try:
        values = payload["value"]["timeSeries"][0]["values"][0]["value"]
    except (KeyError, IndexError):
        return pd.DataFrame()

    if not values:
        return pd.DataFrame()

    records = []
    for v in values:
        try:
            val = float(v["value"])
        except (ValueError, TypeError):
            continue
        if val < 0:
            continue
        records.append({"datetime": pd.to_datetime(v["dateTime"]), "flow_cfs": val})

    if not records:
        return pd.DataFrame()

    out = pd.DataFrame(records).set_index("datetime")
    out.index = out.index.tz_localize(None)
    return out.sort_index()


def usgs_status(df: pd.DataFrame) -> tuple:
    if df.empty:
        return "OFFLINE — station unreachable (check network / USGS service)", "#cfd8dc"
    age = dt.datetime.now() - df.index.max().to_pydatetime()
    if age <= OFFLINE_WINDOW:
        return "LIVE — streaming real-time data", "#7cf29b"
    minutes = int(age.total_seconds() // 60)
    return f"STALE — last reading {minutes} min ago", "#ffd54f"


def render_usgs_hero(df: pd.DataFrame) -> None:
    latest = float(df["flow_cfs"].iloc[-1]) if not df.empty else None
    status_text, status_color = usgs_status(df)
    value_html = f"{latest:,.1f}" if latest is not None else "N/A"
    st.markdown(
        f"""
        <div class="usgs-hero">
            <div class="usgs-hero-label">LIVE STREAMFLOW &nbsp;•&nbsp; USGS {USGS_STATION} &nbsp;—&nbsp; {USGS_NAME}</div>
            <div class="usgs-hero-value">{value_html} <span>ft³/s</span></div>
            <div class="usgs-hero-status" style="color: {status_color};">● {status_text}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def build_usgs_map(df: pd.DataFrame) -> folium.Map:
    fmap = folium.Map(location=[USGS_LAT, USGS_LON], zoom_start=12, tiles="OpenStreetMap")

    if df.empty:
        color = "gray"
        popup_txt = "<b>Osage Creek near Bentonville, AR</b><br>No live data — station unreachable"
    else:
        age = dt.datetime.now() - df.index.max().to_pydatetime()
        color = "green" if age <= OFFLINE_WINDOW else "orange"
        latest = df["flow_cfs"].iloc[-1]
        popup_txt = (
            f"<b>Osage Creek near Bentonville, AR</b><br>"
            f"USGS {USGS_STATION}<br>"
            f"Latest discharge: {latest:,.1f} ft³/s"
        )

    folium.Marker(
        location=[USGS_LAT, USGS_LON],
        icon=folium.Icon(color=color, icon="tint", prefix="fa"),
        popup=folium.Popup(popup_txt, max_width=260),
        tooltip=f"USGS {USGS_STATION} — Osage Creek",
    ).add_to(fmap)
    return fmap


selected_zones = list(ZONES)
show_only_alerts = False
min_loss = 0

st.sidebar.title("HydroWatch AR")

data_mode = st.sidebar.radio(
    "Data Engine Mode",
    ["Simulated Municipal Meters", "Live USGS Streamgage (Osage Creek)"],
)
st.sidebar.markdown("---")

if data_mode == "Simulated Municipal Meters":
    st.sidebar.subheader("Filters")
    selected_zones = st.sidebar.multiselect("Zones", list(ZONES), default=list(ZONES))
    show_only_alerts = st.sidebar.checkbox("Show only alerts", value=False)
    min_loss = st.sidebar.slider("Min estimated loss (gal/hr)", 0, 20000, 0, 500)
else:
    st.sidebar.caption(
        f"Streaming **USGS {USGS_STATION}** ({USGS_NAME}) via NWIS real-time "
        f"instantaneous values. Data refreshes every {USGS_CACHE_TTL // 60} minutes."
    )

st.title("HydroWatch AR")

if data_mode == "Simulated Municipal Meters":
    st.caption("Municipal water leak detection dashboard for Benton County, AR")

    df = detect_anomalies(generate_synthetic_flow_data(), train_isolation_forest())
    alerts = df.loc[df["alert"] & df["zone"].isin(selected_zones) & (df["loss_galhr"] >= min_loss)]

    if show_only_alerts:
        chart_df = df.loc[df["zone"].isin(selected_zones) & df["alert"]]
    else:
        chart_df = df.loc[df["zone"].isin(selected_zones)]

    recent_alerts = alerts.loc[alerts["timestamp"] >= df["timestamp"].max() - pd.Timedelta(hours=23)]
    active_alerts = int(len(recent_alerts))
    system_status = "LEAK DETECTED" if active_alerts else "NORMAL"
    estimated_loss = float(recent_alerts["loss_galhr"].sum())

    col1, col2, col3 = st.columns(3)
    col1.metric("System Status", system_status, "HydroWatch AR")
    col2.metric("Active Alerts", f"{active_alerts}", f"{len(alerts)} total")
    col3.metric("Est. Loss", f"{estimated_loss:,.0f}", "gal/hr")

    left, right = st.columns([0.95, 1.05], gap="large")

    with left:
        st.subheader("Zone Map")
        components.html(build_map(df, recent_alerts)._repr_html_(), height=440, scrolling=False)

    with right:
        st.subheader("Alert Details")
        if len(alerts):
            details = alerts[["timestamp", "zone", "city", "flow", "expected", "loss_galhr", "leak"]].copy()
            details["flow"] = details["flow"].round(1)
            details["expected"] = details["expected"].round(1)
            details["loss_galhr"] = details["loss_galhr"].round(0)
            st.dataframe(
                details.sort_values("timestamp", ascending=False).set_index("timestamp"),
                use_container_width=True,
                height=240,
            )

            export_df = alerts[
                ["timestamp", "zone", "city", "flow", "expected", "loss_galhr"]
            ].rename(
                columns={
                    "flow": "observed_flow_gpm",
                    "expected": "expected_flow_gpm",
                    "loss_galhr": "estimated_loss_gal_hr",
                }
            )
            export_df["observed_flow_gpm"] = export_df["observed_flow_gpm"].round(1)
            export_df["expected_flow_gpm"] = export_df["expected_flow_gpm"].round(1)
            export_df["estimated_loss_gal_hr"] = export_df["estimated_loss_gal_hr"].round(0)
            st.download_button(
                "📥 Export Leak Report (CSV)",
                data=export_df.sort_values("timestamp", ascending=False).to_csv(index=False),
                file_name="HydroWatch_Leak_Report.csv",
                mime="text/csv",
                use_container_width=True,
            )
        else:
            st.info("No off-peak anomalies detected for the selected filters.")
            export_df = pd.DataFrame(
                columns=[
                    "timestamp",
                    "zone",
                    "city",
                    "observed_flow_gpm",
                    "expected_flow_gpm",
                    "estimated_loss_gal_hr",
                ]
            )
            st.download_button(
                "📥 Export Leak Report (CSV)",
                data=export_df.to_csv(index=False),
                file_name="HydroWatch_Leak_Report.csv",
                mime="text/csv",
                use_container_width=True,
            )

        if active_alerts > 0:
            st.markdown("---")
            flagged_labels = {
                f"{row['zone']} - {row['city']}": row["zone"]
                for _, row in recent_alerts[["zone", "city"]].drop_duplicates().iterrows()
            }
            dispatch_target = st.selectbox(
                "Flagged zones — select dispatch target", list(flagged_labels)
            )

            if st.button("🚨 Dispatch Maintenance Crew", type="primary", use_container_width=True):
                st.session_state.work_order_seq += 1
                wo_id = f"#WO-{9481 + st.session_state.work_order_seq}"
                eta_min = random.randint(25, 40)
                crew = random.choice(["Crew Alpha", "Crew Bravo", "Crew Charlie", "Crew Delta"])
                st.session_state.dispatch_log.append(
                    {"zone": dispatch_target, "work_order": wo_id, "eta": eta_min}
                )
                st.toast(f"🚨 Maintenance crew dispatched to {dispatch_target}", icon="🚒")
                st.success(
                    f"**{crew} dispatched to {dispatch_target}**  \n"
                    f"Work Order {wo_id}  •  Estimated arrival: `{eta_min} min`"
                )

            if st.session_state.dispatch_log:
                st.caption("Dispatched crews this session")
                st.dataframe(
                    pd.DataFrame(st.session_state.dispatch_log),
                    use_container_width=True,
                    height=120,
                )

        st.caption("24-hour flow by sub-zone (gal/min)")
        flow_chart = chart_df.pivot(index="timestamp", columns="zone", values="flow")
        st.line_chart(flow_chart, height=250)

else:
    st.caption("Live USGS streamflow telemetry — National Water Information System (NWIS)")

    flow_df = fetch_live_usgs_flow()
    render_usgs_hero(flow_df)

    if flow_df.empty:
        st.warning(
            "⚠️ Unable to reach USGS NWIS for station 07194880. "
            "Check network connectivity or USGS service availability; "
            "the last cached reading (if any) will be reused for the next 15 minutes."
        )

    chart_left, chart_right = st.columns([0.85, 1.15], gap="large")

    with chart_left:
        st.subheader("Station Map")
        components.html(build_usgs_map(flow_df)._repr_html_(), height=440, scrolling=False)

    with chart_right:
        st.subheader("24-Hour Real Discharge Trend")
        if flow_df.empty:
            st.info("No streamflow data to plot while offline.")
        else:
            trend = flow_df["flow_cfs"].resample("15min").mean().dropna()
            st.line_chart(trend, height=320)
            st.caption(
                f"Discharge at USGS {USGS_STATION} ({USGS_NAME}), parameter 00060, "
                "instantaneous values (ft³/s) aggregated to 15-min means."
            )