import json
from pathlib import Path

from django.conf import settings
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from pydantic import ValidationError

from .bond_models import BondPriceRequest, BondPriceResponse
from .pricing.bond_price import price_bond


def _collect_css(manifest, chunk_key, visited=None):
    if visited is None:
        visited = set()
    if chunk_key in visited:
        return []
    visited.add(chunk_key)
    chunk = manifest.get(chunk_key, {})
    css = list(chunk.get('css', []))
    for imp in chunk.get('imports', []):
        css.extend(_collect_css(manifest, imp, visited))
    return css


def _get_vite_assets():
    vite_dev_path = settings.BASE_DIR / 'frontend' / 'vite-dev.json'
    if settings.DEBUG and vite_dev_path.exists():
        return {
            'dev': True,
            'client': 'http://localhost:5173/@vite/client',
            'entry_js': 'http://localhost:5173/applets/slb_pricer/src/main.jsx',
            'css': [],
        }

    manifest_path = settings.BASE_DIR / 'static' / '.vite' / 'manifest.json'
    try:
        with open(manifest_path) as f:
            manifest = json.load(f)
    except FileNotFoundError:
        manifest = {}

    entry_key = 'applets/slb_pricer/src/main.jsx'
    entry = manifest.get(entry_key, {})
    return {
        'dev': False,
        'client': None,
        'entry_js': f"/static/{entry.get('file', '')}",
        'css': [f"/static/{c}" for c in _collect_css(manifest, entry_key)],
    }


def index(request):
    return render(request, 'pricer/index.html', {'vite': _get_vite_assets()})


def health(request):
    return JsonResponse({'status': 'ok'})


@csrf_exempt
@require_http_methods(['POST'])
def price_bond_view(request):
    try:
        data = json.loads(request.body)
        req = BondPriceRequest(**data)
    except (json.JSONDecodeError, ValidationError) as e:
        return JsonResponse({'detail': str(e)}, status=422)

    if req.settlement_date >= req.maturity_date:
        return JsonResponse({'detail': 'settlement_date must be before maturity_date'}, status=400)
    if req.call_option and req.call_option.call_date >= req.maturity_date:
        return JsonResponse({'detail': 'call_date must be before maturity_date'}, status=400)
    if req.call_option and req.call_option.call_date <= req.settlement_date:
        return JsonResponse({'detail': 'call_date must be after settlement_date'}, status=400)

    try:
        result = price_bond(req)
        response = BondPriceResponse(**result)
        return JsonResponse(response.model_dump(mode='json'))
    except ValueError as e:
        return JsonResponse({'detail': str(e)}, status=400)
    except Exception as e:
        return JsonResponse({'detail': str(e)}, status=500)
