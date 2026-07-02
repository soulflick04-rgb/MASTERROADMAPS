import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://skill-roadmap-hub-10.preview.emergentagent.com').rstrip('/')


@pytest.fixture
def client():
    s = requests.Session()
    s.headers.update({'Content-Type': 'application/json'})
    return s


def test_root(client):
    r = client.get(f'{BASE_URL}/api/')
    assert r.status_code == 200
    assert 'MasterRoadmaps' in r.json().get('message', '')


def test_empty_skill_returns_400(client):
    r = client.post(f'{BASE_URL}/api/generate-roadmap', json={'skill': '', 'intensity': '2 hours/day'}, timeout=30)
    assert r.status_code == 400
    assert 'skill' in r.json().get('detail', '').lower()


def test_whitespace_skill_returns_400(client):
    r = client.post(f'{BASE_URL}/api/generate-roadmap', json={'skill': '   ', 'intensity': '2 hours/day'}, timeout=30)
    assert r.status_code == 400


def test_generate_roadmap_magic(client):
    r = client.post(f'{BASE_URL}/api/generate-roadmap', json={'skill': 'magic', 'intensity': '4 hours/day Extreme'}, timeout=90)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get('success') is True
    data = body['data']
    # Structure checks
    assert 'motivation' in data and isinstance(data['motivation'], str)
    assert isinstance(data.get('phases'), list) and len(data['phases']) == 4
    for phase in data['phases']:
        assert 'name' in phase and 'days' in phase and 'goal' in phase
        assert isinstance(phase['tasks'], list) and len(phase['tasks']) == 6
    assert isinstance(data.get('resources'), list) and len(data['resources']) == 6
    for res in data['resources']:
        assert 'label' in res and 'text' in res
    assert isinstance(data.get('projects'), list) and len(data['projects']) == 4
    results = data.get('results', {})
    assert 'minimum' in results and 'good' in results and 'extreme' in results
    # Skill specificity - some phase text should mention magic-related concept
    combined = ' '.join([str(data)]).lower()
    assert 'magic' in combined or 'trick' in combined or 'card' in combined or 'illusion' in combined


def test_generate_roadmap_excel(client):
    r = client.post(f'{BASE_URL}/api/generate-roadmap', json={'skill': 'Excel', 'intensity': '1 hour/day'}, timeout=90)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body['success'] is True
    data = body['data']
    assert len(data['phases']) == 4
    assert len(data['resources']) == 6
    assert len(data['projects']) == 4
    combined = str(data).lower()
    assert 'excel' in combined or 'formula' in combined or 'vlookup' in combined or 'pivot' in combined
