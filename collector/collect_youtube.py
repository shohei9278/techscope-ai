import os
import requests

YOUTUBE_KEY = os.getenv("YOUTUBE_API_KEY")

def fetch_youtube(keyword):
    if not YOUTUBE_KEY:
        print("YOUTUBE_API_KEY is not set; skipping YouTube")
        return []
    url = "https://www.googleapis.com/youtube/v3/search"
    params = {
        "part": "snippet",
        "q": keyword,
        "maxResults": 5,
        "type": "video",
        "key": YOUTUBE_KEY,
    }
    response = requests.get(url, params=params, timeout=15)
    response.raise_for_status()
    res = response.json()
    return [
        {
            "title": item["snippet"]["title"],
            "summary": item["snippet"]["description"],
            "url": f"https://www.youtube.com/watch?v={item['id']['videoId']}",
            "thumbnail_url": item["snippet"]["thumbnails"].get("high", item["snippet"]["thumbnails"].get("default", {})).get("url"),
            "source": "YouTube",
            "type": "video",
            "external_id": item["id"]["videoId"],
        }
        for item in res.get("items", [])
    ]
