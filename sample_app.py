"""Separate sample-only explorer. Never imports or modifies the existing apps."""
import altair as alt
import pandas as pd
import streamlit as st

from sample_data import SOURCE_URL, group_hours, load_sample


COMPACT_CSS = '''
<style>
  .block-container {
      max-width: min(1000px, 92vw) !important;
      padding: 1rem 1.5rem 1.5rem !important;
  }
  [data-testid="stHeader"] { height: 2rem; }
  [data-testid="stMain"] { padding-top: 2rem; }
  [data-testid="stVerticalBlock"] { gap: 0.65rem; }
  h1 { font-size: 1.7rem !important; padding-top: 0 !important; }
  [data-testid="stMetricValue"] { font-size: 1.35rem !important; }
  [data-testid="stMetricLabel"] { font-size: 0.8rem !important; }
  [data-testid="stAlert"] { padding: 0.5rem 0.75rem !important; }
  [data-testid="stAlert"] p { font-size: 0.9rem !important; }
  .stTabs [data-baseweb="tab-list"] { gap: 8px !important; }
  .stTabs [data-baseweb="tab"] {
      padding: 4px 12px !important;
      font-size: 0.88rem !important;
  }
  @media (max-width: 640px) {
      .block-container { max-width: 100% !important; padding-inline: 1rem !important; }
      .stTabs [data-baseweb="tab"] { padding-inline: 6px !important; }
  }
</style>
'''


@st.cache_data(show_spinner=False)
def get_hours():
    # Shared cache is intentionally limited to the bundled PUBLIC sample.
    return group_hours(load_sample())


def main():
    st.set_page_config(page_title='HydroWatch AR', page_icon='💧', layout='wide',
                       initial_sidebar_state='collapsed')
    st.markdown(COMPACT_CSS, unsafe_allow_html=True)
    st.title('Explore recorded water use')
    st.caption('For Northwest Arkansas residents: understand water-use records before contacting '
               'your utility. Practice with a public Utah sample; find local help in Source & guidance.')
    st.info('Recorded Utah household sample—not your meter. Leak status unknown. '
            'Source timezone unverified.')
    st.caption(f'[Cache County High Resolution Residential Water Use Data]({SOURCE_URL}) · '
               '[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) · '
               'Site032, Aug 12–28, 2020 · Recorded sample / demo, not simulated.')
    try:
        with st.spinner('Checking the bundled sample…'):
            hours = get_hours()
    except (OSError, ValueError, EOFError, UnicodeError):
        st.error('The bundled sample could not be verified. Restore data/site032_summer.csv.gz '
                 'from the documented fixture before continuing. No substitute readings are shown.')
        st.link_button('Open original dataset', SOURCE_URL)
        return

    cols = st.columns(3)
    cols[0].metric('Whole-sample gallons', f'{sum(h.gallons for h in hours if h.gallons is not None):,.2f}')
    cols[1].metric('Sample observations (4 sec)', f'{sum(h.count for h in hours):,}')
    cols[2].metric('Sample full-count hours', f'{sum(h.count == h.expected for h in hours)} / {len(hours)}')
    usage, coverage, source = st.tabs(['Usage', 'Coverage', 'Source & guidance'],
                                     key='sample_view', on_change='rerun')
    days = sorted({h.timestamp.strftime('%Y-%m-%d') for h in hours})
    with usage:
        day = st.selectbox('View recorded day', ['Entire sample'] + days)
    chosen = [h for h in hours if day == 'Entire sample' or h.timestamp.strftime('%Y-%m-%d') == day]
    table = pd.DataFrame([{
        'Source-clock hour': h.timestamp.strftime('%Y-%m-%d %H:00'),
        'Recorded gallons': float(h.gallons) if h.gallons is not None else None,
        'Observations': h.count,
        'Expected per full hour': h.expected,
        'Coverage': ('Partial edge' if h.partial else 'Missing observations' if h.count < h.expected
                     else 'All expected readings present'),
    } for h in chosen])
    chart = alt.Chart(table).mark_bar().encode(
        x=alt.X('Source-clock hour:O', sort=None, title='Recorded timestamp hour (timezone unknown)',
                axis=alt.Axis(labelOverlap=True, labelAngle=0,
                              labelExpr="substring(datum.label, 5, 10) + ' ' + substring(datum.label, 11, 16)")),
        y=alt.Y('Recorded gallons:Q', title='Gallons grouped by timestamp hour', stack=None),
        color=alt.Color('Coverage:N', scale=alt.Scale(
            domain=['All expected readings present', 'Partial edge', 'Missing observations'],
            range=['#176B87', '#99620A', '#5F7D8A']),
            legend=alt.Legend(orient='right', columns=1, labelLimit=220)),
        tooltip=['Source-clock hour:O', alt.Tooltip('Recorded gallons:Q', format='.3f'),
                 'Observations:Q', 'Coverage:N'],
    ).properties(height=260)
    with usage:
        st.altair_chart(chart, width='stretch')
        st.caption('Colors show coverage, not risk. Opening/closing hours are partial. '
                   'A missing hour and a recorded zero may both have no visible bar. '
                   'Check Coverage to distinguish them. Metrics above always cover the whole sample.')

    with coverage:
        st.warning('The opening and closing hours are partial. Clock timezone and interval-start/end '
                   'meaning are unverified. Bars group readings by timestamp hour, not proven '
                   'continuous flow or local overnight use.')
        st.caption(f'Table follows the Usage tab selection: {day}. '
                   '900 observations = all expected readings present (3,600 seconds ÷ 4).')
        st.dataframe(table.rename(columns={
            'Source-clock hour': 'Recorded hour', 'Recorded gallons': 'Gallons',
            'Observations': 'Count', 'Expected per full hour': 'Expected',
        }), hide_index=True, width='stretch', height=200, column_config={
            'Gallons': st.column_config.NumberColumn(format='%.3f'),
        })
        st.caption('No interior timestamp gaps. First group: 281 observations; last: 510. '
                   'Measured zeros are retained; missing observations are never zero-filled. '
                   'Full counts do not resolve physical interval boundary ownership.')
        st.caption('Recorded Aug 12, 2020 09:41:17 through Aug 28, 2020 09:33:57, source clock.')
    with source:
        st.subheader('Northwest Arkansas utility guide')
        providers = {
            'Fayetteville': (
                'UtilityAccess offers consumption/account views and past bill downloads.',
                'https://www.fayetteville-ar.gov/419/Water-Service-and-Billing',
                '479-521-1258'),
            'Rogers': (
                'Official account-help guides cover account setup and management.',
                'https://www.rogerswaterar.gov/new-customers/online-account-management/online-account-help/',
                '479-621-1142'),
            'Bentonville': (
                'The official billing page describes InvoiceCloud and past bills in PDF form.',
                'https://www.bentonville.ar.gov/244/Online-Payments---Updated-Website',
                '479-271-3100'),
            'Springdale': (
                'The official site links to e-statements, customer help and reporting a leak.',
                'https://springdalewaterar.gov/',
                '479-751-5751'),
        }
        provider = st.selectbox('Your water provider (check your bill)', list(providers))
        description, url, phone = providers[provider]
        st.markdown(f'{description} [Open {provider} official help]({url}). Customer service: **{phone}**.')
        st.caption('Choose the provider named on your bill, not just your city. Other providers are not '
                   'listed. Links leave this app; no account connection is made. '
                   'Hourly exports and compatibility are unverified. Changing this choice does not '
                   'change the Utah sample. Public pages reviewed October 9, 2026; details may change.')
        st.markdown(f'[Cache County High Resolution Residential Water Use Data]({SOURCE_URL}), '
                'Bastidas Pacheco, Atallah and Horsburgh (2023). '
                '[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). '
                'DOI: 10.4211/hs.0b72cddfc51c45b188e0e6cd8927227e.')
        st.caption('Modified for this demo: selected site032 summer observations, normalized CSV line '
             'endings and compressed for offline use; summed pulses by source-clock hour and '
             'converted using 0.008699 gallons per pulse. The source authors do not endorse this app.')
        st.write('This sample is not representative evidence for Arkansas households. There are no '
             'documented leak labels, uploads, live meter connections, anomaly scores or leak '
             'classifications here. This tool does not assess water safety or promise savings.')
        st.write('Visitors, irrigation and appliances can change usage. For your own household, review '
             'expected activities and your provider’s guidance; contact your utility or a qualified '
             'plumber with concerns. Do not operate utility meter-box valves or pressure-relief equipment.')
        st.markdown('[Rogers: possible reasons for higher usage]('
                'https://www.rogerswaterar.gov/your-water/efficiency-and-leak-detection-tips/'
                'possible-causes-of-higher-than-average-water-usage/)')
        st.markdown('[Fayetteville: household inspection guidance]('
                'https://www.fayetteville-ar.gov/447/Water-Leak-Check)')
        st.caption('Independent educational project. The published boil-water notice finder is a separate app.')


if __name__ == '__main__':
    main()
