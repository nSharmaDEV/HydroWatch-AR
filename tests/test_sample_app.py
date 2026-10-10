from pathlib import Path
import importlib.util
import json

from streamlit.testing.v1 import AppTest


def app():
    assert importlib.util.find_spec('sample_app'), 'sample explorer UI is not implemented'
    return AppTest.from_file(str(Path(__file__).parents[1] / 'sample_app.py'), default_timeout=60)


def test_sample_caveats_totals_and_no_upload():
    at = app().run()
    assert not at.exception
    assert at.title[0].value == 'Explore recorded water use'
    assert 'not your meter' in at.info[0].value
    assert 'Leak status unknown' in at.info[0].value
    assert 'timezone unverified' in at.info[0].value
    assert [m.value for m in at.metric] == ['14,512.53', '345,491', '383 / 385']
    assert not at.get('file_uploader')
    assert any('CC BY 4.0' in m.value for m in at.markdown)
    assert any('partial' in w.value for w in at.warning)
    assert len(at.get('vega_lite_chart')) == 1
    spec = json.loads(at.get('vega_lite_chart')[0].proto.spec)
    assert 'stack' in spec['encoding']['y'] and spec['encoding']['y']['stack'] is None
    assert spec['encoding']['x']['type'] == 'ordinal'  # no browser timezone conversion
    assert spec['encoding']['color']['legend']['columns'] == 1  # narrow screens


def test_day_selection_changes_table_not_provenance():
    at = app().run()
    at.selectbox[0].select('2020-08-13').run()
    assert not at.exception
    assert len(at.dataframe[0].value) == 24
    assert all(at.dataframe[0].value['Recorded hour'].str.startswith('2020-08-13'))
    assert 'not your meter' in at.info[0].value
    assert at.metric[0].value == '14,512.53'  # explicitly whole-sample summary


def test_invalid_fixture_has_readable_error(monkeypatch):
    assert importlib.util.find_spec('sample_app'), 'sample explorer UI is not implemented'
    import sample_app
    def unavailable():
        raise ValueError('checksum mismatch')
    monkeypatch.setattr(sample_app, 'get_hours', unavailable)
    def harness():
        import sample_app
        sample_app.main()
    at = AppTest.from_function(harness).run()
    assert not at.exception
    assert 'restore' in at.error[0].value.lower()
    assert not at.metric


def test_compact_layout_keeps_content_in_bounded_tabs():
    at = app().run()
    assert not at.exception
    assert [t.label for t in at.tabs] == ['Usage', 'Coverage', 'Source & guidance']
    spec = json.loads(at.get('vega_lite_chart')[0].proto.spec)
    assert spec['height'] == 260
    assert spec['encoding']['color']['legend']['orient'] == 'right'
    assert list(at.dataframe[0].value.columns) == ['Recorded hour', 'Gallons', 'Count',
                                                   'Expected', 'Coverage']
    assert all('sample' in m.label.lower() for m in at.metric)
    assert any('CC BY 4.0' in c.value for c in at.caption)
    assert not at.get('download_button')


def test_missing_and_zero_explanation_and_plain_coverage_labels():
    at = app().run()
    assert not at.exception
    captions = ' '.join(c.value for c in at.caption)
    assert 'A missing hour and a recorded zero may both have no visible bar.' in captions
    assert 'Check Coverage to distinguish them.' in captions
    assert 'No bar means missing' not in captions
    spec = json.loads(at.get('vega_lite_chart')[0].proto.spec)
    assert spec['encoding']['color']['scale']['domain'][0] == 'All expected readings present'
    assert spec['encoding']['color']['legend']['labelLimit'] == 220
    table = at.dataframe[0].value
    full = table[table['Count'] == table['Expected']]
    assert set(full['Coverage']) == {'All expected readings present'}
    assert any(full['Gallons'] == 0)  # Real measured zero remains complete, not missing.


def test_arkansas_purpose_keeps_utah_practice_sample_distinct():
    at = app().run()
    assert not at.exception
    captions = ' '.join(c.value for c in at.caption)
    assert 'For Northwest Arkansas residents' in captions
    assert 'Practice with a public Utah sample' in captions
    assert 'not your meter' in at.info[0].value
    assert 'Leak status unknown' in at.info[0].value
    assert any('Hourly exports and compatibility are unverified' in c.value for c in at.caption)
    assert not at.get('file_uploader')


def test_local_utility_choice_shows_verified_help_without_changing_readings():
    at = app().run()
    guide = next(s for s in at.selectbox if s.label == 'Your water provider (check your bill)')
    assert guide.options == ['Fayetteville', 'Rogers', 'Bentonville', 'Springdale']
    expected = {
        'Fayetteville': ('479-521-1258', 'https://www.fayetteville-ar.gov/419/Water-Service-and-Billing'),
        'Rogers': ('479-621-1142', 'https://www.rogerswaterar.gov/new-customers/online-account-management/online-account-help/'),
        'Bentonville': ('479-271-3100', 'https://www.bentonville.ar.gov/244/Online-Payments---Updated-Website'),
        'Springdale': ('479-751-5751', 'https://springdalewaterar.gov/'),
    }
    for provider, (phone, url) in expected.items():
        guide.select(provider).run()
        assert not at.exception
        text = ' '.join(m.value for m in at.markdown)
        assert phone in text and url in text
        assert [m.value for m in at.metric] == ['14,512.53', '345,491', '383 / 385']
        assert 'Recorded Utah household sample' in at.info[0].value
        guide = next(s for s in at.selectbox if s.label == 'Your water provider (check your bill)')
