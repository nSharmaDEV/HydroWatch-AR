from decimal import Decimal
import importlib.util

import pytest


def module():
    assert importlib.util.find_spec('sample_data'), 'sample_data parser is not implemented'
    import sample_data
    return sample_data


def test_exact_conversion_and_measured_zero():
    m = module()
    rows = m.parse_readings('Time,Pulses\n2020-08-12 09:41:17,16\n2020-08-12 09:41:21,0\n')
    buckets = m.group_hours(rows)
    assert rows[0].timestamp.tzinfo is None
    assert buckets[0].gallons == Decimal('0.139184')
    assert buckets[0].count == 2
    assert buckets[0].expected == 900
    assert buckets[0].partial


@pytest.mark.parametrize('body', [
    '2020-08-12 09:41:17,-1', '2020-08-12 09:41:17,1.5',
    '2020-08-12T09:41:17Z,1', 'bad,1', '2020-08-12 09:41:17,NaN',
    '2020-08-12 09:41:17,1\n2020-08-12 09:41:17,2',
    '2020-08-12 09:41:21,1\n2020-08-12 09:41:17,2',
    '2020-08-12 09:41:17,1\n2020-08-12 09:41:22,2',
])
def test_invalid_observations_fail_closed(body):
    with pytest.raises(ValueError):
        module().parse_readings('Time,Pulses\n' + body + '\n')


@pytest.mark.parametrize('text', ['', 'Time,Pulses\n', 'timestamp,usage\na,1\n'])
def test_empty_or_wrong_schema_rejected(text):
    with pytest.raises(ValueError):
        module().parse_readings(text)


def test_missing_hour_is_not_zero():
    m = module()
    rows = m.parse_readings('Time,Pulses\n2020-08-12 09:00:01,0\n2020-08-12 11:00:01,1\n')
    buckets = m.group_hours(rows)
    assert len(buckets) == 3
    assert buckets[0].gallons == 0
    assert buckets[1].count == 0
    assert buckets[1].gallons is None
    assert buckets[2].gallons == Decimal('0.008699')


def test_bundled_sample_reproduces_complete_audit():
    m = module()
    rows = m.load_sample()
    buckets = m.group_hours(rows)
    assert len(rows) == 345491
    assert sum(r.pulses for r in rows) == 1668299
    assert rows[0].timestamp.isoformat(' ') == '2020-08-12 09:41:17'
    assert rows[-1].timestamp.isoformat(' ') == '2020-08-28 09:33:57'
    assert len(buckets) == 385
    assert sum(b.count == 900 for b in buckets) == 383
    assert [b.count for b in buckets if b.partial] == [281, 510]
    assert sum(b.gallons for b in buckets) == Decimal('14512.533001')


def test_interior_gap_remains_incomplete():
    m = module()
    rows = m.parse_readings('Time,Pulses\n2020-08-12 09:59:57,1\n'
                            '2020-08-12 10:00:01,0\n2020-08-12 10:00:09,2\n'
                            '2020-08-12 11:00:01,1\n')
    middle = m.group_hours(rows)[1]
    assert middle.count == 2 and middle.expected == 900
    assert middle.gallons == Decimal('0.017398')
    assert not middle.partial  # incomplete interior, not collection edge


@pytest.mark.parametrize('content', [b'not gzip', b'Time,Pulses\n2020-08-12 09:41:17,1\n'])
def test_corrupted_fixture_is_not_accepted(tmp_path, monkeypatch, content):
    import gzip
    m = module()
    path = tmp_path / 'sample.gz'
    path.write_bytes(content if content == b'not gzip' else gzip.compress(content))
    monkeypatch.setattr(m, 'SAMPLE_PATH', path)
    with pytest.raises((OSError, ValueError)):
        m.load_sample()


def test_missing_fixture_is_not_synthetic_fallback(tmp_path, monkeypatch):
    m = module()
    monkeypatch.setattr(m, 'SAMPLE_PATH', tmp_path / 'absent.gz')
    with pytest.raises(FileNotFoundError):
        m.load_sample()
