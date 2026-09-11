import requests
import xml.etree.ElementTree as ET


def fetch_dev_to_articles(query="python", limit=5):
    """Dev.to APIから開発者記事を取得（サムネイル付き）"""
    api_url = f"https://dev.to/api/articles?tag={query}&per_page={limit}&state=fresh"
    
    headers = {
        "User-Agent": "TechScope Learning Content Collector",
        "Accept": "application/json",
    }
    
    try:
        response = requests.get(api_url, headers=headers, timeout=10)
        if response.status_code != 200:
            print(f"❌ Dev.to API failed: {response.status_code}")
            return []
            
        articles_data = response.json()
        articles = []
        
        for article in articles_data:
            # サムネイル画像の取得（優先順位: cover_image > social_image）
            thumbnail_url = article.get("cover_image") or article.get("social_image")
            
            articles.append({
                "title": article.get("title", ""),
                "url": article.get("url", ""),
                "source": "Dev.to",
                "type": "article",
                "summary": article.get("description", "Developer article from Dev.to"),
                "published_at": article.get("published_at"),
                "tags": article.get("tag_list", []),
                "reading_time": article.get("reading_time_minutes", 0),
                "thumbnail_url": thumbnail_url,
                "author": article.get("user", {}).get("name", ""),
                "author_avatar": article.get("user", {}).get("profile_image", "")
            })
        
        print(f"✅ Dev.to: Found {len(articles)} articles (with thumbnails)")
        return articles
        
    except Exception as e:
        print(f"❌ Dev.to API error: {e}")
        return []


def fetch_github_tutorials(query="python tutorial", limit=5):
    """GitHub APIから学習リポジトリを取得（サムネイル付き）"""
    search_query = f"{query} language:python sort:stars"
    api_url = f"https://api.github.com/search/repositories?q={search_query}&per_page={limit}"
    
    headers = {
        "User-Agent": "TechScope Learning Content Collector",
        "Accept": "application/vnd.github.v3+json",
    }
    
    try:
        response = requests.get(api_url, headers=headers, timeout=10)
        if response.status_code != 200:
            print(f"❌ GitHub API failed: {response.status_code}")
            return []
            
        data = response.json()
        repos = data.get('items', [])
        tutorials = []
        
        for repo in repos:
            # オーナーのアバター画像をサムネイルとして使用
            owner = repo.get("owner", {})
            thumbnail_url = owner.get("avatar_url")
            
            tutorials.append({
                "title": repo.get("name", ""),
                "url": repo.get("html_url", ""),
                "source": "GitHub",
                "type": "repository",
                "summary": repo.get("description", "GitHub learning repository"),
                "stars": repo.get("stargazers_count", 0),
                "language": repo.get("language", ""),
                "updated_at": repo.get("updated_at"),
                "thumbnail_url": thumbnail_url,
                "author": owner.get("login", ""),
                "author_avatar": thumbnail_url,
                "forks": repo.get("forks_count", 0),
                "issues": repo.get("open_issues_count", 0)
            })
        
        print(f"✅ GitHub: Found {len(tutorials)} repositories (with avatars)")
        return tutorials
        
    except Exception as e:
        print(f"❌ GitHub API error: {e}")
        return []


def fetch_reddit_posts(subreddit="Python", limit=5):
    """Reddit APIからプログラミング関連投稿を取得（サムネイル付き）"""
    api_url = f"https://www.reddit.com/r/{subreddit}/hot.json?limit={limit}"
    
    headers = {
        "User-Agent": "TechScope Learning Content Collector/1.0"
    }
    
    try:
        response = requests.get(api_url, headers=headers, timeout=10)
        if response.status_code != 200:
            print(f"❌ Reddit API failed: {response.status_code}")
            return []
            
        data = response.json()
        posts = data.get('data', {}).get('children', [])
        articles = []
        
        for post in posts:
            post_data = post.get('data', {})
            
            # 学習に関連する投稿のみフィルタリング
            title = post_data.get('title', '').lower()
            if any(keyword in title for keyword in ['tutorial', 'learn', 'guide', 'beginner', 'course', 'project']):
                
                # サムネイル画像の取得
                thumbnail = post_data.get('thumbnail')
                thumbnail_url = None
                
                # Redditのサムネイルが有効なURLかチェック
                if thumbnail and thumbnail not in ['self', 'default', 'nsfw', 'spoiler']:
                    thumbnail_url = thumbnail
                
                # preview画像があればそれも取得
                preview_url = None
                preview = post_data.get('preview')
                if preview and 'images' in preview:
                    images = preview['images']
                    if images and 'source' in images[0]:
                        preview_url = images[0]['source'].get('url', '').replace('&amp;', '&')
                
                articles.append({
                    "title": post_data.get('title', ''),
                    "url": f"https://reddit.com{post_data.get('permalink', '')}",
                    "source": f"Reddit r/{subreddit}",
                    "type": "discussion",
                    "summary": post_data.get('selftext', '')[:200] + "..." if post_data.get('selftext') else "Reddit discussion",
                    "score": post_data.get('score', 0),
                    "comments": post_data.get('num_comments', 0),
                    "thumbnail_url": preview_url or thumbnail_url,
                    "author": post_data.get('author', ''),
                    "subreddit": post_data.get('subreddit_name_prefixed', ''),
                    "created_utc": post_data.get('created_utc', 0)
                })
        
        print(f"✅ Reddit: Found {len(articles)} learning posts (with thumbnails)")
        return articles
        
    except Exception as e:
        print(f"❌ Reddit API error: {e}")
        return []


def fetch_hackernews_stories(limit=5):
    """Hacker News APIから技術記事を取得（サムネイル付き）"""
    try:
        # トップストーリーのIDを取得
        response = requests.get("https://hacker-news.firebaseio.com/v0/topstories.json", timeout=10)
        if response.status_code != 200:
            print(f"❌ HackerNews API failed: {response.status_code}")
            return []
            
        story_ids = response.json()[:limit * 3]  # 多めに取得してフィルタリング
        stories = []
        
        for story_id in story_ids:
            try:
                story_response = requests.get(f"https://hacker-news.firebaseio.com/v0/item/{story_id}.json", timeout=5)
                if story_response.status_code == 200:
                    story = story_response.json()
                    title = story.get('title', '').lower()
                    
                    # 技術・学習関連の記事のみフィルタリング
                    if any(keyword in title for keyword in ['python', 'javascript', 'programming', 'tutorial', 'guide', 'learn', 'course', 'api', 'framework']):
                        
                        # URLからドメインを抽出してファビコンをサムネイルとして使用
                        story_url = story.get('url', f"https://news.ycombinator.com/item?id={story_id}")
                        thumbnail_url = None
                        
                        if story_url and not story_url.startswith('https://news.ycombinator.com'):
                            try:
                                from urllib.parse import urlparse
                                parsed = urlparse(story_url)
                                domain = f"{parsed.scheme}://{parsed.netloc}"
                                thumbnail_url = f"{domain}/favicon.ico"
                            except:
                                pass
                        
                        # HackerNewsのデフォルトアイコン
                        if not thumbnail_url:
                            thumbnail_url = "https://news.ycombinator.com/favicon.ico"
                        
                        stories.append({
                            "title": story.get('title', ''),
                            "url": story_url,
                            "source": "Hacker News",
                            "type": "article",
                            "summary": "Technical article from Hacker News",
                            "score": story.get('score', 0),
                            "comments": story.get('descendants', 0),
                            "thumbnail_url": thumbnail_url,
                            "author": story.get('by', ''),
                            "published_at": story.get('time', 0),
                            "hn_id": story_id
                        })
                        
                        if len(stories) >= limit:
                            break
            except:
                continue
        
        print(f"✅ Hacker News: Found {len(stories)} tech stories (with favicons)")
        return stories
        
    except Exception as e:
        print(f"❌ Hacker News API error: {e}")
        return []


def fetch_freecodecamp_rss(limit=5):
    """FreeCodeCamp RSSから学習記事を取得（サムネイル付き）"""
    try:
        import xml.etree.ElementTree as ET
        import re
        
        response = requests.get("https://www.freecodecamp.org/news/rss/", timeout=10)
        if response.status_code != 200:
            print(f"❌ FreeCodeCamp RSS failed: {response.status_code}")
            return []
            
        # XMLを解析
        root = ET.fromstring(response.content)
        articles = []
        
        # RSS itemsを取得
        items = root.findall('.//item')[:limit]
        
        for item in items:
            title = item.find('title')
            link = item.find('link') 
            description = item.find('description')
            pub_date = item.find('pubDate')
            
            # description内からimg要素を抽出してサムネイルとして使用
            thumbnail_url = None
            if description is not None and description.text:
                # HTMLからimg srcを抽出
                img_match = re.search(r'<img[^>]+src="([^"]+)"', description.text)
                if img_match:
                    thumbnail_url = img_match.group(1)
            
            articles.append({
                "title": title.text if title is not None else "",
                "url": link.text if link is not None else "",
                "source": "FreeCodeCamp",
                "type": "article",
                "summary": description.text[:200] + "..." if description is not None else "Programming tutorial from FreeCodeCamp",
                "published_at": pub_date.text if pub_date is not None else "",
                "thumbnail_url": thumbnail_url,
                "author": "FreeCodeCamp",
                "author_avatar": "https://cdn.freecodecamp.org/platform/universal/fcc_primary.svg"
            })
        
        print(f"✅ FreeCodeCamp RSS: Found {len(articles)} articles (with thumbnails)")
        return articles
        
    except Exception as e:
        print(f"❌ FreeCodeCamp RSS error: {e}")
        return []


def fetch_all_api_content(query="python", limit_per_source=3):
    """公開APIのみから学習コンテンツを取得する統合関数"""
    all_content = []
    
    print(f"🔍 Searching for '{query}' across public API learning platforms...")
    
    # 公開APIのみを使用
    api_sources = [
        ("Dev.to", lambda: fetch_dev_to_articles(query, limit_per_source)),
        ("GitHub", lambda: fetch_github_tutorials(f"{query} tutorial", limit_per_source)),
        ("Reddit", lambda: fetch_reddit_posts("Python" if "python" in query.lower() else "programming", limit_per_source)),
        ("Hacker News", lambda: fetch_hackernews_stories(limit_per_source)),
        ("FreeCodeCamp", lambda: fetch_freecodecamp_rss(limit_per_source)),
    ]
    
    for source_name, fetch_func in api_sources:
        try:
            print(f"\n📚 Fetching from {source_name}...")
            content = fetch_func()
            all_content.extend(content)
        except Exception as e:
            print(f"❌ Error fetching from {source_name}: {e}")
    
    print(f"\n🎯 Total content found: {len(all_content)} items")
    return all_content






