import json
import codecs

with codecs.open('wp_json.json', 'r', encoding='utf-16le') as f:
    content = f.read()

# Just in case it has a BOM, strip it if necessary or try utf-8
try:
    data = json.loads(content.lstrip('\ufeff'))
except Exception as e:
    # Fallback to try reading with utf-8 or cp1252 if it was not actually utf-16
    with open('wp_json.json', 'r', encoding='utf-8', errors='ignore') as f:
        data = json.loads(f.read().lstrip('\ufeff'))

namespaces = data.get('namespaces', [])
print("Namespaces:")
for ns in namespaces:
    print(f"  - {ns}")

print("\nCustom endpoints containing 'aps', 'sof', 'bvs':")
for route in data.get('routes', {}):
    if 'aps' in route.lower() or 'sof' in route.lower() or 'bvs' in route.lower():
        print(f"  - {route}")

print("\nWP V2 Endpoints:")
wp_v2_routes = [r for r in data.get('routes', {}) if r.startswith('/wp/v2/')]
for route in wp_v2_routes:
    # filter out some noise
    if not any(x in route for x in ['revisions', 'autosaves', 'statuses', 'taxonomies', 'users']):
        print(f"  - {route}")
