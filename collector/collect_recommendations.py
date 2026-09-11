import sys, os
from urllib.parse import parse_qs, urlparse
import dotenv

dotenv.load_dotenv()

from supabase import create_client
from collect_youtube import fetch_youtube
from collect_books import fetch_books
from collect_courses import fetch_all_api_content

user_id = sys.argv[1]
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def collect_all(keyword="Python"):
    data = []
    data.extend(fetch_youtube(keyword))
    data.extend(fetch_books(keyword))
    data.extend(fetch_all_api_content(keyword))
    return data

def save_to_supabase(user_id, keyword="Python"):
    resources = collect_all(keyword)
    rows = []
    for resource in resources:
        url = resource.get("url")
        if not resource.get("title") or not url:
            continue
        resource_type = resource.get("type", "article")
        if resource.get("source") == "FreeCodeCamp":
            resource_type = "course"
        if resource_type not in {"article", "video", "book", "repository", "course"}:
            resource_type = "article"
        video_id = parse_qs(urlparse(url).query).get("v", [None])[0]
        external_id = resource.get("external_id") or video_id or url
        metadata = {key: value for key, value in resource.items() if key not in {"title", "summary", "url", "thumbnail_url", "source", "type", "external_id"}}
        rows.append({
            "resource_type": resource_type,
            "external_id": str(external_id),
            "title": resource["title"][:500],
            "summary": (resource.get("summary") or "")[:2000],
            "url": url,
            "thumbnail_url": resource.get("thumbnail_url"),
            "source": resource.get("source", "Unknown"),
            "topic": keyword,
            "metadata": metadata,
        })

    if not rows:
        print("No learning resources found")
        return
    result = supabase.table("learning_resources").upsert(rows, on_conflict="resource_type,external_id").execute()
    print(f"Saved {len(result.data or [])} learning resources for {user_id}")

if __name__ == "__main__":
    save_to_supabase(user_id, sys.argv[2] if len(sys.argv) > 2 else "Python")