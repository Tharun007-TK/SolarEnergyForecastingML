def calculate_pr(actual_wh: float, expected_wh: float) -> float | None:
    """
    Performance Ratio = Actual Output / Expected Output × 100
    Returns percentage (0-100+). None if expected is zero.
    """
    if expected_wh <= 0:
        return None
    return (actual_wh / expected_wh) * 100


def classify_pr(pr: float | None) -> str:
    """Return color classification for PR value."""
    if pr is None:
        return "unknown"
    if pr >= 80:
        return "green"
    if pr >= 60:
        return "yellow"
    return "red"


def diagnose_anomaly(pr: float | None, ghi: float, temperature: float, cloud_cover: float) -> str | None:
    """Rule-based anomaly diagnosis."""
    if pr is None:
        return None

    if pr < 40 and cloud_cover < 30 and ghi > 200:
        return "Clear sky + very low PR — possible soiling or shading"

    if pr < 60 and temperature > 40:
        return "High temperature + low PR — possible thermal degradation"

    if pr < 60 and cloud_cover < 50:
        return "Low PR on fair day — possible inverter fault"

    if pr < 60:
        return "Low performance ratio detected"

    return None
