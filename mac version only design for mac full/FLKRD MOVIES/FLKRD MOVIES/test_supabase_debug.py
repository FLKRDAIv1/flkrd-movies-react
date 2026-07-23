import urllib.request
import json

headers = {
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mZGRhZW9mcHRvdG54ZW94ZmtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3NDk1NDIsImV4cCI6MjEwMDMyNTU0Mn0.Y502Vk2zlev9d4Hbkjt6VniV_xFXjl41YW4EE26wCNc",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mZGRhZW9mcHRvdG54ZW94ZmtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3NDk1NDIsImV4cCI6MjEwMDMyNTU0Mn0.Y502Vk2zlev9d4Hbkjt6VniV_xFXjl41YW4EE26wCNc",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

url = "https://ofddaeofptotnxeoxfko.supabase.co/rest/v1/dubbed_movies?select=id,title,kurdishTitle,description,videoUrl,media_type,imdb_id,tmdb_id,level,created_at,imageBase64&order=created_at.desc"
print("Testing select without bannerBase64:")
req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as response:
        print("  Status Code:", response.getcode())
        data = response.read().decode('utf-8')
        parsed = json.loads(data)
        print("  Success! Items:", len(parsed))
except Exception as e:
    print("  Error:", e)
