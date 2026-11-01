"""
Automated tests for frontend assets, single-page application routing,
MIME types, and static file delivery.
"""

from starlette.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_serves_spa_html():
    """Verify that the root endpoint serves the single-page application HTML."""
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers.get("content-type", "")
    html = response.text
    assert '<div id="root"></div>' in html
    assert 'styles.css' in html
    assert 'react.production.min.js' in html
    assert 'app.jsx' in html


def test_styles_css_served_with_correct_rules():
    """Verify that custom luxury styles, 3D flip card, and animations are served."""
    response = client.get("/static/css/styles.css")
    assert response.status_code == 200
    assert "text/css" in response.headers.get("content-type", "")
    css = response.text
    assert ".flip-card" in css
    assert "transform-style: preserve-3d" in css
    assert "rotateY(180deg)" in css
    assert ".navbar" in css
    assert ".ambient-layer" in css
    assert ".tabs-nav-wrapper" in css
    assert ".tabs-scroll-btn" in css
    assert ".variance-category-grid" in css


def test_react_app_jsx_served_with_javascript_mime():
    """Verify that app.jsx is served with application/javascript MIME type."""
    response = client.get("/static/js/app.jsx")
    assert response.status_code == 200
    content_type = response.headers.get("content-type", "")
    assert "javascript" in content_type
    jsx = response.text
    assert "function App()" in jsx
    assert "IdeasTab" in jsx
    assert "BudgetTab" in jsx
    assert "CostVarianceTab" in jsx
    assert "RecordPaymentModal" in jsx
    assert "formatINR" in jsx
    assert "TimelineTab" in jsx
    assert "VendorsTab" in jsx
    assert "GuestsTab" in jsx


def test_vendor_react_and_babel_served():
    """Verify that offline vendor scripts are present and served."""
    res_react = client.get("/static/vendor/react.production.min.js")
    assert res_react.status_code == 200

    res_dom = client.get("/static/vendor/react-dom.production.min.js")
    assert res_dom.status_code == 200

    res_babel = client.get("/static/vendor/babel.min.js")
    assert res_babel.status_code == 200
