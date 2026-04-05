import feedparser
from datetime import datetime

RSS_FEEDS = [
    "https://www.thehindu.com/news/national/feeder/default.rss",
    "https://indianexpress.com/section/india/feed/",
]

def fetch_articles_by_date(target_date):
    articles = []

    for url in RSS_FEEDS:
        feed = feedparser.parse(url)

        for entry in feed.entries:
            if not hasattr(entry, "published"):
                continue

            pub_date = datetime(*entry.published_parsed[:6]).date()

            if abs((pub_date - datetime.strptime(target_date, "%Y-%m-%d").date()).days) <= 1:
                articles.append({
                    "title": entry.title,
                    "link": entry.link
                })

    return articles[:20]