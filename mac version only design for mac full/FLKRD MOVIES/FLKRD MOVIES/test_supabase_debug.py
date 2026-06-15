import urllib.request
import json

headers = {
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtYWh6YWxheGJrbWhicGNhbGx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NjQ0NDYsImV4cCI6MjA5MzM0MDQ0Nn0.d4y612cjG6bSHL6vNK1YdxFmKjCJ6YpDIV7oG9XFis4",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtYWh6YWxheGJrbWhicGNhbGx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NjQ0NDYsImV4cCI6MjA5MzM0MDQ0Nn0.d4y612cjG6bSHL6vNK1YdxFmKjCJ6YpDIV7oG9XFis4",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

url = "https://fmahzalaxbkmhbpcally.supabase.co/rest/v1/dubbed_movies?select=id,title,kurdishTitle,description,videoUrl,media_type,imdb_id,tmdb_id,level,created_at,imageBase64&order=created_at.desc"
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
