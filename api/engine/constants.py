"""Decision constants (docs/methods.md §3.1). All are [assumption] proposals until the data lead confirms them.

Echo the ones that produced a finding in that evidence item's `method` text.
"""

HISTORY_MIN_FRACTION = 0.10  # EQ-003
MIN_VALID_FRACTION = 0.50  # EQ-005
S2_WINDOW_DAYS = 90  # EQ-005
AREA_TOLERANCE = 0.20  # EQ-009, EQ-012

# Sourced constants used inside formulas (docs/methods.md §3, EQ-002).
GMW_PIXEL_DEG = 0.000269469  # GMW pixel spacing, JAXA
EARTH_RADIUS_M = 6_371_008.8  # IUGG mean Earth radius

# Sentinel-2 SCL classes used here (AGENTS.md stack facts).
SCL_VEGETATION = 4
SCL_BARE_SOIL = 5
SCL_WATER = 6
