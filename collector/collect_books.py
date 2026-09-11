import requests

def fetch_books(keyword):
    url = f"https://www.googleapis.com/books/v1/volumes?q={keyword}&maxResults=5"
    response = requests.get(url, timeout=15)
    response.raise_for_status()
    res = response.json()
    return [
        {
            "title": item["volumeInfo"].get("title"),
            "summary": item["volumeInfo"].get("description", ""),
            "url": item["volumeInfo"].get("infoLink"),
            "thumbnail_url": item["volumeInfo"].get("imageLinks", {}).get("thumbnail"),
            "source": "Books",
            "type": "book",
            "external_id": item.get("id"),
        }
        for item in res.get("items", [])
    ]
