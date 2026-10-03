# services/ingest

Evidence source adapters that normalize each source into the common evidence model:
- `gmw/`: Global Mangrove Watch historical extent/change (pre-ingested snapshot)
- `sentinel2/`: Copernicus Sentinel Hub Statistical + Catalog APIs (falls back to a traceable snapshot if the live API is unreliable)
- `field/`: project / field evidence uploads

_Created during the build window in Kiro._
