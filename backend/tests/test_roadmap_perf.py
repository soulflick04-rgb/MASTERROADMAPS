"""Performance + regression tests for the gpt-5.4-mini switch."""
import os
import time
import pytest
import requests

BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/')


@pytest.fixture
def client():
    s = requests.Session()
    s.headers.update({'Content-Type': 'application/json'})
    return s


@pytest.mark.parametrize('skill,intensity', [
    ('Python', '2 hours/day'),
    ('Guitar', '1 hour/day'),
    ('Public Speaking', '4 hours/day Extreme'),
])
def test_roadmap_response_time_under_12s(client, skill, intensity):
    t0 = time.time()
    r = client.post(f'{BASE_URL}/api/generate-roadmap',
                    json={'skill': skill, 'intensity': intensity}, timeout=60)
    elapsed = time.time() - t0
    assert r.status_code == 200, r.text
    body = r.json()
    assert body['success'] is True
    data = body['data']
    # Structure regression
    assert len(data['phases']) == 4
    for p in data['phases']:
        assert len(p['tasks']) == 6
    assert len(data['resources']) == 6
    assert len(data['projects']) == 4
    assert set(['minimum', 'good', 'extreme']).issubset(data['results'].keys())
    print(f"\n[PERF] {skill} @ {intensity}: {elapsed:.2f}s")
    # Soft budget - fail if it takes > 12s (as per bug fix goal)
    assert elapsed <= 12.0, f"Response took {elapsed:.2f}s (>12s budget)"


# --- Leads endpoint regression ---
def test_leads_invalid_phone(client):
    r = client.post(f'{BASE_URL}/api/leads', json={'phone': '12345', 'skill': 'Python'}, timeout=15)
    assert r.status_code == 400


def test_leads_valid_phone(client):
    r = client.post(f'{BASE_URL}/api/leads', json={'phone': '9876543210', 'skill': 'Python'}, timeout=15)
    assert r.status_code == 200
    assert r.json().get('success') is True


def test_leads_valid_phone_with_prefix(client):
    r = client.post(f'{BASE_URL}/api/leads', json={'phone': '+91 9876543210', 'skill': 'Python'}, timeout=15)
    assert r.status_code == 200
