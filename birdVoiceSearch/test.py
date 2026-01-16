#%%
import requests
query="Cuculus canorus"
query += " +type:song"
url = f"https://xeno-canto.org/api/2/recordings?query={query}"
        
response = requests.get(url)
print(response.json())
# %%
response.json()
# %%
