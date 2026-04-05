from fastapi import FastAPI
from app.rss_fetcher import fetch_articles_by_date
from app.extractor import extract_text
from app.dedup import deduplicate
from app.summarizer import summarize_articles
from app.qa_generator import generate_qa
from app.database import collection
from app.cache import get_cache, set_cache
from app.tags import generate_importance, generate_tags

app = FastAPI()


def process_date(date: str):
    # DB check
    existing = collection.find_one({"date": date})
    if existing:
        existing["_id"] = str(existing["_id"])
        return existing

    articles = fetch_articles_by_date(date)
    if not articles:
        return {
            "date": date,
            "summary": "No articles found for this date.",
            "qa": "",
            "tags": [],
            "importance": "No data available"
        }
    articles = deduplicate(articles)

    texts = []
    for a in articles[:5]:
        text = extract_text(a["link"])
        if text:
            # texts.append(text)
            texts.append(text[:3000])

    summary = summarize_articles(texts)
    qa = generate_qa(texts)
    tags = generate_tags("\n".join(texts))

    importance = generate_importance("\n".join(texts))
    data = {
        "date": date,
        "summary": summary,
        "qa": qa,
        "tags": tags,
        "syllabus_links": [
            "https://upsc.gov.in/syllabus"
        ],
        "importance": importance
    }

    inserted = collection.insert_one(data)
    data["_id"] = str(inserted.inserted_id)

    return data


@app.get("/news/{date}")
def get_news(date: str):
    # Redis cache
    #cached = get_cache(date)
    #if cached:
        #return cached

    result = process_date(date)

    #set_cache(date, result)
    return result

@app.get("/")
def health():
    return {"status": "running"}