
import json

with open('ahmed_files.json', 'r') as f:
    files = json.load(f)
    for file in files:
        if 'nawawi' in file['name'].lower():
            print(file['name'])
