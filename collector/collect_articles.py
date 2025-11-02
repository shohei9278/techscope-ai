import os, requests, feedparser, psycopg2, html
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]  # Cloud SQL 用は Secret から
RSS_LIST = [
    "https://hnrss.org/frontpage",
    "https://qiita.com/popular-items/feed",
    "https://dev.to/feed",
]

def extract_summary(html_text: str, max_len=280):
    soup = BeautifulSoup(html_text, "html.parser")
    text = soup.get_text(" ", strip=True)
    return (text[:max_len] + "…") if len(text) > max_len else text

def upsert(cur, title, url, summary, source, category="General"):
    cur.execute("""
        insert into "Article"(id, title, url, summary, tags, category, source, "createdAt")
        values (gen_random_uuid()::text, %s, %s, %s, array[]::text[], %s, %s, now())
        on conflict (url) do nothing;
    """, (title, url, summary, source, category))

def main():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    for feed_url in RSS_LIST:
        feed = feedparser.parse(feed_url)
        for e in feed.entries[:20]:
            title = e.title
            link  = e.link
            summary = extract_summary(html.unescape(getattr(e, "summary", "")))
            source = feed.feed.title if "title" in feed.feed else "RSS"
            upsert(cur, title, link, summary or "(no summary)", source)
    conn.commit()
    cur.close(); conn.close()

if __name__ == "__main__":
    main()
