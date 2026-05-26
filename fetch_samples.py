import urllib.request
import json

def fetch_and_print(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            print(f"--- Data from {url} ---")
            if isinstance(data, list) and len(data) > 0:
                item = data[0]
                print(json.dumps({
                    'id': item.get('id'),
                    'title': item.get('title', {}).get('rendered', ''),
                    'content_snippet': item.get('content', {}).get('rendered', '')[:200].replace('\n', ' '),
                    'ciap2': item.get('ciap2', []),
                    'categoria_da_evidencia': item.get('categoria-da-evidencia', [])
                }, indent=2, ensure_ascii=False))
            else:
                print(f"Empty or unexpected data: {str(data)[:200]}")
    except Exception as e:
        print(f"Error fetching {url}: {e}")

fetch_and_print('https://aps-repo.bvs.br/wp-json/wp/v2/aps?per_page=1')
fetch_and_print('https://aps-repo.bvs.br/wp-json/wp/v2/ciap2?per_page=3')
