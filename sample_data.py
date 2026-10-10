"""Offline, measured sample data; no leak inference or timezone conversion."""
import csv
from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import Decimal
import gzip
import hashlib
import io
from pathlib import Path
import re

FACTOR = Decimal('0.008699')  # site032 gallons per pulse, sites.csv
SAMPLE_PATH = Path(__file__).parent / 'data' / 'site032_summer.csv.gz'
SAMPLE_SHA256 = 'e52624a3736a7cbd8d219060c821b12f4a5e885541d062f4cb584861565dcd80'
SOURCE_URL = 'https://www.hydroshare.org/resource/0b72cddfc51c45b188e0e6cd8927227e/'


@dataclass(frozen=True)
class Reading:
    timestamp: datetime
    pulses: int


@dataclass(frozen=True)
class Hour:
    timestamp: datetime
    count: int
    expected: int
    gallons: Decimal | None
    partial: bool


def parse_readings(text: str) -> tuple[Reading, ...]:
    """Validate source-clock observations. Gaps remain gaps on the 4-second grid."""
    reader = csv.reader(io.StringIO(text))
    if next(reader, None) != ['Time', 'Pulses']:
        raise ValueError('Expected Time,Pulses source columns.')
    rows = []
    previous = None
    for number, fields in enumerate(reader, 2):
        if len(fields) != 2 or not re.fullmatch(r'[0-9]+', fields[1]):
            raise ValueError(f'Row {number}: expected a timestamp and nonnegative integer pulses.')
        try:
            timestamp = datetime.strptime(fields[0], '%Y-%m-%d %H:%M:%S')
        except ValueError as exc:
            raise ValueError(f'Row {number}: invalid source-clock timestamp.') from exc
        if timestamp.strftime('%Y-%m-%d %H:%M:%S') != fields[0]:
            raise ValueError(f'Row {number}: timestamp format must be YYYY-MM-DD HH:MM:SS.')
        if previous is not None:
            delta = (timestamp - previous).total_seconds()
            if delta <= 0 or delta % 4:
                raise ValueError(f'Row {number}: duplicate, unordered, or off-grid timestamp.')
        rows.append(Reading(timestamp, int(fields[1])))
        previous = timestamp
    if not rows:
        raise ValueError('The sample has no observations.')
    return tuple(rows)


def group_hours(readings: tuple[Reading, ...]) -> tuple[Hour, ...]:
    """Group by naive clock hour. Absent buckets have None, not zero gallons."""
    if not readings:
        raise ValueError('Cannot group an empty sample.')
    grouped = {}
    for row in readings:
        hour = row.timestamp.replace(minute=0, second=0)
        count, pulses = grouped.get(hour, (0, 0))
        grouped[hour] = (count + 1, pulses + row.pulses)
    first = readings[0].timestamp.replace(minute=0, second=0)
    last = readings[-1].timestamp.replace(minute=0, second=0)
    buckets = []
    hour = first
    while hour <= last:
        count, pulses = grouped.get(hour, (0, 0))
        buckets.append(Hour(hour, count, 900, Decimal(pulses) * FACTOR if count else None,
                            hour in (first, last) and count < 900))
        hour += timedelta(hours=1)
    return tuple(buckets)


def load_sample() -> tuple[Reading, ...]:
    """Load only the pinned local fixture and fail closed on modified bytes."""
    data = gzip.decompress(SAMPLE_PATH.read_bytes())
    if hashlib.sha256(data).hexdigest() != SAMPLE_SHA256:
        raise ValueError('Bundled sample checksum mismatch; restore the documented fixture.')
    return parse_readings(data.decode('utf-8'))
