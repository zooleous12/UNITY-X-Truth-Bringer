import base64
import gzip
import json

file_path = r'C:\Users\Charles Kendrick\Desktop\New folder\Why Is My App Not Responding_\Bigmanus\wault_context.base64'
with open(file_path, 'r') as f:
    content = f.read().strip()

# It has a prefix 'B85+GZIP+JSON:'
if ':' in content:
    content = content.split(':', 1)[1]

try:
    decoded_b85 = base64.b85decode(content)
    decompressed = gzip.decompress(decoded_b85)
    json_data = json.loads(decompressed)
    print(json.dumps(json_data, indent=2))
except Exception as e:
    print('Error decoding:', e)
